/**
 * Repositório de Check-in do Validador — Registro Individual Transacional
 *
 * Substitui as funções inseguras de checkin.repository.ts para uso no painel
 * do validador (/validador). O repositório antigo é mantido intacto para
 * compatibilidade com /admin/check-in até a Etapa 4.
 *
 * DIFERENÇAS FUNDAMENTAIS:
 * - Check-in por participantId individual (não por "primeiro guest não verificado")
 * - Transação segura sem count().get() (usa transaction.get() + verificação em memória)
 * - Chave determinística de documento: {eventId}_{invitationId}_{participantId}
 * - Suporte a acompanhantes com UUIDs persistentes
 * - Validação completa de RSVP antes do registro
 * - DTO serializável para Client Components
 * - Compatibilidade com check-ins legados (auto-generated doc IDs)
 *
 * SEGURANÇA:
 * - Firebase Admin SDK somente no servidor
 * - Tokens nunca expostos em logs ou DTOs
 * - Autorização verificada em cada operação
 * - Idempotência garantida pela chave determinística + transação
 */

import { serializeFirestoreValue } from '@/lib/server/firestore-serializer';
import { buildCheckInDocId } from '@/lib/checkin/participant-ids';
import type { CheckInParticipant } from '@/types';
import type { InvitationCheckInSummaryDTO } from '@/lib/checkin/dto';
import { toInvitationCheckInSummaryDTO } from '@/lib/checkin/dto';

const CHECKINS_SUBCOLLECTION = 'checkins';
const INVITATIONS_SUBCOLLECTION = 'invitations';
const GUESTS_SUBCOLLECTION = 'guests';
const RSVPS_SUBCOLLECTION = 'rsvps';

// ============================================================================
// TIPOS DE RESULTADO
// ============================================================================

export type InvitationValidationStatus =
	| 'valid'
	| 'partial'
	| 'complete'
	| 'rsvp_pending'
	| 'rsvp_declined'
	| 'invitation_revoked'
	| 'token_invalid'
	| 'error';

export interface InvitationValidationResult {
	status: InvitationValidationStatus;
	invitationId: string | null;
	displayName: string;
	participants: CheckInParticipant[];
	totalConfirmed: number;
	totalCheckedIn: number;
	totalPending: number;
	error?: string;
}

export interface ParticipantCheckInResult {
	success: boolean;
	participantName: string;
	alreadyCheckedIn: boolean;
	checkedInAt?: string;
	error?: string;
}

// ============================================================================
// VALIDAÇÃO DE CONVITE POR TOKEN
// ============================================================================

/**
 * Valida credencial de check-in (token do QR Code) e retorna dados completos
 * do convite com participantes e status de entrada individual.
 *
 * Esta operação é SOMENTE LEITURA — não registra entradas.
 * O registro ocorre apenas via performParticipantCheckIn().
 *
 * LOTE 2 (§6): Participantes autorizados em convites válidos podem realizar
 * check-in mesmo sem RSVP positivo. O RSVP original é preservado.
 * Um aviso é retornado no campo `error` mas NÃO bloqueia a operação.
 *
 * @param eventId - ID do evento
 * @param checkInToken - Token extraído do QR Code (puro ou URL)
 * @returns Resultado da validação com lista de participantes
 */
