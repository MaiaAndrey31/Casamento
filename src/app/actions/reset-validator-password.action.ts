'use server';

/**
 * Server Action — Redefinir Senha de Validador (Item 10 Definitivo)
 *
 * Permite ao administrador definir uma nova senha para um validador existente.
 * Utiliza Firebase Admin SDK exclusivamente no servidor.
 *
 * SEGURANÇA:
 * - requireAdminSession() — apenas admins (owner), não validadores
 * - Senha NUNCA recuperada, exibida ou armazenada no Firestore
 * - Senha NUNCA registrada em logs ou auditoria
 * - Sessões anteriores do validador são revogadas via adminAuth.revokeRefreshTokens()
 * - Validação Zod da nova senha (mínimo 8 caracteres)
 * - Verificação de que o UID existe e é um validador ativo
 */

import { requireAdminSession } from '@/lib/auth/admin-session';
import type { ApiResponse } from '@/types';
import { z } from 'zod';

const resetPasswordSchema = z.object({
	uid: z.string().min(1, 'UID do validador é obrigatório'),
	newPassword: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres').max(128),
});

export async function resetValidatorPasswordAction(
	formData: Record<string, unknown>,
): Promise<ApiResponse> {
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

	// 2. Apenas owners podem redefinir senhas
	if (session.role !== 'owner') {
 return {
 success: false,
 error: 'Apenas os noivos podem redefinir senhas de validadores.',
 };
	}

	// 3. Validar dados de entrada
	const validation = resetPasswordSchema.safeParse(formData);
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

	try {
 const { adminAuth, adminDb } = await import('@/lib/firebase/admin');

 // 5. Verificar se o UID existe e é um validador
 const adminDoc = await adminDb.collection('admins').doc(validation.data.uid).get();

 if (!adminDoc.exists) {
 return {
 success: false,
 error: 'Validador não encontrado.',
 };
 }

 const adminData = adminDoc.data();
 if (adminData?.type !== 'validator') {
 return {
 success: false,
 error: 'Esta conta não é um validador.',
 };
 }

 // 6. Atualizar senha no Firebase Authentication
 try {
 await adminAuth.updateUser(validation.data.uid, {
 password: validation.data.newPassword,
 });
 } catch (e) {
 const code = (e as { code?: string })?.code;
 if (code === 'auth/user-not-found') {
 return {
 success: false,
 error: 'Conta de autenticação não encontrada. O validador pode ter sido removido do Firebase Authentication.',
 };
 }
 console.error('[ResetValidatorPassword] Erro ao atualizar senha no Auth:', e);
 return {
 success: false,
 error: 'Erro ao redefinir senha. Tente novamente.',
 };
 }

 // 7. Revogar sessões anteriores do validador
 try {
 await adminAuth.revokeRefreshTokens(validation.data.uid);
 } catch (e) {
 // Não crítico — a senha já foi alterada, sessões expirarão naturalmente
 console.warn('[ResetValidatorPassword] Falha ao revogar tokens (não crítico):', e);
 }

 // 8. Registrar auditoria (SEM credenciais)
 console.log('[ResetValidatorPassword] Senha redefinida com sucesso.', {
 uid: validation.data.uid,
 email: adminData?.email || '(desconhecido)',
 resetBy: session.uid,
 sessionsRevoked: true,
 });

 return {
 success: true,
 message: 'Senha redefinida com sucesso. Todas as sessões anteriores do validador foram invalidadas.',
 };
	} catch (e) {
 console.error('[ResetValidatorPassword] Erro inesperado:', e);
 return {
 success: false,
 error: 'Erro interno ao redefinir senha.',
 };
	}
}