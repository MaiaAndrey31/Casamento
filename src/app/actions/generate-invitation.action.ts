'use server';

/**
 * Server Action — Gerar Convite para Convidado (TRANSACIONAL)
 *
 * Cria um convite digital personalizado associado a um convidado existente
 * usando uma transação do Firestore para garantir atomicidade:
 * - Verifica duplicidade DENTRO da transação (previne race conditions)
 * - Cria convite com tokenHash + encryptedToken em uma única escrita
 * - Vincula convidado ao convite na mesma transação
 * - Se qualquer etapa falhar, nenhuma escrita é persistida
 *
 * SEGURANÇA:
 * - Token original nunca é persistido em texto puro
 * - Apenas hash SHA-256 e token criptografado AES-256-GCM são armazenados
 * - Exige sessão administrativa válida
 * - Exige INVITATION_ENCRYPTION_KEY configurada ANTES de qualquer escrita
 */

import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/lib/auth/admin-session';
import { encryptToken, isEncryptionConfigured } from '@/lib/crypto/invitation-vault';
import type { ApiResponse } from '@/types';
import { z } from 'zod';
import { GUEST_CATEGORY_VALUES } from '@/lib/constants/guest-categories';

const generateInvitationSchema = z.object({
	guestId: z.string().min(1, 'ID do convidado é obrigatório'),
	displayName: z.string().min(2, 'Nome de exibição deve ter pelo menos 2 caracteres').max(200),
	maxCompanions: z.coerce.number().int().min(0).max(50).default(0),
	category: z.enum(GUEST_CATEGORY_VALUES),
});

export interface GenerateInvitationResult {
	invitationId: string;
	token: string;
	inviteUrl: string;
}

export async function generateInvitationAction(
	formData: Record<string, unknown>,
): Promise<ApiResponse<GenerateInvitationResult>> {
	// 1. Verificar sessão administrativa
	let session;
	try {
		session = await requireAdminSession();
	} catch {
		return {
			success: false,
			error: 'Sessão administrativa inválida ou expirada. Faça login novamente.',
		};
	}

	// 2. Validar dados
	const validation = generateInvitationSchema.safeParse(formData);
	if (!validation.success) {
		return {
			success: false,
			error: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
		};
	}

	// 3. Verificar Admin SDK
	if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
		return {
			success: false,
			error: 'Firebase Admin SDK não configurado no servidor.',
		};
	}

	// 4. Verificar criptografia ANTES de qualquer operação de escrita
	// Se a chave estiver ausente ou inválida, falhar cedo sem criar documentos órfãos
	const encryptionReady = await isEncryptionConfigured();
	if (!encryptionReady) {
		return {
			success: false,
			error: 'INVITATION_ENCRYPTION_KEY não configurada. Adicione a variável de ambiente privada na Vercel antes de gerar convites.',
		};
	}

	// 5. Preparar token, hash e criptografia ANTES da transação
	// Operações criptográficas são puras e não devem estar dentro da callback transacional
	const { adminDb, generateSecureToken, hashToken } = await import('@/lib/firebase/admin');
	const { FieldValue } = await import('firebase-admin/firestore');

	const token = generateSecureToken();
	const tokenHash = await hashToken(token);
	const encryptedToken = await encryptToken(token);

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';
	const guestRef = adminDb
		.collection('events')
		.doc(eventId)
		.collection('guests')
		.doc(validation.data.guestId);
	const invitationsRef = adminDb
		.collection('events')
		.doc(eventId)
		.collection('invitations');

	// 6. Executar transação atômica
	try {
		const invitationId = await adminDb.runTransaction(async (transaction) => {
			// Leitura 1: verificar se convidado existe
			const guestDoc = await transaction.get(guestRef);
			if (!guestDoc.exists) {
				throw new Error('GUEST_NOT_FOUND');
			}

			const guestData = guestDoc.data();

			// Leitura 2: verificar se já possui convite ativo (dentro da transação = seguro contra concorrência)
			if (guestData?.invitationId) {
				const existingInvitationDoc = await transaction.get(
					adminDb
						.collection('events')
						.doc(eventId)
						.collection('invitations')
						.doc(guestData.invitationId),
				);

				if (existingInvitationDoc.exists && existingInvitationDoc.data()?.invitationStatus === 'active') {
					throw new Error('INVITATION_ALREADY_ACTIVE');
				}
			}

			// Escrita 1: criar documento de convite com todos os campos atômicos
			const newInvitationRef = invitationsRef.doc();
			transaction.set(newInvitationRef, {
				eventId,
				displayName: validation.data.displayName,
				maxCompanions: validation.data.maxCompanions,
				category: validation.data.category,
				guestIds: [validation.data.guestId],
				invitationStatus: 'active',
				tokenHash,
				encryptedToken,
				tokenExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
				createdAt: FieldValue.serverTimestamp(),
				updatedAt: FieldValue.serverTimestamp(),
				createdBy: session.uid,
			});

			// Escrita 2: vincular convidado ao convite na mesma transação
			transaction.update(guestRef, {
				invitationId: newInvitationRef.id,
				updatedAt: FieldValue.serverTimestamp(),
			});

			return newInvitationRef.id;
		});

		revalidatePath('/admin/convidados');

		const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://casamento-amanda-andrey.vercel.app';
		const inviteUrl = `${baseUrl}/convite/${token}`;

		console.log('[GenerateInvitation] Convite gerado com sucesso (transacional).', {
			eventId,
			guestId: validation.data.guestId,
			invitationId,
			createdBy: session.uid,
		});

		return {
			success: true,
			data: {
				invitationId,
				token,
				inviteUrl,
			},
			message: 'Convite gerado com sucesso! Copie ou compartilhe o link agora — ele pode ser recuperado posteriormente pelo painel.',
		};
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';

		// Erros conhecidos da transação → mensagens amigáveis
		if (message === 'GUEST_NOT_FOUND') {
			return { success: false, error: 'Convidado não encontrado.' };
		}
		if (message === 'INVITATION_ALREADY_ACTIVE') {
			return {
				success: false,
				error: 'Este convidado já possui um convite ativo. Use a opção "Regenerar link de acesso" se precisar de um novo link.',
			};
		}

		console.error('[GenerateInvitation] Falha na transação:', message);
		return { success: false, error: `Falha ao gerar convite: ${message}` };
	}
}