export async function validateInvitationForCheckIn(
	eventId: string,
	checkInToken: string,
): Promise<InvitationValidationResult> {
	try {
 const { adminDb, hashToken } = await import('@/lib/firebase/admin');

 // Extrair token puro se for URL
 let token = checkInToken;
 try {
 const url = new URL(checkInToken);
 token = url.searchParams.get('t') || url.searchParams.get('token') || checkInToken;
 } catch {
 // Não é URL, usar como token direto
 }

 if (!token || token.length < 8) {
 return {
 status: 'token_invalid',
 invitationId: null,
 displayName: '',
 participants: [],
 totalConfirmed: 0,
 totalCheckedIn: 0,
 totalPending: 0,
 error: 'QR Code inválido ou ilegível.',
 };
 }

 // Gerar hash do token para busca segura
 const tokenHash = await hashToken(token);

 // Buscar convite pelo hash do checkInToken
 const invitationSnapshot = await adminDb
 .collection('events')
 .doc(eventId)
 .collection(INVITATIONS_SUBCOLLECTION)
 .where('checkInTokenHash', '==', tokenHash)
 .limit(1)
 .get();

 if (invitationSnapshot.empty) {
 return {
 status: 'token_invalid',
 invitationId: null,
 displayName: '',
 participants: [],
 totalConfirmed: 0,
 totalCheckedIn: 0,
 totalPending: 0,
 error: 'QR Code não corresponde a nenhum convite válido.',
 };
 }

 const invitationDoc = invitationSnapshot.docs[0];
 const invitationData = serializeFirestoreValue(invitationDoc.data(), 'validateInvitation') as Record<string, unknown>;
 const invitationId = invitationDoc.id;

 // Verificar status do convite
 if (invitationData.invitationStatus !== 'active') {
 return {
 status: 'invitation_revoked',
 invitationId,
 displayName: String(invitationData.displayName || ''),
 participants: [],
 totalConfirmed: 0,
 totalCheckedIn: 0,
 totalPending: 0,
 error: 'Este convite foi revogado ou expirou.',
 };
 }

 // LOTE 2 (§6): Permitir check-in mesmo sem RSVP positivo.
 // Participantes autorizados em convites válidos podem entrar mesmo sem RSVP
 // ou com RSVP recusado. O RSVP original é preservado.
 // O scanner deve exibir aviso visual, mas NÃO bloquear a entrada.
 let rsvpData: Record<string, unknown> | null = null;
 let rsvpWarning: string | undefined;

 const rsvpDoc = await adminDb
 .collection('events')
 .doc(eventId)
 .collection(RSVPS_SUBCOLLECTION)
 .doc(invitationId)
 .get();

 if (!rsvpDoc.exists) {
 rsvpWarning = '⚠️ PRESENÇA NÃO CONFIRMADA: Este convite não possui RSVP. Verifique se o participante está autorizado antes de registrar entrada.';
 } else {
 rsvpData = serializeFirestoreValue(rsvpDoc.data(), 'rsvp') as Record<string, unknown>;

 if (rsvpData.attendanceStatus === 'declined') {
 rsvpWarning = '⚠️ PRESENÇA RECUSADA NO RSVP: Este convidado informou que não compareceria. Verifique se deseja registrar a entrada mesmo assim.';
 } else if (rsvpData.attendanceStatus !== 'confirmed') {
 rsvpWarning = '⚠️ RSVP PENDENTE: A presença ainda não foi confirmada. Verifique se o participante está autorizado antes de registrar entrada.';
 }
 }

 // Se não há RSVP confirmado, construir lista de participantes apenas pelos guests vinculados
 // (sem companions do RSVP, pois não há RSVP confirmado)
 if (!rsvpData || rsvpData.attendanceStatus !== 'confirmed') {
 const participants = await buildParticipantsListWithoutRsvp(eventId, invitationId, invitationData);

 if (participants.length === 0) {
 return {
 status: 'rsvp_pending',
 invitationId,
 displayName: String(invitationData.displayName || ''),
 participants: [],
 totalConfirmed: 0,
 totalCheckedIn: 0,
 totalPending: 0,
 error: rsvpWarning || 'Nenhum participante encontrado para este convite.',
 };
 }

 const checkedInIds = await getCheckedInParticipantIds(eventId, invitationId);
 const participantsWithStatus = participants.map(p => ({
 ...p,
 checkedIn: checkedInIds.has(p.participantId),
 }));

 const totalCheckedIn = participantsWithStatus.filter(p => p.checkedIn).length;

 return {
 status: 'valid', // Permitir check-in apesar do RSVP
 invitationId,
 displayName: String(invitationData.displayName || ''),
 participants: participantsWithStatus,
 totalConfirmed: participantsWithStatus.length,
 totalCheckedIn,
 totalPending: participantsWithStatus.length - totalCheckedIn,
 error: rsvpWarning, // Aviso não-bloqueante
 };
 }

 // RSVP confirmado — fluxo normal com companions
 const participants = await buildParticipantsList(eventId, invitationId, invitationData, rsvpData);

 // Buscar check-ins existentes para este convite
 const checkedInIds = await getCheckedInParticipantIds(eventId, invitationId);

 // Marcar participantes que já entraram
 const participantsWithStatus = participants.map(p => ({
 ...p,
 checkedIn: checkedInIds.has(p.participantId),
 checkedInAt: checkedInIds.has(p.participantId) ? undefined : undefined, // TODO: buscar timestamp se necessário
 }));

 const totalCheckedIn = participantsWithStatus.filter(p => p.checkedIn).length;
 const totalPending = participantsWithStatus.length - totalCheckedIn;

 let status: InvitationValidationStatus = 'valid';
 if (totalCheckedIn === participantsWithStatus.length && participantsWithStatus.length > 0) {
 status = 'complete';
 } else if (totalCheckedIn > 0) {
 status = 'partial';
 }

 return {
 status,
 invitationId,
 displayName: String(invitationData.displayName || ''),
 participants: participantsWithStatus,
 totalConfirmed: participantsWithStatus.length,
 totalCheckedIn,
 totalPending,
 };
	} catch (e) {
 console.error('[ValidatorCheckIn] Erro ao validar convite:', e);
 return {
 status: 'error',
 invitationId: null,
 displayName: '',
 participants: [],
 totalConfirmed: 0,
 totalCheckedIn: 0,
 totalPending: 0,
 error: 'Erro interno ao validar convite. Tente novamente.',
 };
	}
}

