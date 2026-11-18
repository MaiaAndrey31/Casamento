'use server';

/**
 * Server Actions — Check-in do Validador
 *
 * Expõe as operações de validação e registro de entrada para o painel
 * do validador (/validador). Todas as operações verificam sessão de
 * validador (requireValidatorSession) antes de executar.
 *
 * SEGURANÇA:
 * - Tokens nunca expostos em logs ou retornos
 * - Autorização verificada em cada operação
 * - Validação Zod de entradas
 * - DTOs serializáveis para Client Components
 */

import { requireValidatorSession } from '@/lib/auth/admin-session';
import {
	validateInvitationForCheckIn,
	performParticipantCheckIn,
	searchConfirmedGuests,
	type InvitationValidationResult,
	type ParticipantCheckInResult,
} from '@/lib/repositories/validator-checkin.repository';
import type { ApiResponse } from '@/types';
import { z } from 'zod';

const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

// ============================================================================
// VALIDAÇÃO DE CONVITE (SOMENTE LEITURA)
// ============================================================================

/**
 * Valida credencial de QR Code e retorna dados do convite com participantes.
 * Esta operação é SOMENTE LEITURA — não registra entradas.
 */
export async function validateQrCodeAction(
	qrCodeData: string,
): Promise<ApiResponse<InvitationValidationResult>> {
	// 1. Verificar sessão de validador
	try {
		await requireValidatorSession();
	} catch {
		return {
			success: false,
			error: 'Sessão de validador inválida ou expirada. Faça login novamente.',
		};
	}

	// 2. Validar formato básico
	if (!qrCodeData || qrCodeData.length < 4) {
		return {
			success: false,
			error: 'QR Code inválido ou ilegível.',
		};
	}

	// 3. Validar convite (somente leitura)
	const result = await validateInvitationForCheckIn(eventId, qrCodeData);

	if (result.status === 'error') {
		return {
			success: false,
			error: result.error || 'Erro ao validar convite.',
		};
	}

	return {
		success: true,
		data: result,
	};
}

// ============================================================================
// REGISTRO DE ENTRADA INDIVIDUAL (TRANSACTIONAL)
// ============================================================================

const participantCheckInSchema = z.object({
	invitationId: z.string().min(1, 'ID do convite é obrigatório'),
	participantId: z.string().min(1, 'ID do participante é obrigatório'),
});

/**
 * Registra entrada de um participante específico via transação Firestore.
 * Idempotente: mesma chamada múltiplas vezes = apenas uma entrada.
 */
export async function checkInParticipantAction(
	formData: Record<string, unknown>,
): Promise<ApiResponse<ParticipantCheckInResult>> {
	// 1. Verificar sessão de validador
	let session;
	try {
		session = await requireValidatorSession();
	} catch {
		return {
			success: false,
			error: 'Sessão de validador inválida ou expirada.',
		};
	}

	// 2. Validar dados
	const validation = participantCheckInSchema.safeParse(formData);
	if (!validation.success) {
		return {
			success: false,
			error: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
		};
	}

	// 3. Registrar entrada via transação
	const result = await performParticipantCheckIn(
		eventId,
		validation.data.invitationId,
		validation.data.participantId,
		session.uid,
		'qr_code',
	);

	if (!result.success) {
		return {
			success: false,
			data: result,
			error: result.error || 'Erro ao registrar entrada.',
		};
	}

	return {
		success: true,
		data: result,
		message: `✅ ${result.participantName} — Entrada registrada!`,
	};
}

// ============================================================================
// CHECK-IN MANUAL POR GUEST ID
// ============================================================================

/**
 * Registra entrada manual de um convidado encontrado por busca.
 * Usa a mesma operação transacional do check-in por QR Code.
 */
export async function manualCheckInAction(
	guestId: string,
	invitationId: string,
): Promise<ApiResponse<ParticipantCheckInResult>> {
	let session;
	try {
		session = await requireValidatorSession();
	} catch {
		return {
			success: false,
			error: 'Sessão de validador inválida ou expirada.',
		};
	}

	if (!guestId || !invitationId) {
		return {
			success: false,
			error: 'Dados insuficientes para check-in manual.',
		};
	}

	const result = await performParticipantCheckIn(
		eventId,
		invitationId,
		guestId,
		session.uid,
		'manual',
	);

	if (!result.success) {
		return {
			success: false,
			data: result,
			error: result.error || 'Erro ao registrar entrada manual.',
		};
	}

	return {
		success: true,
		data: result,
		message: `✅ ${result.participantName} — Entrada manual registrada!`,
	};
}

// ============================================================================
// BUSCA MANUAL DE CONVIDADOS CONFIRMADOS
// ============================================================================

/**
 * Busca convidados confirmados por nome para check-in manual.
 * Retorna apenas guests ativos vinculados a convites com RSVP confirmado.
 */
export async function searchGuestsAction(
	searchTerm: string,
): Promise<ApiResponse<Array<{
	guestId: string;
	fullName: string;
	invitationId: string;
	invitationDisplayName: string;
	checkedIn: boolean;
}>>> {
	try {
		await requireValidatorSession();
	} catch {
		return {
			success: false,
			error: 'Sessão de validador inválida.',
		};
	}

	if (!searchTerm || searchTerm.length < 2) {
		return { success: true, data: [] };
	}

	const results = await searchConfirmedGuests(eventId, searchTerm);
	return { success: true, data: results };
}