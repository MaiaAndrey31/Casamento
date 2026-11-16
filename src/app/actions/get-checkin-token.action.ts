'use server';

/**
 * Server Action — Recuperar Check-In Token para QR Code
 *
 * Permite que um convidado com RSVP confirmado recupere seu checkInToken
 * para visualizar/baixar o QR Code novamente, sem regenerar token.
 *
 * SEGURANÇA: Requer validação server-side do token do convite + RSVP confirmado.
 * O campo checkInTokenPlain só é retornado se ambos os critérios forem atendidos.
 */

import type { ApiResponse } from '@/types';

export async function getCheckInTokenAction(
	eventId: string,
	invitationId: string,
	token: string,
): Promise<ApiResponse<{ checkInToken: string; displayName: string; eventDate: string | null; ceremonyTime: string | null; timezone: string; venueAddress: string | null; companions: Array<{ name: string; isMinor: boolean }> }>> {
	// 1. Validar formato do token
	if (!token || token.length < 16 || !/^[a-zA-Z0-9_-]+$/.test(token)) {
		return { success: false, error: 'Token de convite inválido.' };
	}

	// 2. Verificar Admin SDK
	if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
		return { success: false, error: 'Serviço temporariamente indisponível.' };
	}

	try {
		const { adminDb, hashToken } = await import('@/lib/firebase/admin');

		// 3. Validar token do convite via hash
		const tokenHash = await hashToken(token);
		const invitationDoc = await adminDb
			.collection('events')
			.doc(eventId)
			.collection('invitations')
			.where('tokenHash', '==', tokenHash)
			.where('invitationStatus', '==', 'active')
			.limit(1)
			.get();

		if (invitationDoc.empty) {
			return { success: false, error: 'Convite não encontrado ou inativo.' };
		}

		const invDoc = invitationDoc.docs[0];
		const invData = invDoc.data();

		// Verificar se o invitationId corresponde ao token validado
		if (invDoc.id !== invitationId) {
			return { success: false, error: 'Convite não corresponde ao token fornecido.' };
		}

		// 4. Verificar RSVP confirmado
		const rsvpDoc = await adminDb
			.collection('events')
			.doc(eventId)
			.collection('rsvps')
			.doc(invitationId)
			.get();

		if (!rsvpDoc.exists || rsvpDoc.data()?.attendanceStatus !== 'confirmed') {
			return { success: false, error: 'QR Code disponível apenas para convites com presença confirmada.' };
		}

		// 5. Verificar se checkInTokenPlain existe
		const checkInTokenPlain = invData?.checkInTokenPlain;
		if (!checkInTokenPlain) {
			return { success: false, error: 'QR Code ainda não foi gerado para este convite. Confirme sua presença primeiro.' };
		}

		// 6. Buscar dados do evento para exibição no modal
		const eventDoc = await adminDb.collection('events').doc(eventId).get();
		const eventData = eventDoc.exists ? eventDoc.data() : null;

		// 7. Extrair acompanhantes confirmados do RSVP
		const rsvpData = rsvpDoc.data();
		const companions = Array.isArray(rsvpData?.companions)
			? rsvpData.companions.filter((c: { name: string }) => c.name?.trim()).map((c: { name: string; isMinor?: boolean }) => ({
				name: c.name,
				isMinor: Boolean(c.isMinor),
			}))
			: [];

		return {
			success: true,
			data: {
				checkInToken: checkInTokenPlain,
				displayName: invData.displayName || '',
				eventDate: eventData?.eventDate || null,
				ceremonyTime: eventData?.ceremonyTime || null,
				timezone: eventData?.timezone || 'America/Sao_Paulo',
				venueAddress: eventData?.venueAddress || null,
				companions,
			},
		};
	} catch (e) {
		console.error('[GetCheckInToken] Erro ao recuperar token:', e);
		return { success: false, error: 'Erro interno ao recuperar QR Code.' };
	}
}