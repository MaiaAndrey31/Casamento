'use server';

/**
 * Server Actions de Check-in — DESATIVADAS (Etapa 5)
 *
 * Estas funções foram substituídas pelo serviço transacional seguro em
 * validator-checkin.action.ts. O fluxo antigo (/admin/check-in) foi
 * convertido em redirecionamento para /validador.
 *
 * MOTIVO DA DESATIVAÇÃO:
 * - performCheckIn() usava seleção automática do primeiro guest (inseguro)
 * - performCheckIn() usava count().get() dentro de transação (incompatível)
 * - performManualCheckIn() não usava transação (duplicidade possível)
 * - searchGuestForCheckIn() fazia N+1 queries (lento)
 * - Nenhum suporte a IDs persistentes de acompanhantes
 *
 * Todas as chamadas agora retornam erro controlado direcionando para o novo fluxo.
 * Arquivo preservado para evitar breaking changes em imports existentes.
 */

import type { ApiResponse } from '@/types';

const DEPRECATED_ERROR = 'Este endpoint foi desativado. Utilize o painel do validador em /validador para realizar check-ins com segurança.';

/**
 * @deprecated Use validateQrCodeAction + checkInParticipantAction from validator-checkin.action.ts
 */
export async function checkInByQrCode(
	_eventId: string,
	_qrCodeData: string,
): Promise<ApiResponse> {
	console.warn('[CheckInAction DEPRECATED] checkInByQrCode chamada — redirecionar para /validador');
	return { success: false, error: DEPRECATED_ERROR };
}

/**
 * @deprecated Use searchGuestsAction from validator-checkin.action.ts
 */
export async function searchGuestsForCheckIn(
	_eventId: string,
	_searchTerm: string,
): Promise<ApiResponse> {
	console.warn('[CheckInAction DEPRECATED] searchGuestsForCheckIn chamada — redirecionar para /validador');
	return { success: false, error: DEPRECATED_ERROR };
}

/**
 * @deprecated Use manualCheckInAction from validator-checkin.action.ts
 */
export async function checkInManually(
	_eventId: string,
	_guestId: string,
): Promise<ApiResponse> {
	console.warn('[CheckInAction DEPRECATED] checkInManually chamada — redirecionar para /validador');
	return { success: false, error: DEPRECATED_ERROR };
}