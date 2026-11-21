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