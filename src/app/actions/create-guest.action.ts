'use server';

/**
 * Server Action — Criar Convidado
 *
 * Cadastra um novo convidado no Firestore via Admin SDK.
 * Requer sessão administrativa válida.
 * Preserva dados do formulário em caso de erro (não limpa campos).
 */

import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/lib/auth/admin-session';
import { createGuest } from '@/lib/repositories/guest.repository';
import type { ApiResponse } from '@/types';
import { z } from 'zod';

const createGuestSchema = z.object({
	fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(200),
	phone: z.string().min(10, 'Telefone inválido').max(20),
	email: z.string().email('E-mail inválido').or(z.literal('')).optional(),
	category: z.string().min(1, 'Categoria é obrigatória'),
	group: z.string().max(100).optional(),
	notes: z.string().max(500).optional(),
	maxCompanions: z.coerce.number().int().min(0).max(20).default(0),
});

export interface CreateGuestResult {
	guestId?: string;
}

export async function createGuestAction(
	formData: Record<string, unknown>,
): Promise<ApiResponse<CreateGuestResult>> {
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

	// 2. Validar dados com Zod
	const validation = createGuestSchema.safeParse(formData);
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
		const result = await createGuest(eventId, {
			fullName: validation.data.fullName,
			phone: validation.data.phone,
			category: validation.data.category,
			isPrimaryGuest: true,
			maxCompanions: validation.data.maxCompanions,
		});

		if (!result.success) {
			return {
				success: false,
				error: result.error || 'Falha ao criar convidado no Firestore.',
			};
		}

		// Revalidar listagem de convidados
		revalidatePath('/admin/convidados');

		console.log('[CreateGuest] Convidado criado com sucesso.', {
			eventId,
			guestId: result.guestId,
			createdBy: session.uid,
		});

		return {
			success: true,
			data: { guestId: result.guestId },
			message: 'Convidado cadastrado com sucesso!',
		};
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';
		console.error('[CreateGuest] Falha ao criar convidado:', {
			eventId,
			errorType: e instanceof Error ? e.constructor.name : 'unknown',
			errorMessage: message,
		});
		return {
			success: false,
			error: `Falha ao salvar no Firestore: ${message}`,
		};
	}
}