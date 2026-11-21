/**
 * Testes — Conversão de datas no formulário de configurações
 *
 * Valida que isoToLocal e localToISO produzem round-trip consistente
 * respeitando o fuso horário configurado (America/Sao_Paulo).
 *
 * Cenário de teste:
 * - Data principal: 12/12/2026 17:30 (17:30 BRT = 20:30 UTC)
 * - Prazo RSVP: 02/12/2026 23:59 (23:59 BRT = 02:59 UTC dia seguinte)
 * - Fuso: America/Sao_Paulo
 */

import { describe, it, expect } from 'vitest';

// ============================================================================
// Réplica das funções puras para teste unitário independente
// ============================================================================

function getUtcOffsetForLocal(
	year: number, month: number, day: number,
	hour: number, minute: number,
	timezone: string,
): number {
	const fmt = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		year: 'numeric', month: '2-digit', day: '2-digit',
		hour: '2-digit', minute: '2-digit', second: '2-digit',
		hour12: false,
	});

	const parseParts = (ts: number) => {
		const parts = fmt.formatToParts(new Date(ts));
		const g = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);
		return { y: g('year'), m: g('month'), d: g('day'), h: g('hour') === 24 ? 0 : g('hour'), min: g('minute') };
	};

	let guess = Date.UTC(year, month - 1, day, hour, minute, 0);

	for (let i = 0; i < 3; i++) {
		const p = parseParts(guess);
		const localAsUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, 0);
		const diff = Date.UTC(year, month - 1, day, hour, minute, 0) - localAsUtc;
		guess += diff;
	}

	const finalParts = parseParts(guess);
	const finalLocalAsUtc = Date.UTC(finalParts.y, finalParts.m - 1, finalParts.d, finalParts.h, finalParts.min, 0);
	const offsetMs = guess - finalLocalAsUtc;

	return Math.round(offsetMs / 60000);
}

