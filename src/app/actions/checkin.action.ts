'use server';

/**
 * Server Action — Check-in de Convidados
 *
 * Valida token opaco do QR Code, verifica convite e registra entrada via transação.
 * Suporta check-in por QR Code e busca manual por nome.
 */

import { requireAdminSession } from '@/lib/auth/admin-session';
import { performCheckIn, searchGuestForCheckIn, performManualCheckIn, type CheckInResult } from '@/lib/repositories/checkin.repository';
import type { ApiResponse } from '@/types';

/**
 * Realiza check-in via QR Code (token opaco).
 */
export async function checkInByQrCode(
	eventId: string,
	qrCodeData: string,
): Promise<ApiResponse<CheckInResult>> {
	// 1. Verificar sessão administrativa
	let session;
	try {
 session = await requireAdminSession();
	} catch {
 return { success: false, error: 'Sessão administrativa inválida. Faça login novamente.' };
	}

	// 2. Validar formato do QR Code
	if (!qrCodeData || qrCodeData.length < 8) {
 return { success: false, error: 'QR Code inválido ou ilegível.' };
	}

	// 3. Extrair token do QR Code (pode ser URL completa ou token puro)
	let token = qrCodeData;
	try {
 const url = new URL(qrCodeData);
 token = url.searchParams.get('t') || url.searchParams.get('token') || qrCodeData;
	} catch {
 // Não é URL, usar como token direto
	}

	// 4. Executar check-in
	const result = await performCheckIn(eventId, token, session.uid);

	if (!result.success) {
 return {
 success: false,
 data: result,
 error: result.error,
 };
	}

	return {
 success: true,
 data: result,
 message: `✅ ${result.guestName} (${result.invitationDisplayName}) — Check-in realizado!`,
	};
}

/**
 * Busca convidados por nome para check-in manual.
 */
export async function searchGuestsForCheckIn(
	eventId: string,
	searchTerm: string,
): Promise<ApiResponse<Array<{ id: string; fullName: string; invitationDisplayName: string; checkedIn: boolean }>>> {
	// Verificar sessão
	try {
 await requireAdminSession();
	} catch {
 return { success: false, error: 'Sessão administrativa inválida.' };
	}

	if (!searchTerm || searchTerm.length < 2) {
 return { success: true, data: [] };
	}

	const results = await searchGuestForCheckIn(eventId, searchTerm);
	return { success: true, data: results };
}

/**
 * Realiza check-in manual por ID do convidado.
 */
export async function checkInManually(
	eventId: string,
	guestId: string,
): Promise<ApiResponse<CheckInResult>> {
	let session;
	try {
 session = await requireAdminSession();
	} catch {
 return { success: false, error: 'Sessão administrativa inválida.' };
	}

	const result = await performManualCheckIn(eventId, guestId, session.uid);

	if (!result.success) {
 return { success: false, data: result, error: result.error };
	}

	return {
 success: true,
 data: result,
 message: `✅ ${result.guestName} (${result.invitationDisplayName}) — Check-in manual realizado!`,
	};
}