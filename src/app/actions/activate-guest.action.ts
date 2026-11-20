'use server';

/**
 * Server Action — Reativar Convidado
 *
 * Restaura o convidado ao estado ativo (active: true).
 * A confirmação de presença anterior NÃO é restaurada automaticamente.
 * O convidado volta ao estado elegível e deve confirmar presença novamente.
 * O histórico de invalidação permanece no audit log.
 *
 * Requer sessão administrativa válida.
 */

import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/lib/auth/admin-session';
import type { ApiResponse } from '@/types';
import { z } from 'zod';

const activateGuestSchema = z.object({
	guestId: z.string().min(1, 'ID do convidado é obrigatório'),
});

export async function activateGuestAction(
	formData: Record<string, unknown>,
): Promise<ApiResponse<{ guestId: string }>> {
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
	const validation = activateGuestSchema.safeParse(formData);
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

		const guestRef = adminDb
			.collection('events')
			.doc(eventId)
			.collection('guests')
			.doc(validation.data.guestId);

		await adminDb.runTransaction(async (transaction) => {
			const guestDoc = await transaction.get(guestRef);
			if (!guestDoc.exists) {
				throw new Error('GUEST_NOT_FOUND');
			}

			const guestData = guestDoc.data();
			if (guestData?.active !== false) {
				throw new Error('GUEST_ALREADY_ACTIVE');
			}

			// Reativar convidado — NÃO restaurar RSVP anterior
			transaction.update(guestRef, {
				active: true,
				updatedAt: FieldValue.serverTimestamp(),
				reactivatedAt: FieldValue.serverTimestamp(),
				reactivatedBy: session.uid,
				// Limpar campos de desativação
				deactivatedAt: FieldValue.delete(),
				deactivatedBy: FieldValue.delete(),
			});

			// Se o convite estava revogado e este era o primary guest, reativar o convite
			if (guestData.invitationId && guestData.isPrimaryGuest) {
				const invitationRef = adminDb
					.collection('events')
					.doc(eventId)
					.collection('invitations')
					.doc(guestData.invitationId);

				const invDoc = await transaction.get(invitationRef);
				if (invDoc.exists && invDoc.data()?.invitationStatus === 'revoked') {
					transaction.update(invitationRef, {
						invitationStatus: 'active',
						updatedAt: FieldValue.serverTimestamp(),
					});
				}
			}

			// Audit log da reativação
			const auditRef = adminDb
				.collection('events')
				.doc(eventId)
				.collection('auditLogs')
				.doc();

			transaction.set(auditRef, {
				eventId,
				action: 'guest.reactivated',
				actorId: session.uid,
				targetId: validation.data.guestId,
				targetType: 'guest',
				timestamp: FieldValue.serverTimestamp(),
				metadata: {
					invitationId: guestData.invitationId || null,
					note: 'RSVP anterior não restaurado. Nova confirmação necessária.',
				},
			});
		});

		revalidatePath('/admin/convidados');
		revalidatePath('/admin/confirmacoes');
		revalidatePath('/admin');
		revalidatePath('/validador/confirmados');

		console.log('[ActivateGuest] Convidado reativado com sucesso.', {
			eventId,
			guestId: validation.data.guestId,
			reactivatedBy: session.uid,
		});

		return {
			success: true,
			data: { guestId: validation.data.guestId },
			message: 'Convidado reativado com sucesso. Uma nova confirmação de presença será necessária.',
		};
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);

		if (message === 'GUEST_NOT_FOUND') {
			return { success: false, error: 'Convidado não encontrado.' };
		}
		if (message === 'GUEST_ALREADY_ACTIVE') {
			return { success: false, error: 'Este convidado já está ativo.' };
		}

		console.error('[ActivateGuest] Falha ao reativar convidado:', message);
		return { success: false, error: `Falha ao reativar convidado: ${message}` };
	}
}