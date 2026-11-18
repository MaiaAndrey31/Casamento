'use server';

/**
 * Server Action — Verificar Disponibilidade do Treinamento (Lote 4 §11)
 *
 * O treinamento está disponível APENAS antes da primeira abertura da recepção.
 * Após a recepção ser aberta pela primeira vez, o treinamento é bloqueado
 * permanentemente (mesmo que a recepção seja encerrada ou reaberta).
 *
 * SEGURANÇA:
 * - requireValidatorSession() para acessar
 * - Somente leitura (nenhuma escrita no Firestore)
 * - Não expõe dados reais
 */

import { requireValidatorSession } from '@/lib/auth/admin-session';
import type { ApiResponse } from '@/types';

const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

export async function isTrainingAvailableAction(): Promise<ApiResponse<{ available: boolean; reason?: string }>> {
	try {
 await requireValidatorSession();
	} catch {
 return { success: false, error: 'Sessão de validador inválida.' };
	}

	try {
 const { adminDb } = await import('@/lib/firebase/admin');

 const doc = await adminDb
 .collection('events')
 .doc(eventId)
 .collection('config')
 .doc('receptionControl')
 .get();

 if (!doc.exists) {
 // Nunca foi aberto → treinamento disponível
 return { success: true, data: { available: true } };
	}

	const data = doc.data();
	const hasEverBeenOpened = data?.openedAt || data?.status === 'open' || data?.status === 'closed';

	if (hasEverBeenOpened) {
 return {
 success: true,
 data: {
 available: false,
 reason: 'O treinamento foi bloqueado porque a recepção já foi aberta. Utilize o modo real em /validador.',
 },
 };
	}

	return { success: true, data: { available: true } };
	} catch (e) {
 console.error('[TrainingMode] Erro ao verificar disponibilidade:', e);
 return { success: false, error: 'Erro ao verificar disponibilidade do treinamento.' };
	}
}