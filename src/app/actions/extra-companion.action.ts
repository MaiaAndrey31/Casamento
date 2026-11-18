'use server';

/**
 * Server Actions — Solicitações de Acompanhantes Extras (Lote 3 §8)
 *
 * Fluxo completo:
 * 1. Validador cria solicitação → status 'pending'
 * 2. Admin aprova/recusa → status 'approved' ou 'rejected'
 * 3. Se aprovado → participante extra é adicionado ao convite automaticamente
 * 4. Notificação via evento customizado (polling detecta mudança)
 *
 * SEGURANÇA:
 * - Criação: requireValidatorSession()
 * - Aprovação/recusa: requireAdminSession() (apenas admins)
 * - Validação Zod em todas as operações
 * - Auditoria completa (quem solicitou, quem decidiu, quando, motivo)
 * - Sem limite fixo de acompanhantes extras por convite
 * - Cada acompanhante extra tem sua própria solicitação individual
 */

import { requireValidatorSession, requireAdminSession } from '@/lib/auth/admin-session';
import { serializeFirestoreValue } from '@/lib/server/firestore-serializer';
import { generateParticipantUuid } from '@/lib/checkin/participant-ids';
import { revalidatePath } from 'next/cache';
import type { ApiResponse } from '@/types';
import { z } from 'zod';

const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';
const REQUESTS_COLLECTION = 'extraCompanionRequests';

// ============================================================================
// SCHEMAS DE VALIDAÇÃO
// ============================================================================

const createRequestSchema = z.object({
	invitationId: z.string().min(1, 'ID do convite é obrigatório'),
	companionName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(200),
	isMinor: z.boolean().default(false),
	age: z.number().int().min(0).max(150).optional(),
	note: z.string().max(500).optional().or(z.literal('')),
});

const decideRequestSchema = z.object({
	requestId: z.string().min(1, 'ID da solicitação é obrigatório'),
	decision: z.enum(['approved', 'rejected'], { errorMap: () => ({ message: 'Decisão deve ser approved ou rejected' }) }),
	reason: z.string().min(3, 'Justificativa deve ter pelo menos 3 caracteres').max(500),
});

// ============================================================================
// TIPOS
// ============================================================================

export interface ExtraCompanionRequest {
	id: string;
	eventId: string;
	invitationId: string;
	companionName: string;
	isMinor: boolean;
	age?: number;
	note?: string;
	status: 'pending' | 'approved' | 'rejected';
	requestedBy: string;
	requestedByName: string;
	requestedAt: string;
	decidedBy?: string;
	decidedAt?: string;
	decisionReason?: string;
	participantId?: string; // Gerado apenas na aprovação
	createdAt: string;
	updatedAt: string;
}

// ============================================================================
// CRIAR SOLICITAÇÃO (VALIDADOR)
// ============================================================================

export async function createExtraCompanionRequestAction(
	formData: Record<string, unknown>,
): Promise<ApiResponse<{ requestId: string }>> {
	let session;
	try {
 session = await requireValidatorSession();
	} catch {
 return { success: false, error: 'Sessão de validador inválida ou expirada.' };
	}

	const validation = createRequestSchema.safeParse(formData);
	if (!validation.success) {
 return {
 success: false,
 error: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
 };
	}

	try {
 const { adminDb } = await import('@/lib/firebase/admin');
 const { FieldValue } = await import('firebase-admin/firestore');

 // Verificar se o convite existe e está ativo
 const invDoc = await adminDb
 .collection('events')
 .doc(eventId)
 .collection('invitations')
 .doc(validation.data.invitationId)
 .get();

 if (!invDoc.exists || invDoc.data()?.invitationStatus !== 'active') {
 return { success: false, error: 'Convite não encontrado ou inativo.' };
 }

 // Verificar duplicidade: mesma pessoa, mesmo convite, ainda pendente
 const existingSnapshot = await adminDb
 .collection('events')
 .doc(eventId)
 .collection(REQUESTS_COLLECTION)
 .where('invitationId', '==', validation.data.invitationId)
 .where('companionName', '==', validation.data.companionName.trim())
 .where('status', '==', 'pending')
 .limit(1)
 .get();

 if (!existingSnapshot.empty) {
 return {
 success: false,
 error: 'Já existe uma solicitação pendente para este acompanhante neste convite.',
 };
 }

 // Criar solicitação
 const requestRef = adminDb
 .collection('events')
 .doc(eventId)
 .collection(REQUESTS_COLLECTION)
 .doc();

 await requestRef.set({
 eventId,
 invitationId: validation.data.invitationId,
 companionName: validation.data.companionName.trim(),
 isMinor: Boolean(validation.data.isMinor),
 age: validation.data.age || null,
 note: validation.data.note?.trim() || null,
 status: 'pending',
 requestedBy: session.uid,
 requestedByName: session.email,
 requestedAt: FieldValue.serverTimestamp(),
 createdAt: FieldValue.serverTimestamp(),
 updatedAt: FieldValue.serverTimestamp(),
 });

 console.log('[ExtraCompanion] Solicitação criada.', {
 requestId: requestRef.id,
 invitationId: validation.data.invitationId,
 companionName: validation.data.companionName,
 requestedBy: session.uid,
 });

 return {
 success: true,
 data: { requestId: requestRef.id },
 message: `Solicitação para "${validation.data.companionName}" enviada com sucesso. Aguarde a aprovação do administrador.`,
 };
	} catch (e) {
 console.error('[ExtraCompanion] Erro ao criar solicitação:', e);
 return { success: false, error: 'Erro interno ao criar solicitação.' };
	}
}

