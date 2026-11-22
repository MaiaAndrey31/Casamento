'use server';

/**
 * Server Actions — Participantes Especiais (Noivos, Filhos, Familiares)
 *
 * CRUD administrativo vinculado ao evento.
 * Todas as operações validam sessão administrativa.
 */

import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/lib/auth/admin-session';
import type { ApiResponse, SpecialParticipantCategory } from '@/types';
import { z } from 'zod';

// ============================================================================
// SCHEMAS
// ============================================================================

const createSpecialParticipantSchema = z.object({
	fullName: z.string().min(1, 'Nome é obrigatório').max(200),
	category: z.enum(['groom', 'bride', 'child', 'family', 'other']),
	notes: z.string().max(500).optional(),
	active: z.boolean().optional(),
});

const updateSpecialParticipantSchema = z.object({
	participantId: z.string().min(1),
	fullName: z.string().min(1).max(200).optional(),
	category: z.enum(['groom', 'bride', 'child', 'family', 'other']).optional(),
	notes: z.string().max(500).optional(),
	active: z.boolean().optional(),
});

const deleteSpecialParticipantSchema = z.object({
	participantId: z.string().min(1),
});

// ============================================================================
// CRUD ACTIONS
// ============================================================================

export async function listSpecialParticipantsAction(): Promise<ApiResponse> {
	try {
		await requireAdminSession();
	} catch {
		return { success: false, error: 'Sessão administrativa inválida ou expirada.' };
	}

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

	try {
		const { listSpecialParticipants } = await import('@/lib/repositories/special-participants.repository');
		const participants = await listSpecialParticipants(eventId);
		return { success: true, data: participants };
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';
		console.error('[SpecialParticipantsAction] Falha ao listar:', message);
		return { success: false, error: `Falha ao listar: ${message}` };
	}
}

export async function createSpecialParticipantAction(
	formData: Record<string, unknown>,
): Promise<ApiResponse<{ participantId: string }>> {
	let session;
	try {
		session = await requireAdminSession();
	} catch {
		return { success: false, error: 'Sessão administrativa inválida ou expirada.' };
	}

	const validation = createSpecialParticipantSchema.safeParse(formData);
	if (!validation.success) {
		return {
			success: false,
			error: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
		};
	}

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

	try {
		const { createSpecialParticipant } = await import('@/lib/repositories/special-participants.repository');
		const result = await createSpecialParticipant(eventId, validation.data, session.uid);

		if (!result.success) {
			return { success: false, error: result.error };
		}

		// Audit log
		const { adminDb } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');
		await adminDb.collection('events').doc(eventId).collection('auditLogs').add({
			eventId,
			action: 'specialParticipant.created',
			actorId: session.uid,
			targetId: result.participantId,
			targetType: 'specialParticipant',
			timestamp: FieldValue.serverTimestamp(),
			metadata: { fullName: validation.data.fullName, category: validation.data.category },
		});

		revalidatePath('/admin/mesas');

		return {
			success: true,
			data: { participantId: result.participantId! },
			message: 'Participante especial cadastrado com sucesso.',
		};
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';
		console.error('[SpecialParticipantsAction] Falha ao criar:', message);
		return { success: false, error: `Falha ao criar: ${message}` };
	}
}

export async function updateSpecialParticipantAction(
	formData: Record<string, unknown>,
): Promise<ApiResponse> {
	let session;
	try {
		session = await requireAdminSession();
	} catch {
		return { success: false, error: 'Sessão administrativa inválida ou expirada.' };
	}

	const validation = updateSpecialParticipantSchema.safeParse(formData);
	if (!validation.success) {
		return {
			success: false,
			error: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
		};
	}

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

	try {
		const { updateSpecialParticipant } = await import('@/lib/repositories/special-participants.repository');
		const result = await updateSpecialParticipant(eventId, validation.data.participantId, {
			fullName: validation.data.fullName,
			category: validation.data.category as SpecialParticipantCategory | undefined,
			notes: validation.data.notes,
			active: validation.data.active,
		});

		if (!result.success) {
			return { success: false, error: result.error };
		}

		// Audit log
		const { adminDb } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');
		await adminDb.collection('events').doc(eventId).collection('auditLogs').add({
			eventId,
			action: 'specialParticipant.updated',
			actorId: session.uid,
			targetId: validation.data.participantId,
			targetType: 'specialParticipant',
			timestamp: FieldValue.serverTimestamp(),
			metadata: { ...validation.data },
		});

		revalidatePath('/admin/mesas');

		return { success: true, message: 'Participante atualizado com sucesso.' };
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';
		console.error('[SpecialParticipantsAction] Falha ao atualizar:', message);
		return { success: false, error: `Falha ao atualizar: ${message}` };
	}
}

