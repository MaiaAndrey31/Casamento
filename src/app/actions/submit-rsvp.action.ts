'use server';

/**
 * Server Action — Submissão de RSVP (Confirmação de Presença)
 *
 * Valida entrada com Zod, verifica convite e persiste no Firestore via transação.
 * Ao confirmar presença, gera checkInToken opaco e retorna para o QR Code do cartão digital.
 * Retorna resposta padronizada sem expor dados internos.
 */

import { rsvpFormRefinedSchema } from '@/lib/validators/rsvp.schema';
import { submitRSVP } from '@/lib/repositories/rsvp.repository';
import type { ApiResponse } from '@/types';

export async function submitRsvpAction(
	eventId: string,
	formData: {
		invitationId: string;
		fullName: string;
		phone: string;
		attendanceStatus: 'confirmed' | 'declined';
		companions: Array<{ name: string; isMinor: boolean; age?: number }>;
		dietaryRestrictions: string[];
		songSuggestion: string;
		personalMessage: string;
	},
): Promise<ApiResponse<{ updated: boolean; checkInToken?: string }>> {
	// 1. Validação Zod com regras condicionais
	const validation = rsvpFormRefinedSchema.safeParse(formData);
	if (!validation.success) {
		return {
			success: false,
			error: validation.error.errors.map(e => e.message).join('; '),
		};
	}

	// 2. Verificar se Admin SDK está configurado
	if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
		return {
			success: false,
			error: 'Serviço de confirmação temporariamente indisponível. Tente novamente mais tarde.',
		};
	}

	// 3. Persistência via transação (controle de concorrência)
	const result = await submitRSVP(eventId, formData.invitationId, {
		attendanceStatus: validation.data.attendanceStatus,
		confirmedGuestIds: [], // Será preenchido quando convites estiverem totalmente implementados
		companions: validation.data.companions,
		dietaryRestrictions: validation.data.dietaryRestrictions,
		songSuggestion: validation.data.songSuggestion || '',
		personalMessage: validation.data.personalMessage || '',
	});

	if (!result.success) {
		return {
			success: false,
			error: result.error ?? 'Falha ao salvar confirmação. Tente novamente.',
		};
	}

	// 4. Se confirmado, gerar checkInToken opaco para o QR Code do cartão digital
	let checkInToken: string | undefined;

	if (validation.data.attendanceStatus === 'confirmed') {
		try {
			const { adminDb, generateSecureToken, hashToken } = await import('@/lib/firebase/admin');
			const { FieldValue } = await import('firebase-admin/firestore');

			// Gerar novo token de check-in exclusivo para este convite
			checkInToken = generateSecureToken();
			const checkInTokenHash = await hashToken(checkInToken);

			// Armazenar hash no convite (substitui qualquer token anterior, invalidando QR Codes antigos)
			await adminDb
				.collection('events')
				.doc(eventId)
				.collection('invitations')
				.doc(formData.invitationId)
				.update({
					checkInTokenHash,
					updatedAt: FieldValue.serverTimestamp(),
				});
		} catch (e) {
			console.error('[SubmitRSVP] Falha ao gerar checkInToken:', e);
			// Não falhar o RSVP por causa do token — o admin pode regenerar depois
			checkInToken = undefined;
		}
	}

	return {
		success: true,
		data: { updated: true, checkInToken },
		message: validation.data.attendanceStatus === 'confirmed'
			? 'Presença confirmada com sucesso! Estamos ansiosos para celebrar com você.'
			: 'Resposta registrada. Agradecemos por nos avisar.',
	};
}