/**
 * Repositório de Validadores — CRUD de operadores de check-in
 *
 * Todas as operações são server-side via Firebase Admin SDK.
 * A coleção `admins` armazena tanto administradores quanto validadores,
 * diferenciados pelo campo `type: 'admin' | 'validator'`.
 *
 * SEGURANÇA:
 * - Senhas NUNCA são armazenadas no Firestore
 * - Tokens e hashes não são expostos nos retornos
 * - Operações de escrita usam transações quando necessário
 * - Auditoria de todas as mutações
 */

import { serializeFirestoreDoc } from '@/lib/server/firestore-serializer';
import type { ValidatorDTO } from '@/lib/checkin/dto';
import { toValidatorDTO } from '@/lib/checkin/dto';

const ADMINS_COLLECTION = 'admins';

export interface CreateValidatorInput {
	email: string;
	displayName: string;
	phone?: string;
	password: string;
	createdBy: string;
}

export interface ValidatorListItem {
	uid: string;
	email: string;
	displayName: string;
	phone: string | null;
	role: string;
	type: string;
	active: boolean;
	createdAt: string | null;
	lastLoginAt: string | null;
	createdBy: string | null;
}

/**
 * Lista todos os validadores (type === 'validator').
 * Ordenado por nome para exibição consistente.
 */
export async function listValidators(): Promise<ValidatorListItem[]> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');

		const snapshot = await adminDb
			.collection(ADMINS_COLLECTION)
			.where('type', '==', 'validator')
			.orderBy('displayName', 'asc')
			.get();

		return snapshot.docs.map(doc => {
			const data = serializeFirestoreDoc<Record<string, unknown>>(doc.id, doc.data());
			return {
				uid: doc.id,
				email: String(data.email || ''),
				displayName: String(data.displayName || ''),
				phone: (data.phone as string) || null,
				role: String(data.role || 'checkin_operator'),
				type: String(data.type || 'validator'),
				active: Boolean(data.active),
				createdAt: (data.createdAt as string) || null,
				lastLoginAt: (data.lastLoginAt as string) || null,
				createdBy: (data.createdBy as string) || null,
			};
		});
	} catch (e) {
		console.error('[ValidatorRepository] Erro ao listar validadores:', e);
		return [];
	}
}

/**
 * Verifica se já existe um usuário com o email fornecido no Firebase Auth.
 * Retorna o UID se existir, null caso contrário.
 */
export async function findUserByEmail(email: string): Promise<string | null> {
	try {
		const { adminAuth } = await import('@/lib/firebase/admin');
		const user = await adminAuth.getUserByEmail(email);
		return user.uid;
	} catch (e) {
		// auth/user-not-found é esperado quando o email não existe
		if ((e as { code?: string })?.code === 'auth/user-not-found') {
			return null;
		}
		console.error('[ValidatorRepository] Erro ao buscar usuário por email:', e);
		throw e;
	}
}

/**
 * Cria conta no Firebase Authentication e perfil no Firestore.
 *
 * FLUXO SEGuro:
 * 1. Verificar duplicidade de email
 * 2. Criar usuário no Firebase Auth
 * 3. Gravar perfil no Firestore com UID do Auth
 * 4. Se gravação falhar → marcar usuário como pendente (não deletar automaticamente)
 *
 * A senha é definida via Firebase Auth e NUNCA armazenada no Firestore.
 */