// ============================================================================
// APROVAR/RECUSAR SOLICITAÇÃO (ADMIN)
// ============================================================================

export async function decideExtraCompanionRequestAction(
	formData: Record<string, unknown>,
): Promise<ApiResponse> {
	let session;
	try {
 session = await requireAdminSession();
	} catch {
 return { success: false, error: 'Sessão administrativa inválida. Apenas administradores podem aprovar/recusar solicitações.' };
	}

	const validation = decideRequestSchema.safeParse(formData);
	if (!validation.success) {
 return {
 success: false,
 error: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
 };
	}

	try {
 const { adminDb } = await import('@/lib/firebase/admin');
 const { FieldValue } = await import('firebase-admin/firestore');

 const requestRef = adminDb
 .collection('events')
 .doc(eventId)
 .collection(REQUESTS_COLLECTION)
 .doc(validation.data.requestId);

 let companionName = '';
	let invitationId = '';
	let participantId: string | undefined;

 await adminDb.runTransaction(async (transaction) => {
 const requestDoc = await transaction.get(requestRef);

 if (!requestDoc.exists) {
 throw new Error('REQUEST_NOT_FOUND');
 }

 const requestData = requestDoc.data();
 if (!requestData) {
 throw new Error('REQUEST_NOT_FOUND');
 }

 if (requestData.status !== 'pending') {
 throw new Error(`REQUEST_ALREADY_${requestData.status.toUpperCase()}`);
 }

 companionName = requestData.companionName;
 invitationId = requestData.invitationId;

 if (validation.data.decision === 'approved') {
 // Gerar UUID persistente para o acompanhante extra
 participantId = generateParticipantUuid();

 // Atualizar solicitação com status aprovado e participantId
 transaction.update(requestRef, {
 status: 'approved',
 decidedBy: session.uid,
 decidedAt: FieldValue.serverTimestamp(),
 decisionReason: validation.data.reason.trim(),
 participantId,
 updatedAt: FieldValue.serverTimestamp(),
 });

 // Adicionar acompanhante extra ao RSVP do convite
 const rsvpRef = adminDb
 .collection('events')
 .doc(eventId)
 .collection('rsvps')
 .doc(invitationId);

 const rsvpDoc = await transaction.get(rsvpRef);

 if (rsvpDoc.exists) {
 const rsvpData = rsvpDoc.data();
 const currentCompanions = Array.isArray(rsvpData?.companions) ? rsvpData.companions : [];
 const updatedCompanions = [
 ...currentCompanions,
 {
 participantId,
 name: companionName,
 isMinor: Boolean(requestData?.isMinor),
 age: requestData?.age || undefined,
 addedViaExtraRequest: true,
 addedAt: new Date().toISOString(),
 },
 ];

 transaction.update(rsvpRef, {
 companions: updatedCompanions,
 updatedAt: FieldValue.serverTimestamp(),
 });
 } else {
 // Se não há RSVP, criar um mínimo com o acompanhante extra
 transaction.set(rsvpRef, {
 eventId,
 invitationId,
 attendanceStatus: 'confirmed',
 companions: [{
 participantId,
 name: companionName,
 isMinor: Boolean(requestData?.isMinor),
 age: requestData?.age || undefined,
 addedViaExtraRequest: true,
 addedAt: new Date().toISOString(),
 }],
 dietaryRestrictions: [],
 songSuggestion: '',
 personalMessage: '',
 submittedAt: FieldValue.serverTimestamp(),
 updatedAt: FieldValue.serverTimestamp(),
 revision: 1,
 });
 }
 } else {
 // Recusado
 transaction.update(requestRef, {
 status: 'rejected',
 decidedBy: session.uid,
 decidedAt: FieldValue.serverTimestamp(),
 decisionReason: validation.data.reason.trim(),
 updatedAt: FieldValue.serverTimestamp(),
 });
 }
 });

 revalidatePath('/admin/check-in/solicitacoes');
 revalidatePath('/validador');

 const action = validation.data.decision === 'approved' ? 'aprovada' : 'recusada';
	console.log(`[ExtraCompanion] Solicitação ${action}.`, {
 requestId: validation.data.requestId,
 companionName,
 invitationId,
 decidedBy: session.uid,
 decision: validation.data.decision,
 participantId: participantId || 'N/A',
 });

	return {
 success: true,
 message: validation.data.decision === 'approved'
 ? `✅ "${companionName}" foi aprovado(a) e adicionado(a) ao convite. O check-in individual está disponível.`
 : `❌ Solicitação para "${companionName}" foi recusada.`,
	};
	} catch (e) {
 const message = e instanceof Error ? e.message : String(e);

 if (message === 'REQUEST_NOT_FOUND') {
 return { success: false, error: 'Solicitação não encontrada.' };
 }
 if (message.startsWith('REQUEST_ALREADY_')) {
 return { success: false, error: 'Esta solicitação já foi processada anteriormente.' };
 }

 console.error('[ExtraCompanion] Erro ao processar solicitação:', e);
 return { success: false, error: 'Erro interno ao processar solicitação.' };
	}
}

