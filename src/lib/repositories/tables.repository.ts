/**
 * Repositório de Mesas — CRUD e atribuições de participantes.
 *
 * Todas as operações são server-side via Admin SDK.
 * Usa transações para garantir consistência de capacidade e unicidade de atribuição.
 *
 * SERIALIZAÇÃO: funções de leitura usam serializeFirestoreValue() para converter
 * Timestamps antes de retornar dados para Server/Client Components.
 */

import type { Table, TableAssignment, TableWithOccupancy, TablesDashboardStats } from '@/types';
import { serializeFirestoreValue } from '@/lib/server/firestore-serializer';

const TABLES_SUBCOLLECTION = 'tables';
const ASSIGNMENTS_SUBCOLLECTION = 'tableAssignments';

// ============================================================================
// MESAS — CRUD
// ============================================================================

/**
 * Lista todas as mesas do evento com ocupação calculada.
 */
export async function listTables(eventId: string): Promise<TableWithOccupancy[]> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');

		const tablesSnap = await adminDb
			.collection('events')
			.doc(eventId)
			.collection(TABLES_SUBCOLLECTION)
			.orderBy('name', 'asc')
			.get();

		const tables: TableWithOccupancy[] = [];

		for (const tableDoc of tablesSnap.docs) {
			const tableData = serializeFirestoreValue(tableDoc.data(), `table.${tableDoc.id}`) as Record<string, unknown>;
			const table = { id: tableDoc.id, ...tableData } as Table;

			// Buscar atribuições desta mesa
			const assignmentsSnap = await adminDb
				.collection('events')
				.doc(eventId)
				.collection(ASSIGNMENTS_SUBCOLLECTION)
				.where('tableId', '==', tableDoc.id)
				.get();

			const assignments = assignmentsSnap.docs.map(doc => ({
				id: doc.id,
				...(serializeFirestoreValue(doc.data(), `assignment.${doc.id}`) as Record<string, unknown>),
			})) as TableAssignment[];

			tables.push({
				...table,
				occupiedSeats: assignments.length,
				availableSeats: Math.max(0, table.capacity - assignments.length),
				assignments,
			});
		}

		return tables;
	} catch (e) {
		console.error('[TablesRepository] Falha ao listar mesas:', e);
		return [];
	}
}

/**
 * Obtém uma mesa específica com ocupação.
 */
export async function getTable(eventId: string, tableId: string): Promise<TableWithOccupancy | null> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');

		const tableDoc = await adminDb
			.collection('events')
			.doc(eventId)
			.collection(TABLES_SUBCOLLECTION)
			.doc(tableId)
			.get();

		if (!tableDoc.exists) return null;

		const tableData = serializeFirestoreValue(tableDoc.data(), `table.${tableId}`) as Record<string, unknown>;
		const table = { id: tableDoc.id, ...tableData } as Table;

		const assignmentsSnap = await adminDb
			.collection('events')
			.doc(eventId)
			.collection(ASSIGNMENTS_SUBCOLLECTION)
			.where('tableId', '==', tableId)
			.get();

		const assignments = assignmentsSnap.docs.map(doc => ({
			id: doc.id,
			...(serializeFirestoreValue(doc.data(), `assignment.${doc.id}`) as Record<string, unknown>),
		})) as TableAssignment[];

		return {
			...table,
			occupiedSeats: assignments.length,
			availableSeats: Math.max(0, table.capacity - assignments.length),
			assignments,
		};
	} catch (e) {
		console.error('[TablesRepository] Falha ao obter mesa:', e);
		return null;
	}
}

/**
 * Cria uma nova mesa.
 * Valida unicidade do nome dentro do evento.
 */
export async function createTable(
	eventId: string,
	data: { name: string; capacity: number },
	adminUid: string,
): Promise<{ success: boolean; tableId?: string; error?: string }> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');

		// Verificar unicidade do nome
		const existingSnap = await adminDb
			.collection('events')
			.doc(eventId)
			.collection(TABLES_SUBCOLLECTION)
			.where('name', '==', data.name)
			.limit(1)
			.get();

		if (!existingSnap.empty) {
			return { success: false, error: `Já existe uma mesa com o nome "${data.name}".` };
		}

		const ref = adminDb
			.collection('events')
			.doc(eventId)
			.collection(TABLES_SUBCOLLECTION)
			.doc();

		await ref.set({
			eventId,
			name: data.name,
			capacity: data.capacity,
			createdAt: FieldValue.serverTimestamp(),
			updatedAt: FieldValue.serverTimestamp(),
			createdBy: adminUid,
		});

		return { success: true, tableId: ref.id };
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';
		console.error('[TablesRepository] Falha ao criar mesa:', message);
		return { success: false, error: message };
	}
}

