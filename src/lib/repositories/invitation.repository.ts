/**
 * Repositório de Convites — Validação e consulta de convites personalizados.
 *
 * Leitura por token hash é server-side only (Security Rules bloqueiam leitura direta).
 * Criação e atualização são admin-only via Admin SDK.
 *
 * SERIALIZAÇÃO: Todos os retornos passam por serializeFirestoreValue() para garantir
 * que objetos Firestore Timestamp sejam convertidos em strings ISO 8601 antes
 * de atravessar a fronteira Server Component → Client Component.
 */

import type { Invitation, Guest } from '@/types';
import { serializeFirestoreValue } from '@/lib/server/firestore-serializer';

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
 // Serializar documento bruto do Firestore Admin SDK para objeto seguro
 const invitation = { id: doc.id, ...(serializeFirestoreValue(doc.data(), 'invitation') as Record<string, unknown>) } as Invitation;

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
 ...(serializeFirestoreValue(g.data(), `guest.${g.id}`) as Record<string, unknown>),
 })) as Guest[];

 return { invitation, guests };
	} catch (e) {
 console.error('[InvitationRepository] Falha ao buscar convite por token:', e);
 return null;
	}
}

/**
 * Valida token de convite e retorna dados autorizados.
 * Verifica expiração e status ativo.
 */
export async function validateInvitationToken(
	eventId: string,
	tokenHash: string,
): Promise<{ valid: boolean; invitation?: Invitation; guests?: Guest[]; error?: string }> {
	try {
 const { adminDb } = await import('@/lib/firebase/admin');

 const snapshot = await adminDb
 .collection('events')
 .doc(eventId)
 .collection(INVITATIONS_SUBCOLLECTION)
 .where('tokenHash', '==', tokenHash)
 .limit(1)
 .get();

 if (snapshot.empty) {
 return { valid: false, error: 'Convite não encontrado.' };
 }

 const doc = snapshot.docs[0];
 const data = serializeFirestoreValue(doc.data(), 'validateInvitation') as Record<string, unknown>;

 // Verificar expiração do token
 const expiresAt = data.tokenExpiresAt ? new Date(data.tokenExpiresAt as string) : null;
 if (expiresAt && expiresAt < new Date()) {
 return { valid: false, error: 'Este convite expirou.' };
 }

 // Verificar status
 if (data.invitationStatus !== 'active') {
 return { valid: false, error: 'Este convite não está mais ativo.' };
 }

 const invitation = { id: doc.id, ...data } as Invitation;

 // Buscar convidados
 const guestsSnapshot = await adminDb
 .collection('events')
 .doc(eventId)
 .collection(GUESTS_SUBCOLLECTION)
 .where('invitationId', '==', invitation.id)
 .where('active', '==', true)
 .get();

 const guests = guestsSnapshot.docs.map(g => ({
 id: g.id,
 ...(serializeFirestoreValue(g.data(), `validateGuest.${g.id}`) as Record<string, unknown>),
 })) as Guest[];

 return { valid: true, invitation, guests };
	} catch (e) {
 console.error('[InvitationRepository] Falha ao validar token:', e);
 return { valid: false, error: 'Erro interno ao validar convite.' };
	}
}

/**
 * Cria um novo convite personalizado.
 * Admin only — requer Admin SDK.
 */
export async function createInvitation(
	eventId: string,
	data: {
 displayName: string;
 guestIds: string[];
 maxCompanions: number;
 category: string;
 tokenHash: string;
 encryptedToken?: string;
 tokenExpiresAt: Date;
 },
): Promise<{ success: boolean; invitationId?: string; error?: string }> {
	try {
 const { adminDb } = await import('@/lib/firebase/admin');
 const { FieldValue } = await import('firebase-admin/firestore');

 const ref = adminDb
 .collection('events')
 .doc(eventId)
 .collection(INVITATIONS_SUBCOLLECTION)
 .doc();

 await ref.set({
 eventId,
 displayName: data.displayName,
 guestIds: data.guestIds,
 maxCompanions: data.maxCompanions,
 category: data.category,
 tokenHash: data.tokenHash,
 encryptedToken: data.encryptedToken || null,
 tokenExpiresAt: data.tokenExpiresAt,
 invitationStatus: 'active',
 createdAt: FieldValue.serverTimestamp(),
 updatedAt: FieldValue.serverTimestamp(),
 });

 // Vincular convite aos convidados
 for (const guestId of data.guestIds) {
 await adminDb
 .collection('events')
 .doc(eventId)
 .collection(GUESTS_SUBCOLLECTION)
 .doc(guestId)
 .update({ invitationId: ref.id, updatedAt: FieldValue.serverTimestamp() });
 }

 return { success: true, invitationId: ref.id };
	} catch (e) {
 const message = e instanceof Error ? e.message : 'Erro desconhecido';
 console.error('[InvitationRepository] Falha ao criar convite:', message);
 return { success: false, error: message };
	}
}

