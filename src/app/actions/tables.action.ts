'use server';

/**
 * Server Actions — Organização de Mesas
 *
 * CRUD de mesas e atribuições de participantes.
 * Todas as operações validam sessão administrativa e usam transações
 * para garantir consistência de capacidade e unicidade de atribuição.
 */

import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/lib/auth/admin-session';
import type { ApiResponse } from '@/types';
import { z } from 'zod';

// ============================================================================
// SCHEMAS
// ============================================================================

const createTableSchema = z.object({
	name: z.string().min(1, 'Nome da mesa é obrigatório').max(100),
	capacity: z.number().int().positive('Capacidade deve ser maior que zero').max(500),
});

const updateTableSchema = z.object({
	tableId: z.string().min(1),
	name: z.string().min(1).max(100).optional(),
	capacity: z.number().int().positive().max(500).optional(),
});

const deleteTableSchema = z.object({
	tableId: z.string().min(1),
});

const assignParticipantSchema = z.object({
	tableId: z.string().min(1),
	participantId: z.string().min(1),
	participantName: z.string().min(1),
	participantType: z.enum(['titular', 'companion']),
	invitationId: z.string().min(1),
});

const unassignParticipantSchema = z.object({
	participantId: z.string().min(1),
});

const transferParticipantSchema = z.object({
	participantId: z.string().min(1),
	targetTableId: z.string().min(1),
});

// ============================================================================
// MESAS — CRUD
// ============================================================================

export async function createTableAction(
	formData: Record<string, unknown>,
): Promise<ApiResponse<{ tableId: string }>> {
	let session;
	try {
		session = await requireAdminSession();
	} catch {
		return { success: false, error: 'Sessão administrativa inválida ou expirada.' };
	}

	const validation = createTableSchema.safeParse(formData);
	if (!validation.success) {
		return {
			success: false,
			error: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
		};
	}

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

	try {
		const { createTable } = await import('@/lib/repositories/tables.repository');
		const result = await createTable(eventId, validation.data, session.uid);

		if (!result.success) {
			return { success: false, error: result.error };
		}

		// Audit log
		const { adminDb } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');
		await adminDb.collection('events').doc(eventId).collection('auditLogs').add({
			eventId,
			action: 'table.created',
			actorId: session.uid,
			targetId: result.tableId,
			targetType: 'table',
			timestamp: FieldValue.serverTimestamp(),
			metadata: { name: validation.data.name, capacity: validation.data.capacity },
		});

		revalidatePath('/admin/mesas');

		return { success: true, data: { tableId: result.tableId! }, message: 'Mesa criada com sucesso.' };
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';
		console.error('[TablesAction] Falha ao criar mesa:', message);
		return { success: false, error: `Falha ao criar mesa: ${message}` };
	}
}

export async function updateTableAction(
	formData: Record<string, unknown>,
): Promise<ApiResponse> {
	let session;
	try {
		session = await requireAdminSession();
	} catch {
		return { success: false, error: 'Sessão administrativa inválida ou expirada.' };
	}

	const validation = updateTableSchema.safeParse(formData);
	if (!validation.success) {
		return {
			success: false,
			error: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
		};
	}

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

	try {
		const { updateTable } = await import('@/lib/repositories/tables.repository');
		const result = await updateTable(eventId, validation.data.tableId, {
			name: validation.data.name,
			capacity: validation.data.capacity,
		});

		if (!result.success) {
			return { success: false, error: result.error };
		}

		// Audit log
		const { adminDb } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');
		await adminDb.collection('events').doc(eventId).collection('auditLogs').add({
			eventId,
			action: 'table.updated',
			actorId: session.uid,
			targetId: validation.data.tableId,
			targetType: 'table',
			timestamp: FieldValue.serverTimestamp(),
			metadata: { name: validation.data.name, capacity: validation.data.capacity },
		});

		revalidatePath('/admin/mesas');

		return { success: true, message: 'Mesa atualizada com sucesso.' };
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';
		console.error('[TablesAction] Falha ao atualizar mesa:', message);
		return { success: false, error: `Falha ao atualizar mesa: ${message}` };
	}
}

export async function deleteTableAction(
	formData: Record<string, unknown>,
): Promise<ApiResponse> {
	let session;
	try {
		session = await requireAdminSession();
	} catch {
		return { success: false, error: 'Sessão administrativa inválida ou expirada.' };
	}

	const validation = deleteTableSchema.safeParse(formData);
	if (!validation.success) {
		return {
			success: false,
			error: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
		};
	}

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

	try {
		const { deleteTable } = await import('@/lib/repositories/tables.repository');
		const result = await deleteTable(eventId, validation.data.tableId);

		if (!result.success) {
			return { success: false, error: result.error };
		}

		// Audit log
		const { adminDb } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');
		await adminDb.collection('events').doc(eventId).collection('auditLogs').add({
			eventId,
			action: 'table.deleted',
			actorId: session.uid,
			targetId: validation.data.tableId,
			targetType: 'table',
			timestamp: FieldValue.serverTimestamp(),
			metadata: {},
		});

		revalidatePath('/admin/mesas');

		return { success: true, message: 'Mesa excluída com sucesso.' };
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';
		console.error('[TablesAction] Falha ao excluir mesa:', message);
		return { success: false, error: `Falha ao excluir mesa: ${message}` };
	}
}