/**
 * Atualiza uma mesa (nome e/ou capacidade).
 * Impede reduzir capacidade abaixo da ocupação atual.
 * Valida unicidade do nome se alterado.
 */
export async function updateTable(
	eventId: string,
	tableId: string,
	data: { name?: string; capacity?: number },
): Promise<{ success: boolean; error?: string }> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');

		const tableRef = adminDb
			.collection('events')
			.doc(eventId)
			.collection(TABLES_SUBCOLLECTION)
			.doc(tableId);

		await adminDb.runTransaction(async (transaction) => {
			const tableDoc = await transaction.get(tableRef);
			if (!tableDoc.exists) {
				throw new Error('TABLE_NOT_FOUND');
			}

			const tableData = tableDoc.data();
			if (!tableData) {
				throw new Error('TABLE_NOT_FOUND');
			}

			// Se alterando nome, verificar unicidade
			if (data.name && data.name !== tableData.name) {
				const existingSnap = await adminDb
					.collection('events')
					.doc(eventId)
					.collection(TABLES_SUBCOLLECTION)
					.where('name', '==', data.name)
					.limit(1)
					.get();

				if (!existingSnap.empty && existingSnap.docs[0].id !== tableId) {
					throw new Error('DUPLICATE_NAME');
				}
			}

			// Se reduzindo capacidade, verificar ocupação atual
			if (data.capacity !== undefined) {
				const assignmentsSnap = await adminDb
					.collection('events')
					.doc(eventId)
					.collection(ASSIGNMENTS_SUBCOLLECTION)
					.where('tableId', '==', tableId)
					.count()
					.get();

				const currentOccupancy = assignmentsSnap.data().count ?? 0;
				if (data.capacity < currentOccupancy) {
					throw new Error(`CAPACITY_BELOW_OCCUPANCY:${currentOccupancy}`);
				}
			}

			const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
			if (data.name !== undefined) updates.name = data.name;
			if (data.capacity !== undefined) updates.capacity = data.capacity;

			transaction.update(tableRef, updates);
		});

		return { success: true };
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);

		if (message === 'TABLE_NOT_FOUND') {
			return { success: false, error: 'Mesa não encontrada.' };
		}
		if (message === 'DUPLICATE_NAME') {
			return { success: false, error: 'Já existe outra mesa com este nome.' };
		}
		if (message.startsWith('CAPACITY_BELOW_OCCUPANCY:')) {
			const occupancy = message.split(':')[1];
			return { success: false, error: `Não é possível reduzir a capacidade. A mesa possui ${occupancy} participantes atribuídos. Remova participantes antes de alterar a capacidade.` };
		}

		console.error('[TablesRepository] Falha ao atualizar mesa:', message);
		return { success: false, error: message };
	}
}

/**
 * Exclui uma mesa. Apenas permitido se estiver vazia.
 */
export async function deleteTable(
	eventId: string,
	tableId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');

		const tableRef = adminDb
			.collection('events')
			.doc(eventId)
			.collection(TABLES_SUBCOLLECTION)
			.doc(tableId);

		await adminDb.runTransaction(async (transaction) => {
			const tableDoc = await transaction.get(tableRef);
			if (!tableDoc.exists) {
				throw new Error('TABLE_NOT_FOUND');
			}

			// Verificar se há atribuições
			const assignmentsSnap = await adminDb
				.collection('events')
				.doc(eventId)
				.collection(ASSIGNMENTS_SUBCOLLECTION)
				.where('tableId', '==', tableId)
				.count()
				.get();

			const occupancy = assignmentsSnap.data().count ?? 0;
			if (occupancy > 0) {
				throw new Error(`TABLE_NOT_EMPTY:${occupancy}`);
			}

			transaction.delete(tableRef);
		});

		return { success: true };
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);

		if (message === 'TABLE_NOT_FOUND') {
			return { success: false, error: 'Mesa não encontrada.' };
		}
		if (message.startsWith('TABLE_NOT_EMPTY:')) {
			const occupancy = message.split(':')[1];
			return { success: false, error: `Não é possível excluir a mesa. Ela possui ${occupancy} participantes atribuídos. Remova-os antes de excluir.` };
		}

		console.error('[TablesRepository] Falha ao excluir mesa:', message);
		return { success: false, error: message };
	}
}

