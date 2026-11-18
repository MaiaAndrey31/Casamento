'use server';

/**
 * Server Actions — Controle de Recepção (Lote 3 §10)
 *
 * Somente administradores podem controlar o estado da recepção.
 *
 * Estados:
 * - 'waiting': Aguardando abertura (validadores podem logar, treinamento disponível)
 * - 'open': Recepção aberta (check-ins reais liberados, treinamento bloqueado)
 * - 'closed': Recepção encerrada (novos check-ins bloqueados, histórico disponível)
 *
 * SEGURANÇA:
 * - requireAdminSession() em todas as operações
 * - Justificativa obrigatória para reabertura
 * - Todas as transições são registradas com auditoria completa
 * - Bloqueio aplicado no servidor (não apenas na UI)
 */

import { requireAdminSession } from '@/lib/auth/admin-session';
import { serializeFirestoreValue } from '@/lib/server/firestore-serializer';
import type { ApiResponse } from '@/types';
import { z } from 'zod';

const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';
const RECEPTION_CONTROL_DOC = 'receptionControl';

export type ReceptionStatus = 'waiting' | 'open' | 'closed';

export interface ReceptionControlState {
	status: ReceptionStatus;
	openedBy?: string;
	openedAt?: string;
	closedBy?: string;
	closedAt?: string;
	reopenedBy?: string;
	reopenedAt?: string;
	reopenReason?: string;
	updatedAt: string;
	history: Array<{
		action: 'opened' | 'closed' | 'reopened';
		by: string;
		at: string;
		reason?: string;
	}>;
}

// ============================================================================
// OBTER ESTADO ATUAL
// ============================================================================

export async function getReceptionControlAction(): Promise<ApiResponse<ReceptionControlState>> {
	try {
 await requireAdminSession();
	} catch {
 return { success: false, error: 'Sessão administrativa inválida.' };
	}

	try {
 const { adminDb } = await import('@/lib/firebase/admin');

 const doc = await adminDb
 .collection('events')
 .doc(eventId)
 .collection('config')
 .doc(RECEPTION_CONTROL_DOC)
 .get();

 if (!doc.exists) {
 // Estado inicial: aguardando abertura
 return {
 success: true,
 data: {
 status: 'waiting',
 updatedAt: new Date().toISOString(),
 history: [],
 },
 };
 }

 const data = serializeFirestoreValue(doc.data(), 'receptionControl') as Record<string, unknown>;

 return {
 success: true,
 data: {
 status: (data.status as ReceptionStatus) || 'waiting',
 openedBy: (data.openedBy as string) || undefined,
 openedAt: (data.openedAt as string) || undefined,
 closedBy: (data.closedBy as string) || undefined,
 closedAt: (data.closedAt as string) || undefined,
 reopenedBy: (data.reopenedBy as string) || undefined,
 reopenedAt: (data.reopenedAt as string) || undefined,
 reopenReason: (data.reopenReason as string) || undefined,
 updatedAt: (data.updatedAt as string) || '',
 history: Array.isArray(data.history) ? data.history as ReceptionControlState['history'] : [],
 },
 };
	} catch (e) {
 console.error('[ReceptionControl] Erro ao obter estado:', e);
 return { success: false, error: 'Erro interno ao obter estado da recepção.' };
	}
}

// ============================================================================
// ABRIR RECEPÇÃO
// ============================================================================

export async function openReceptionAction(): Promise<ApiResponse> {
	let session;
	try {
 session = await requireAdminSession();
	} catch {
 return { success: false, error: 'Sessão administrativa inválida.' };
	}

	try {
 const { adminDb } = await import('@/lib/firebase/admin');
 const { FieldValue } = await import('firebase-admin/firestore');

 const configRef = adminDb
 .collection('events')
 .doc(eventId)
 .collection('config')
 .doc(RECEPTION_CONTROL_DOC);

 await adminDb.runTransaction(async (transaction) => {
 const doc = await transaction.get(configRef);
 const currentStatus = doc.exists ? doc.data()?.status : 'waiting';

 if (currentStatus === 'open') {
 throw new Error('ALREADY_OPEN');
 }

 const historyEntry = {
 action: 'opened',
 by: session.uid,
 at: new Date().toISOString(),
 };

 const openDocData = doc.exists ? doc.data() : undefined;
 const existingHistory = openDocData && Array.isArray(openDocData.history)
 ? openDocData.history
 : [];

 if (doc.exists) {
 transaction.update(configRef, {
 status: 'open',
 openedBy: session.uid,
 openedAt: FieldValue.serverTimestamp(),
 updatedAt: FieldValue.serverTimestamp(),
 history: [...existingHistory, historyEntry],
 });
 } else {
 transaction.set(configRef, {
 status: 'open',
 openedBy: session.uid,
 openedAt: FieldValue.serverTimestamp(),
 updatedAt: FieldValue.serverTimestamp(),
 history: [historyEntry],
 });
 }
 });

 console.log('[ReceptionControl] Recepção aberta.', { by: session.uid });

	return { success: true, message: 'Recepção aberta com sucesso. Check-ins reais estão liberados.' };
	} catch (e) {
 const message = e instanceof Error ? e.message : String(e);
 if (message === 'ALREADY_OPEN') {
 return { success: false, error: 'A recepção já está aberta.' };
 }
 console.error('[ReceptionControl] Erro ao abrir recepção:', e);
 return { success: false, error: 'Erro interno ao abrir recepção.' };
	}
}