// ============================================================================
// ATRIBUIÇÕES
// ============================================================================

export async function assignParticipantAction(
	formData: Record<string, unknown>,
): Promise<ApiResponse<{ assignmentId: string }>> {
	let session;
	try {
		session = await requireAdminSession();
	} catch {
		return { success: false, error: 'Sessão administrativa inválida ou expirada.' };
	}

	const validation = assignParticipantSchema.safeParse(formData);
	if (!validation.success) {
		return {
			success: false,
			error: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
		};
	}

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

	try {
		const { assignParticipant } = await import('@/lib/repositories/tables.repository');
		const result = await assignParticipant(eventId, validation.data, session.uid);

		if (!result.success) {
			return { success: false, error: result.error };
		}

		// Audit log
		const { adminDb } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');
		await adminDb.collection('events').doc(eventId).collection('auditLogs').add({
			eventId,
			action: 'table.assignment.created',
			actorId: session.uid,
			targetId: result.assignmentId,
			targetType: 'tableAssignment',
			timestamp: FieldValue.serverTimestamp(),
			metadata: {
				tableId: validation.data.tableId,
				participantId: validation.data.participantId,
				participantName: validation.data.participantName,
				participantType: validation.data.participantType,
				invitationId: validation.data.invitationId,
			},
		});

		revalidatePath('/admin/mesas');

		return { success: true, data: { assignmentId: result.assignmentId! }, message: 'Participante atribuído com sucesso.' };
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';
		console.error('[TablesAction] Falha ao atribuir participante:', message);
		return { success: false, error: `Falha ao atribuir participante: ${message}` };
	}
}

export async function unassignParticipantAction(
	formData: Record<string, unknown>,
): Promise<ApiResponse> {
	let session;
	try {
		session = await requireAdminSession();
	} catch {
		return { success: false, error: 'Sessão administrativa inválida ou expirada.' };
	}

	const validation = unassignParticipantSchema.safeParse(formData);
	if (!validation.success) {
		return {
			success: false,
			error: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
		};
	}

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

	try {
		const { unassignParticipant } = await import('@/lib/repositories/tables.repository');
		const result = await unassignParticipant(eventId, validation.data.participantId);

		if (!result.success) {
			return { success: false, error: result.error };
		}

		// Audit log
		const { adminDb } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');
		await adminDb.collection('events').doc(eventId).collection('auditLogs').add({
			eventId,
			action: 'table.assignment.removed',
			actorId: session.uid,
			targetId: validation.data.participantId,
			targetType: 'tableAssignment',
			timestamp: FieldValue.serverTimestamp(),
			metadata: { participantId: validation.data.participantId },
		});

		revalidatePath('/admin/mesas');

		return { success: true, message: 'Participante removido da mesa.' };
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';
		console.error('[TablesAction] Falha ao remover atribuição:', message);
		return { success: false, error: `Falha ao remover atribuição: ${message}` };
	}
}

const assignGroupSchema = z.object({
	tableId: z.string().min(1),
	participants: z.array(z.object({
 participantId: z.string().min(1),
 participantName: z.string().min(1),
 participantType: z.enum(['titular', 'companion']),
 invitationId: z.string().min(1),
	})).min(1, 'Selecione pelo menos um participante.'),
});

/**
 * Atribui múltiplos participantes de uma vez em transação atômica.
 * Valida capacidade total, duplicidade e status ativo de cada titular.
 * Se qualquer validação falhar, nenhuma atribuição do grupo é concluída.
 */