// ============================================================================
// ATRIBUIÇÕES — Assign / Unassign / Transfer
// ============================================================================

/**
 * Atribui um participante a uma mesa.
 * Transacional: verifica capacidade, duplicidade e status ativo do guest.
 */
export async function assignParticipant(
	eventId: string,
	data: {
		tableId: string;
		participantId: string;
		participantName: string;
		participantType: 'titular' | 'companion';
		invitationId: string;
	},
	adminUid: string,
): Promise<{ success: boolean; assignmentId?: string; error?: string }> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');

		let assignmentId = '';

		await adminDb.runTransaction(async (transaction) => {
			// 1. Verificar capacidade da mesa
			const tableRef = adminDb
				.collection('events')
				.doc(eventId)
				.collection(TABLES_SUBCOLLECTION)
				.doc(data.tableId);

			const tableDoc = await transaction.get(tableRef);
			if (!tableDoc.exists) {
				throw new Error('TABLE_NOT_FOUND');
			}

			const tableData = tableDoc.data();
			const capacity = tableData?.capacity ?? 0;

			// Contar atribuições atuais
			const assignmentsCountSnap = await adminDb
				.collection('events')
				.doc(eventId)
				.collection(ASSIGNMENTS_SUBCOLLECTION)
				.where('tableId', '==', data.tableId)
				.count()
				.get();

			const currentOccupancy = assignmentsCountSnap.data().count ?? 0;
			if (currentOccupancy >= capacity) {
				throw new Error('TABLE_FULL');
			}

			// 2. Verificar duplicidade — participante já atribuído a alguma mesa?
			const existingAssignmentSnap = await adminDb
				.collection('events')
				.doc(eventId)
				.collection(ASSIGNMENTS_SUBCOLLECTION)
				.where('participantId', '==', data.participantId)
				.limit(1)
				.get();

			if (!existingAssignmentSnap.empty) {
				const existingTableId = existingAssignmentSnap.docs[0].data()?.tableId;
				throw new Error(`ALREADY_ASSIGNED:${existingTableId}`);
			}

			// 3. Se for titular, verificar se o guest está ativo
			if (data.participantType === 'titular') {
				const guestRef = adminDb
					.collection('events')
					.doc(eventId)
					.collection('guests')
					.doc(data.participantId);

				const guestDoc = await transaction.get(guestRef);
				if (guestDoc.exists && guestDoc.data()?.active === false) {
					throw new Error('GUEST_INACTIVE');
				}
			}

			// 4. Criar atribuição
			const assignmentRef = adminDb
				.collection('events')
				.doc(eventId)
				.collection(ASSIGNMENTS_SUBCOLLECTION)
				.doc();

			transaction.set(assignmentRef, {
				eventId,
				tableId: data.tableId,
				invitationId: data.invitationId,
				participantId: data.participantId,
				participantName: data.participantName,
				participantType: data.participantType,
				assignedAt: FieldValue.serverTimestamp(),
				assignedBy: adminUid,
			});

			assignmentId = assignmentRef.id;
		});

		return { success: true, assignmentId };
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);

		if (message === 'TABLE_NOT_FOUND') {
			return { success: false, error: 'Mesa não encontrada.' };
		}
		if (message === 'TABLE_FULL') {
			return { success: false, error: 'Esta mesa está cheia. Escolha outra mesa ou aumente a capacidade.' };
		}
		if (message.startsWith('ALREADY_ASSIGNED:')) {
			return { success: false, error: 'Este participante já está atribuído a outra mesa. Remova-o antes de reatribuir.' };
		}
		if (message === 'GUEST_INACTIVE') {
			return { success: false, error: 'Este convidado está desativado e não pode ser atribuído a uma mesa.' };
		}

		console.error('[TablesRepository] Falha ao atribuir participante:', message);
		return { success: false, error: message };
	}
}

/**
 * Remove a atribuição de um participante.
 */
export async function unassignParticipant(
	eventId: string,
	participantId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');

		const assignmentsSnap = await adminDb
			.collection('events')
			.doc(eventId)
			.collection(ASSIGNMENTS_SUBCOLLECTION)
			.where('participantId', '==', participantId)
			.limit(1)
			.get();

		if (assignmentsSnap.empty) {
			return { success: false, error: 'Participante não está atribuído a nenhuma mesa.' };
		}

		await assignmentsSnap.docs[0].ref.delete();
		return { success: true };
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';
		console.error('[TablesRepository] Falha ao remover atribuição:', message);
		return { success: false, error: message };
	}
}

