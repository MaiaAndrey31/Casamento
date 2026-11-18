'use server';

/**
 * Server Actions — Lista de Confirmados e Resumo da Recepção (Etapa 4)
 *
 * Expõe consultas otimizadas para o painel do validador.
 * Todas as operações verificam sessão de validador antes de executar.
 */

import { requireValidatorSession } from '@/lib/auth/admin-session';
import {
	listConfirmedInvitations,
	getReceptionSummary,
	type ConfirmedFilter,
	type ConfirmedListResult,
	type ReceptionSummary,
} from '@/lib/repositories/validator-confirmed.repository';
import type { ApiResponse } from '@/types';

const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

/**
 * Lista convidados confirmados com paginação, filtros e busca.
 */
export async function listConfirmedAction(
	filter: ConfirmedFilter = 'all',
	pageSize: number = 20,
	lastDocId?: string,
	searchTerm?: string,
): Promise<ApiResponse<ConfirmedListResult>> {
	try {
		await requireValidatorSession();
	} catch {
		return { success: false, error: 'Sessão de validador inválida ou expirada.' };
	}

	const result = await listConfirmedInvitations(eventId, filter, pageSize, lastDocId, searchTerm);

	return { success: true, data: result };
}

/**
 * Retorna resumo agregado da recepção.
 * Distingue pessoas de convites nos contadores.
 */
export async function getReceptionSummaryAction(): Promise<ApiResponse<ReceptionSummary>> {
	try {
		await requireValidatorSession();
	} catch {
		return { success: false, error: 'Sessão de validador inválida ou expirada.' };
	}

	const summary = await getReceptionSummary(eventId);

	return { success: true, data: summary };
}