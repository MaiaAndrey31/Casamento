'use server';

/**
 * Server Action — Validação de Token de Convite Personalizado
 *
 * Recebe o token da URL, gera o hash e busca o convite no Firestore.
 * Retorna os dados autorizados do convite + convidados vinculados.
 * Nunca expõe dados de outros convites ou informações internas.
 */

import { getInvitationByTokenHash } from '@/lib/repositories/invitation.repository';
import type { ApiResponse, Invitation, Guest } from '@/types';

export interface InvitationViewData {
	invitation: Pick<Invitation, 'id' | 'displayName' | 'maxCompanions' | 'category'>;
	guests: Array<Pick<Guest, 'id' | 'fullName' | 'isPrimaryGuest'>>;
}

export async function validateInvitation(
	eventId: string,
	token: string,
): Promise<ApiResponse<InvitationViewData>> {
	// 1. Validar formato do token
	if (!token || token.length < 16 || !/^[a-zA-Z0-9_-]+$/.test(token)) {
 return {
 success: false,
 error: 'Link de convite inválido.',
 };
	}

	// 2. Verificar se Admin SDK está configurado
	if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
 return {
 success: false,
 error: 'Serviço de convites temporariamente indisponível. A Service Account do Firebase Admin SDK precisa ser configurada no servidor.',
 };
	}

	// 3. Gerar hash do token para busca segura
	try {
 const { hashToken } = await import('@/lib/firebase/admin');
 const tokenHash = await hashToken(token);

 // 4. Buscar convite pelo hash
 const result = await getInvitationByTokenHash(eventId, tokenHash);

 if (!result) {
 return {
 success: false,
 error: 'Convite não encontrado ou inativo. Verifique o link ou entre em contato com os noivos.',
 };
 }

 // 5. Retornar apenas dados autorizados (sem tokenHash, sem IDs internos desnecessários)
 return {
 success: true,
 data: {
 invitation: {
 id: result.invitation.id,
 displayName: result.invitation.displayName,
 maxCompanions: result.invitation.maxCompanions,
 category: result.invitation.category,
 },
 guests: result.guests.map(g => ({
 id: g.id,
 fullName: g.fullName,
 isPrimaryGuest: g.isPrimaryGuest,
 })),
 },
 };
	} catch (e) {
 console.error('[ValidateInvitation] Erro inesperado:', e);
 return {
 success: false,
 error: 'Erro interno ao validar convite. Tente novamente mais tarde.',
 };
	}
}