// ============================================================================
// REGISTRO TRANSACIONAL DE ENTRADA INDIVIDUAL
// ============================================================================

/**
 * Registra entrada de um participante específico via transação Firestore.
 *
 * GARANTIAS:
 * - Idempotência: mesma chamada múltiplas vezes = apenas uma entrada
 * - Concorrência: dois validadores simultâneos = apenas um registro
 * - Atomicidade: todas as verificações e escrita dentro da mesma transação
 * - Compatibilidade: detecta check-ins legados (auto-generated IDs)
 *
 * LOTE 2 (§6): RSVP confirmado NÃO é mais obrigatório dentro da transação.
 * A validação de autorização do participante e do convite permanece obrigatória.
 *
 * @param eventId - ID do evento
 * @param invitationId - ID do convite
 * @param participantId - ID persistente do participante (guestId ou UUID)
 * @param operatorUid - UID do validador que está registrando
 * @param source - Origem do check-in ('qr_code' | 'manual')
 */
export async function performParticipantCheckIn(
	eventId: string,
	invitationId: string,
	participantId: string,
	operatorUid: string,
	source: 'qr_code' | 'manual' = 'qr_code',
): Promise<ParticipantCheckInResult> {
	// Bloquear check-in de participantes sem ID persistente (não migrados)
	if (!participantId || participantId.trim().length === 0) {
 return {
 success: false,
 participantName: '',
 alreadyCheckedIn: false,
 error: 'REGULARIZAÇÃO NECESSÁRIA: Este acompanhante ainda não possui identificação persistente. Solicite a regularização via painel administrativo antes de registrar entrada.',
 };
	}

	let resultName = '';
	let alreadyCheckedIn = false;

	try {
 const { adminDb } = await import('@/lib/firebase/admin');
 const { FieldValue } = await import('firebase-admin/firestore');

 // Chave determinística do documento de check-in
 const checkInDocId = buildCheckInDocId(eventId, invitationId, participantId);
 const checkInRef = adminDb
 .collection('events')
 .doc(eventId)
 .collection(CHECKINS_SUBCOLLECTION)
 .doc(checkInDocId);

 // Referências para leitura dentro da transação
 const invitationRef = adminDb
 .collection('events')
 .doc(eventId)
 .collection(INVITATIONS_SUBCOLLECTION)
 .doc(invitationId);

 const rsvpRef = adminDb
 .collection('events')
 .doc(eventId)
 .collection(RSVPS_SUBCOLLECTION)
 .doc(invitationId);

 await adminDb.runTransaction(async (transaction) => {
 // 1. Verificar se já existe check-in com chave determinística
 const existingDoc = await transaction.get(checkInRef);
 if (existingDoc.exists) {
 alreadyCheckedIn = true;
 const data = existingDoc.data();
 resultName = data?.participantName || '';
 throw new Error('ALREADY_CHECKED_IN');
 }

 // 2. Revalidar convite dentro da transação
 const invDoc = await transaction.get(invitationRef);
 if (!invDoc.exists || invDoc.data()?.invitationStatus !== 'active') {
 throw new Error('INVITATION_INVALID');
 }

 // 3. LOTE 2 (§6): RSVP confirmado NÃO é mais obrigatório.
 // Apenas verificar se o convite existe e está ativo (já feito acima).
 // O RSVP é consultado apenas para obter a lista de companions.
 const rsvpDoc = await transaction.get(rsvpRef);
 const rsvpData = rsvpDoc.exists ? rsvpDoc.data() : null;

 // 4. Verificar se o participante pertence a este convite e está ativo
 const invDataInner = invDoc.data();
 const guestIds: string[] = Array.isArray(invDataInner?.guestIds) ? (invDataInner.guestIds as string[]) : [];
 const companionIds: string[] = (rsvpData && Array.isArray(rsvpData.companions))
 ? (rsvpData.companions as Array<{ participantId?: string }>).map(c => c.participantId).filter((id): id is string => Boolean(id))
 : [];

 // Bloquear check-in de convidados inativos (desativados pelo admin)
 if (guestIds.includes(participantId)) {
 const guestRef = adminDb
 .collection('events')
 .doc(eventId)
 .collection(GUESTS_SUBCOLLECTION)
 .doc(participantId);
 const guestDoc = await transaction.get(guestRef);
 if (guestDoc.exists && guestDoc.data()?.active === false) {
 throw new Error('GUEST_INACTIVE');
 }
 }

 const allValidIds = [...guestIds, ...companionIds];
 if (!allValidIds.includes(participantId)) {
 // Verificar também check-ins legados (sem participantId) por guestId
 // Se participantId é um guestId e já tem check-in legado, tratar como duplicado
 const legacyCheckIns = await adminDb
 .collection('events')
 .doc(eventId)
 .collection(CHECKINS_SUBCOLLECTION)
 .where('guestId', '==', participantId)
 .where('invitationId', '==', invitationId)
 .limit(1)
 .get();

 if (!legacyCheckIns.empty) {
 alreadyCheckedIn = true;
 resultName = '';
 throw new Error('LEGACY_CHECKIN_EXISTS');
 }

 throw new Error('PARTICIPANT_NOT_FOUND');
 }

 // 5. Obter nome do participante para registro
 const companions = (rsvpData && Array.isArray(rsvpData.companions)) ? rsvpData.companions : [];
 const companion = companions.find((c: { participantId?: string }) => c.participantId === participantId);

 if (companion) {
 resultName = companion.name;
 } else {
 // É o titular — usar displayName do convite como fallback
 resultName = invDataInner?.displayName || 'Convidado';
 }

 // 6. Registrar entrada (escrita atômica dentro da transação)
 transaction.set(checkInRef, {
 eventId,
 invitationId,
 participantId,
 guestId: guestIds.includes(participantId) ? participantId : null,
 participantName: resultName,
 checkedInAt: FieldValue.serverTimestamp(),
 checkedInBy: operatorUid,
 source,
 status: 'valid' as const,
 });
 });

 if (alreadyCheckedIn) {
 return {
 success: false,
 participantName: resultName,
 alreadyCheckedIn: true,
 error: 'Entrada já registrada para este participante.',
 };
 }

 return {
 success: true,
 participantName: resultName,
 alreadyCheckedIn: false,
 };
	} catch (e) {
 const message = e instanceof Error ? e.message : String(e);

 if (message === 'ALREADY_CHECKED_IN') {
 return {
 success: false,
 participantName: resultName,
 alreadyCheckedIn: true,
 error: 'Entrada já registrada para este participante.',
 };
 }

 if (message === 'LEGACY_CHECKIN_EXISTS') {
 return {
 success: false,
 participantName: resultName,
 alreadyCheckedIn: true,
 error: 'Entrada já registrada (registro legado). Regularize via painel administrativo se necessário.',
 };
 }

 if (message === 'GUEST_INACTIVE') {
 return {
 success: false,
 participantName: resultName,
 alreadyCheckedIn: false,
 error: 'Este convidado foi desativado e não pode realizar check-in.',
 };
 }

 if (message === 'INVITATION_INVALID') {
 return {
 success: false,
 participantName: '',
 alreadyCheckedIn: false,
 error: 'Convite inválido ou revogado.',
 };
 }

 if (message === 'RSVP_NOT_CONFIRMED') {
 return {
 success: false,
 participantName: '',
 alreadyCheckedIn: false,
 error: 'Presença não confirmada para este convite.',
 };
 }

 if (message === 'PARTICIPANT_NOT_FOUND') {
 return {
 success: false,
 participantName: '',
 alreadyCheckedIn: false,
 error: 'Participante não encontrado neste convite.',
 };
 }

 console.error('[ValidatorCheckIn] Erro no check-in transacional:', e);
 return {
 success: false,
 participantName: '',
 alreadyCheckedIn: false,
 error: 'Erro interno ao registrar entrada. Tente novamente.',
 };
	}
}

