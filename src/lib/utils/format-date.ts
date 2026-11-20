/**
 * Utilitário Centralizado de Formatação de Datas
 *
 * Aceita múltiplos formatos de entrada (Timestamp Firestore, string ISO,
 * number em ms, Date nativo) e retorna strings formatadas em pt-BR
 * com fuso horário America/Sao_Paulo.
 *
 * Regras:
 * - Nunca inventa datas: se o valor for inválido ou ausente, retorna fallback.
 * - Não substitui datas inválidas pela data atual.
 * - Registra inconsistências no console para diagnóstico.
 */

// ============================================================================
// TIPOS
// ============================================================================

/** Valor de data aceito pelas funções de formatação. */
export type DateInput =
	| string
	| number
	| Date
	| { _seconds: number; _nanoseconds: number; toDate?: () => Date }
	| null
	| undefined;

// ============================================================================
// CONVERSÃO PARA DATE
// ============================================================================

/**
 * Converte qualquer formato suportado em um Date válido.
 * Retorna null se o valor for ausente, inválido ou não reconhecido.
 */
export function toDate(value: DateInput): Date | null {
	if (value === null || value === undefined) return null;

	// Date nativo
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value;
	}

	// String ISO 8601 ou outra string parseável
	if (typeof value === 'string') {
		if (!value.trim()) return null;
		const d = new Date(value);
		if (Number.isNaN(d.getTime())) {
			console.warn(`[formatDate] String de data inválida: "${value}"`);
			return null;
		}
		return d;
	}

	// Número (milissegundos desde epoch)
	if (typeof value === 'number') {
		if (!Number.isFinite(value)) return null;
		const d = new Date(value);
		if (Number.isNaN(d.getTime())) {
			console.warn(`[formatDate] Timestamp numérico inválido: ${value}`);
			return null;
		}
		return d;
	}

	// Objeto tipo Firestore Timestamp (_seconds / _nanoseconds)
	if (typeof value === 'object' && '_seconds' in value && '_nanoseconds' in value) {
		try {
			if (typeof value.toDate === 'function') {
				const d = value.toDate();
				return Number.isNaN(d.getTime()) ? null : d;
			}
			const ms = value._seconds * 1000 + Math.floor(value._nanoseconds / 1_000_000);
			const d = new Date(ms);
			if (Number.isNaN(d.getTime())) {
				console.warn(`[formatDate] Timestamp Firestore inválido: _seconds=${value._seconds}`);
				return null;
			}
			return d;
		} catch {
			console.warn('[formatDate] Falha ao converter objeto Timestamp-like');
			return null;
		}
	}

	console.warn(`[formatDate] Tipo de data não reconhecido:`, typeof value, value);
	return null;
}

// ============================================================================
// FORMATADORES
// ============================================================================

const TIMEZONE = 'America/Sao_Paulo';

/**
 * Formata uma data como "DD/MM/AAAA às HH:MM".
 * Exemplo: "18/11/2026 às 21:35"
 *
 * @param value - Data em qualquer formato suportado
 * @param fallback - Texto retornado quando a data é inválida (padrão: "Data não disponível")
 */
export function formatDateTime(value: DateInput, fallback = 'Data não disponível'): string {
	const date = toDate(value);
	if (!date) return fallback;

	return date.toLocaleString('pt-BR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		timeZone: TIMEZONE,
	});
}

/**
 * Formata uma data apenas como "DD/MM/AAAA".
 * Exemplo: "18/11/2026"
 *
 * @param value - Data em qualquer formato suportado
 * @param fallback - Texto retornado quando a data é inválida (padrão: "Data não disponível")
 */
export function formatDateOnly(value: DateInput, fallback = 'Data não disponível'): string {
	const date = toDate(value);
	if (!date) return fallback;

	return date.toLocaleDateString('pt-BR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		timeZone: TIMEZONE,
	});
}

/**
 * Formata uma data como string completa com dia da semana.
 * Exemplo: "quarta-feira, 18/11/2026 às 21:35"
 *
 * @param value - Data em qualquer formato suportado
 * @param fallback - Texto retornado quando a data é inválida
 */
export function formatDateTimeFull(value: DateInput, fallback = 'Data não disponível'): string {
	const date = toDate(value);
	if (!date) return fallback;

	return date.toLocaleString('pt-BR', {
		weekday: 'long',
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		timeZone: TIMEZONE,
	});
}