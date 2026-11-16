'use server';

/**
 * Server Action — Regenerar Link de Convite Existente
 *
 * Operação C: Regenera o token de um convite ATIVO existente.
 * Diferente de generateInvitationAction, esta ação:
 * - Funciona ESPECIFICAMENTE quando já existe convite ativo
 * - Atualiza o documento existente (não cria novo)
 * - Preserva invitationId, guestIds, RSVP e vínculos
 * - Invalida o token anterior atomicamente
 * - Armazena novo token criptografado para recuperação futura
 *
 * SEGURANÇA:
 * - Exige confirmação explícita (frontend via confirm())
 * - Exige sessão administrativa válida
 * - Valida vínculo convidado-convite
 * - Token anterior deixa de funcionar imediatamente após update
 */

import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/lib/auth/admin-session';
import { encryptToken, isEncryptionConfigured } from '@/lib/crypto/invitation-vault';
import type { ApiResponse } from '@/types';
import { z } from 'zod';

const regenerateSchema = z.object({
	guestId: z.string().min(1, 'ID do convidado é obrigatório'),
});

export interface RegenerateInvitationResult {
	invitationId: string;
	token: string;
	inviteUrl: string;
}

export async function regenerateInvitationAction(
	formData: Record<string, unknown>,
): Promise<ApiResponse<RegenerateInvitationResult>> {
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
	const validation = regenerateSchema.safeParse(formData);
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

	// 4. Verificar se criptografia está configurada
	const encryptionReady = await isEncryptionConfigured();
	if (!encryptionReady) {
		return {
			success: false,
			error: 'INVITATION_ENCRYPTION_KEY não configurada. Adicione a variável de ambiente privada na Vercel antes de regenerar convites.',
		};
	}

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

	try {
		const { adminDb, generateSecureToken, hashToken } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');

		// 5. Buscar convidado e verificar vínculo com convite
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

		// 6. Buscar convite existente e validar
		const invitationRef = adminDb
			.collection('events')
			.doc(eventId)
			.collection('invitations')
			.doc(guestData.invitationId);

		const invitationDoc = await invitationRef.get();

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
				error: `Convite com status "${invitationData?.invitationStatus}" não pode ser regenerado.`,
			};
		}

		// 7. Verificar consistência: convidado deve estar nos guestIds do convite
		if (!invitationData?.guestIds?.includes(validation.data.guestId)) {
			console.warn('[RegenerateInvitation] Inconsistência detectada: convidado não está nos guestIds do convite.', {
				guestId: validation.data.guestId,
				invitationId: guestData.invitationId,
				guestIds: invitationData?.guestIds,
			});
			// Não bloquear — o vínculo via guest.invitationId é a fonte primária
		}

		// 8. Gerar novo token e hash
		const newToken = generateSecureToken();
		const newTokenHash = await hashToken(newToken);

		// 9. Criptografar novo token para recuperação futura
		const encryptedToken = await encryptToken(newToken);

		// 10. Atualizar convite atomicamente
		// O hash antigo é substituído → token anterior invalidado imediatamente
		await invitationRef.update({
			tokenHash: newTokenHash,
			encryptedToken,
			updatedAt: FieldValue.serverTimestamp(),
			regeneratedAt: FieldValue.serverTimestamp(),
			regeneratedBy: session.uid,
		});

		revalidatePath('/admin/convidados');

		const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://casamento-amanda-andrey.vercel.app';
		const inviteUrl = `${baseUrl}/convite/${newToken}`;

		console.log('[RegenerateInvitation] Token regenerado com sucesso.', {
			eventId,
			guestId: validation.data.guestId,
			invitationId: guestData.invitationId,
			regeneratedBy: session.uid,
		});

		return {
			success: true,
			data: {
				invitationId: guestData.invitationId,
				token: newToken,
				inviteUrl,
			},
			message: 'Link regenerado com sucesso! O link anterior foi invalidado.',
		};
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';
		console.error('[RegenerateInvitation] Falha ao regenerar convite:', message);
		return { success: false, error: `Falha ao regenerar convite: ${message}` };
	}
}