/**
 * Repositório de Participantes Especiais — Noivos, filhos e familiares.
 *
 * Todas as operações são server-side via Admin SDK.
 * Coleção: events/{eventId}/specialParticipants/{participantId}
 */

import type { SpecialParticipant, SpecialParticipantCategory } from '@/types';
import { serializeFirestoreValue } from '@/lib/server/firestore-serializer';

const SUBCOLLECTION = 'specialParticipants';

/**
 * Normaliza string para busca: minúsculas, sem acentos, trim.
 */
function normalizeSearch(value: string): string {
	return value
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.trim();
}

// ============================================================================
// CRUD
// ============================================================================

/**
 * Lista todos os participantes especiais do evento.
 */
export async function listSpecialParticipants(
	eventId: string,
): Promise<SpecialParticipant[]> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');

		const snap = await adminDb
			.collection('events')
			.doc(eventId)
			.collection(SUBCOLLECTION)
			.orderBy('fullName', 'asc')
			.get();

		return snap.docs.map(doc => ({
			id: doc.id,
			...(serializeFirestoreValue(doc.data(), `specialParticipant.${doc.id}`) as Record<string, unknown>),
		})) as SpecialParticipant[];
	} catch (e) {
		console.error('[SpecialParticipantsRepository] Falha ao listar:', e);
		return [];
	}
}

/**
 * Obtém um participante especial por ID.
 */
export async function getSpecialParticipant(
	eventId: string,
	participantId: string,
): Promise<SpecialParticipant | null> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');

		const doc = await adminDb
			.collection('events')
			.doc(eventId)
			.collection(SUBCOLLECTION)
			.doc(participantId)
			.get();

		if (!doc.exists) return null;

		return {
			id: doc.id,
			...(serializeFirestoreValue(doc.data(), `specialParticipant.${doc.id}`) as Record<string, unknown>),
		} as SpecialParticipant;
	} catch (e) {
		console.error('[SpecialParticipantsRepository] Falha ao obter:', e);
		return null;
	}
}

/**
 * Cria um novo participante especial.
 */
export async function createSpecialParticipant(
	eventId: string,
	data: {
		fullName: string;
		category: SpecialParticipantCategory;
		notes?: string;
		active?: boolean;
	},
	adminUid: string,
): Promise<{ success: boolean; participantId?: string; error?: string }> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');

		const ref = adminDb
			.collection('events')
			.doc(eventId)
			.collection(SUBCOLLECTION)
			.doc();

		await ref.set({
			eventId,
			fullName: data.fullName.trim(),
			normalizedName: normalizeSearch(data.fullName),
			category: data.category,
			active: data.active !== false,
			notes: data.notes?.trim() || '',
			createdAt: FieldValue.serverTimestamp(),
			updatedAt: FieldValue.serverTimestamp(),
			createdBy: adminUid,
		});

		return { success: true, participantId: ref.id };
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';
		console.error('[SpecialParticipantsRepository] Falha ao criar:', message);
		return { success: false, error: message };
	}
}

/**
 * Atualiza um participante especial.
 */
export async function updateSpecialParticipant(
	eventId: string,
	participantId: string,
	data: {
		fullName?: string;
		category?: SpecialParticipantCategory;
		notes?: string;
		active?: boolean;
	},
): Promise<{ success: boolean; error?: string }> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');

		const ref = adminDb
			.collection('events')
			.doc(eventId)
			.collection(SUBCOLLECTION)
			.doc(participantId);

		const updates: Record<string, unknown> = {
			updatedAt: FieldValue.serverTimestamp(),
		};

		if (data.fullName !== undefined) {
			updates.fullName = data.fullName.trim();
			updates.normalizedName = normalizeSearch(data.fullName);
		}
		if (data.category !== undefined) updates.category = data.category;
		if (data.notes !== undefined) updates.notes = data.notes.trim();
		if (data.active !== undefined) updates.active = data.active;

		await ref.update(updates);

		return { success: true };
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';
		console.error('[SpecialParticipantsRepository] Falha ao atualizar:', message);
		return { success: false, error: message };
	}
}

/**
 * Exclui definitivamente um participante especial e todas as suas atribuições de mesa.
 *
 * Operação atômica via transação do Firestore:
 * - Remove o documento do participante.
 * - Remove todas as atribuições vinculadas (inclusive duplicidades antigas).
 * - Se qualquer passo falhar, nenhuma alteração é persistida.
 *
 * Retorna informações sobre a mesa liberada para auditoria.
 */