export async function assignGroupAction(
	formData: Record<string, unknown>,
): Promise<ApiResponse<{ assignedCount: number }>> {
	let session;
	try {
 session = await requireAdminSession();
	} catch {
 return { success: false, error: 'Sessão administrativa inválida ou expirada.' };
	}

	const validation = assignGroupSchema.safeParse(formData);
	if (!validation.success) {
 return {
 success: false,
 error: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
 };
	}

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

	try {
 const { adminDb } = await import('@/lib/firebase/admin');
 const { FieldValue } = await import('firebase-admin/firestore');

 let assignedCount = 0;

 await adminDb.runTransaction(async (transaction) => {
 // 1. Verificar capacidade da mesa
 const tableRef = adminDb
 .collection('events')
 .doc(eventId)
 .collection('tables')
 .doc(validation.data.tableId);

 const tableDoc = await transaction.get(tableRef);
 if (!tableDoc.exists) {
 throw new Error('TABLE_NOT_FOUND');
 }

 const capacity = tableDoc.data()?.capacity ?? 0;

 // Contar atribuições atuais
 const assignmentsCountSnap = await adminDb
 .collection('events')
 .doc(eventId)
 .collection('tableAssignments')
 .where('tableId', '==', validation.data.tableId)
 .count()
 .get();

 const currentOccupancy = assignmentsCountSnap.data().count ?? 0;
 const requestedCount = validation.data.participants.length;

 if (currentOccupancy + requestedCount > capacity) {
 throw new Error(`TABLE_CAPACITY_EXCEEDED:${capacity}:${currentOccupancy}:${requestedCount}`);
 }

 // 2. Validar cada participante
 for (const participant of validation.data.participants) {
 // Verificar duplicidade
 const existingSnap = await adminDb
 .collection('events')
 .doc(eventId)
 .collection('tableAssignments')
 .where('participantId', '==', participant.participantId)
 .limit(1)
 .get();

 if (!existingSnap.empty) {
 throw new Error(`DUPLICATE:${participant.participantName}`);
 }

 // Se titular, verificar se está ativo
 if (participant.participantType === 'titular') {
 const guestRef = adminDb
 .collection('events')
 .doc(eventId)
 .collection('guests')
 .doc(participant.participantId);

 const guestDoc = await transaction.get(guestRef);
 if (guestDoc.exists && guestDoc.data()?.active === false) {
 throw new Error(`GUEST_INACTIVE:${participant.participantName}`);
 }
 }
 }

 // 3. Criar todas as atribuições
 for (const participant of validation.data.participants) {
 const assignmentRef = adminDb
 .collection('events')
 .doc(eventId)
 .collection('tableAssignments')
 .doc();

 transaction.set(assignmentRef, {
 eventId,
 tableId: validation.data.tableId,
 invitationId: participant.invitationId,
 participantId: participant.participantId,
 participantName: participant.participantName,
 participantType: participant.participantType,
 assignedAt: FieldValue.serverTimestamp(),
 assignedBy: session.uid,
 });
 }

 assignedCount = requestedCount;
 });

 // Audit log (fora da transação)
 const { adminDb: db } = await import('@/lib/firebase/admin');
 const { FieldValue: FV } = await import('firebase-admin/firestore');
 await db.collection('events').doc(eventId).collection('auditLogs').add({
 eventId,
 action: 'table.assignment.group_created',
 actorId: session.uid,
 targetId: validation.data.tableId,
 targetType: 'tableAssignment',
 timestamp: FV.serverTimestamp(),
 metadata: {
 tableId: validation.data.tableId,
 assignedCount,
 participants: validation.data.participants.map(p => ({
 participantId: p.participantId,
 participantName: p.participantName,
 participantType: p.participantType,
 })),
 },
 });

 revalidatePath('/admin/mesas');

 return {
 success: true,
 data: { assignedCount },
 message: `${assignedCount} participante(s) atribuído(s) com sucesso.`,
 };
	} catch (e) {
 const message = e instanceof Error ? e.message : String(e);

 if (message === 'TABLE_NOT_FOUND') {
 return { success: false, error: 'Mesa não encontrada.' };
 }
 if (message.startsWith('TABLE_CAPACITY_EXCEEDED:')) {
 const [, cap, occ, req] = message.split(':');
 const available = parseInt(cap, 10) - parseInt(occ, 10);
 return {
 success: false,
 error: `Capacidade insuficiente. Mesa tem ${available} vaga(s) disponível(is), mas ${req} participante(s) foram selecionado(s).`,
 };
 }
 if (message.startsWith('DUPLICATE:')) {
 const name = message.split(':')[1];
 return { success: false, error: `${name} já está atribuído(a) a outra mesa.` };
 }
 if (message.startsWith('GUEST_INACTIVE:')) {
 const name = message.split(':')[1];
 return { success: false, error: `${name} está desativado(a) e não pode ser atribuído(a).` };
 }

 console.error('[TablesAction] Falha ao atribuir grupo:', message);
 return { success: false, error: `Falha ao atribuir grupo: ${message}` };
	}
}

/**
 * Busca os nomes dos titulares originais para uma lista de invitationIds.
 * Usa invitations.guestIds[0] → guests.fullName para identificar o titular real,
 * independente de quem esteja na lista de participantes disponíveis.
 *
 * Retorna um mapa { invitationId: titularName } para convites encontrados.
 */