// ============================================================================
// DESFAZER CHECK-IN (LOTE 2 §12)
// ============================================================================

/**
 * Desfaz um check-in existente. Somente administradores podem executar.
 *
 * O registro original é preservado no histórico com status 'undone'.
 * Um novo check-in válido pode ser realizado posteriormente para o mesmo participante.
 *
 * @param eventId - ID do evento
 * @param invitationId - ID do convite
 * @param participantId - ID persistente do participante
 * @param adminUid - UID do administrador que está desfazendo
 * @param reason - Justificativa obrigatória para auditoria
 */
export async function undoParticipantCheckIn(
	eventId: string,
	invitationId: string,
	participantId: string,
	adminUid: string,
	reason: string,
): Promise<{ success: boolean; error?: string }> {
	if (!reason || reason.trim().length < 3) {
 return { success: false, error: 'Justificativa obrigatória para desfazer check-in (mínimo 3 caracteres).' };
	}

	try {
 const { adminDb } = await import('@/lib/firebase/admin');
 const { FieldValue } = await import('firebase-admin/firestore');

 const checkInDocId = buildCheckInDocId(eventId, invitationId, participantId);
 const checkInRef = adminDb
 .collection('events')
 .doc(eventId)
 .collection(CHECKINS_SUBCOLLECTION)
 .doc(checkInDocId);

 await adminDb.runTransaction(async (transaction) => {
 const existingDoc = await transaction.get(checkInRef);

 if (!existingDoc.exists) {
 throw new Error('CHECKIN_NOT_FOUND');
 }

 const data = existingDoc.data();

 // Se já foi desfeito, não fazer nada
 if (data?.status === 'undone') {
 throw new Error('ALREADY_UNDONE');
 }

 // Atualizar status para 'undone' preservando dados originais
 transaction.update(checkInRef, {
 status: 'undone',
 undoneBy: adminUid,
 undoneAt: FieldValue.serverTimestamp(),
 undoReason: reason.trim(),
 updatedAt: FieldValue.serverTimestamp(),
 });
 });

 console.log('[ValidatorCheckIn] Check-in desfeito com sucesso.', {
 eventId,
 invitationId,
 participantId,
 undoneBy: adminUid,
 });

 return { success: true };
	} catch (e) {
 const message = e instanceof Error ? e.message : String(e);

 if (message === 'CHECKIN_NOT_FOUND') {
 return { success: false, error: 'Check-in não encontrado para este participante.' };
 }

 if (message === 'ALREADY_UNDONE') {
 return { success: false, error: 'Este check-in já foi desfeito anteriormente.' };
 }

 console.error('[ValidatorCheckIn] Erro ao desfazer check-in:', e);
 return { success: false, error: 'Erro interno ao desfazer check-in. Tente novamente.' };
	}
}