export async function createValidatorAccount(
	input: CreateValidatorInput,
): Promise<{ success: boolean; uid?: string; error?: string; pendingAuth?: boolean }> {
	try {
		const { adminAuth, adminDb } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');

		// 1. Verificar duplicidade
		const existingUid = await findUserByEmail(input.email);
		if (existingUid) {
			// Verificar se é um validador existente ou outro tipo de conta
			const existingDoc = await adminDb.collection(ADMINS_COLLECTION).doc(existingUid).get();
			if (existingDoc.exists) {
				return {
					success: false,
					error: `Já existe uma conta com este email (${input.email}).`,
				};
			}
			// Usuário existe no Auth mas sem perfil — pode ser órfão
			return {
				success: false,
				error: 'Email já cadastrado no sistema. Use outro email ou entre em contato com o suporte.',
			};
		}

		// 2. Criar usuário no Firebase Auth
		let authUid: string;
		try {
			const userRecord = await adminAuth.createUser({
				email: input.email,
				password: input.password,
				displayName: input.displayName,
				emailVerified: false,
			});
			authUid = userRecord.uid;
		} catch (e) {
			const code = (e as { code?: string })?.code;
			if (code === 'auth/email-already-exists') {
				return {
					success: false,
					error: 'Este email já está em uso por outra conta.',
				};
			}
			console.error('[ValidatorRepository] Falha ao criar usuário no Auth:', e);
			return {
				success: false,
				error: 'Erro ao criar conta de autenticação. Tente novamente.',
			};
		}

		// 3. Gravar perfil no Firestore
		try {
			await adminDb.collection(ADMINS_COLLECTION).doc(authUid).set({
				email: input.email,
				displayName: input.displayName,
				phone: input.phone || null,
				role: 'checkin_operator' as const,
				type: 'validator' as const,
				active: true,
				createdBy: input.createdBy,
				createdAt: FieldValue.serverTimestamp(),
				updatedAt: FieldValue.serverTimestamp(),
				lastLoginAt: null,
			});
		} catch (e) {
			// COMPENSAÇÃO: Auth criado mas Firestore falhou
			// Não deletamos automaticamente para evitar perda de dados
			// O admin pode tentar criar novamente — o sistema detectará o UID existente
			console.error('[ValidatorRepository] Falha ao gravar perfil após criação no Auth:', {
				authUid,
				email: input.email,
				error: e instanceof Error ? e.message : String(e),
			});
			return {
				success: false,
				pendingAuth: true,
				uid: authUid,
				error: 'Conta de autenticação criada, mas falha ao salvar perfil. Entre em contato com o suporte para regularizar.',
			};
		}

		console.log('[ValidatorRepository] Validador criado com sucesso.', {
			uid: authUid,
			email: input.email,
			createdBy: input.createdBy,
		});

		return { success: true, uid: authUid };
	} catch (e) {
		console.error('[ValidatorRepository] Erro inesperado ao criar validador:', e);
		return {
			success: false,
			error: 'Erro interno ao criar validador. Tente novamente.',
		};
	}
}

/**
 * Ativa ou desativa um validador.
 * Desativar impede imediatamente novas operações protegidas no servidor.
 */
export async function toggleValidatorStatus(
	uid: string,
	active: boolean,
	updatedBy: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');

		const doc = await adminDb.collection(ADMINS_COLLECTION).doc(uid).get();
		if (!doc.exists) {
			return { success: false, error: 'Validador não encontrado.' };
		}

		const data = doc.data();
		if (data?.type !== 'validator') {
			return { success: false, error: 'Esta conta não é um validador.' };
		}

		await adminDb.collection(ADMINS_COLLECTION).doc(uid).update({
			active,
			updatedAt: FieldValue.serverTimestamp(),
			updatedBy,
		});

		console.log('[ValidatorRepository] Status do validador atualizado.', {
			uid,
			active,
			updatedBy,
		});

		return { success: true };
	} catch (e) {
		console.error('[ValidatorRepository] Erro ao alterar status:', e);
		return { success: false, error: 'Erro ao alterar status do validador.' };
	}
}

/**
 * Registra último login do validador.
 * Chamado após autenticação bem-sucedida.
 */
export async function recordValidatorLogin(uid: string): Promise<void> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');

		await adminDb.collection(ADMINS_COLLECTION).doc(uid).update({
			lastLoginAt: FieldValue.serverTimestamp(),
		});
	} catch (e) {
		// Login registrado é observabilidade, não crítico
		console.warn('[ValidatorRepository] Falha ao registrar login:', e);
	}
}

/**
 * Recupera perfil de validador para recuperação de conta pendente.
 * Útil quando Auth foi criado mas Firestore falhou.
 */
export async function recoverPendingValidator(
	uid: string,
	displayName: string,
	phone: string | null,
	createdBy: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');

		// Verificar se já existe perfil
		const existing = await adminDb.collection(ADMINS_COLLECTION).doc(uid).get();
		if (existing.exists) {
			return { success: false, error: 'Perfil já existe para este UID.' };
		}

		await adminDb.collection(ADMINS_COLLECTION).doc(uid).set({
			displayName,
			phone: phone || null,
			role: 'checkin_operator' as const,
			type: 'validator' as const,
			active: true,
			createdBy,
			createdAt: FieldValue.serverTimestamp(),
			updatedAt: FieldValue.serverTimestamp(),
			lastLoginAt: null,
			recoveredAt: FieldValue.serverTimestamp(),
		});

		return { success: true };
	} catch (e) {
		console.error('[ValidatorRepository] Erro ao recuperar validador pendente:', e);
		return { success: false, error: 'Erro ao recuperar conta pendente.' };
	}
}