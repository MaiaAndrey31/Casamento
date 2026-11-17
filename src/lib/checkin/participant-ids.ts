/**
 * Participant IDs — Geração e Gestão de Identificadores Persistentes
 *
 * Cada participante de um convite (titular ou acompanhante) possui um
 * `participantId` imutável e único, gerado uma única vez.
 *
 * REGRAS:
 * - Titular: usa o guestId existente (já é estável e único no Firestore)
 * - Acompanhante: UUID v4 gerado uma única vez na migração ou criação
 * - O ID NÃO depende do nome, posição no array ou qualquer outro campo mutável
 * - O ID NUNCA muda após geração
 * - O ID NUNCA é reutilizado para outra pessoa
 *
 * COMPATIBILIDADE:
 * - Check-ins legados (sem participantId) são reconciliados por guestId
 * - A migração atribui UUIDs aos companions existentes SEM alterar nomes
 * - Se não for possível reconciliar com segurança, sinaliza para revisão manual
 */

import type { CompanionWithId } from '@/types';

/**
 * Sanitiza valores para uso seguro em document IDs do Firestore.
 * Remove caracteres que podem causar problemas em paths.
 */
export function sanitizeForDocId(value: string): string {
	return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Constrói a chave determinística de um check-in no Firestore.
 * Formato: {eventId}_{invitationId}_{participantId}
 *
 * Esta chave garante unicidade atômica pelo próprio Firestore:
 * dois validadores tentando registrar o mesmo participante simultaneamente
 * resultam em apenas uma escrita bem-sucedida dentro de uma transação.
 *
 * @param eventId - ID do evento
 * @param invitationId - ID do convite
 * @param participantId - ID persistente do participante (guestId ou UUID)
 * @returns Document ID seguro para a coleção checkins
 */
export function buildCheckInDocId(
	eventId: string,
	invitationId: string,
	participantId: string,
): string {
	const safeEvent = sanitizeForDocId(eventId);
	const safeInvitation = sanitizeForDocId(invitationId);
	const safeParticipant = sanitizeForDocId(participantId);

	return `${safeEvent}_${safeInvitation}_${safeParticipant}`;
}

/**
 * Extrai os componentes de um check-in doc ID.
 * Retorna null se o formato for inválido.
 */
export function parseCheckInDocId(
	docId: string,
): { eventId: string; invitationId: string; participantId: string } | null {
	const parts = docId.split('_');
	if (parts.length < 3) return null;

	// eventId e invitationId podem conter underscores sanitizados,
	// então usamos a estratégia: primeiro e último segmentos fixos,
	// meio é o invitationId. Mas como sanitizamos, o split é confiável
	// apenas se os IDs originais não continham underscores.
	// Para segurança, assumimos formato padrão sem underscores nos IDs originais.
	const eventId = parts[0];
	const participantId = parts[parts.length - 1];
	const invitationId = parts.slice(1, parts.length - 1).join('_');

	if (!eventId || !invitationId || !participantId) return null;

	return { eventId, invitationId, participantId };
}

/**
 * Gera um UUID v4 persistente para um acompanhante.
 * Usa crypto.randomUUID() quando disponível (Node 19+, browsers modernos),
 * fallback para implementação manual segura.
 */
export function generateParticipantUuid(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}

	// Fallback: UUID v4 manual com crypto.getRandomValues
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);

	// Set version (4) and variant (RFC 4122)
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;

	const hex = Array.from(bytes)
		.map(b => b.toString(16).padStart(2, '0'))
		.join('');

	return [
		hex.slice(0, 8),
		hex.slice(8, 12),
		hex.slice(12, 16),
		hex.slice(16, 20),
		hex.slice(20, 32),
	].join('-');
}

/**
 * Garante que todos os companions de um RSVP tenham participantId persistente.
 * Idempotente: companions que já têm ID não são alterados.
 *
 * @param companions - Array de companions do RSVP (legado ou já migrado)
 * @returns Array com participantId garantido para cada companion
 */
export function ensureCompanionIds(
	companions: Array<{ name: string; isMinor: boolean; age?: number; participantId?: string }>,
): CompanionWithId[] {
	return companions.map(c => ({
		participantId: c.participantId || generateParticipantUuid(),
		name: c.name,
		isMinor: Boolean(c.isMinor),
		age: c.age,
	}));
}

/**
 * Verifica se um participantId é válido (não vazio e formato aceitável).
 */
export function isValidParticipantId(id: string): boolean {
	if (!id || id.trim().length === 0) return false;
	// guestIds do Firestore são strings alfanuméricas (~20 chars)
	// UUIDs têm formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
	// Ambos passam nesta verificação básica
	return /^[a-zA-Z0-9_-]+$/.test(id) && id.length >= 8 && id.length <= 64;
}