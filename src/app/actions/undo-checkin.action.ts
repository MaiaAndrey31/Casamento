'use server';

/**
 * Server Action — Desfazer Check-in (Lote 2 §12)
 *
 * Somente administradores podem desfazer check-ins.
 * O registro original é preservado no histórico com status 'undone'.
 * Um novo check-in válido pode ser realizado posteriormente.
 *
 * SEGURANÇA:
 * - requireAdminSession() — apenas admins, não validadores
 * - Justificativa obrigatória (mínimo 3 caracteres)
 * - Operação transacional
 * - Auditoria: registra quem desfez, quando e por quê
 */

import { requireAdminSession } from '@/lib/auth/admin-session';
import { undoParticipantCheckIn } from '@/lib/repositories/validator-checkin.repository';
import type { ApiResponse } from '@/types';
import { z } from 'zod';

const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

const undoCheckInSchema = z.object({
	invitationId: z.string().min(1, 'ID do convite é obrigatório'),
	participantId: z.string().min(1, 'ID do participante é obrigatório'),
	reason: z.string().min(3, 'Justificativa deve ter pelo menos 3 caracteres').max(500),
});

export async function undoCheckInAction(
	formData: Record<string, unknown>,
): Promise<ApiResponse> {
	// 1. Verificar sessão administrativa (apenas admins, não validadores)
	let session;
	try {
 session = await requireAdminSession();
	} catch {
 return {
 success: false,
 error: 'Sessão administrativa inválida ou expirada. Apenas administradores podem desfazer check-ins.',
 };
	}

	// 2. Validar dados
	const validation = undoCheckInSchema.safeParse(formData);
	if (!validation.success) {
 return {
 success: false,
 error: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
 };
	}

	// 3. Desfazer check-in via transação
	const result = await undoParticipantCheckIn(
 eventId,
 validation.data.invitationId,
 validation.data.participantId,
 session.uid,
 validation.data.reason,
	);

	if (!result.success) {
 return {
 success: false,
 error: result.error || 'Erro ao desfazer check-in.',
 };
	}

	console.log('[UndoCheckIn] Check-in desfeito com sucesso.', {
 invitationId: validation.data.invitationId,
 participantId: validation.data.participantId,
 undoneBy: session.uid,
 reason: validation.data.reason,
	});

	return {
 success: true,
 message: 'Check-in desfeito com sucesso. O participante poderá realizar nova entrada.',
	};
}