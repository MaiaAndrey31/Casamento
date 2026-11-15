/**
 * Repositório de Check-in — Registro de entrada no evento.
 *
 * Utiliza transações do Firestore para evitar registros duplicados
 * em leituras simultâneas de QR Code.
 *
 * O QR Code contém um token opaco (checkInToken), NUNCA o invitationId diretamente.
 * O hash do token é armazenado no convite e usado para validação.
 */

import type { CheckIn } from '@/types';

const CHECKINS_SUBCOLLECTION = 'checkins';
const INVITATIONS_SUBCOLLECTION = 'invitations';
const GUESTS_SUBCOLLECTION = 'guests';

export interface CheckInResult {
	success: boolean;
	guestName?: string;
	invitationDisplayName?: string;
	alreadyCheckedIn?: boolean;
	checkedInAt?: string;
	error?: string;
}

/**
 * Realiza o check-in de um convidado usando o token opaco do QR Code.
 *
 * Fluxo:
 * 1. Busca convite pelo hash do checkInToken
 * 2. Verifica se já existe check-in para este convidado
 * 3. Registra entrada via transação (previne duplicidade)
 * 4. Retorna dados do convidado para feedback visual
 */
export async function performCheckIn(
	eventId: string,
	checkInToken: string,
	adminUid: string,
): Promise<CheckInResult> {
	try {
 const { adminDb, hashToken } = await import('@/lib/firebase/admin');
 const { FieldValue } = await import('firebase-admin/firestore');

 // 1. Gerar hash do token para busca segura
 const tokenHash = await hashToken(checkInToken);

 // 2. Buscar convite pelo hash do checkInToken
 const invitationSnapshot = await adminDb
 .collection('events')
 .doc(eventId)
 .collection(INVITATIONS_SUBCOLLECTION)
 .where('checkInTokenHash', '==', tokenHash)
 .where('invitationStatus', '==', 'active')
 .limit(1)
 .get();

 if (invitationSnapshot.empty) {
 return { success: false, error: 'QR Code inválido ou convite não encontrado.' };
 }

 const invitationDoc = invitationSnapshot.docs[0];
 const invitation = invitationDoc.data();
 const invitationId = invitationDoc.id;

 // 3. Buscar convidados vinculados ao convite
 const guestsSnapshot = await adminDb
 .collection('events')
 .doc(eventId)
 .collection(GUESTS_SUBCOLLECTION)
 .where('invitationId', '==', invitationId)
 .where('active', '==', true)
 .get();

 if (guestsSnapshot.empty) {
 return { success: false, error: 'Nenhum convidado vinculado a este convite.' };
 }

 // 4. Verificar check-ins existentes para este convite
 const existingCheckIns = await adminDb
 .collection('events')
 .doc(eventId)
 .collection(CHECKINS_SUBCOLLECTION)
 .where('invitationId', '==', invitationId)
 .get();

 const checkedInGuestIds = new Set(existingCheckIns.docs.map(d => d.data().guestId));

 // Encontrar o primeiro convidado que ainda não fez check-in
 let targetGuest: { id: string; fullName: string } | null = null;
 for (const guestDoc of guestsSnapshot.docs) {
 const guestData = guestDoc.data();
 if (!checkedInGuestIds.has(guestDoc.id)) {
 targetGuest = { id: guestDoc.id, fullName: guestData.fullName };
 break;
 }
 }

 if (!targetGuest) {
 // Todos os convidados deste convite já fizeram check-in
 const lastCheckIn = existingCheckIns.docs[existingCheckIns.docs.length - 1];
 return {
 success: false,
 alreadyCheckedIn: true,
 invitationDisplayName: invitation.displayName,
 guestName: guestsSnapshot.docs[0]?.data()?.fullName,
 checkedInAt: lastCheckIn?.data()?.checkedInAt?.toDate?.()?.toISOString(),
 error: 'Todos os convidados deste convite já realizaram check-in.',
 };
 }

 // 5. Registrar check-in via transação (previne duplicidade em leituras simultâneas)
 const checkInRef = adminDb
 .collection('events')
 .doc(eventId)
 .collection(CHECKINS_SUBCOLLECTION)
 .doc(); // ID auto-gerado

 await adminDb.runTransaction(async (transaction) => {
 // Re-verificar dentro da transação se já existe check-in para este convidado
 const existingForGuest = await adminDb
 .collection('events')
 .doc(eventId)
 .collection(CHECKINS_SUBCOLLECTION)
 .where('guestId', '==', targetGuest!.id)
 .where('invitationId', '==', invitationId)
 .count()
 .get();

 if ((existingForGuest.data().count ?? 0) > 0) {
 throw new Error('DUPLICATE: Check-in já realizado para este convidado.');
 }

 transaction.set(checkInRef, {
 eventId,
 invitationId,
 guestId: targetGuest!.id,
 checkedInAt: FieldValue.serverTimestamp(),
 checkedInBy: adminUid,
 status: 'valid' as const,
 });
 });

 return {
 success: true,
 guestName: targetGuest.fullName,
 invitationDisplayName: invitation.displayName,
 };
	} catch (e) {
 if (e instanceof Error && e.message.startsWith('DUPLICATE:')) {
 return {
 success: false,
 alreadyCheckedIn: true,
 error: 'Check-in duplicado detectado. Este convidado já entrou no evento.',
 };
 }

 console.error('[CheckInRepository] Erro no check-in:', e);
 return { success: false, error: 'Erro interno ao processar check-in.' };
	}
}

