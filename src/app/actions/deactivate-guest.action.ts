'use server';

/**
 * Server Action — Desativar Convidado
 *
 * Realiza exclusão lógica (active: false) em transação atômica:
 * 1. Desativa o convidado
 * 2. Remove o guestId da lista confirmedGuestIds do RSVP (se presente)
 * 3. Se nenhum guest ativo permanecer confirmado no convite, invalida o RSVP inteiro
 * 4. Se o convidado for titular e não houver outros guests ativos, revoga o convite
 * 5. Cria registro de auditoria preservando estado anterior do RSVP
 * 6. Bloqueia check-in de convidados inativos (validação no validator-checkin.repository)
 *
 * A confirmação anterior NÃO é restaurada automaticamente na reativação.
 * Requer sessão administrativa válida.
 */

import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/lib/auth/admin-session';
import type { ApiResponse } from '@/types';
import { z } from 'zod';

const deactivateGuestSchema = z.object({
	guestId: z.string().min(1, 'ID do convidado é obrigatório'),
	reason: z.string().optional(),
});

export async function deactivateGuestAction(
	formData: Record<string, unknown>,
): Promise<ApiResponse<{ guestId: string; invitationRevoked: boolean; rsvpInvalidated: boolean }>> {
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

		const guestRef = adminDb
			.collection('events')
			.doc(eventId)
			.collection('guests')
			.doc(validation.data.guestId);

		let invitationRevoked = false;
		let rsvpInvalidated = false;
		let previousRsvpStatus: string | null = null;
		let previousConfirmedGuestIds: string[] = [];

		// Transação atômica: desativar guest + invalidar RSVP + revogar convite + audit log
		await adminDb.runTransaction(async (transaction) => {
			// 1. Ler guest
			const guestDoc = await transaction.get(guestRef);
			if (!guestDoc.exists) {
				throw new Error('GUEST_NOT_FOUND');
			}

			const guestData = guestDoc.data();
			if (!guestData?.active) {
				throw new Error('GUEST_ALREADY_INACTIVE');
			}

			const invitationId = guestData.invitationId;

			// 2. Desativar convidado
			transaction.update(guestRef, {
				active: false,
				updatedAt: FieldValue.serverTimestamp(),
				deactivatedAt: FieldValue.serverTimestamp(),
				deactivatedBy: session.uid,
			});

			// 3. Processar RSVP se existir
			if (invitationId) {
				const rsvpRef = adminDb
					.collection('events')
					.doc(eventId)
					.collection('rsvps')
					.doc(invitationId);

				const rsvpDoc = await transaction.get(rsvpRef);

				if (rsvpDoc.exists) {
					const rsvpData = rsvpDoc.data();
					previousRsvpStatus = rsvpData?.attendanceStatus || null;
					previousConfirmedGuestIds = Array.isArray(rsvpData?.confirmedGuestIds)
						? [...rsvpData.confirmedGuestIds]
						: [];

					if (rsvpData?.attendanceStatus === 'confirmed') {
						// Remover este guestId da lista de confirmados
						const updatedConfirmedIds = previousConfirmedGuestIds.filter(
							(id: string) => id !== validation.data.guestId,
						);

						// Verificar quantos guests ativos restam no convite (excluindo o que está sendo desativado)
						const otherGuestsSnap = await adminDb
							.collection('events')
							.doc(eventId)
							.collection('guests')
							.where('invitationId', '==', invitationId)
							.where('active', '==', true)
							.get();

						// Filtrar para excluir o guest atual (que ainda aparece como ativo nesta query
						// pois a transação ainda não foi commitada)
						const otherActiveGuestIds = otherGuestsSnap.docs
							.filter(d => d.id !== validation.data.guestId)
							.map(d => d.id);

						// Guests que permanecem confirmados = interseção de otherActiveGuestIds com updatedConfirmedIds
						const remainingConfirmed = updatedConfirmedIds.filter(
							(id: string) => otherActiveGuestIds.includes(id),
						);

						if (remainingConfirmed.length === 0) {
							// Nenhum guest ativo confirmado resta → invalidar RSVP inteiro
							transaction.update(rsvpRef, {
								attendanceStatus: 'pending',
								confirmedGuestIds: [],
								invalidatedAt: FieldValue.serverTimestamp(),
								invalidatedBy: session.uid,
								invalidationReason: validation.data.reason || 'Todos os convidados confirmados foram desativados',
								revision: (rsvpData.revision ?? 0) + 1,
								updatedAt: FieldValue.serverTimestamp(),
							});
							rsvpInvalidated = true;
						} else {
							// Apenas remover este guest da lista de confirmados
							transaction.update(rsvpRef, {
								confirmedGuestIds: remainingConfirmed,
								revision: (rsvpData.revision ?? 0) + 1,
								updatedAt: FieldValue.serverTimestamp(),
							});
						}
					}
				}

				// 4. Verificar se deve revogar o convite
				if (guestData.isPrimaryGuest) {
					const otherActiveSnap = await adminDb
						.collection('events')
						.doc(eventId)
						.collection('guests')
						.where('invitationId', '==', invitationId)
						.where('active', '==', true)
						.get();

					const otherActiveCount = otherActiveSnap.docs
						.filter(d => d.id !== validation.data.guestId).length;

					if (otherActiveCount === 0) {
						const invitationRef = adminDb
							.collection('events')
							.doc(eventId)
							.collection('invitations')
							.doc(invitationId);

						transaction.update(invitationRef, {
							invitationStatus: 'revoked',
							updatedAt: FieldValue.serverTimestamp(),
						});
						invitationRevoked = true;
					}
				}
			}

			// 5. Criar registro de auditoria dentro da transação
			const auditRef = adminDb
				.collection('events')
				.doc(eventId)
				.collection('auditLogs')
				.doc();

			transaction.set(auditRef, {
				eventId,
				action: 'guest.deactivated',
				actorId: session.uid,
				targetId: validation.data.guestId,
				targetType: 'guest',
				timestamp: FieldValue.serverTimestamp(),
				metadata: {
					invitationId: guestData.invitationId || null,
					previousRsvpStatus,
					previousConfirmedGuestIds,
					rsvpInvalidated,
					invitationRevoked,
					reason: validation.data.reason || null,
					hasExistingCheckIn: true, // Será verificado fora da transação para log
				},
			});
		});

		// Verificar check-ins existentes (fora da transação, apenas para log)
		if (true) {
			const { adminDb: db } = await import('@/lib/firebase/admin');
			const checkInSnapshot = await db
				.collection('events')
				.doc(eventId)
				.collection('checkins')
				.where('guestId', '==', validation.data.guestId)
				.count()
				.get();

			const checkInCount = checkInSnapshot.data().count ?? 0;
			if (checkInCount > 0) {
				console.warn('[DeactivateGuest] Convidado possui check-in registrado. Histórico preservado, mas convidado inativo não poderá fazer novo check-in.', {
					guestId: validation.data.guestId,
					checkInCount,
				});
			}
		}

		revalidatePath('/admin/convidados');
		revalidatePath('/admin/confirmacoes');
		revalidatePath('/admin');
		revalidatePath('/validador/confirmados');

		console.log('[DeactivateGuest] Convidado desativado com sucesso.', {
			eventId,
			guestId: validation.data.guestId,
			invitationRevoked,
			rsvpInvalidated,
			deactivatedBy: session.uid,
		});

		return {
			success: true,
			data: { guestId: validation.data.guestId, invitationRevoked, rsvpInvalidated },
			message: invitationRevoked
				? 'Convidado desativado e convite associado revogado.'
				: rsvpInvalidated
					? 'Convidado desativado e confirmação de presença invalidada.'
					: 'Convidado desativado com sucesso.',
		};
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);

		if (message === 'GUEST_NOT_FOUND') {
			return { success: false, error: 'Convidado não encontrado.' };
		}
		if (message === 'GUEST_ALREADY_INACTIVE') {
			return { success: false, error: 'Este convidado já está desativado.' };
		}

		console.error('[DeactivateGuest] Falha ao desativar convidado:', message);
		return { success: false, error: `Falha ao desativar convidado: ${message}` };
	}
}