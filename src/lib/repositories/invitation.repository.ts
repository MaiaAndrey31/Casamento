/**
 * Repositório de Convites — Validação e consulta de convites personalizados.
 *
 * Leitura por token hash é server-side only (Security Rules bloqueiam leitura direta).
 * Criação e atualização são admin-only via Admin SDK.
 *
 * Quando Admin SDK não está configurado, operações de escrita retornam erro explícito.
 */

import type { Invitation, Guest } from '@/types';

const INVITATIONS_SUBCOLLECTION = 'invitations';
const GUESTS_SUBCOLLECTION = 'guests';

/**
 * Busca convite pelo hash do token de acesso.
 * Retorna null se não encontrado ou inativo.
 */
export async function getInvitationByTokenHash(
	eventId: string,
	tokenHash: string,
): Promise<{ invitation: Invitation; guests: Guest[] } | null> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');

		// Buscar convite pelo hash do token
		const snapshot = await adminDb
			.collection('events')
			.doc(eventId)
			.collection(INVITATIONS_SUBCOLLECTION)
			.where('tokenHash', '==', tokenHash)
			.where('invitationStatus', '==', 'active')
			.limit(1)
			.get();

		if (snapshot.empty) return null;

		const doc = snapshot.docs[0];
		const invitation = { id: doc.id, ...doc.data() } as Invitation;

		// Buscar convidados vinculados ao convite
		const guestsSnapshot = await adminDb
			.collection('events')
			.doc(eventId)
			.collection(GUESTS_SUBCOLLECTION)
			.where('invitationId', '==', invitation.id)
			.where('active', '==', true)
			.get();

		const guests = guestsSnapshot.docs.map(g => ({
			id: g.id,
			...g.data(),
		})) as Guest[];

		return { invitation, guests };
	} catch (e) {
		console.error('[InvitationRepository] Falha ao buscar convite por token:', e);
		return null;
	}
}

/**
 * Verifica se um token hash corresponde a um convite válido e ativo.
 * Versão leve sem buscar convidados (para validação rápida).
 */
export async function validateInvitationToken(
	eventId: string,
	tokenHash: string,
): Promise<{ valid: boolean; invitationId?: string; error?: string }> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');

		const snapshot = await adminDb
			.collection('events')
			.doc(eventId)
			.collection(INVITATIONS_SUBCOLLECTION)
			.where('tokenHash', '==', tokenHash)
			.where('invitationStatus', '==', 'active')
			.limit(1)
			.get();

		if (snapshot.empty) {
			return { valid: false, error: 'Convite não encontrado ou inativo.' };
		}

		const doc = snapshot.docs[0];
		const data = doc.data();

		// Verificar expiração do token
		if (data.tokenExpiresAt) {
			const expiresAt = new Date(data.tokenExpiresAt);
			if (expiresAt < new Date()) {
				return { valid: false, error: 'Este convite expirou.' };
			}
		}

		return { valid: true, invitationId: doc.id };
	} catch (e) {
		if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
			return {
				valid: false,
				error: 'Serviço de validação temporariamente indisponível. A Service Account do Firebase Admin SDK precisa ser configurada.',
			};
		}
		console.error('[InvitationRepository] Erro na validação:', e);
		return { valid: false, error: 'Erro interno ao validar convite.' };
	}
}

/**
 * Cria um novo convite com tokens seguros (admin only).
 * Gera dois tokens separados:
 * - token: para acesso ao convite personalizado (/convite/[token])
 * - checkInToken: token opaco exclusivo para QR Code de check-in
 *
 * Ambos os hashes são armazenados; os tokens originais NUNCA são persistidos.
 * Requer Admin SDK configurado.
 */