/**
 * Busca manual de convidado por nome (fallback quando QR Code falha).
 */
export async function searchGuestForCheckIn(
	eventId: string,
	searchTerm: string,
): Promise<Array<{ id: string; fullName: string; invitationDisplayName: string; checkedIn: boolean }>> {
	try {
 const { adminDb } = await import('@/lib/firebase/admin');

 const normalizedSearch = searchTerm
 .toLowerCase()
 .normalize('NFD')
 .replace(/[̀-ͯ]/g, '')
 .trim();

 const guestsSnapshot = await adminDb
 .collection('events')
 .doc(eventId)
 .collection(GUESTS_SUBCOLLECTION)
 .where('active', '==', true)
 .orderBy('fullName')
 .limit(20)
 .get();

 const results: Array<{ id: string; fullName: string; invitationDisplayName: string; checkedIn: boolean }> = [];

 for (const guestDoc of guestsSnapshot.docs) {
 const guest = guestDoc.data();
 const normalizedName = guest.normalizedName || guest.fullName.toLowerCase();

 if (normalizedName.includes(normalizedSearch)) {
 // Verificar se já fez check-in
 const checkInSnapshot = await adminDb
 .collection('events')
 .doc(eventId)
 .collection(CHECKINS_SUBCOLLECTION)
 .where('guestId', '==', guestDoc.id)
 .count()
 .get();

 // Buscar nome do convite
 let invitationDisplayName = '';
 if (guest.invitationId) {
 const invDoc = await adminDb
 .collection('events')
 .doc(eventId)
 .collection(INVITATIONS_SUBCOLLECTION)
 .doc(guest.invitationId)
 .get();
 invitationDisplayName = invDoc.exists ? invDoc.data()?.displayName : '';
 }

 results.push({
 id: guestDoc.id,
 fullName: guest.fullName,
 invitationDisplayName,
 checkedIn: (checkInSnapshot.data().count ?? 0) > 0,
 });
 }
 }

 return results;
	} catch (e) {
 console.error('[CheckInRepository] Erro na busca:', e);
 return [];
	}
}

/**
 * Realiza check-in manual por ID do convidado (busca manual).
 */
export async function performManualCheckIn(
	eventId: string,
	guestId: string,
	adminUid: string,
): Promise<CheckInResult> {
	try {
 const { adminDb } = await import('@/lib/firebase/admin');
 const { FieldValue } = await import('firebase-admin/firestore');

 // Buscar dados do convidado
 const guestDoc = await adminDb
 .collection('events')
 .doc(eventId)
 .collection(GUESTS_SUBCOLLECTION)
 .doc(guestId)
 .get();

 if (!guestDoc.exists) {
 return { success: false, error: 'Convidado não encontrado.' };
 }

 const guest = guestDoc.data();
 const invitationId = guest?.invitationId;

 if (!invitationId) {
 return { success: false, error: 'Convidado não está vinculado a nenhum convite.' };
 }

 // Verificar se já fez check-in
 const existingCheckIn = await adminDb
 .collection('events')
 .doc(eventId)
 .collection(CHECKINS_SUBCOLLECTION)
 .where('guestId', '==', guestId)
 .count()
 .get();

 if ((existingCheckIn.data().count ?? 0) > 0) {
 return {
 success: false,
 alreadyCheckedIn: true,
 guestName: guest.fullName,
 error: 'Este convidado já realizou check-in.',
 };
 }

 // Buscar nome do convite
 let invitationDisplayName = '';
 const invDoc = await adminDb
 .collection('events')
 .doc(eventId)
 .collection(INVITATIONS_SUBCOLLECTION)
 .doc(invitationId)
 .get();
 if (invDoc.exists) {
 invitationDisplayName = invDoc.data()?.displayName;
 }

 // Registrar check-in
 await adminDb
 .collection('events')
 .doc(eventId)
 .collection(CHECKINS_SUBCOLLECTION)
 .add({
 eventId,
 invitationId,
 guestId,
 checkedInAt: FieldValue.serverTimestamp(),
 checkedInBy: adminUid,
 status: 'valid' as const,
 });

 return {
 success: true,
 guestName: guest.fullName,
 invitationDisplayName,
 };
	} catch (e) {
 console.error('[CheckInRepository] Erro no check-in manual:', e);
 return { success: false, error: 'Erro interno ao processar check-in manual.' };
	}
}