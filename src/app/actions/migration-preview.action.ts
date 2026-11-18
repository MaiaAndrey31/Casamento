'use server';

/**
 * Server Action — Prévia de Migração de Acompanhantes (Etapa 4)
 *
 * Analisa todos os RSVPs confirmados e identifica acompanhantes sem UUID persistente.
 * Retorna relatório detalhado SEM modificar dados reais.
 *
 * A migração real só será executada após autorização explícita do administrador.
 *
 * SEGURANÇA:
 * - Apenas owners podem executar
 * - Operação somente leitura (preview)
 * - Não modifica RSVPs, check-ins ou convites
 */

import { requireAdminSession } from '@/lib/auth/admin-session';
import { serializeFirestoreValue } from '@/lib/server/firestore-serializer';
import type { ApiResponse } from '@/types';

export interface MigrationPreviewResult {
	totalRsvpsConfirmed: number;
	totalCompanions: number;
	companionsWithoutId: number;
	companionsWithId: number;
	affectedInvitations: Array<{
 invitationId: string;
 displayName: string;
 companionsNeedingMigration: Array<{
 name: string;
 isMinor: boolean;
 index: number;
 }>;
}>;
	legacyCheckIns: number;
	ambiguousCases: number;
}

export async function getMigrationPreviewAction(): Promise<ApiResponse<MigrationPreviewResult>> {
	// 1. Verificar sessão administrativa (apenas owners)
	let session;
	try {
 session = await requireAdminSession();
	} catch {
 return { success: false, error: 'Sessão administrativa inválida.' };
	}

	if (session.role !== 'owner') {
 return { success: false, error: 'Apenas os noivos podem visualizar a prévia de migração.' };
	}

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

	try {
 const { adminDb } = await import('@/lib/firebase/admin');

 // Buscar todos os RSVPs confirmados
 const rsvpsSnapshot = await adminDb
 .collection('events')
 .doc(eventId)
 .collection('rsvps')
 .where('attendanceStatus', '==', 'confirmed')
 .get();

 let totalCompanions = 0;
 let companionsWithoutId = 0;
 let companionsWithId = 0;
 const affectedInvitations: MigrationPreviewResult['affectedInvitations'] = [];

 for (const rsvpDoc of rsvpsSnapshot.docs) {
 const rsvpData = serializeFirestoreValue(rsvpDoc.data(), `rsvp.${rsvpDoc.id}`) as Record<string, unknown>;
 const companions = Array.isArray(rsvpData.companions) ? rsvpData.companions : [];

 if (companions.length === 0) continue;

 const needingMigration: Array<{ name: string; isMinor: boolean; index: number }> = [];

 for (let i = 0; i < companions.length; i++) {
 const c = companions[i] as { name?: string; isMinor?: boolean; participantId?: string };
 totalCompanions++;

 if (!c.participantId) {
 companionsWithoutId++;
 needingMigration.push({
 name: c.name || '(sem nome)',
 isMinor: Boolean(c.isMinor),
 index: i,
 });
 } else {
 companionsWithId++;
 }
 }

 if (needingMigration.length > 0) {
 // Buscar displayName do convite
 let displayName = '';
 try {
 const invDoc = await adminDb
 .collection('events')
 .doc(eventId)
 .collection('invitations')
 .doc(rsvpDoc.id)
 .get();
 if (invDoc.exists) {
 displayName = invDoc.data()?.displayName || '';
 }
 } catch {
 // Ignorar falhas individuais
 }

 affectedInvitations.push({
 invitationId: rsvpDoc.id,
 displayName,
 companionsNeedingMigration: needingMigration,
 });
 }
	}

	// Contar check-ins legados (sem participantId)
	let legacyCheckIns = 0;
	try {
 const allCheckIns = await adminDb
 .collection('events')
 .doc(eventId)
 .collection('checkins')
 .get();

 for (const doc of allCheckIns.docs) {
 const data = doc.data();
 if (!data?.participantId && data?.guestId) {
 legacyCheckIns++;
 }
 }
	} catch {
 // Ignorar falha na contagem de legados
	}

	console.log('[MigrationPreview] Prévia gerada.', {
 totalRsvpsConfirmed: rsvpsSnapshot.size,
 totalCompanions,
 companionsWithoutId,
 companionsWithId,
 affectedInvitations: affectedInvitations.length,
 legacyCheckIns,
 generatedBy: session.uid,
	});

	return {
 success: true,
 data: {
 totalRsvpsConfirmed: rsvpsSnapshot.size,
 totalCompanions,
 companionsWithoutId,
 companionsWithId,
 affectedInvitations,
 legacyCheckIns,
 ambiguousCases: 0, // Será calculado na migração real
 },
	};
	} catch (e) {
 console.error('[MigrationPreview] Erro ao gerar prévia:', e);
 return { success: false, error: 'Erro interno ao gerar prévia de migração.' };
	}
}