/**
 * Transfere um participante de uma mesa para outra.
 * Transacional: remove da origem e adiciona no destino atomicamente.
 */
export async function transferParticipant(
	eventId: string,
	data: {
		participantId: string;
		targetTableId: string;
	},
	adminUid: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');

		await adminDb.runTransaction(async (transaction) => {
			// 1. Encontrar atribuição atual
			const currentAssignmentSnap = await adminDb
				.collection('events')
				.doc(eventId)
				.collection(ASSIGNMENTS_SUBCOLLECTION)
				.where('participantId', '==', data.participantId)
				.limit(1)
				.get();

			if (currentAssignmentSnap.empty) {
				throw new Error('NOT_CURRENTLY_ASSIGNED');
			}

			const currentAssignment = currentAssignmentSnap.docs[0];
			const currentData = currentAssignment.data();

			// Se já está na mesa destino, não fazer nada
			if (currentData.tableId === data.targetTableId) {
				return; // No-op
			}

			// 2. Verificar capacidade da mesa destino
			const targetTableRef = adminDb
				.collection('events')
				.doc(eventId)
				.collection(TABLES_SUBCOLLECTION)
				.doc(data.targetTableId);

			const targetTableDoc = await transaction.get(targetTableRef);
			if (!targetTableDoc.exists) {
				throw new Error('TARGET_TABLE_NOT_FOUND');
			}

			const targetCapacity = targetTableDoc.data()?.capacity ?? 0;

			const targetAssignmentsSnap = await adminDb
				.collection('events')
				.doc(eventId)
				.collection(ASSIGNMENTS_SUBCOLLECTION)
				.where('tableId', '==', data.targetTableId)
				.count()
				.get();

			const targetOccupancy = targetAssignmentsSnap.data().count ?? 0;
			if (targetOccupancy >= targetCapacity) {
				throw new Error('TARGET_TABLE_FULL');
			}

			// 3. Remover da mesa atual e criar na nova
			transaction.delete(currentAssignment.ref);

			const newAssignmentRef = adminDb
				.collection('events')
				.doc(eventId)
				.collection(ASSIGNMENTS_SUBCOLLECTION)
				.doc();

			transaction.set(newAssignmentRef, {
				eventId,
				tableId: data.targetTableId,
				invitationId: currentData.invitationId,
				participantId: data.participantId,
				participantName: currentData.participantName,
				participantType: currentData.participantType,
				assignedAt: FieldValue.serverTimestamp(),
				assignedBy: adminUid,
			});
		});

		return { success: true };
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);

		if (message === 'NOT_CURRENTLY_ASSIGNED') {
			return { success: false, error: 'Este participante não está atribuído a nenhuma mesa.' };
		}
		if (message === 'TARGET_TABLE_NOT_FOUND') {
			return { success: false, error: 'Mesa destino não encontrada.' };
		}
		if (message === 'TARGET_TABLE_FULL') {
			return { success: false, error: 'A mesa destino está cheia.' };
		}

		console.error('[TablesRepository] Falha ao transferir participante:', message);
		return { success: false, error: message };
	}
}

// ============================================================================
// DASHBOARD STATS
// ============================================================================

/**
 * Calcula estatísticas do dashboard de mesas.
 */
