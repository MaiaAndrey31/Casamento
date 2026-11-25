/**
 * Identidade de Acompanhantes — Regra Central de Persistência
 *
 * TODA escrita no array `companions` de um RSVP deve passar por aqui.
 * A função é pura e roda dentro da transação que lê o RSVP atual, o que
 * garante que a decisão sobre cada identidade seja atômica em relação à
 * versão do documento que está sendo gravada.
 *
 * REGRAS INVIOLÁVEIS:
 * - Nenhum acompanhante é persistido sem `participantId` válido.
 * - IDs existentes NUNCA são regenerados, mesmo após renomeação, mudança de
 *   idade ou reordenação.
 * - O cliente não pode introduzir um ID que não pertença ao RSVP atual
 *   (identidade conflitante) — a escrita é rejeitada.
 * - Dados legados sem ID recebem um UUID na primeira escrita seguinte,
 *   apenas quando o nome é inequívoco dentro do mesmo RSVP.
 * - A POSIÇÃO NO ARRAY NUNCA é usada como prova de identidade.
 * - Identidades já estabelecidas só são aceitas quando o ID é reenviado
 *   explicitamente. Edições ambíguas são BLOQUEADAS, nunca resolveis por
 *   nome/posição, para não transferir o ID de uma pessoa para outra.
 */

import { z } from 'zod';
import type { CompanionWithId } from '@/types';
import { generateParticipantUuid, isValidParticipantId } from '@/lib/checkin/participant-ids';

/** Schema de persistência — exige identificador válido após a preparação. */
export const companionPersistenceSchema = z.object({
	participantId: z.string().refine(isValidParticipantId, 'participantId inválido'),
	name: z.string().min(1, 'Nome do acompanhante é obrigatório').max(200),
	isMinor: z.boolean(),
	age: z.number().int().min(0).max(150).optional(),
}).passthrough();

export interface CompanionCandidate {
	name: string;
	isMinor?: boolean;
	age?: number;
	participantId?: string;
}

export type PersistedCompanion = CompanionWithId & Record<string, unknown>;

interface ExistingEntry {
	companion: CompanionCandidate;
	id: string | null;
	name: string;
	used: boolean;
}

/** Remove chaves com valor undefined (evita campos indefinidos no Firestore). */
function withoutUndefined(value: CompanionCandidate): CompanionCandidate {
	return Object.fromEntries(
		Object.entries(value).filter(([, v]) => v !== undefined),
	) as CompanionCandidate;
}

/** Normalização para correspondência — acentos, caixa e espaços irrelevantes. */
function normalizeName(value: string): string {
	return String(value || '')
		.toLocaleLowerCase('pt-BR')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.trim();
}

function mergeCompanion(
	existing: CompanionCandidate,
	incoming: CompanionCandidate,
	participantId: string,
): PersistedCompanion {
	return {
		...existing,
		...withoutUndefined(incoming),
		participantId,
	} as PersistedCompanion;
}

export interface PrepareCompanionsInput {
	/** Dados vindos do formulário/action (podem não ter ID). */
	incoming: CompanionCandidate[];
	/** Com companions atuais do RSVP, lidos dentro da transação de escrita. */
	existing?: CompanionCandidate[];
	/**
	 * Índices de companions que DEVEM receber um ID novo, mesmo que o nome
	 * coincida com um existente (ex.: acompanhante extra aprovado).
	 */
	forceNewIndexes?: number[];
}

/**
 * Prepara e valida os companions que serão gravados no RSVP.
 *
 * @throws Error quando há ID conflitante ou o resultado não atende ao schema.
 */
