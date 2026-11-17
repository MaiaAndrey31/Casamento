'use server';

/**
 * Verificação de Sessão Administrativa e de Validador
 *
 * Valida token de ID do Firebase e verifica permissão na coleção `admins/{uid}`.
 * Retorna o perfil completo (role real + type) ou lança erro se não autorizado.
 *
 * CORREÇÃO: anteriormente retornava role: 'admin' hardcoded.
 * Agora lê o campo `role` real do documento Firestore.
 *
 * COMPATIBILIDADE: documentos legados sem `type` são tratados como `type: 'admin'`.
 * Documentos sem `role` mas com `active: true` são tratados como `role: 'owner'`
 * para preservar acesso dos primeiros administradores criados via seed.
 */

import { cookies } from 'next/headers';
import type { AdminRole, AccountType } from '@/types';

export interface AdminSession {
	uid: string;
	email: string;
	role: AdminRole;
	type: AccountType;
}

/**
 * Obtém a sessão administrativa atual (apenas admins, não validadores).
 * Retorna null se não houver sessão válida ou se o usuário for apenas validador.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
	try {
 const cookieStore = await cookies();
 const sessionToken = cookieStore.get('__session')?.value;

 if (!sessionToken) return null;

 const { adminAuth, getAdminProfile } = await import('@/lib/firebase/admin');

 // Verificar token de ID
 const decoded = await adminAuth.verifyIdToken(sessionToken);

 // Obter perfil completo do admin
 const profile = await getAdminProfile(decoded.uid);
 if (!profile || !profile.active) return null;

 // Apenas contas tipo 'admin' passam nesta verificação
 if (profile.type !== 'admin') return null;

 return {
 uid: decoded.uid,
 email: decoded.email || '',
 role: profile.role,
 type: profile.type,
 };
	} catch {
 return null;
	}
}

/**
 * Exige sessão administrativa válida (apenas admins).
 * Lança erro se não autenticado, não autorizado ou se for apenas validador.
 */
export async function requireAdminSession(): Promise<AdminSession> {
	const session = await getAdminSession();

	if (!session) {
 throw new Error('UNAUTHORIZED: Sessão administrativa inválida ou expirada.');
	}

	return session;
}

/**
 * Obtém a sessão de validador (checkin_operator) OU admin owner.
 * Noivos (owner) têm acesso total; validadores têm acesso restrito.
 * Retorna null se não houver sessão válida ou permissão insuficiente.
 */
export async function getValidatorSession(): Promise<AdminSession | null> {
	try {
 const cookieStore = await cookies();
 const sessionToken = cookieStore.get('__session')?.value;

 if (!sessionToken) return null;

 const { adminAuth, getAdminProfile } = await import('@/lib/firebase/admin');

 const decoded = await adminAuth.verifyIdToken(sessionToken);
 const profile = await getAdminProfile(decoded.uid);

 if (!profile || !profile.active) return null;

 // Owner tem acesso total (inclui painel do validador)
 if (profile.role === 'owner') {
 return {
 uid: decoded.uid,
 email: decoded.email || '',
 role: profile.role,
 type: profile.type,
 };
 }

 // Checkin operator ou validator type
 if (profile.role === 'checkin_operator' || profile.type === 'validator') {
 return {
 uid: decoded.uid,
 email: decoded.email || '',
 role: profile.role,
 type: profile.type,
 };
 }

 return null;
	} catch {
 return null;
	}
}

/**
 * Exige sessão de validador (checkin_operator ou owner).
 * Lança erro se não autenticado ou sem permissão de check-in.
 */
export async function requireValidatorSession(): Promise<AdminSession> {
	const session = await getValidatorSession();

	if (!session) {
 throw new Error('UNAUTHORIZED: Sessão de validador inválida ou sem permissão de check-in.');
	}

	return session;
}