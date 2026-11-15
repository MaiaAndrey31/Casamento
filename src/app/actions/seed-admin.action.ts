'use server';

/**
 * Server Action — Seed do Primeiro Administrador
 *
 * Cria o primeiro admin na coleção `admins/{uid}` usando o UID
 * de um usuário já existente no Firebase Authentication.
 *
 * SEGURANÇA: Esta ação deve ser executada APENAS uma vez durante setup inicial.
 * Após criar o primeiro admin, considere remover ou desabilitar este endpoint.
 *
 * Como usar:
 * 1. Crie um usuário via Firebase Console → Authentication → Add User
 * 2. Copie o UID do usuário criado
 * 3. Execute esta action com o UID e role desejado
 */

import type { ApiResponse, AdminRole } from '@/types';

export async function seedFirstAdmin(
	uid: string,
	email: string,
	displayName: string,
	role: AdminRole = 'owner',
): Promise<ApiResponse<{ uid: string; role: AdminRole }>> {
	// Verificar se Admin SDK está configurado
	if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
 return {
 success: false,
 error: 'Firebase Admin SDK não configurado.',
 };
	}

	// Validar entrada
	if (!uid || uid.length < 10) {
 return {
 success: false,
 error: 'UID inválido. Obtenha o UID correto no Firebase Console → Authentication.',
 };
	}

	try {
 const { adminDb } = await import('@/lib/firebase/admin');
 const { FieldValue } = await import('firebase-admin/firestore');

 // Verificar se já existe algum admin (prevenir criação acidental de múltiplos owners)
 const existingAdmins = await adminDb.collection('admins').where('role', '==', 'owner').count().get();

 if (existingAdmins.data().count > 0 && role === 'owner') {
 return {
 success: false,
 error: 'Já existe um administrador owner. Use role "editor" ou "viewer" para admins adicionais.',
 };
 }

 // Verificar se o UID já tem documento de admin
 const existingDoc = await adminDb.collection('admins').doc(uid).get();
 if (existingDoc.exists) {
 return {
 success: false,
 error: `Usuário ${uid} já possui documento de admin com role "${existingDoc.data()?.role}".`,
 };
 }

 // Criar documento do admin
 await adminDb.collection('admins').doc(uid).set({
 email,
 displayName,
 role,
 active: true,
 createdAt: FieldValue.serverTimestamp(),
 });

 return {
 success: true,
 data: { uid, role },
 message: `Administrador "${displayName}" (${email}) criado com sucesso como ${role}.`,
 };
	} catch (e) {
 const message = e instanceof Error ? e.message : 'Erro desconhecido';
 console.error('[SeedAdmin] Falha ao criar admin:', message);
 return { success: false, error: message };
	}
}