export function preparePersistedCompanions({
	incoming,
	existing = [],
	forceNewIndexes = [],
}: PrepareCompanionsInput): PersistedCompanion[] {
	const incomingList = incoming.map(withoutUndefined);
	const existingList = existing.map(withoutUndefined);
	const forced = new Set(forceNewIndexes);

	const entries: ExistingEntry[] = existingList.map(companion => ({
		companion,
		id: isValidParticipantId(String(companion.participantId || ''))
			? String(companion.participantId)
			: null,
		name: normalizeName(String(companion.name || '')),
		used: false,
	}));

	const prepared: Array<PersistedCompanion | null> = incomingList.map(() => null);

	// 1) IDs explícitos e pertencentes ao RSVP atual têm prioridade absoluta.
	for (let i = 0; i < incomingList.length; i++) {
		if (forced.has(i)) continue;
		const id = String(incomingList[i].participantId || '');
		if (!isValidParticipantId(id)) continue;

		const entry = entries.find(e => !e.used && e.id === id);
		if (!entry) {
			throw new Error(
				`IDENTIDADE_CONFLITANTE: participantId "${id}" não pertence a este RSVP ou já foi utilizado nesta edição.`,
			);
		}
		entry.used = true;
		prepared[i] = mergeCompanion(entry.companion, incomingList[i], id);
	}

	// Clientes que reenviam ao menos um ID conhecido são considerados
	// "id-aware": companions omitidos são remoções e os demais sem ID são
	// pessoas novas (UUID fresco). Clientes sem nenhum ID não podem editar
	// identidades já estabelecidas — a ambiguidade é bloqueada abaixo.
	const idAware = prepared.some(companion => companion !== null);

	// 2) Promoção de registros LEGADOS (sem ID) pelo nome — apenas quando o
	//    nome ocorre UMA ÚNICA vez no RSVP. Identidades já estabelecidas
	//    (com ID) nunca são recuperadas por nome: para isso o ID é obrigatório.
	const unmatched: number[] = [];
	for (let i = 0; i < incomingList.length; i++) {
		if (prepared[i] || forced.has(i)) continue;

		const name = normalizeName(String(incomingList[i].name || ''));
		const candidates = name
			? entries.filter(e => !e.used && e.id === null && e.name === name)
			: [];

		if (candidates.length > 1) {
			throw new Error(
				'IDENTIDADE_AMBIGUA: existem acompanhantes legados com o mesmo nome neste RSVP. ' +
				'Não é possível atribuir identificadores sem reenviar os IDs existentes.',
			);
		}

		if (candidates.length === 1) {
			candidates[0].used = true;
			prepared[i] = mergeCompanion(
				candidates[0].companion,
				incomingList[i],
				generateParticipantUuid(),
			);
			continue;
		}

		unmatched.push(i);
	}

	// 3) Nenhum acompanhante sem ID pode assumir a identidade de alguém que
	//    já possui ID. Em uma edição sem IDs, se restar qualquer identidade
	//    estabelecida não representada, a edição é ambígua e é BLOQUEADA.
	//    Em uma edição id-aware, o novo acompanhante recebe ID novo e a
	//    identidade omitida é tratada como remoção — nunca reaproveitada.
	const establishedWithoutId = entries.some(e => !e.used && e.id !== null);
	if (unmatched.length > 0 && establishedWithoutId && !idAware) {
		throw new Error(
			'IDENTIDADE_AMBIGUA: a edição não informou os participantIds dos acompanhantes ' +
			'já existentes. Reenvie os identificadores para evitar atribuir a identidade ' +
			'de uma pessoa a outra.',
		);
	}

	// Sem identidades estabelecidas em conflito, os restantes são novos.
	for (const index of unmatched) {
		prepared[index] = {
			...incomingList[index],
			isMinor: Boolean(incomingList[index].isMinor),
			participantId: generateParticipantUuid(),
		} as PersistedCompanion;
	}

	// Companions explicitamente marcados como novos recebem sempre um UUID
	// fresco, sem reaproveitar a identidade de um homônimo existente.
	for (const index of forced) {
		if (prepared[index]) continue;
		prepared[index] = {
			...incomingList[index],
			isMinor: Boolean(incomingList[index].isMinor),
			participantId: generateParticipantUuid(),
		} as PersistedCompanion;
	}

	const result = prepared as PersistedCompanion[];

	// 4) Schema de persistência + unicidade — nenhum documento inconsistente
	//    é produzido por esta função.
	const validated = result.map(companion => companionPersistenceSchema.parse(companion));
	const ids = validated.map(c => c.participantId);
	if (new Set(ids).size !== ids.length) {
		throw new Error('IDENTIDADE_DUPLICADA: dois companions possuem o mesmo participantId.');
	}

	return validated as PersistedCompanion[];
}