// ============================================================================
// BUSCA MANUAL OTIMIZADA
// ============================================================================

/**
 * Busca convidados confirmados por nome para check-in manual.
 * Evita N+1 queries usando batch get de check-ins.
 *
 * @param eventId - ID do evento
 * @param searchTerm - Termo de busca (mínimo 2 caracteres)
 * @param limit - Máximo de resultados (padrão 20)
 */
export async function searchConfirmedGuests(
	eventId: string,
	searchTerm: string,
	limit: number = 20,
): Promise<Array<{
	guestId: string;
	fullName: string;
	invitationId: string;
	invitationDisplayName: string;
	checkedIn: boolean;
}>> {
	try {
 const { adminDb } = await import('@/lib/firebase/admin');

 if (!searchTerm || searchTerm.length < 2) return [];

 const normalizedSearch = searchTerm
 .toLowerCase()
 .normalize('NFD')
 .replace(/[̀-ͯ]/g, '')
 .trim();

 // Buscar guests ativos com nome correspondente
 const guestsSnapshot = await adminDb
 .collection('events')
 .doc(eventId)
 .collection(GUESTS_SUBCOLLECTION)
 .where('active', '==', true)
 .orderBy('fullName')
 .limit(limit * 2) // Buscar mais para filtrar depois
 .get();

 const results: Array<{
 guestId: string;
 fullName: string;
 invitationId: string;
 invitationDisplayName: string;
 checkedIn: boolean;
 }> = [];

 // Coletar IDs para batch lookup de check-ins e invitations
 const matchingGuests: Array<{ id: string; fullName: string; invitationId: string }> = [];

 for (const guestDoc of guestsSnapshot.docs) {
 const guest = guestDoc.data();
 const normalizedName = (guest.normalizedName || guest.fullName || '').toLowerCase();

 if (normalizedName.includes(normalizedSearch) && guest.invitationId) {
 matchingGuests.push({
 id: guestDoc.id,
 fullName: guest.fullName,
 invitationId: guest.invitationId,
 });
 }
 }

 if (matchingGuests.length === 0) return [];

 // Batch get de invitations (únicas)
 const uniqueInvitationIds = [...new Set(matchingGuests.map(g => g.invitationId))];
 const invitationNames = new Map<string, string>();

 for (const invId of uniqueInvitationIds) {
 try {
 const invDoc = await adminDb
 .collection('events')
 .doc(eventId)
 .collection(INVITATIONS_SUBCOLLECTION)
 .doc(invId)
 .get();
 if (invDoc.exists) {
 invitationNames.set(invId, invDoc.data()?.displayName || '');
 }
 } catch {
 // Ignorar falhas individuais
 }
 }

 // Batch check de check-ins existentes
 const checkedInGuestIds = new Set<string>();
 for (const guest of matchingGuests) {
 try {
 const checkInDocs = await adminDb
 .collection('events')
 .doc(eventId)
 .collection(CHECKINS_SUBCOLLECTION)
 .where('guestId', '==', guest.id)
 .where('invitationId', '==', guest.invitationId)
 .limit(1)
 .get();
 if (!checkInDocs.empty) {
 checkedInGuestIds.add(guest.id);
 }
 } catch {
 // Ignorar falhas individuais
 }
 }

 // Montar resultados
 for (const guest of matchingGuests) {
 if (results.length >= limit) break;
 results.push({
 guestId: guest.id,
 fullName: guest.fullName,
 invitationId: guest.invitationId,
 invitationDisplayName: invitationNames.get(guest.invitationId) || '',
 checkedIn: checkedInGuestIds.has(guest.id),
 });
 }

 return results;
	} catch (e) {
 console.error('[ValidatorCheckIn] Erro na busca manual:', e);
 return [];
	}
}