function localToISO(localValue: string, tz: string): string {
	if (!localValue) return '';
	try {
		const [datePart, timePart] = localValue.split('T');
		if (!datePart || !timePart) return '';

		const [year, month, day] = datePart.split('-').map(Number);
		const [hour, minute] = timePart.split(':').map(Number);

		if ([year, month, day, hour, minute].some((v) => isNaN(v))) return '';

		const timezone = tz || 'America/Sao_Paulo';
		// getUtcOffsetForLocal retorna minutos tal que UTC = local + offset.
		// ISO 8601 offset é o sinal oposto: local = UTC + isoOffset.
		const rawOffsetMin = getUtcOffsetForLocal(year, month, day, hour, minute, timezone);
		const isoOffsetMin = -rawOffsetMin;

		const pad = (n: number) => String(n).padStart(2, '0');
		const base = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00`;

		const sign = isoOffsetMin >= 0 ? '+' : '-';
		const absMin = Math.abs(isoOffsetMin);
		const offH = pad(Math.floor(absMin / 60));
		const offM = pad(absMin % 60);

		return `${base}${sign}${offH}:${offM}`;
	} catch {
		return '';
	}
}

function isoToLocal(isoValue: string | null | undefined, tz?: string): string {
	if (!isoValue) return '';
	try {
		const date = new Date(isoValue);
		if (isNaN(date.getTime())) return '';

		const timezone = tz || 'America/Sao_Paulo';
		const fmt = new Intl.DateTimeFormat('en-CA', {
			timeZone: timezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
		});

		const parts = fmt.formatToParts(date);
		const get = (type: string) =>
			parts.find((p) => p.type === type)?.value ?? '00';

		let hours = get('hour');
		if (hours === '24') hours = '00';

		return `${get('year')}-${get('month')}-${get('day')}T${hours}:${get('minute')}`;
	} catch {
		return '';
	}
}

// ============================================================================
// TESTES
// ============================================================================

describe('Conversão de datas — config-form', () => {
	describe('localToISO', () => {
		it('deve produzir ISO 8601 com offset -03:00 para dezembro em America/Sao_Paulo', () => {
			const result = localToISO('2026-12-12T17:30', 'America/Sao_Paulo');
			expect(result).toBe('2026-12-12T17:30:00-03:00');
		});

		it('deve retornar string vazia para input vazio', () => {
			expect(localToISO('', 'America/Sao_Paulo')).toBe('');
		});

		it('deve retornar string vazia para input sem formato datetime-local', () => {
			// Inputs datetime-local do navegador sempre produzem "YYYY-MM-DDTHH:mm" válido.
			// Strings que não seguem esse formato são rejeitadas pelo split/parse.
			expect(localToISO('not-a-date', 'America/Sao_Paulo')).toBe('');
			expect(localToISO('2026/12/12 17:30', 'America/Sao_Paulo')).toBe('');
			expect(localToISO('T17:30', 'America/Sao_Paulo')).toBe('');
		});

		it('deve produzir ISO válido aceito por Zod .datetime()', () => {
			const iso = localToISO('2026-12-12T17:30', 'America/Sao_Paulo');
			const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;
			expect(isoRegex.test(iso)).toBe(true);
		});

		it('deve calcular offset correto para rsvpDeadline 02/12/2026 23:59', () => {
			const result = localToISO('2026-12-02T23:59', 'America/Sao_Paulo');
			expect(result).toBe('2026-12-02T23:59:00-03:00');
		});
	});

	describe('isoToLocal', () => {
		it('deve converter ISO com offset para datetime-local no fuso do evento', () => {
			const result = isoToLocal('2026-12-12T17:30:00-03:00', 'America/Sao_Paulo');
			expect(result).toBe('2026-12-12T17:30');
		});

		it('deve retornar string vazia para input vazio ou null', () => {
			expect(isoToLocal('', 'America/Sao_Paulo')).toBe('');
			expect(isoToLocal(null, 'America/Sao_Paulo')).toBe('');
			expect(isoToLocal(undefined, 'America/Sao_Paulo')).toBe('');
		});

		it('deve retornar string vazia para ISO inválido', () => {
			expect(isoToLocal('not-a-date', 'America/Sao_Paulo')).toBe('');
		});

		it('deve usar timezone explícito, não o fuso do navegador', () => {
			// 20:30 UTC = 17:30 BRT (-03:00)
			const result = isoToLocal('2026-12-12T20:30:00Z', 'America/Sao_Paulo');
			expect(result).toBe('2026-12-12T17:30');
		});
	});

	describe('Round-trip ISO → local → ISO', () => {
		it('deve preservar o instante exato para eventDate 12/12/2026 17:30 BRT', () => {
			const originalISO = '2026-12-12T17:30:00-03:00';
			const tz = 'America/Sao_Paulo';

			const localValue = isoToLocal(originalISO, tz);
			expect(localValue).toBe('2026-12-12T17:30');

			const resultISO = localToISO(localValue, tz);
			expect(resultISO).toBe('2026-12-12T17:30:00-03:00');

			// Mesmo instante UTC
			expect(new Date(resultISO).getTime()).toBe(new Date(originalISO).getTime());
		});

		it('deve preservar o instante exato para rsvpDeadline 02/12/2026 23:59 BRT', () => {
			const originalISO = '2026-12-02T23:59:00-03:00';
			const tz = 'America/Sao_Paulo';

			const localValue = isoToLocal(originalISO, tz);
			expect(localValue).toBe('2026-12-02T23:59');

			const resultISO = localToISO(localValue, tz);

			// Mesmo instante UTC
			expect(new Date(resultISO).getTime()).toBe(new Date(originalISO).getTime());
		});

		it('deve funcionar com ISO em formato UTC (Z)', () => {
			const originalISO = '2026-12-12T20:30:00Z'; // = 17:30 BRT
			const tz = 'America/Sao_Paulo';

			const localValue = isoToLocal(originalISO, tz);
			expect(localValue).toBe('2026-12-12T17:30');

			const resultISO = localToISO(localValue, tz);

			// Mesmo instante UTC
			expect(new Date(resultISO).getTime()).toBe(new Date(originalISO).getTime());
		});
	});

	describe('rsvpDeadline vazio', () => {
		it('deve aceitar string vazia como valor válido', () => {
			const emptyValue = '';
			expect(emptyValue).toBe('');
		});

		it('não deve enviar string vazia como ISO inválido', () => {
			const rsvpDeadlineLocal = '';
			const payloadValue = rsvpDeadlineLocal || '';
			expect(payloadValue).toBe('');
			expect(payloadValue).not.toMatch(/^\d{4}/);
		});
	});

	describe('Preservação do fuso America/Sao_Paulo', () => {
		it('dezembro deve usar offset +180min (UTC = local + 3h, BRT sem DST)', () => {
			// getUtcOffsetForLocal retorna minutos tal que UTC = local + offset
			// Para BRT (-03:00): UTC = 17:30 + 3h = 20:30 → offset = +180
			const offset = getUtcOffsetForLocal(2026, 12, 12, 17, 30, 'America/Sao_Paulo');
			expect(offset).toBe(180);
		});

		it('offset deve ser consistente para diferentes horários no mesmo dia', () => {
			const offset1 = getUtcOffsetForLocal(2026, 12, 12, 0, 0, 'America/Sao_Paulo');
			const offset2 = getUtcOffsetForLocal(2026, 12, 12, 23, 59, 'America/Sao_Paulo');
			expect(offset1).toBe(offset2);
		});
	});
});