export async function getInvitationTitularNamesAction(
	formData: Record<string, unknown>,
): Promise<ApiResponse<Record<string, string>>> {
	try {
 await requireAdminSession();
	} catch {
 return { success: false, error: 'Sessão administrativa inválida ou expirada.' };
	}

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';
	const invitationIds = Array.isArray(formData.invitationIds) ? formData.invitationIds as string[] : [];

	if (invitationIds.length === 0) {
 return { success: true, data: {} };
	}

	try {
 const { adminDb } = await import('@/lib/firebase/admin');

 const namesMap: Record<string, string> = {};

 for (const invId of invitationIds) {
 try {
 const invDoc = await adminDb
 .collection('events')
 .doc(eventId)
 .collection('invitations')
 .doc(invId)
 .get();

 if (!invDoc.exists) continue;

 const invData = invDoc.data();
 const guestIds: string[] = Array.isArray(invData?.guestIds) ? invData.guestIds : [];

 if (guestIds.length === 0) continue;

 // O primeiro guestId é o titular original do convite
 const primaryGuestId = guestIds[0];
 const guestDoc = await adminDb
 .collection('events')
 .doc(eventId)
 .collection('guests')
 .doc(primaryGuestId)
 .get();

 if (guestDoc.exists) {
 namesMap[invId] = guestDoc.data()?.fullName || 'Convidado';
 }
 } catch {
 // Ignorar falhas individuais — continuar com os demais
 }
 }

 return { success: true, data: namesMap };
	} catch (e) {
 const message = e instanceof Error ? e.message : 'Erro desconhecido';
 console.error('[TablesAction] Falha ao buscar nomes de titulares:', message);
 return { success: false, error: `Falha ao buscar nomes: ${message}` };
	}
}

/**
 * Recarrega dados completos de mesas e stats do dashboard.
 * Server Action wrapper para uso em Client Components após mutações.
 */
export async function refreshTablesDataAction(): Promise<ApiResponse<{
	tables: unknown[];
	stats: unknown;
}>> {
	try {
		await requireAdminSession();
	} catch {
		return { success: false, error: 'Sessão administrativa inválida ou expirada.' };
	}

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

	try {
		const { listTables, getTablesDashboardStats } = await import('@/lib/repositories/tables.repository');
		const [tables, stats] = await Promise.all([
			listTables(eventId),
			getTablesDashboardStats(eventId),
		]);
		return { success: true, data: { tables, stats } };
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';
		console.error('[TablesAction] Falha ao recarregar dados:', message);
		return { success: false, error: `Falha ao recarregar dados: ${message}` };
	}
}

/**
 * Lista participantes disponíveis para atribuição (não atribuídos a nenhuma mesa).
 * Server Action wrapper para uso em Client Components.
 */
export async function listAvailableParticipantsAction(
	formData: Record<string, unknown>,
): Promise<ApiResponse<Array<{ participantId: string; participantName: string; participantType: 'titular' | 'companion'; invitationId: string }>>> {
	try {
 await requireAdminSession();
	} catch {
 return { success: false, error: 'Sessão administrativa inválida ou expirada.' };
	}

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';
	const searchTerm = typeof formData.searchTerm === 'string' ? formData.searchTerm : undefined;

	try {
 const { listAvailableParticipants } = await import('@/lib/repositories/tables.repository');
 const participants = await listAvailableParticipants(eventId, searchTerm);
 return { success: true, data: participants };
	} catch (e) {
 const message = e instanceof Error ? e.message : 'Erro desconhecido';
 console.error('[TablesAction] Falha ao listar participantes disponíveis:', message);
 return { success: false, error: `Falha ao listar participantes: ${message}` };
	}
}

export async function transferParticipantAction(
	formData: Record<string, unknown>,
): Promise<ApiResponse> {
	let session;
	try {
		session = await requireAdminSession();
	} catch {
		return { success: false, error: 'Sessão administrativa inválida ou expirada.' };
	}

	const validation = transferParticipantSchema.safeParse(formData);
	if (!validation.success) {
		return {
			success: false,
			error: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
		};
	}

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

	try {
		const { transferParticipant } = await import('@/lib/repositories/tables.repository');
		const result = await transferParticipant(eventId, validation.data, session.uid);

		if (!result.success) {
			return { success: false, error: result.error };
		}

		// Audit log
		const { adminDb } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');
		await adminDb.collection('events').doc(eventId).collection('auditLogs').add({
			eventId,
			action: 'table.assignment.transferred',
			actorId: session.uid,
			targetId: validation.data.participantId,
			targetType: 'tableAssignment',
			timestamp: FieldValue.serverTimestamp(),
			metadata: {
				participantId: validation.data.participantId,
				targetTableId: validation.data.targetTableId,
			},
		});

		revalidatePath('/admin/mesas');

		return { success: true, message: 'Participante transferido com sucesso.' };
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';
		console.error('[TablesAction] Falha ao transferir participante:', message);
		return { success: false, error: `Falha ao transferir participante: ${message}` };
	}
}