'use server';

/**
 * Server Action — Gerar Convite para Convidado
 *
 * Cria um convite digital personalizado associado a um convidado existente.
 * Retorna o token original APENAS nesta operação (não é armazenado no Firestore).
 * Se o convidado já possui convite ativo, retorna erro orientando regeneração.
 *
 * SEGURANÇA: O token original nunca é persistido. Apenas o hash SHA-256 é armazenado.
 */

import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/lib/auth/admin-session';
import { createInvitation } from '@/lib/repositories/invitation.repository';
import type { ApiResponse } from '@/types';
import { z } from 'zod';

const generateInvitationSchema = z.object({
	guestId: z.string().min(1, 'ID do convidado é obrigatório'),
	displayName: z.string().min(2, 'Nome de exibição deve ter pelo menos 2 caracteres').max(200),
	maxCompanions: z.coerce.number().int().min(0).max(50).default(0),
	category: z.enum(['familia_noiva', 'familia_noivo', 'padrinhos', 'amigos', 'colegas']),
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

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

	try {
		const { adminDb } = await import('@/lib/firebase/admin');

		// Verificar se o convidado existe e obter dados
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

		// Verificar se já possui convite ativo
		if (guestData?.invitationId) {
			const existingInvitation = await adminDb
				.collection('events')
				.doc(eventId)
				.collection('invitations')
				.doc(guestData.invitationId)
				.get();

			if (existingInvitation.exists && existingInvitation.data()?.invitationStatus === 'active') {
				return {
					success: false,
					error: 'Este convidado já possui um convite ativo. Use a opção "Regenerar convite" se precisar de um novo link.',
				};
			}
		}

		// Criar convite
		const result = await createInvitation(eventId, {
			displayName: validation.data.displayName,
			maxCompanions: validation.data.maxCompanions,
			category: validation.data.category,
			guestIds: [validation.data.guestId],
		});

		if (!result.success || !result.token || !result.invitationId) {
			return {
				success: false,
				error: result.error || 'Falha ao gerar convite.',
			};
		}

		// Associar convite ao convidado
		await adminDb
			.collection('events')
			.doc(eventId)
			.collection('guests')
			.doc(validation.data.guestId)
			.update({
				invitationId: result.invitationId,
				updatedAt: new Date().toISOString(),
			});

		revalidatePath('/admin/convidados');

		const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://casamento-amanda-andrey.vercel.app';
		const inviteUrl = `${baseUrl}/convite/${result.token}`;

		console.log('[GenerateInvitation] Convite gerado com sucesso.', {
			eventId,
			guestId: validation.data.guestId,
			invitationId: result.invitationId,
			createdBy: session.uid,
		});

		return {
			success: true,
			data: {
				invitationId: result.invitationId,
				token: result.token,
				inviteUrl,
			},
			message: 'Convite gerado com sucesso! Copie ou compartilhe o link agora — ele não será exibido novamente.',
		};
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';
		console.error('[GenerateInvitation] Falha ao gerar convite:', message);
		return { success: false, error: `Falha ao gerar convite: ${message}` };
	}
}