/**
 * Regenera token de convite existente.
 * Preserva RSVPs e dados do convidado.
 */
export async function regenerateInvitationToken(
	eventId: string,
	invitationId: string,
	newTokenHash: string,
	newEncryptedToken: string,
	newExpiresAt: Date,
	adminUid: string,
): Promise<{ success: boolean; error?: string }> {
	try {
 const { adminDb } = await import('@/lib/firebase/admin');
 const { FieldValue } = await import('firebase-admin/firestore');

 await adminDb
 .collection('events')
 .doc(eventId)
 .collection(INVITATIONS_SUBCOLLECTION)
 .doc(invitationId)
 .update({
 tokenHash: newTokenHash,
 encryptedToken: newEncryptedToken,
 tokenExpiresAt: newExpiresAt,
 regeneratedAt: FieldValue.serverTimestamp(),
 regeneratedBy: adminUid,
 updatedAt: FieldValue.serverTimestamp(),
 });

 return { success: true };
	} catch (e) {
 const message = e instanceof Error ? e.message : 'Erro desconhecido';
 console.error('[InvitationRepository] Falha ao regenerar token:', message);
 return { success: false, error: message };
	}
}

/**
 * Desativa um convite (soft delete).
 * Preserva dados históricos e RSVPs.
 */
export async function deactivateInvitation(
	eventId: string,
	invitationId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
 const { adminDb } = await import('@/lib/firebase/admin');
 const { FieldValue } = await import('firebase-admin/firestore');

 await adminDb
 .collection('events')
 .doc(eventId)
 .collection(INVITATIONS_SUBCOLLECTION)
 .doc(invitationId)
 .update({
 invitationStatus: 'revoked',
 updatedAt: FieldValue.serverTimestamp(),
 });

 return { success: true };
	} catch (e) {
 const message = e instanceof Error ? e.message : 'Erro desconhecido';
 console.error('[InvitationRepository] Falha ao desativar convite:', message);
 return { success: false, error: message };
	}
}

/**
 * Gera check-in tokens para convites ativos que ainda não possuem.
 * Usado na preparação pré-evento.
 */
export async function generateCheckInTokens(
	eventId: string,
	generateTokenFn: () => { plain: string; hash: string },
): Promise<{ generated: number; errors: string[] }> {
	try {
 const { adminDb } = await import('@/lib/firebase/admin');
 const { FieldValue } = await import('firebase-admin/firestore');

 const snapshot = await adminDb
 .collection('events')
 .doc(eventId)
 .collection(INVITATIONS_SUBCOLLECTION)
 .where('invitationStatus', '==', 'active')
 .get();

 let generated = 0;
 const errors: string[] = [];

 for (const doc of snapshot.docs) {
 const data = serializeFirestoreValue(doc.data(), `checkin.${doc.id}`) as Record<string, unknown>;

 // Pular convites que já possuem checkInTokenHash
 if (data.checkInTokenHash) continue;

 try {
 const { plain, hash } = generateTokenFn();

 await adminDb
 .collection('events')
 .doc(eventId)
 .collection(INVITATIONS_SUBCOLLECTION)
 .doc(doc.id)
 .update({
 checkInTokenHash: hash,
 checkInTokenGeneratedAt: FieldValue.serverTimestamp(),
 updatedAt: FieldValue.serverTimestamp(),
 });

 generated++;
 } catch (e) {
 errors.push(`Convite ${doc.id}: ${e instanceof Error ? e.message : 'Erro desconhecido'}`);
 }
 }

 return { generated, errors };
	} catch (e) {
 console.error('[InvitationRepository] Falha ao gerar check-in tokens:', e);
 return { generated: 0, errors: [e instanceof Error ? e.message : 'Erro desconhecido'] };
	}
}