export async function deleteSpecialParticipant(
	eventId: string,
	participantId: string,
): Promise<{
	success: boolean;
	error?: string;
	deletedAssignments?: Array<{ assignmentId: string; tableId: string; tableName?: string }>;
}> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');

		const participantRef = adminDb
			.collection('events')
			.doc(eventId)
			.collection(SUBCOLLECTION)
			.doc(participantId);

		const assignmentsCollection = adminDb
			.collection('events')
			.doc(eventId)
			.collection('tableAssignments');

		let deletedAssignments: Array<{ assignmentId: string; tableId: string; tableName?: string }> = [];

		await adminDb.runTransaction(async (transaction) => {
			// 1. Ler o participante dentro da transação
			const participantDoc = await transaction.get(participantRef);
			if (!participantDoc.exists) {
				throw new Error('PARTICIPANT_NOT_FOUND');
			}

			// 2. Buscar todas as atribuições deste participante dentro da transação
			const assignmentsSnap = await transaction.get(
				assignmentsCollection.where('participantId', '==', participantId),
			);

			// 3. Coletar IDs das mesas afetadas para buscar nomes
			const tableIds = new Set<string>();
			const assignmentDocs: Array<{ id: string; tableId: string }> = [];
			assignmentsSnap.docs.forEach((doc) => {
				const data = doc.data();
				if (data?.tableId) {
					tableIds.add(data.tableId);
					assignmentDocs.push({ id: doc.id, tableId: data.tableId });
				}
			});

			// 4. Buscar nomes das mesas afetadas (leitura dentro da transação)
			const tableNames = new Map<string, string>();
			for (const tableId of tableIds) {
				const tableDoc = await transaction.get(
					adminDb.collection('events').doc(eventId).collection('tables').doc(tableId),
				);
				if (tableDoc.exists) {
					tableNames.set(tableId, tableDoc.data()?.name || tableId);
				}
			}

			// 5. Montar lista de atribuições excluídas para auditoria
			deletedAssignments = assignmentDocs.map((a) => ({
				assignmentId: a.id,
				tableId: a.tableId,
				tableName: tableNames.get(a.tableId),
			}));

			// 6. Excluir todas as atribuições dentro da transação
			for (const doc of assignmentsSnap.docs) {
				transaction.delete(doc.ref);
			}

			// 7. Excluir o participante dentro da transação
			transaction.delete(participantRef);
		});

		return { success: true, deletedAssignments };
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';
		console.error('[SpecialParticipantsRepository] Falha ao excluir:', message);

		if (message === 'PARTICIPANT_NOT_FOUND') {
			return { success: false, error: 'Participante não encontrado.' };
		}

		return { success: false, error: message };
	}
}

// ============================================================================
// INTEGRAÇÃO COM MESAS
// ============================================================================

/**
 * Lista participantes especiais ativos disponíveis para atribuição (não atribuídos).
 * Retorna array compatível com listAvailableParticipants do tables.repository.
 */
export async function listAvailableSpecialParticipants(
	eventId: string,
	searchTerm?: string,
): Promise<Array<{
	participantId: string;
	participantName: string;
	participantType: 'special';
	participantSource: 'special';
	specialCategory: SpecialParticipantCategory;
	invitationId: string; // Placeholder para compatibilidade de tipo
	rsvpStatus: string;
	alreadyAssigned?: boolean;
}>> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');

		// Buscar todas as atribuições existentes
		const allAssignmentsSnap = await adminDb
			.collection('events')
			.doc(eventId)
			.collection('tableAssignments')
			.get();

		const assignedParticipantIds = new Set<string>();
		allAssignmentsSnap.docs.forEach(doc => {
			assignedParticipantIds.add(doc.data()?.participantId);
		});

		// Buscar participantes especiais ativos
		const specialSnap = await adminDb
			.collection('events')
			.doc(eventId)
			.collection(SUBCOLLECTION)
			.where('active', '==', true)
			.orderBy('fullName', 'asc')
			.get();

		const normalizedSearch = searchTerm ? normalizeSearch(searchTerm) : '';
		const available: Array<{
			participantId: string;
			participantName: string;
			participantType: 'special';
			participantSource: 'special';
			specialCategory: SpecialParticipantCategory;
			invitationId: string;
			rsvpStatus: string;
			alreadyAssigned?: boolean;
		}> = [];

		for (const doc of specialSnap.docs) {
			const data = doc.data();
			const fullName = data?.fullName || '';

			if (normalizedSearch && !normalizeSearch(fullName).includes(normalizedSearch)) continue;

			const isAlreadyAssigned = assignedParticipantIds.has(doc.id);

			available.push({
				participantId: doc.id,
				participantName: fullName,
				participantType: 'special',
				participantSource: 'special',
				specialCategory: data?.category || 'other',
				invitationId: `__special_${doc.id}`, // Placeholder único para compatibilidade
				rsvpStatus: 'special',
				alreadyAssigned: isAlreadyAssigned,
			});
		}

		return available;
	} catch (e) {
		console.error('[SpecialParticipantsRepository] Falha ao listar disponíveis:', e);
		return [];
	}
}

/**
 * Conta participantes especiais ativos.
 */
export async function countActiveSpecialParticipants(
	eventId: string,
): Promise<number> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');

		const snap = await adminDb
			.collection('events')
			.doc(eventId)
			.collection(SUBCOLLECTION)
			.where('active', '==', true)
			.count()
			.get();

		return snap.data().count ?? 0;
	} catch (e) {
		console.error('[SpecialParticipantsRepository] Falha ao contar:', e);
		return 0;
	}
}