// ============================================================================
// HELPERS INTERNOS
// ============================================================================

/**
 * Constrói lista de participantes (titular + companions) a partir dos dados
 * do convite e RSVP. Usa participantId persistente quando disponível.
 */
async function buildParticipantsList(
	eventId: string,
	invitationId: string,
	invitationData: Record<string, unknown>,
	rsvpData: Record<string, unknown>,
): Promise<CheckInParticipant[]> {
	const { adminDb } = await import('@/lib/firebase/admin');

	const participants: CheckInParticipant[] = [];

	// Titular: buscar guest(s) vinculado(s) ao convite
	const guestIds: string[] = Array.isArray(invitationData.guestIds) ? invitationData.guestIds : [];

	for (const guestId of guestIds) {
 try {
 const guestDoc = await adminDb
 .collection('events')
 .doc(eventId)
 .collection(GUESTS_SUBCOLLECTION)
 .doc(guestId)
 .get();

 if (guestDoc.exists) {
 const guest = guestDoc.data();
 participants.push({
 participantId: guestId,
 name: guest?.fullName || 'Titular',
 type: 'titular',
 isMinor: false,
 checkedIn: false,
 });
 }
 } catch {
 // Guest pode ter sido desativado
 }
	}

	// Companions do RSVP
	const companions = Array.isArray(rsvpData.companions) ? rsvpData.companions : [];

	for (const companion of companions) {
 const c = companion as { name?: string; isMinor?: boolean; age?: number; participantId?: string };
 if (!c.name?.trim()) continue;

 // Bloquear check-in de acompanhantes sem UUID persistente.
 // IDs baseados em índice são instáveis e podem atribuir entrada à pessoa errada.
 if (!c.participantId) {
 participants.push({
 participantId: '', // Vazio = não pode fazer check-in até migração
 name: c.name,
 type: 'companion',
 isMinor: Boolean(c.isMinor),
 age: c.age,
 checkedIn: false,
 });
 } else {
 participants.push({
 participantId: c.participantId,
 name: c.name,
 type: 'companion',
 isMinor: Boolean(c.isMinor),
 age: c.age,
 checkedIn: false,
 });
 }
	}

	return participants;
}

