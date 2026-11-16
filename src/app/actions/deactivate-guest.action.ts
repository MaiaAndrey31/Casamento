'use server';

/**
 * Server Action — Desativar Convidado
 *
 * Realiza exclusão lógica (active: false) preservando integridade referencial.
 * Verifica vínculos com Invitation, RSVP e CheckIn antes de desativar.
 * Se o convidado for titular de um convite individual, revoga o convite associado.
 * Requer sessão administrativa válida.
 */

import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/lib/auth/admin-session';
import type { ApiResponse } from '@/types';
import { z } from 'zod';

const deactivateGuestSchema = z.object({
	guestId: z.string().min(1, 'ID do convidado é obrigatório'),
});

export async function deactivateGuestAction(
	formData: Record<string, unknown>,
): Promise<ApiResponse<{ guestId: string; invitationRevoked: boolean }>> {
	// 1. Verificar sessão administrativa
	let session;
	try {
		session = await requireAdminSession();
	} catch {
		return {
			success: false,
			error: 'Sessão administrativa inválida ou expirada. Faça login novamente.',
		};
	}

	// 2. Validar dados
	const validation = deactivateGuestSchema.safeParse(formData);
	if (!validation.success) {
		return {
			success: false,
			error: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
		};
	}

	// 3. Verificar Admin SDK
	if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
		return {
			success: false,
			error: 'Firebase Admin SDK não configurado no servidor.',
		};
	}

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

	try {
		const { adminDb } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');

		// Buscar dados do convidado
		const guestDoc = await adminDb
			.collection('events')
			.doc(eventId)
			.collection('guests')
			.doc(validation.data.guestId)
			.get();

		if (!guestDoc.exists) {
			return { success: false, error: 'Convidado não encontrado.' };
		}

		const guestData = guestDoc.data();

		if (!guestData?.active) {
			return { success: false, error: 'Este convidado já está desativado.' };
		}

		// Verificar vínculos com check-ins existentes
		if (guestData.invitationId) {
			const checkInSnapshot = await adminDb
				.collection('events')
				.doc(eventId)
				.collection('checkins')
				.where('guestId', '==', validation.data.guestId)
				.count()
				.get();

			const checkInCount = checkInSnapshot.data().count ?? 0;

			if (checkInCount > 0) {
				console.warn('[DeactivateGuest] Convidado possui check-in registrado. Desativação prossegue mas histórico é preservado.', {
					guestId: validation.data.guestId,
					checkInCount,
				});
			}
		}

		// Desativar convidado (exclusão lógica)
		await guestDoc.ref.update({
			active: false,
			updatedAt: FieldValue.serverTimestamp(),
			deactivatedAt: FieldValue.serverTimestamp(),
			deactivatedBy: session.uid,
		});

		// Se o convidado é titular de um convite individual, revogar o convite
		let invitationRevoked = false;
		if (guestData.invitationId && guestData.isPrimaryGuest) {
			// Verificar se há outros convidados ativos vinculados ao mesmo convite
			const otherActiveGuests = await adminDb
				.collection('events')
				.doc(eventId)
				.collection('guests')
				.where('invitationId', '==', guestData.invitationId)
				.where('active', '==', true)
				.count()
				.get();

			// Se não há outros convidados ativos, revogar o convite
			if ((otherActiveGuests.data().count ?? 0) === 0) {
				await adminDb
					.collection('events')
					.doc(eventId)
					.collection('invitations')
					.doc(guestData.invitationId)
					.update({
						invitationStatus: 'revoked',
						updatedAt: FieldValue.serverTimestamp(),
					});

				invitationRevoked = true;
				console.log('[DeactivateGuest] Convite associado revogado.', {
					guestId: validation.data.guestId,
					invitationId: guestData.invitationId,
				});
			}
		}

		revalidatePath('/admin/convidados');

		console.log('[DeactivateGuest] Convidado desativado com sucesso.', {
			eventId,
			guestId: validation.data.guestId,
			invitationRevoked,
			deactivatedBy: session.uid,
		});

		return {
			success: true,
			data: { guestId: validation.data.guestId, invitationRevoked },
			message: invitationRevoked
				? 'Convidado desativado e convite associado revogado.'
				: 'Convidado desativado com sucesso.',
		};
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';
		console.error('[DeactivateGuest] Falha ao desativar convidado:', message);
		return { success: false, error: `Falha ao desativar convidado: ${message}` };
	}
}