// ============================================================================
// LISTAR SOLICITAÇÕES
// ============================================================================

export async function listExtraCompanionRequestsAction(
	filter: 'all' | 'pending' | 'approved' | 'rejected' = 'all',
): Promise<ApiResponse<ExtraCompanionRequest[]>> {
	try {
 await requireValidatorSession();
	} catch {
 return { success: false, error: 'Sessão inválida.' };
	}

	try {
 const { adminDb } = await import('@/lib/firebase/admin');

 let query = adminDb
 .collection('events')
 .doc(eventId)
 .collection(REQUESTS_COLLECTION)
 .orderBy('createdAt', 'desc');

 if (filter !== 'all') {
 query = query.where('status', '==', filter);
 }

 const snapshot = await query.limit(100).get();

 const requests: ExtraCompanionRequest[] = snapshot.docs.map(doc => {
 const data = serializeFirestoreValue(doc.data(), `request.${doc.id}`) as Record<string, unknown>;
 return {
 id: doc.id,
 eventId: String(data.eventId || ''),
 invitationId: String(data.invitationId || ''),
 companionName: String(data.companionName || ''),
 isMinor: Boolean(data.isMinor),
 age: (data.age as number) || undefined,
 note: (data.note as string) || undefined,
 status: (data.status as ExtraCompanionRequest['status']) || 'pending',
 requestedBy: String(data.requestedBy || ''),
 requestedByName: String(data.requestedByName || ''),
 requestedAt: (data.requestedAt as string) || '',
 decidedBy: (data.decidedBy as string) || undefined,
 decidedAt: (data.decidedAt as string) || undefined,
 decisionReason: (data.decisionReason as string) || undefined,
 participantId: (data.participantId as string) || undefined,
 createdAt: (data.createdAt as string) || '',
 updatedAt: (data.updatedAt as string) || '',
 };
 });

 return { success: true, data: requests };
	} catch (e) {
 console.error('[ExtraCompanion] Erro ao listar solicitações:', e);
 return { success: false, error: 'Erro ao carregar solicitações.' };
	}
}