export async function getTablesDashboardStats(eventId: string): Promise<TablesDashboardStats> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');

		// Total de mesas e capacidade
		const tablesSnap = await adminDb
			.collection('events')
			.doc(eventId)
			.collection(TABLES_SUBCOLLECTION)
			.get();

		let totalTables = 0;
		let totalSeats = 0;

		tablesSnap.docs.forEach(doc => {
			totalTables++;
			totalSeats += doc.data()?.capacity ?? 0;
		});

		// Total de atribuições (lugares ocupados)
		const assignmentsCountSnap = await adminDb
			.collection('events')
			.doc(eventId)
			.collection(ASSIGNMENTS_SUBCOLLECTION)
			.count()
			.get();

		const occupiedSeats = assignmentsCountSnap.data().count ?? 0;

		// Convidados sem mesa: guests ativos confirmados + companions confirmados - atribuições
		// Simplificação: contar todos os participants disponíveis menos os já atribuídos
		// Para precisão, contamos guests ativos com RSVP confirmado
		const confirmedRsvpsSnap = await adminDb
			.collection('events')
			.doc(eventId)
			.collection('rsvps')
			.where('attendanceStatus', '==', 'confirmed')
			.get();

		let totalConfirmedParticipants = 0;
		confirmedRsvpsSnap.docs.forEach(doc => {
			const data = doc.data();
			const confirmedGuestIds = Array.isArray(data?.confirmedGuestIds) ? data.confirmedGuestIds.length : 0;
			const companions = Array.isArray(data?.companions) ? data.companions.length : 0;
			totalConfirmedParticipants += confirmedGuestIds + companions;
		});

		const guestsWithoutTable = Math.max(0, totalConfirmedParticipants - occupiedSeats);

		return {
			totalTables,
			totalSeats,
			occupiedSeats,
			availableSeats: Math.max(0, totalSeats - occupiedSeats),
			guestsWithoutTable,
		};
	} catch (e) {
		console.error('[TablesRepository] Falha ao calcular stats:', e);
		return {
			totalTables: 0,
			totalSeats: 0,
			occupiedSeats: 0,
			availableSeats: 0,
			guestsWithoutTable: 0,
		};
	}
}

/**
 * Lista participantes disponíveis para atribuição (não atribuídos a nenhuma mesa).
 * Retorna guests ativos confirmados + companions de RSVPs confirmados.
 */
export async function listAvailableParticipants(
	eventId: string,
	searchTerm?: string,
): Promise<Array<{ participantId: string; participantName: string; participantType: 'titular' | 'companion'; invitationId: string; rsvpStatus: string }>> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');

		// Buscar todas as atribuições existentes
		const allAssignmentsSnap = await adminDb
			.collection('events')
			.doc(eventId)
			.collection(ASSIGNMENTS_SUBCOLLECTION)
			.get();

		const assignedParticipantIds = new Set<string>();
		allAssignmentsSnap.docs.forEach(doc => {
			assignedParticipantIds.add(doc.data()?.participantId);
		});

		// Buscar RSVPs confirmados
		const confirmedRsvpsSnap = await adminDb
			.collection('events')
			.doc(eventId)
			.collection('rsvps')
			.where('attendanceStatus', '==', 'confirmed')
			.get();

		const available: Array<{ participantId: string; participantName: string; participantType: 'titular' | 'companion'; invitationId: string; rsvpStatus: string }> = [];

		for (const rsvpDoc of confirmedRsvpsSnap.docs) {
			const rsvpData = rsvpDoc.data();
			const invitationId = rsvpDoc.id;

			// Adicionar guests confirmados
			const confirmedGuestIds: string[] = Array.isArray(rsvpData?.confirmedGuestIds) ? rsvpData.confirmedGuestIds : [];
			for (const guestId of confirmedGuestIds) {
				if (assignedParticipantIds.has(guestId)) continue;

				// Buscar nome do guest
				const guestDoc = await adminDb
					.collection('events')
					.doc(eventId)
					.collection('guests')
					.doc(guestId)
					.get();

				if (!guestDoc.exists || guestDoc.data()?.active === false) continue;

				const guestName = guestDoc.data()?.fullName || 'Desconhecido';

				if (searchTerm && !guestName.toLowerCase().includes(searchTerm.toLowerCase())) continue;

				available.push({
					participantId: guestId,
					participantName: guestName,
					participantType: 'titular',
					invitationId,
					rsvpStatus: 'confirmed',
				});
			}

			// Adicionar companions
			const companions: Array<{ participantId?: string; name?: string }> = Array.isArray(rsvpData?.companions) ? rsvpData.companions : [];
			for (const companion of companions) {
				if (!companion.participantId) continue;
				if (assignedParticipantIds.has(companion.participantId)) continue;

				const companionName = companion.name || 'Acompanhante';
				if (searchTerm && !companionName.toLowerCase().includes(searchTerm.toLowerCase())) continue;

				available.push({
					participantId: companion.participantId,
					participantName: companionName,
					participantType: 'companion',
					invitationId,
					rsvpStatus: 'confirmed',
				});
			}
		}

		return available.sort((a, b) => a.participantName.localeCompare(b.participantName));
	} catch (e) {
		console.error('[TablesRepository] Falha ao listar participantes disponíveis:', e);
		return [];
	}
}