/**
 * Formatação de data e horário do casamento — fonte única.
 *
 * Respeita o fuso horário configurado (ex: America/Sao_Paulo) e produz
 * strings elegantes para exibição na Home e demais componentes públicos.
 *
 * O campo `eventDate` é a fonte oficial da data + horário principal.
 * `ceremonyTime` e `receptionTime` são independentes e NÃO devem ser
 * usados como horário principal da Home.
 */

/**
 * Extrai o horário formatado no estilo "17H" ou "17H30" a partir de uma
 * string ISO 8601 com timezone, respeitando o fuso configurado.
 *
 * @example
 * formatWeddingTime('2026-12-12T17:00:00-03:00', 'America/Sao_Paulo') // '17H'
 * formatWeddingTime('2026-12-12T17:30:00-03:00', 'America/Sao_Paulo') // '17H30'
 */
export function formatWeddingTime(
	eventDate: string,
	timezone: string,
): string {
	const date = new Date(eventDate);
	const parts = new Intl.DateTimeFormat('pt-BR', {
		timeZone: timezone || 'America/Sao_Paulo',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	}).formatToParts(date);

	const hour = parts.find(p => p.type === 'hour')?.value ?? '00';
	const minute = parts.find(p => p.type === 'minute')?.value ?? '00';

	if (minute === '00') {
		return `${hour}H`;
	}
	return `${hour}H${minute}`;
}

/**
 * Retorna o dia da semana em português, uppercase, respeitando o fuso.
 *
 * @example
 * formatWeekday('2026-12-12T17:00:00-03:00', 'America/Sao_Paulo') // 'SÁBADO'
 */
export function formatWeekday(
	eventDate: string,
	timezone: string,
): string {
	const date = new Date(eventDate);
	return new Intl.DateTimeFormat('pt-BR', {
		timeZone: timezone || 'America/Sao_Paulo',
		weekday: 'long',
	}).format(date).toUpperCase();
}

/**
 * Retorna a data completa formatada: "12 DE DEZEMBRO DE 2026".
 * Respeita o fuso horário para evitar deslocamento de data por UTC.
 *
 * @example
 * formatFullDate('2026-12-12T17:00:00-03:00', 'America/Sao_Paulo')
 * // '12 DE DEZEMBRO DE 2026'
 */
export function formatFullDate(
	eventDate: string,
	timezone: string,
): string {
	const date = new Date(eventDate);
	const day = new Intl.DateTimeFormat('pt-BR', {
		timeZone: timezone || 'America/Sao_Paulo',
		day: 'numeric',
	}).format(date);

	const monthYear = new Intl.DateTimeFormat('pt-BR', {
		timeZone: timezone || 'America/Sao_Paulo',
		month: 'long',
		year: 'numeric',
	}).format(date).toUpperCase();

	return `${day} DE ${monthYear}`;
}

/**
 * Retorna o dia numérico (sem zero à esquerda) para uso decorativo.
 */
export function formatDayNumber(
	eventDate: string,
	timezone: string,
): string {
	const date = new Date(eventDate);
	return new Intl.DateTimeFormat('pt-BR', {
		timeZone: timezone || 'America/Sao_Paulo',
		day: 'numeric',
	}).format(date);
}

/**
 * Formata data legível para texto corrido: "12 de dezembro de 2026".
 */
export function formatReadableDate(
	eventDate: string,
	timezone: string,
): string {
	const date = new Date(eventDate);
	return new Intl.DateTimeFormat('pt-BR', {
		timeZone: timezone || 'America/Sao_Paulo',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	}).format(date);
}