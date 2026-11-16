'use server';

/**
 * Server Action — Atualizar Convidado
 *
 * Edita os dados de um convidado existente no Firestore via Admin SDK.
 * Requer sessão administrativa válida. Preserva dados em caso de erro.
 * Não modifica confirmações RSVP existentes.
 */

import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/lib/auth/admin-session';
import { updateGuest } from '@/lib/repositories/guest.repository';
import type { ApiResponse } from '@/types';
import { z } from 'zod';

const updateGuestSchema = z.object({
	guestId: z.string().min(1, 'ID do convidado é obrigatório'),
	fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(200),
	phone: z.string().min(10, 'Telefone inválido').max(20),
	email: z.string().email('E-mail inválido').or(z.literal('')).optional(),
	category: z.string().min(1, 'Categoria é obrigatória'),
	group: z.string().max(100).optional(),
	notes: z.string().max(500).optional(),
	maxCompanions: z.coerce.number().int().min(0).max(50).default(0),
});

export async function updateGuestAction(
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

	// 2. Validar dados com Zod
	const validation = updateGuestSchema.safeParse(formData);
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
		const result = await updateGuest(eventId, validation.data.guestId, {
			fullName: validation.data.fullName,
			phone: validation.data.phone,
			category: validation.data.category,
		});

		if (!result.success) {
			return {
				success: false,
				error: result.error || 'Falha ao atualizar convidado no Firestore.',
			};
		}

		// Atualizar campos adicionais que o repository.updateGuest não cobre
		// (maxCompanions via invitation, notes, group, email)
		const { adminDb } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');

		const guestRef = adminDb
			.collection('events')
			.doc(eventId)
			.collection('guests')
			.doc(validation.data.guestId);

		const additionalUpdate: Record<string, unknown> = {
			updatedAt: FieldValue.serverTimestamp(),
		};

		if (validation.data.group !== undefined) {
			additionalUpdate.group = validation.data.group || null;
		}
		if (validation.data.notes !== undefined) {
			additionalUpdate.notes = validation.data.notes || null;
		}
		if (validation.data.email !== undefined) {
			additionalUpdate.email = validation.data.email || null;
		}

		await guestRef.update(additionalUpdate);

		// Se maxCompanions mudou e há convite associado, atualizar o convite
		if (validation.data.maxCompanions !== undefined) {
			const guestDoc = await guestRef.get();
			const guestData = guestDoc.data();

			if (guestData?.invitationId) {
				await adminDb
					.collection('events')
					.doc(eventId)
					.collection('invitations')
					.doc(guestData.invitationId)
					.update({
						maxCompanions: validation.data.maxCompanions,
						updatedAt: FieldValue.serverTimestamp(),
					});
			}
		}

		revalidatePath('/admin/convidados');

		console.log('[UpdateGuest] Convidado atualizado com sucesso.', {
			eventId,
			guestId: validation.data.guestId,
			updatedBy: session.uid,
		});

		return {
			success: true,
			data: { guestId: validation.data.guestId },
			message: 'Convidado atualizado com sucesso!',
		};
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';
		console.error('[UpdateGuest] Falha ao atualizar convidado:', message);
		return { success: false, error: `Falha ao salvar no Firestore: ${message}` };
	}
}