'use server';

/**
 * Server Action — Submissão de RSVP (Confirmação de Presença)
 *
 * Valida entrada com Zod, verifica convite e persiste no Firestore via transação.
 * Ao confirmar presença pela PRIMEIRA VEZ, gera checkInToken opaco e retorna para o QR Code.
 * Em edições subsequentes, preserva o token existente (não invalida cartão digital).
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

	// 3. Validar limite de acompanhantes NO SERVIDOR (segurança contra manipulação frontend)
	try {
		const { adminDb } = await import('@/lib/firebase/admin');

		const invitationDoc = await adminDb
			.collection('events')
			.doc(eventId)
			.collection('invitations')
			.doc(formData.invitationId)
			.get();

		if (!invitationDoc.exists) {
			return {
				success: false,
				error: 'Convite não encontrado. Verifique o link ou entre em contato com os noivos.',
			};
		}

		const invitationData = invitationDoc.data();
		const maxCompanions = invitationData?.maxCompanions ?? 0;
		const companionsCount = validation.data.companions.filter(c => c.name.trim()).length;

		if (companionsCount > maxCompanions) {
			return {
				success: false,
				error: `Limite de acompanhantes excedido. Seu convite permite ${maxCompanions} acompanhante${maxCompanions !== 1 ? 's' : ''}, mas foram informados ${companionsCount}.`,
			};
		}
	} catch (e) {
		console.error('[SubmitRSVP] Falha ao validar limite de acompanhantes:', e);
		return {
			success: false,
			error: 'Erro ao validar convite. Tente novamente.',
		};
	}

	// 4. Persistência via transação (controle de concorrência)
	const result = await submitRSVP(eventId, formData.invitationId, {
		attendanceStatus: validation.data.attendanceStatus,
		confirmedGuestIds: [],
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

	// 4. Gerar checkInToken APENAS se confirmado E se ainda não existir um token válido
	//    Isso evita invalidar cartões digitais em edições subsequentes do RSVP
	let checkInToken: string | undefined;

	if (validation.data.attendanceStatus === 'confirmed') {
		try {
			const { adminDb, generateSecureToken, hashToken } = await import('@/lib/firebase/admin');
			const { FieldValue } = await import('firebase-admin/firestore');

			// Verificar se já existe um checkInTokenHash neste convite
			const invitationDoc = await adminDb
				.collection('events')
				.doc(eventId)
				.collection('invitations')
				.doc(formData.invitationId)
				.get();

			const existingHash = invitationDoc.exists ? invitationDoc.data()?.checkInTokenHash : null;

			if (!existingHash) {
				// Primeira confirmação: gerar novo token
				checkInToken = generateSecureToken();
				const checkInTokenHash = await hashToken(checkInToken);

				await adminDb
					.collection('events')
					.doc(eventId)
					.collection('invitations')
					.doc(formData.invitationId)
					.update({
						checkInTokenHash,
						// Persistir token plain para recuperação posterior pelo convidado
						// Acesso protegido por validação server-side do token do convite + RSVP confirmado
						checkInTokenPlain: checkInToken,
						updatedAt: FieldValue.serverTimestamp(),
					});
			}
			// Se já existe hash, NÃO regenerar — preservar cartão digital existente
			// O token não é retornado em edições subsequentes (hash é unidirecional)
		} catch (e) {
			console.error('[SubmitRSVP] Falha ao verificar/gerar checkInToken:', e);
			// Não falhar o RSVP por causa do token
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