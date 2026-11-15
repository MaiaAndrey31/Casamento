'use server';

/**
 * Verificação de Sessão Administrativa
 *
 * Valida token de ID do Firebase e verifica permissão na coleção `admins/{uid}`.
 * Retorna o UID do admin autenticado ou lança erro se não autorizado.
 */

import { cookies } from 'next/headers';

export interface AdminSession {
	uid: string;
	email: string;
	role: string;
}

/**
 * Obtém a sessão administrativa atual.
 * Retorna null se não houver sessão válida.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
	try {
 const cookieStore = await cookies();
 const sessionToken = cookieStore.get('__session')?.value;

 if (!sessionToken) return null;

 const { adminAuth, isAdmin } = await import('@/lib/firebase/admin');

 // Verificar token de ID
 const decoded = await adminAuth.verifyIdToken(sessionToken);

 // Verificar se é admin autorizado
 const authorized = await isAdmin(decoded.uid);
 if (!authorized) return null;

 return {
 uid: decoded.uid,
 email: decoded.email || '',
 role: 'admin',
 };
	} catch {
 return null;
	}
}

/**
 * Exige sessão administrativa válida.
 * Lança erro se não autenticado ou não autorizado.
 */
export async function requireAdminSession(): Promise<AdminSession> {
	const session = await getAdminSession();

	if (!session) {
 throw new Error('UNAUTHORIZED: Sessão administrativa inválida ou expirada.');
	}

	return session;
}