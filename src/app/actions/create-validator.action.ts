'use server';

/**
 * Server Action — Criar Validador (Provisionamento Seguro)
 *
 * Cria conta no Firebase Authentication e perfil no Firestore.
 * Apenas administradores com role 'owner' podem cadastrar validadores.
 *
 * SEGURANÇA:
 * - Senha definida via Firebase Auth, NUNCA armazenada no Firestore
 * - Validação Zod de todos os campos
 * - Verificação de duplicidade antes da criação
 * - Compensação segura se Auth criar mas Firestore falhar
 * - Auditoria de quem criou o validador
 */

import { requireAdminSession } from '@/lib/auth/admin-session';
import { createValidatorAccount } from '@/lib/repositories/validator.repository';
import { revalidatePath } from 'next/cache';
import type { ApiResponse } from '@/types';
import { z } from 'zod';

const createValidatorSchema = z.object({
	email: z.string().email('Email inválido').min(5, 'Email muito curto').max(254),
	displayName: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(200),
	phone: z.string().max(20).optional().or(z.literal('')),
	password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres').max(128),
});

export async function createValidatorAction(
	formData: Record<string, unknown>,
): Promise<ApiResponse<{ uid: string }>> {
	// 1. Verificar sessão administrativa (apenas admins, não validadores)
	let session;
	try {
		session = await requireAdminSession();
	} catch {
		return {
			success: false,
			error: 'Sessão administrativa inválida ou expirada.',
		};
	}

	// 2. Apenas owners podem cadastrar validadores
	if (session.role !== 'owner') {
		return {
			success: false,
			error: 'Apenas os noivos podem cadastrar novos validadores.',
		};
	}

	// 3. Validar dados de entrada
	const validation = createValidatorSchema.safeParse(formData);
	if (!validation.success) {
		return {
			success: false,
			error: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
		};
	}

	// 4. Verificar Admin SDK
	if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
		return {
			success: false,
			error: 'Firebase Admin SDK não configurado no servidor.',
		};
	}

	// 5. Criar conta e perfil
	const result = await createValidatorAccount({
		email: validation.data.email.toLowerCase().trim(),
		displayName: validation.data.displayName.trim(),
		phone: validation.data.phone?.trim() || undefined,
		password: validation.data.password,
		createdBy: session.uid,
	});

	if (!result.success) {
		return {
			success: false,
			error: result.error || 'Erro ao criar validador.',
			data: result.pendingAuth ? { uid: result.uid || '' } : undefined,
		};
	}

	revalidatePath('/admin/validadores');

	console.log('[CreateValidator] Validador cadastrado com sucesso.', {
		uid: result.uid,
		email: validation.data.email,
		createdBy: session.uid,
	});

	return {
		success: true,
		data: { uid: result.uid! },
		message: `Validador "${validation.data.displayName}" criado com sucesso. Compartilhe as credenciais de forma segura.`,
	};
}

/**
 * Server Action — Ativar/Desativar Validador
 */
export async function toggleValidatorAction(
	uid: string,
	active: boolean,
): Promise<ApiResponse> {
	let session;
	try {
		session = await requireAdminSession();
	} catch {
		return { success: false, error: 'Sessão administrativa inválida.' };
	}

	if (session.role !== 'owner') {
		return { success: false, error: 'Apenas os noivos podem alterar o status de validadores.' };
	}

	const { toggleValidatorStatus } = await import('@/lib/repositories/validator.repository');
	const result = await toggleValidatorStatus(uid, active, session.uid);

	if (!result.success) {
		return { success: false, error: result.error };
	}

	revalidatePath('/admin/validadores');

	return {
		success: true,
		message: active ? 'Validador ativado com sucesso.' : 'Validador desativado com sucesso.',
	};
}