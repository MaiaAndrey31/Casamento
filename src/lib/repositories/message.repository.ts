/**
 * Repositório de Mensagens — Persistência e moderação de recados no Firestore.
 *
 * Operações públicas (criação) usam Client SDK com validação server-side via Server Action.
 * Operações administrativas (moderação, listagem completa) usam Admin SDK.
 *
 * SERIALIZAÇÃO: getApprovedMessages usa Client SDK (dados já serializáveis).
 * Funções admin que retornam dados para Client Components devem usar serializeFirestoreValue().
 */

import type { Message, ModerationStatus } from '@/types';
import { serializeFirestoreValue } from '@/lib/server/firestore-serializer';

const MESSAGES_SUBCOLLECTION = 'messages';

/**
 * Cria uma nova mensagem com status 'pending'.
 * Operação pública — não requer autenticação admin, mas deve ser chamada
 * apenas via Server Action que valida os dados com Zod.
 */
export async function createMessage(
	eventId: string,
	data: { authorName: string; message: string; invitationId?: string },
): Promise<{ success: boolean; id?: string; error?: string }> {
	try {
 const { adminDb } = await import('@/lib/firebase/admin');
 const { FieldValue } = await import('firebase-admin/firestore');

 const ref = adminDb
 .collection('events')
 .doc(eventId)
 .collection(MESSAGES_SUBCOLLECTION);

 const docRef = await ref.add({
 ...data,
 moderationStatus: 'pending' as ModerationStatus,
 createdAt: FieldValue.serverTimestamp(),
 });

 return { success: true, id: docRef.id };
	} catch (e) {
 // Fallback para Client SDK quando Admin não está configurado
 try {
 const { db } = await import('@/lib/firebase/client');
 const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');

 const ref = collection(db, 'events', eventId, MESSAGES_SUBCOLLECTION);
 const docRef = await addDoc(ref, {
 ...data,
 moderationStatus: 'pending' as ModerationStatus,
 createdAt: serverTimestamp(),
 });

 return { success: true, id: docRef.id };
 } catch (clientError) {
 const message = clientError instanceof Error ? clientError.message : 'Erro desconhecido';
 console.error('[MessageRepository] Falha ao criar mensagem:', message);
 return { success: false, error: message };
 }
	}
}

/**
 * Lista mensagens aprovadas para exibição pública.
 * Leitura pública permitida pelas Security Rules.
 * Usa Client SDK — dados já são serializáveis por React Server Components.
 */
export async function getApprovedMessages(
	eventId: string,
	limitCount: number = 20,
): Promise<Message[]> {
	try {
 const { db } = await import('@/lib/firebase/client');
 const {
 collection,
 query,
 where,
 orderBy,
 limit,
 getDocs,
 } = await import('firebase/firestore');

 const q = query(
 collection(db, 'events', eventId, MESSAGES_SUBCOLLECTION),
 where('moderationStatus', '==', 'approved'),
 orderBy('createdAt', 'desc'),
 limit(limitCount),
 );

 const snapshot = await getDocs(q);
 return snapshot.docs.map(doc => ({
 id: doc.id,
 eventId,
 ...doc.data(),
 })) as Message[];
	} catch (e) {
 console.warn('[MessageRepository] Falha ao listar mensagens aprovadas:', e);
 return [];
	}
}

/**
 * Lista todas as mensagens para moderação (admin only).
 * Retorna dados serializados para uso seguro em Client Components.
 */
export async function getAllMessagesForModeration(
	eventId: string,
): Promise<Message[]> {
	try {
 const { adminDb } = await import('@/lib/firebase/admin');

 const snapshot = await adminDb
 .collection('events')
 .doc(eventId)
 .collection(MESSAGES_SUBCOLLECTION)
 .orderBy('createdAt', 'desc')
 .limit(200)
 .get();

 return snapshot.docs.map(doc => ({
 id: doc.id,
 eventId,
 ...(serializeFirestoreValue(doc.data(), `message.${doc.id}`) as Record<string, unknown>),
 })) as Message[];
	} catch (e) {
 console.error('[MessageRepository] Falha ao listar mensagens para moderação:', e);
 return [];
	}
}

/**
 * Atualiza o status de moderação de uma mensagem (admin only).
 */
export async function moderateMessage(
	eventId: string,
	messageId: string,
	status: ModerationStatus,
	adminUid: string,
): Promise<{ success: boolean; error?: string }> {
	try {
 const { adminDb } = await import('@/lib/firebase/admin');
 const { FieldValue } = await import('firebase-admin/firestore');

 await adminDb
 .collection('events')
 .doc(eventId)
 .collection(MESSAGES_SUBCOLLECTION)
 .doc(messageId)
 .update({
 moderationStatus: status,
 ...(status === 'approved'
 ? { approvedAt: FieldValue.serverTimestamp(), approvedBy: adminUid }
 : {}),
 });

 return { success: true };
	} catch (e) {
 const message = e instanceof Error ? e.message : 'Erro desconhecido';
 console.error('[MessageRepository] Falha ao moderar mensagem:', message);
 return { success: false, error: message };
	}
}

/**
 * Verifica rate limiting simples por IP/nome.
 * Retorna true se o limite foi excedido.
 * Implementação básica usando contagem recente no Firestore.
 */
export async function isRateLimited(
	eventId: string,
	identifier: string,
	maxPerHour: number = 3,
): Promise<boolean> {
	try {
 const { adminDb } = await import('@/lib/firebase/admin');
 const { Timestamp } = await import('firebase-admin/firestore');

 const oneHourAgo = Timestamp.fromDate(new Date(Date.now() - 3600_000));

 const snapshot = await adminDb
 .collection('events')
 .doc(eventId)
 .collection(MESSAGES_SUBCOLLECTION)
 .where('authorName', '==', identifier)
 .where('createdAt', '>=', oneHourAgo)
 .count()
 .get();

 return (snapshot.data().count ?? 0) >= maxPerHour;
	} catch {
 // Se Admin não estiver configurado, não bloquear (Client SDK não suporta count efficiently)
 return false;
	}
}