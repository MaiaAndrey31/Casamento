/**
 * Repositório de Mesas — CRUD e atribuições de participantes.
 *
 * Todas as operações são server-side via Admin SDK.
 * Usa transações para garantir consistência de capacidade e unicidade de atribuição.
 *
 * SERIALIZAÇÃO: funções de leitura usam serializeFirestoreValue() para converter
 * Timestamps antes de retornar dados para Server/Client Components.
 */

import type { SpecialParticipantCategory, Table, TableAssignment, TableWithOccupancy, TablesDashboardStats } from '@/types';
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

			// 3. Se for titular RSVP, verificar se o guest está ativo; pular para especiais
			const isSpecial = (data as Record<string, unknown>).participantSource === 'special';
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
				assignmentData.specialCategory = (data as Record<string, unknown>).specialCategory || 'other';
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

		// Buscar convites ativos para filtrar RSVPs de convites revogados/expirados
		const activeInvitationsSnap = await adminDb
			.collection('events')
			.doc(eventId)
			.collection('invitations')
			.where('invitationStatus', '==', 'active')
			.get();

		const activeInvitationIds = new Set<string>();
		activeInvitationsSnap.docs.forEach(doc => {
			activeInvitationIds.add(doc.id);
		});

		// Convidados sem mesa: titulares ativos (via invitations.guestIds) + companions confirmados - atribuições
		const confirmedRsvpsSnap = await adminDb
			.collection('events')
			.doc(eventId)
			.collection('rsvps')
			.where('attendanceStatus', '==', 'confirmed')
			.get();

		// Contar participantes elegíveis usando invitations.guestIds como fonte canônica
		// de titulares (confirmedGuestIds do RSVP está sempre vazio).
		// Filtrar convites revogados e guests inativos para consistência com listAvailableParticipants.
		let totalConfirmedParticipants = 0;

		for (const rsvpDoc of confirmedRsvpsSnap.docs) {
			const invitationId = rsvpDoc.id;

			// Ignorar RSVPs de convites revogados/expirados
			if (!activeInvitationIds.has(invitationId)) continue;

			// Buscar guests do convite via invitations.guestIds (fonte canônica de titulares)
			const invDoc = await adminDb
				.collection('events')
				.doc(eventId)
				.collection('invitations')
				.doc(invitationId)
				.get();

			const invData = invDoc.exists ? invDoc.data() : null;
			const guestIds: string[] = Array.isArray(invData?.guestIds) ? invData.guestIds : [];

			// Contar apenas guests ativos
			let activeTitularCount = 0;
			for (const guestId of guestIds) {
				const guestDoc = await adminDb
					.collection('events')
					.doc(eventId)
					.collection('guests')
					.doc(guestId)
					.get();
				if (guestDoc.exists && guestDoc.data()?.active !== false) {
					activeTitularCount++;
				}
			}

			// Contar companions confirmados
			const rsvpData = rsvpDoc.data();
			const companions = Array.isArray(rsvpData?.companions) ? rsvpData.companions.length : 0;

			totalConfirmedParticipants += activeTitularCount + companions;
		}

		// Contar participantes especiais ativos
		const specialParticipantsSnap = await adminDb
			.collection('events')
			.doc(eventId)
			.collection('specialParticipants')
			.where('active', '==', true)
			.count()
			.get();

		const activeSpecialCount = specialParticipantsSnap.data().count ?? 0;

		const totalEligibleParticipants = totalConfirmedParticipants + activeSpecialCount;
		const guestsWithoutTable = Math.max(0, totalEligibleParticipants - occupiedSeats);

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

 for (const doc of assignmentDocs) {
 const data = doc.data();
 const pid = data?.participantId as string;
 const tid = data?.tableId as string;
 if (pid && tid) {
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
 * Normaliza string para busca: minúsculas, sem acentos, trim.
 */
function normalizeSearch(value: string): string {
	return value
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.trim();
}

/**
 * Lista participantes disponíveis para atribuição (não atribuídos a nenhuma mesa).
 * Retorna guests ativos confirmados + companions de RSVPs confirmados.
 *
 * IMPORTANTE: Companions sem participantId persistente recebem um UUID gerado
 * via ensureCompanionIds() e são persistidos de volta no RSVP para garantir
 * consistência futura. Isso alinha os critérios com getTablesDashboardStats.
 *
 * Também filtra convites revogados/expirados para consistência com o dashboard.
 */
export async function listAvailableParticipants(
	eventId: string,
	searchTerm?: string,
): Promise<Array<{ participantId: string; participantName: string; participantType: 'titular' | 'companion' | 'special'; invitationId: string; rsvpStatus: string; alreadyAssigned?: boolean; participantSource?: 'rsvp' | 'special'; specialCategory?: SpecialParticipantCategory }>> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');
		const { ensureCompanionIds } = await import('@/lib/checkin/participant-ids');

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

		// Buscar convites ativos para filtrar RSVPs de convites revogados
		const activeInvitationsSnap = await adminDb
			.collection('events')
			.doc(eventId)
			.collection('invitations')
			.where('invitationStatus', '==', 'active')
			.get();

		const activeInvitationIds = new Set<string>();
		activeInvitationsSnap.docs.forEach(doc => {
			activeInvitationIds.add(doc.id);
		});

		// Buscar RSVPs confirmados
		const confirmedRsvpsSnap = await adminDb
			.collection('events')
			.doc(eventId)
			.collection('rsvps')
			.where('attendanceStatus', '==', 'confirmed')
			.get();

		const available: Array<{ participantId: string; participantName: string; participantType: 'titular' | 'companion'; invitationId: string; rsvpStatus: string; alreadyAssigned?: boolean }> = [];
		const normalizedSearch = searchTerm ? normalizeSearch(searchTerm) : '';

		for (const rsvpDoc of confirmedRsvpsSnap.docs) {
			const invitationId = rsvpDoc.id;

			// Ignorar RSVPs de convites revogados/expirados
			if (!activeInvitationIds.has(invitationId)) continue;

			const rsvpData = rsvpDoc.data();

			// IDENTIFICAÇÃO DO TITULAR: usar invitations.guestIds[0] como fonte canônica.
			// confirmedGuestIds do RSVP está SEMPRE vazio (submitRsvpAction passa []),
			// então NÃO pode ser usado como fonte de titulares.
			// guestIds[0] é o titular original cadastrado pelo administrador.
			const invDoc = await adminDb
				.collection('events')
				.doc(eventId)
				.collection('invitations')
				.doc(invitationId)
				.get();

			const invData = invDoc.exists ? invDoc.data() : null;
			const guestIds: string[] = Array.isArray(invData?.guestIds) ? invData.guestIds : [];

			// Adicionar todos os guests do convite como titulares potenciais
			// (incluindo já atribuídos, para manter o nome no cabeçalho do grupo)
			for (const guestId of guestIds) {
				const isAlreadyAssigned = assignedParticipantIds.has(guestId);

				const guestDoc = await adminDb
					.collection('events')
					.doc(eventId)
					.collection('guests')
					.doc(guestId)
					.get();

				if (!guestDoc.exists || guestDoc.data()?.active === false) continue;

				const guestName = guestDoc.data()?.fullName || 'Desconhecido';

				if (normalizedSearch && !normalizeSearch(guestName).includes(normalizedSearch)) continue;

				available.push({
					participantId: guestId,
					participantName: guestName,
					participantType: 'titular',
					invitationId,
					rsvpStatus: 'confirmed',
					alreadyAssigned: isAlreadyAssigned,
				});
			}

			// Adicionar companions — gerar participantId persistente se necessário
			const rawCompanions: Array<{ participantId?: string; name?: string; isMinor?: boolean; age?: number }> =
				Array.isArray(rsvpData?.companions) ? rsvpData.companions : [];

			// ensureCompanionIds gera UUIDs para companions sem participantId
			const companionsWithIds = ensureCompanionIds(
				rawCompanions.map(c => ({
					name: c.name || 'Acompanhante',
					isMinor: Boolean(c.isMinor),
					age: c.age,
					participantId: c.participantId,
				})),
			);

			// IMPORTANTE: listAvailableParticipants é uma operação de LEITURA.
			// Companions sem participantId recebem UUIDs em memória apenas para
			// permitir a atribuição. A persistência dos IDs deve ser feita por
			// um procedimento explícito e separado (não automático na listagem).
			// Os UUIDs gerados aqui são estáveis dentro da mesma chamada, mas
			// NÃO são persistidos automaticamente no Firestore.

			for (const companion of companionsWithIds) {
				if (assignedParticipantIds.has(companion.participantId)) continue;

				const companionName = companion.name || 'Acompanhante';
				if (normalizedSearch && !normalizeSearch(companionName).includes(normalizedSearch)) continue;

				available.push({
					participantId: companion.participantId,
					participantName: companionName,
					participantType: 'companion',
					invitationId,
					rsvpStatus: 'confirmed',
				});
			}
		}

		// Integrar participantes especiais ativos na lista de disponíveis
		const { listAvailableSpecialParticipants } = await import('@/lib/repositories/special-participants.repository');
		const specialParticipants = await listAvailableSpecialParticipants(eventId, searchTerm);

		// Unir listas: RSVP confirmados + participantes especiais
		const combined = [
			...available,
			...specialParticipants.map(sp => ({
				participantId: sp.participantId,
				participantName: sp.participantName,
				participantType: sp.participantType as 'titular' | 'companion' | 'special',
				invitationId: sp.invitationId,
				rsvpStatus: sp.rsvpStatus,
				alreadyAssigned: sp.alreadyAssigned,
				participantSource: sp.participantSource,
				specialCategory: sp.specialCategory,
			})),
		];

		return combined.sort((a, b) => normalizeSearch(a.participantName).localeCompare(normalizeSearch(b.participantName)));
	} catch (e) {
		console.error('[TablesRepository] Falha ao listar participantes disponíveis:', e);
		return [];
	}
}