export async function createInvitation(
	eventId: string,
	data: {
		displayName: string;
		maxCompanions: number;
		category: Invitation['category'];
		guestIds: string[];
	},
): Promise<{ success: boolean; token?: string; checkInToken?: string; invitationId?: string; error?: string }> {
	if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
		return {
			success: false,
			error: 'Firebase Admin SDK não configurado. Adicione FIREBASE_SERVICE_ACCOUNT_JSON ou GOOGLE_APPLICATION_CREDENTIALS ao .env.local para criar convites.',
		};
	}

	try {
		const { adminDb, generateSecureToken, hashToken } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');

		// Token de acesso ao convite
		const token = generateSecureToken();
		const tokenHash = await hashToken(token);

		// Token opaco exclusivo para check-in (QR Code)
		const checkInToken = generateSecureToken();
		const checkInTokenHash = await hashToken(checkInToken);

		const ref = adminDb
			.collection('events')
			.doc(eventId)
			.collection(INVITATIONS_SUBCOLLECTION);

		const docRef = await ref.add({
			eventId,
			displayName: data.displayName,
			guestIds: data.guestIds,
			maxCompanions: data.maxCompanions,
			invitationStatus: 'active' as const,
			tokenHash,
			checkInTokenHash,
			tokenExpiresAt: null, // Sem expiração por padrão
			category: data.category,
			createdAt: FieldValue.serverTimestamp(),
			updatedAt: FieldValue.serverTimestamp(),
		});

		return { success: true, token, checkInToken, invitationId: docRef.id };
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';
		console.error('[InvitationRepository] Falha ao criar convite:', message);
		return { success: false, error: message };
	}
}

/**
 * Regenera o token de check-in de um convite existente.
 * Invalida o QR Code anterior substituindo o hash no Firestore.
 * Retorna o novo checkInToken (deve ser entregue ao convidado imediatamente).
 *
 * SEGURANÇA: O token antigo deixa de funcionar assim que o hash é substituído.
 */
export async function regenerateCheckInToken(
	eventId: string,
	invitationId: string,
): Promise<{ success: boolean; checkInToken?: string; error?: string }> {
	if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
		return {
			success: false,
			error: 'Firebase Admin SDK não configurado.',
		};
	}

	try {
		const { adminDb, generateSecureToken, hashToken } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');

		// Verificar se o convite existe
		const docRef = adminDb
			.collection('events')
			.doc(eventId)
			.collection(INVITATIONS_SUBCOLLECTION)
			.doc(invitationId);

		const doc = await docRef.get();
		if (!doc.exists) {
			return { success: false, error: 'Convite não encontrado.' };
		}

		// Gerar novo token e hash
		const newCheckInToken = generateSecureToken();
		const newCheckInTokenHash = await hashToken(newCheckInToken);

		// Substituir hash (invalida QR Code anterior atomicamente)
		await docRef.update({
			checkInTokenHash: newCheckInTokenHash,
			updatedAt: FieldValue.serverTimestamp(),
		});

		return { success: true, checkInToken: newCheckInToken };
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';
		console.error('[InvitationRepository] Falha ao regenerar checkInToken:', message);
		return { success: false, error: message };
	}
}

/**
 * Migração segura: adiciona checkInTokenHash a convites existentes que não possuem.
 * Gera token novo para cada convite sem checkInTokenHash.
 * Retorna mapa de invitationId → checkInToken para entrega aos convidados.
 *
 * Idempotente: ignora convites que já possuem checkInTokenHash.
 */
export async function migrateCheckInTokens(
	eventId: string,
): Promise<{ migrated: number; tokens: Record<string, string>; error?: string }> {
	if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
		return { migrated: 0, tokens: {}, error: 'Firebase Admin SDK não configurado.' };
	}

	try {
		const { adminDb, generateSecureToken, hashToken } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');

		// Buscar todos os convites ativos
		const snapshot = await adminDb
			.collection('events')
			.doc(eventId)
			.collection(INVITATIONS_SUBCOLLECTION)
			.where('invitationStatus', '==', 'active')
			.get();

		const tokens: Record<string, string> = {};
		let migrated = 0;

		for (const doc of snapshot.docs) {
			const data = doc.data();

			// Pular convites que já possuem checkInTokenHash
			if (data.checkInTokenHash) continue;

			// Gerar novo token de check-in
			const checkInToken = generateSecureToken();
			const checkInTokenHash = await hashToken(checkInToken);

			// Atualizar documento
			await doc.ref.update({
				checkInTokenHash,
				updatedAt: FieldValue.serverTimestamp(),
			});

			tokens[doc.id] = checkInToken;
			migrated++;
		}

		return { migrated, tokens };
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';
		console.error('[InvitationRepository] Falha na migração de checkInTokens:', message);
		return { migrated: 0, tokens: {}, error: message };
	}
}