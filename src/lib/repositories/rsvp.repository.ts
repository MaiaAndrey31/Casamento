/**
 * Repositório de RSVP — Persistência de confirmações de presença no Firestore.
 *
 * Todas as operações são server-side via Admin SDK.
 * Usa transações para controle de concorrência (campo `revision`).
 */

import type { RSVP, AttendanceStatus, CompanionInfo } from '@/types';

const RSVPS_SUBCOLLECTION = 'rsvps';

/**
 * Cria ou atualiza uma confirmação de presença.
 * Usa transação para garantir consistência do campo `revision`.
 */
export async function submitRSVP(
	eventId: string,
	invitationId: string,
	data: {
		attendanceStatus: AttendanceStatus;
		confirmedGuestIds: string[];
		companions: CompanionInfo[];
		dietaryRestrictions: string[];
		songSuggestion: string;
		personalMessage: string;
	},
): Promise<{ success: boolean; error?: string }> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');

		const ref = adminDb
			.collection('events')
			.doc(eventId)
			.collection(RSVPS_SUBCOLLECTION)
			.doc(invitationId);

		await adminDb.runTransaction(async (transaction) => {
			const doc = await transaction.get(ref);

			if (doc.exists) {
				const currentRevision = doc.data()?.revision ?? 0;
				transaction.update(ref, {
					...data,
					revision: currentRevision + 1,
					updatedAt: FieldValue.serverTimestamp(),
				});
			} else {
				transaction.set(ref, {
					eventId,
					invitationId,
					...data,
					revision: 1,
					submittedAt: FieldValue.serverTimestamp(),
					updatedAt: FieldValue.serverTimestamp(),
				});
			}
		});

		return { success: true };
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';
		console.error('[RSVPRepository] Falha ao salvar RSVP:', message);
		return { success: false, error: message };
	}
}

/**
 * Recupera o RSVP existente para um convite.
 * Retorna null se não houver confirmação prévia.
 */
export async function getRSVP(
	eventId: string,
	invitationId: string,
): Promise<RSVP | null> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');

		const doc = await adminDb
			.collection('events')
			.doc(eventId)
			.collection(RSVPS_SUBCOLLECTION)
			.doc(invitationId)
			.get();

		if (!doc.exists) return null;

		return { id: doc.id, ...doc.data() } as RSVP;
	} catch {
		return null;
	}
}

/**
 * Verifica se já existe RSVP para um convite (detecção de duplicidade).
 */
export async function hasExistingRSVP(
	eventId: string,
	invitationId: string,
): Promise<boolean> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');

		const doc = await adminDb
			.collection('events')
			.doc(eventId)
			.collection(RSVPS_SUBCOLLECTION)
			.doc(invitationId)
			.get();

		return doc.exists;
	} catch {
		return false;
	}
}