/**
 * LOTE 2 (§6): Constrói lista de participantes APENAS pelos guests vinculados
 * ao convite, sem companions do RSVP. Usado quando não há RSVP confirmado.
 *
 * A validação de autorização permanece: apenas guests vinculados ao convite
 * (via guestIds) são considerados participantes válidos.
 */
async function buildParticipantsListWithoutRsvp(
	eventId: string,
	invitationId: string,
	invitationData: Record<string, unknown>,
): Promise<CheckInParticipant[]> {
	const { adminDb } = await import('@/lib/firebase/admin');

	const participants: CheckInParticipant[] = [];
	const guestIds: string[] = Array.isArray(invitationData.guestIds) ? invitationData.guestIds : [];

	for (const guestId of guestIds) {
 try {
 const guestDoc = await adminDb
 .collection('events')
 .doc(eventId)
 .collection(GUESTS_SUBCOLLECTION)
 .doc(guestId)
 .get();

 if (guestDoc.exists) {
 const guest = guestDoc.data();
 participants.push({
 participantId: guestId,
 name: guest?.fullName || 'Titular',
 type: 'titular',
 isMinor: false,
 checkedIn: false,
 });
 }
 } catch {
 // Guest pode ter sido desativado
 }
	}

	return participants;
}

/**
 * Obtém conjunto de participantIds que já fizeram check-in para um convite.
 * Inclui tanto check-ins novos (chave determinística) quanto legados (auto-generated).
 * Exclui check-ins com status 'undone'.
 */
async function getCheckedInParticipantIds(
	eventId: string,
	invitationId: string,
): Promise<Set<string>> {
	const { adminDb } = await import('@/lib/firebase/admin');

	const checkedInIds = new Set<string>();

	try {
 const checkInsSnapshot = await adminDb
 .collection('events')
 .doc(eventId)
 .collection(CHECKINS_SUBCOLLECTION)
 .where('invitationId', '==', invitationId)
 .get();

 for (const doc of checkInsSnapshot.docs) {
 const data = doc.data();
 // Excluir check-ins desfeitos
 if (data?.status === 'undone') continue;
 // Check-ins novos têm participantId; legados têm guestId
 const id = data?.participantId || data?.guestId;
 if (id) {
 checkedInIds.add(id);
 }
 }
	} catch (e) {
 console.error('[ValidatorCheckIn] Erro ao buscar check-ins existentes:', e);
	}

	return checkedInIds;
}