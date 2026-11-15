'use server';

/**
 * Server Action — Salvar Configurações do Casamento
 *
 * Cria ou atualiza o documento events/{eventId} no Firestore de forma idempotente.
 * Usa merge: true para preservar campos não enviados.
 * Requer sessão administrativa válida.
 */

import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/lib/auth/admin-session';
import { eventSettingsSchema } from '@/lib/validators/rsvp.schema';
import type { ApiResponse } from '@/types';

export async function saveEventSettings(
	formData: Record<string, unknown>,
): Promise<ApiResponse<{ eventId: string; created: boolean }>> {
	// 1. Verificar sessão administrativa
	let session;
	try {
 session = await requireAdminSession();
	} catch {
 return {
 success: false,
 error: 'Sessão administrativa inválida ou expirada. Faça login novamente.',
 };
	}

	// 2. Validar dados com Zod
	const validation = eventSettingsSchema.safeParse(formData);
	if (!validation.success) {
 return {
 success: false,
 error: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
 };
	}

	// 3. Verificar Admin SDK
	if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
 return {
 success: false,
 error: 'Firebase Admin SDK não configurado no servidor. Adicione FIREBASE_SERVICE_ACCOUNT_JSON nas variáveis de ambiente da Vercel.',
 };
	}

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

	try {
 const { adminDb } = await import('@/lib/firebase/admin');
 const { FieldValue } = await import('firebase-admin/firestore');

 const ref = adminDb.collection('events').doc(eventId);
 const existing = await ref.get();
 const created = !existing.exists;

 // Dados a serem salvos — limpar strings vazias para null
 const data: Record<string, unknown> = {
 coupleNames: validation.data.coupleNames,
 eventDate: validation.data.eventDate || null,
 timezone: validation.data.timezone,
 ceremonyTime: validation.data.ceremonyTime || null,
 receptionTime: validation.data.receptionTime || null,
 venueName: validation.data.venueName || null,
 venueAddress: validation.data.venueAddress || null,
 mapsUrl: validation.data.mapsUrl || null,
 wazeUrl: validation.data.wazeUrl || null,
 dressCode: validation.data.dressCode || null,
 rsvpDeadline: validation.data.rsvpDeadline || null,
 rsvpEnabled: validation.data.rsvpEnabled,
 checkInEnabled: validation.data.checkInEnabled,
 heroMessage: validation.data.heroMessage || null,
 heroVerse: validation.data.heroVerse || null,
 heroVerseReference: validation.data.heroVerseReference || null,
 closingMessage: validation.data.closingMessage || null,
 closingVerse: validation.data.closingVerse || null,
 closingVerseReference: validation.data.closingVerseReference || null,
 updatedAt: FieldValue.serverTimestamp(),
 updatedBy: session.uid,
 };

 if (created) {
 data.status = 'published';
 data.createdAt = FieldValue.serverTimestamp();
 }

 // merge: true preserva campos não enviados (ex: storyFullText, storyTimeline)
 await ref.set(data, { merge: true });

 // Revalidar páginas que consomem as configurações
 revalidatePath('/');
 revalidatePath('/admin/configuracoes');
 revalidatePath('/confirmar-presenca');

 console.log('[SaveEventSettings] Configurações salvas com sucesso.', {
 eventId,
 created,
 updatedBy: session.uid,
 });

 return {
 success: true,
 data: { eventId, created },
 message: created
 ? 'Evento criado e configurações salvas com sucesso!'
 : 'Configurações salvas com sucesso!',
 };
	} catch (e) {
 const message = e instanceof Error ? e.message : 'Erro desconhecido';
 console.error('[SaveEventSettings] Falha ao salvar configurações:', {
 eventId,
 errorType: e instanceof Error ? e.constructor.name : 'unknown',
 errorMessage: message,
 });
 return {
 success: false,
 error: `Falha ao salvar no Firestore: ${message}`,
 };
	}
}