/**
 * Obtém informações do participante antes da exclusão (para modal de confirmação).
 */
export async function getSpecialParticipantForDeletionAction(
	formData: Record<string, unknown>,
): Promise<ApiResponse<{
	participantId: string;
	fullName: string;
	category: SpecialParticipantCategory;
	hasAssignment: boolean;
	tableName?: string;
}>> {
	try {
		await requireAdminSession();
	} catch {
		return { success: false, error: 'Sessão administrativa inválida ou expirada.' };
	}

	const validation = deleteSpecialParticipantSchema.safeParse(formData);
	if (!validation.success) {
		return {
			success: false,
			error: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
		};
	}

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

	try {
		const { getSpecialParticipant } = await import('@/lib/repositories/special-participants.repository');
		const participant = await getSpecialParticipant(eventId, validation.data.participantId);

		if (!participant) {
			return { success: false, error: 'Participante não encontrado.' };
		}

		// Verificar se possui atribuição de mesa
		const { adminDb } = await import('@/lib/firebase/admin');
		const assignmentSnap = await adminDb
			.collection('events')
			.doc(eventId)
			.collection('tableAssignments')
			.where('participantId', '==', validation.data.participantId)
			.limit(1)
			.get();

		let tableName: string | undefined;
		if (!assignmentSnap.empty) {
			const tableId = assignmentSnap.docs[0].data()?.tableId;
			if (tableId) {
				const tableDoc = await adminDb
					.collection('events')
					.doc(eventId)
					.collection('tables')
					.doc(tableId)
					.get();
				if (tableDoc.exists) {
					tableName = tableDoc.data()?.name;
				}
			}
		}

		return {
			success: true,
			data: {
				participantId: participant.id,
				fullName: participant.fullName,
				category: participant.category,
				hasAssignment: !assignmentSnap.empty,
				tableName,
			},
		};
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';
		console.error('[SpecialParticipantsAction] Falha ao obter dados para exclusão:', message);
		return { success: false, error: `Falha ao obter dados: ${message}` };
	}
}

export async function deleteSpecialParticipantAction(
	formData: Record<string, unknown>,
): Promise<ApiResponse<{ deletedAssignmentsCount: number }>> {
	let session;
	try {
		session = await requireAdminSession();
	} catch {
		return { success: false, error: 'Sessão administrativa inválida ou expirada.' };
	}

	const validation = deleteSpecialParticipantSchema.safeParse(formData);
	if (!validation.success) {
		return {
			success: false,
			error: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
		};
	}

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

	try {
		const { deleteSpecialParticipant } = await import('@/lib/repositories/special-participants.repository');
		const result = await deleteSpecialParticipant(eventId, validation.data.participantId);

		if (!result.success) {
			return { success: false, error: result.error };
		}

		const deletedCount = result.deletedAssignments?.length ?? 0;

		// Audit log com informações completas sobre a exclusão
		const { adminDb } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');
		await adminDb.collection('events').doc(eventId).collection('auditLogs').add({
			eventId,
			action: 'specialParticipant.deleted',
			actorId: session.uid,
			targetId: validation.data.participantId,
			targetType: 'specialParticipant',
			timestamp: FieldValue.serverTimestamp(),
			metadata: {
				deletedAssignmentsCount: deletedCount,
				deletedAssignments: result.deletedAssignments || [],
			},
		});

		revalidatePath('/admin/mesas');

		return {
			success: true,
			data: { deletedAssignmentsCount: deletedCount },
			message: deletedCount > 0
				? `Participante excluído permanentemente. ${deletedCount} atribuição(ões) de mesa também foi(foram) removida(s).`
				: 'Participante excluído permanentemente.',
		};
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';
		console.error('[SpecialParticipantsAction] Falha ao excluir:', message);
		return { success: false, error: `Falha ao excluir: ${message}` };
	}
}