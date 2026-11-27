/**
 * Repositório de Mesas — CRUD e atribuições de participantes.
 *
 * Todas as operações são server-side via Admin SDK.
 * Usa transações para garantir consistência de capacidade e unicidade de atribuição.
 *
 * SERIALIZAÇÃO: funções de leitura usam serializeFirestoreValue() para converter
 * Timestamps antes de retornar dados para Server/Client Components.
 */

import type { AvailableParticipant, SpecialParticipantCategory, Table, TableAssignment, TableWithOccupancy, TablesDashboardStats } from '@/types';
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
		participantType: 'titular' | 'companion' | 'special';
		invitationId?: string;
		participantSource?: 'rsvp' | 'special';
		specialCategory?: SpecialParticipantCategory;
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
			const assignmentsSnap = await transaction.get(
				adminDb
					.collection('events')
					.doc(eventId)
					.collection(ASSIGNMENTS_SUBCOLLECTION)
					.where('tableId', '==', data.tableId),
			);

			const currentOccupancy = assignmentsSnap.size;
			if (currentOccupancy >= capacity) {
				throw new Error('TABLE_FULL');
			}

			// 2. Verificar duplicidade — participante já atribuído a alguma mesa?
			const existingAssignmentSnap = await transaction.get(
				adminDb
					.collection('events')
					.doc(eventId)
					.collection(ASSIGNMENTS_SUBCOLLECTION)
					.where('participantId', '==', data.participantId)
					.limit(1),
			);

			if (!existingAssignmentSnap.empty) {
				const existingTableId = existingAssignmentSnap.docs[0].data()?.tableId;
				throw new Error(`ALREADY_ASSIGNED:${existingTableId}`);
			}

			// 3. Se for titular RSVP, verificar se o guest está ativo; pular para especiais
			const isSpecial = data.participantSource === 'special';
			if (data.participantType === 'titular' && !isSpecial) {
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

			// Se participante especial, verificar se está ativo
			if (isSpecial) {
				const specialRef = adminDb
					.collection('events')
					.doc(eventId)
					.collection('specialParticipants')
					.doc(data.participantId);

				const specialDoc = await transaction.get(specialRef);
				if (!specialDoc.exists || specialDoc.data()?.active === false) {
					throw new Error('SPECIAL_INACTIVE');
				}
			}

			// 4. Criar atribuição
			const assignmentRef = adminDb
				.collection('events')
				.doc(eventId)
				.collection(ASSIGNMENTS_SUBCOLLECTION)
				.doc();

			const assignmentData: Record<string, unknown> = {
				eventId,
				tableId: data.tableId,
				participantId: data.participantId,
				participantName: data.participantName,
				participantType: data.participantType,
				assignedAt: FieldValue.serverTimestamp(),
				assignedBy: adminUid,
			};

			if (isSpecial) {
				assignmentData.participantSource = 'special';
				assignmentData.specialCategory = data.specialCategory || 'other';
			} else {
				assignmentData.participantSource = 'rsvp';
				assignmentData.invitationId = data.invitationId || '';
			}

			transaction.set(assignmentRef, assignmentData);

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
		if (message === 'SPECIAL_INACTIVE') {
			return { success: false, error: 'Este participante especial está inativo e não pode ser atribuído.' };
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
): Promise<{ success: boolean; removedCount?: number; error?: string }> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');
		let removedCount = 0;

		// Transacional e idempotente: remove TODAS as atribuições da identidade,
		// incluindo duplicatas legadas, sem tocar em qualquer outro documento.
		await adminDb.runTransaction(async (transaction) => {
			const snap = await transaction.get(
				adminDb
					.collection('events')
					.doc(eventId)
					.collection(ASSIGNMENTS_SUBCOLLECTION)
					.where('participantId', '==', participantId),
			);
			for (const doc of snap.docs) {
				transaction.delete(doc.ref);
				removedCount++;
			}
		});

		return { success: true, removedCount };
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
): Promise<{ success: boolean; noop?: boolean; error?: string }> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');

		let noop = false;

		await adminDb.runTransaction(async (transaction) => {
			// 1. Encontrar atribuição atual DENTRO da transação
			const currentAssignmentSnap = await transaction.get(
				adminDb
					.collection('events')
					.doc(eventId)
					.collection(ASSIGNMENTS_SUBCOLLECTION)
					.where('participantId', '==', data.participantId)
					.limit(1),
			);

			if (currentAssignmentSnap.empty) {
				throw new Error('NOT_CURRENTLY_ASSIGNED');
			}

			const currentAssignment = currentAssignmentSnap.docs[0];
			const currentData = currentAssignment.data();

			// Se já está na mesa destino, não fazer nada
			if (currentData.tableId === data.targetTableId) {
				noop = true;
				return; // No-op
			}

			// Revalidar que o participante continua elegível dentro da transação.
			const source = currentData.participantSource === 'special' ? 'special' : 'rsvp';
			if (source === 'special') {
				const specialDoc = await transaction.get(
					adminDb.collection('events').doc(eventId)
						.collection('specialParticipants').doc(data.participantId),
				);
				if (!specialDoc.exists || specialDoc.data()?.active === false) {
					throw new Error('PARTICIPANT_INACTIVE');
				}
			} else if (currentData.participantType === 'titular') {
				const guestDoc = await transaction.get(
					adminDb.collection('events').doc(eventId).collection('guests').doc(data.participantId),
				);
				if (guestDoc.exists && guestDoc.data()?.active === false) {
					throw new Error('PARTICIPANT_INACTIVE');
				}
			} else if (currentData.participantType === 'companion' && currentData.invitationId) {
				const rsvpDoc = await transaction.get(
					adminDb.collection('events').doc(eventId).collection('rsvps').doc(currentData.invitationId),
				);
				const companions = Array.isArray(rsvpDoc.data()?.companions) ? rsvpDoc.data()!.companions : [];
				if (!rsvpDoc.exists || !companions.some((c: { participantId?: string }) => c.participantId === data.participantId)) {
					throw new Error('PARTICIPANT_NOT_FOUND');
				}
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

			const targetAssignmentsSnap = await transaction.get(
				adminDb
					.collection('events')
					.doc(eventId)
					.collection(ASSIGNMENTS_SUBCOLLECTION)
					.where('tableId', '==', data.targetTableId),
			);

			const targetOccupancy = targetAssignmentsSnap.size;
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

			const transferData: Record<string, unknown> = {
				eventId,
				tableId: data.targetTableId,
				participantId: data.participantId,
				participantName: currentData.participantName,
				participantType: currentData.participantType,
				assignedAt: FieldValue.serverTimestamp(),
				assignedBy: adminUid,
			};

			// Preservar origem e categoria do participante especial
			if (currentData.participantSource === 'special') {
				transferData.participantSource = 'special';
				transferData.specialCategory = currentData.specialCategory || 'other';
			} else {
				transferData.participantSource = 'rsvp';
				transferData.invitationId = currentData.invitationId || '';
			}

			transaction.set(newAssignmentRef, transferData);
		});

		return { success: true, noop };
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
		if (message === 'PARTICIPANT_INACTIVE') {
			return { success: false, error: 'Este participante está inativo e não pode ser transferido.' };
		}
		if (message === 'PARTICIPANT_NOT_FOUND') {
			return { success: false, error: 'Participante não encontrado na confirmação de presença.' };
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

		// Contagens derivadas da fonte única de verdade (mesma regra do modal).
		const { getParticipantCounts } = await import('@/lib/tables/participant-directory');
		const counts = await getParticipantCounts(eventId);
		const guestsWithoutTable = counts.participantsWithoutTable;

		return {
			totalTables,
			totalSeats,
			occupiedSeats,
			availableSeats: Math.max(0, totalSeats - occupiedSeats),
			guestsWithoutTable,
			eligibleParticipants: counts.eligibleParticipants,
			participantsWithTable: counts.participantsWithTable,
			participantsWithoutTable: counts.participantsWithoutTable,
			orphanAssignments: counts.orphanAssignments,
			duplicateAssignments: counts.duplicateAssignments,
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
 * Busca atribuições de mesa para uma lista de participantIds (leitura apenas).
 * Retorna um mapa { participantId → { tableId, tableName } }.
 * Usado pelo fluxo de check-in do validador para exibir a mesa de cada participante.
 * Não realiza escritas no Firestore.
 */
export async function getTableAssignmentsByParticipantIds(
	eventId: string,
	participantIds: string[],
): Promise<Map<string, { tableId: string; tableName: string }>> {
	const result = new Map<string, { tableId: string; tableName: string }>();

	if (participantIds.length === 0) return result;

	try {
 const { adminDb } = await import('@/lib/firebase/admin');

 // Buscar todas as atribuições dos participantes informados
 // Firestore não suporta 'in' com mais de 30 valores; dividir em lotes se necessário
 const batchSize = 30;
 const assignmentDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];

 for (let i = 0; i < participantIds.length; i += batchSize) {
 const batch = participantIds.slice(i, i + batchSize);
 const snap = await adminDb
 .collection('events')
 .doc(eventId)
 .collection(ASSIGNMENTS_SUBCOLLECTION)
 .where('participantId', 'in', batch)
 .get();
 assignmentDocs.push(...snap.docs);
 }

 if (assignmentDocs.length === 0) return result;

 // Coletar tableIds únicos para batch lookup de nomes
 const tableIds = new Set<string>();
 const pidToTableId = new Map<string, string>();

 // Em caso de duplicatas legadas, a atribuição mais recente prevalece.
 const timeOf = (doc: FirebaseFirestore.QueryDocumentSnapshot) => {
 const value = doc.data()?.assignedAt;
 if (value && typeof value.toMillis === 'function') return value.toMillis();
 if (value instanceof Date) return value.getTime();
 return 0;
 };
 const ordered = [...assignmentDocs].sort((a, b) => timeOf(b) - timeOf(a));

 for (const doc of ordered) {
 const data = doc.data();
 const pid = data?.participantId as string;
 const tid = data?.tableId as string;
 if (pid && tid && !pidToTableId.has(pid)) {
 pidToTableId.set(pid, tid);
 tableIds.add(tid);
 }
 }

 // Batch lookup de nomes das mesas
 const tableNameMap = new Map<string, string>();
 const tableIdArray = Array.from(tableIds);

 for (let i = 0; i < tableIdArray.length; i += batchSize) {
 const batch = tableIdArray.slice(i, i + batchSize);
 const tablesSnap = await adminDb
 .collection('events')
 .doc(eventId)
 .collection(TABLES_SUBCOLLECTION)
 .where('__name__', 'in', batch)
 .get();

 for (const tDoc of tablesSnap.docs) {
 tableNameMap.set(tDoc.id, tDoc.data()?.name || 'Mesa');
 }
 }

 // Montar resultado
 for (const [pid, tid] of pidToTableId) {
 result.set(pid, {
 tableId: tid,
 tableName: tableNameMap.get(tid) || 'Mesa',
 });
 }

 return result;
	} catch (e) {
 console.error('[TablesRepository] Falha ao buscar atribuições por participantIds:', e);
 return result;
	}
}

/**
 * Lista participantes disponíveis para atribuição.
 *
 * OPERAÇÃO EXCLUSIVAMENTE DE LEITURA — delega ao diretório central de
 * participantes, que define elegibilidade e disponibilidade por participantId.
 * Nenhuma escrita e nenhuma geração de UUID durante a consulta.
 */
export async function listAvailableParticipants(
	eventId: string,
	searchTerm?: string,
): Promise<AvailableParticipant[]> {
	const { listAvailableParticipants: resolve } = await import('@/lib/tables/participant-directory');
	return resolve(eventId, searchTerm);
}
