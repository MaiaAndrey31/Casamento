'use server';

/**
 * Server Action — Recuperar Link de Convite Existente
 *
 * Operação B: Recupera o token criptografado de um convite ativo
 * sem criar novo convite, sem modificar token, sem alterar RSVP.
 *
 * SEGURANÇA:
 * - Exige sessão administrativa válida
 * - Verifica vínculo entre convidado e convite
 * - Descriptografa token apenas no servidor
 * - Resposta sem cache (token sensível)
 */

import { requireAdminSession } from '@/lib/auth/admin-session';
import { decryptToken, isEncryptionConfigured } from '@/lib/crypto/invitation-vault';
import type { ApiResponse } from '@/types';
import { z } from 'zod';

const recoverSchema = z.object({
	guestId: z.string().min(1, 'ID do convidado é obrigatório'),
});

export interface RecoverInvitationResult {
	invitationId: string;
	token: string;
	inviteUrl: string;
}

export async function recoverInvitationLinkAction(
	formData: Record<string, unknown>,
): Promise<ApiResponse<RecoverInvitationResult>> {
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
	const validation = recoverSchema.safeParse(formData);
	if (!validation.success) {
		return {
			success: false,
			error: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
		};
	}

	// 3. Verificar se criptografia está configurada
	const encryptionReady = await isEncryptionConfigured();
	if (!encryptionReady) {
		return {
			success: false,
			error: 'Sistema de recuperação de links não configurado. A variável INVITATION_ENCRYPTION_KEY precisa ser definida no servidor.',
		};
	}

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

	try {
		const { adminDb } = await import('@/lib/firebase/admin');

		// 4. Buscar convidado e verificar vínculo
		const guestDoc = await adminDb
			.collection('events')
			.doc(eventId)
			.collection('guests')
			.doc(validation.data.guestId)
			.get();

		if (!guestDoc.exists) {
			return { success: false, error: 'Convidado não encontrado.' };
		}

		const guestData = guestDoc.data();

		if (!guestData?.invitationId) {
			return {
				success: false,
				error: 'Este convidado não possui convite associado. Use "Gerar convite digital" para criar um.',
			};
		}

		// 5. Buscar convite e verificar status
		const invitationDoc = await adminDb
			.collection('events')
			.doc(eventId)
			.collection('invitations')
			.doc(guestData.invitationId)
			.get();

		if (!invitationDoc.exists) {
			return {
				success: false,
				error: 'Convite associado não encontrado. Pode ter sido removido. Gere um novo convite.',
			};
		}

		const invitationData = invitationDoc.data();

		if (invitationData?.invitationStatus !== 'active') {
			return {
				success: false,
				error: `Convite com status "${invitationData?.invitationStatus}" não pode ser recuperado.`,
			};
		}

		// 6. Verificar se token criptografado existe
		if (!invitationData?.encryptedToken) {
			return {
				success: false,
				error: 'LEGACY_INVITATION: Este convite foi criado antes do sistema de recuperação. Use "Regenerar link de acesso" para criar um novo link recuperável.',
			};
		}

		// 7. Descriptografar token
		let token: string;
		try {
			token = await decryptToken(invitationData.encryptedToken);
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Erro desconhecido';
			console.error('[RecoverInvitation] Falha ao descriptografar token:', message);
			return {
				success: false,
				error: 'Falha ao recuperar o link. Os dados criptografados podem estar corrompidos. Use "Regenerar link de acesso".',
			};
		}

		const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://casamento-amanda-andrey.vercel.app';
		const inviteUrl = `${baseUrl}/convite/${token}`;

		console.log('[RecoverInvitation] Link recuperado com sucesso.', {
			eventId,
			guestId: validation.data.guestId,
			invitationId: guestData.invitationId,
			recoveredBy: session.uid,
		});

		return {
			success: true,
			data: {
				invitationId: guestData.invitationId,
				token,
				inviteUrl,
			},
		};
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';
		console.error('[RecoverInvitation] Erro inesperado:', message);
		return { success: false, error: `Erro ao recuperar link: ${message}` };
	}
}