// ============================================================================
// ENCERRAR RECEPÇÃO
// ============================================================================

export async function closeReceptionAction(): Promise<ApiResponse> {
	let session;
	try {
 session = await requireAdminSession();
	} catch {
 return { success: false, error: 'Sessão administrativa inválida.' };
	}

	try {
 const { adminDb } = await import('@/lib/firebase/admin');
 const { FieldValue } = await import('firebase-admin/firestore');

 const configRef = adminDb
 .collection('events')
 .doc(eventId)
 .collection('config')
 .doc(RECEPTION_CONTROL_DOC);

 await adminDb.runTransaction(async (transaction) => {
 const doc = await transaction.get(configRef);

 if (!doc.exists || doc.data()?.status !== 'open') {
 throw new Error('NOT_OPEN');
 }

 const historyEntry = {
 action: 'closed',
 by: session.uid,
 at: new Date().toISOString(),
 };

 const docDataLocal = doc.data();
 const existingHistory = docDataLocal && Array.isArray(docDataLocal.history) ? docDataLocal.history : [];

 transaction.update(configRef, {
 status: 'closed',
 closedBy: session.uid,
 closedAt: FieldValue.serverTimestamp(),
 updatedAt: FieldValue.serverTimestamp(),
 history: [...existingHistory, historyEntry],
 });
 });

 console.log('[ReceptionControl] Recepção encerrada.', { by: session.uid });

	return { success: true, message: 'Recepção encerrada. Novos check-ins estão bloqueados.' };
	} catch (e) {
 const message = e instanceof Error ? e.message : String(e);
 if (message === 'NOT_OPEN') {
 return { success: false, error: 'A recepção não está aberta atualmente.' };
 }
 console.error('[ReceptionControl] Erro ao encerrar recepção:', e);
 return { success: false, error: 'Erro interno ao encerrar recepção.' };
	}
}

// ============================================================================
// REABRIR RECEPÇÃO (requer justificativa)
// ============================================================================

const reopenSchema = z.object({
	reason: z.string().min(5, 'Justificativa deve ter pelo menos 5 caracteres').max(500),
});

export async function reopenReceptionAction(
	formData: Record<string, unknown>,
): Promise<ApiResponse> {
	let session;
	try {
 session = await requireAdminSession();
	} catch {
 return { success: false, error: 'Sessão administrativa inválida.' };
	}

	const validation = reopenSchema.safeParse(formData);
	if (!validation.success) {
 return {
 success: false,
 error: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
 };
	}

	try {
 const { adminDb } = await import('@/lib/firebase/admin');
 const { FieldValue } = await import('firebase-admin/firestore');

 const configRef = adminDb
 .collection('events')
 .doc(eventId)
 .collection('config')
 .doc(RECEPTION_CONTROL_DOC);

 await adminDb.runTransaction(async (transaction) => {
 const doc = await transaction.get(configRef);

 if (!doc.exists || doc.data()?.status !== 'closed') {
 throw new Error('NOT_CLOSED');
 }

 const historyEntry = {
 action: 'reopened',
 by: session.uid,
 at: new Date().toISOString(),
 reason: validation.data.reason.trim(),
 };

 const docDataLocal = doc.data();
 const existingHistory = docDataLocal && Array.isArray(docDataLocal.history) ? docDataLocal.history : [];

 transaction.update(configRef, {
 status: 'open',
 reopenedBy: session.uid,
 reopenedAt: FieldValue.serverTimestamp(),
 reopenReason: validation.data.reason.trim(),
 updatedAt: FieldValue.serverTimestamp(),
 history: [...existingHistory, historyEntry],
 });
 });

 console.log('[ReceptionControl] Recepção reaberta.', {
 by: session.uid,
 reason: validation.data.reason,
 });

	return { success: true, message: 'Recepção reaberta com sucesso. Check-ins estão liberados novamente.' };
	} catch (e) {
 const message = e instanceof Error ? e.message : String(e);
 if (message === 'NOT_CLOSED') {
 return { success: false, error: 'A recepção não está encerrada. Apenas recepções encerradas podem ser reabertas.' };
 }
 console.error('[ReceptionControl] Erro ao reabrir recepção:', e);
 return { success: false, error: 'Erro interno ao reabrir recepção.' };
	}
}

// ============================================================================
// VERIFICAR SE RECEPÇÃO ESTÁ ABERTA (para validadores)
// ============================================================================

/**
 * Verifica se a recepção está aberta. Usado pelo scanner do validador
 * para bloquear check-ins quando a recepção não está aberta.
 * Esta função NÃO requer sessão administrativa — é chamada por validadores.
 */
export async function isReceptionOpenAction(): Promise<ApiResponse<{ isOpen: boolean; status: ReceptionStatus }>> {
	try {
 const { adminDb } = await import('@/lib/firebase/admin');

 const doc = await adminDb
 .collection('events')
 .doc(eventId)
 .collection('config')
 .doc(RECEPTION_CONTROL_DOC)
 .get();

 if (!doc.exists) {
 return { success: true, data: { isOpen: false, status: 'waiting' } };
 }

 const status = (doc.data()?.status as ReceptionStatus) || 'waiting';
 return { success: true, data: { isOpen: status === 'open', status } };
	} catch (e) {
 console.error('[ReceptionControl] Erro ao verificar estado:', e);
 return { success: false, error: 'Erro ao verificar estado da recepção.' };
	}
}