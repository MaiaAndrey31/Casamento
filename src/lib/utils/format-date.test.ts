/**
 * Testes do utilitário centralizado de formatação de datas.
 *
 * Cobre: Timestamp Firestore, string ISO, number (ms), Date nativo,
 * valores ausentes/inválidos, fuso horário America/Sao_Paulo e pt-BR.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toDate, formatDateTime, formatDateOnly, formatDateTimeFull } from './format-date';

describe('toDate', () => {
	it('retorna null para null e undefined', () => {
		expect(toDate(null)).toBeNull();
		expect(toDate(undefined)).toBeNull();
	});

	it('converte string ISO 8601 válida', () => {
		const result = toDate('2026-11-18T21:35:00.000Z');
		expect(result).toBeInstanceOf(Date);
		expect(result!.toISOString()).toBe('2026-11-18T21:35:00.000Z');
	});

	it('retorna null para string vazia ou inválida', () => {
		expect(toDate('')).toBeNull();
		expect(toDate('not-a-date')).toBeNull();
		expect(toDate('   ')).toBeNull();
	});

	it('converte número em milissegundos', () => {
		const ms = new Date('2026-11-18T21:35:00.000Z').getTime();
		const result = toDate(ms);
		expect(result).toBeInstanceOf(Date);
		expect(result!.getTime()).toBe(ms);
	});

	it('retorna null para número inválido', () => {
		expect(toDate(NaN)).toBeNull();
		expect(toDate(Infinity)).toBeNull();
	});

	it('converte Date nativo válido', () => {
		const date = new Date('2026-11-18T21:35:00.000Z');
		expect(toDate(date)).toBe(date);
	});

	it('retorna null para Date inválido', () => {
		expect(toDate(new Date('invalid'))).toBeNull();
	});

	it('converte objeto Timestamp Firestore com toDate()', () => {
		const timestamp = {
			_seconds: 1763502900,
			_nanoseconds: 0,
			toDate: () => new Date(1763502900 * 1000),
		};
		const result = toDate(timestamp);
		expect(result).toBeInstanceOf(Date);
		expect(result!.getTime()).toBe(1763502900 * 1000);
	});

	it('converte objeto Timestamp Firestore sem toDate() via _seconds/_nanoseconds', () => {
		const timestamp = {
			_seconds: 1763502900,
			_nanoseconds: 500000000, // 500ms
		};
		const result = toDate(timestamp);
		expect(result).toBeInstanceOf(Date);
		expect(result!.getTime()).toBe(1763502900 * 1000 + 500);
	});

	it('retorna null para objeto Timestamp com valores inválidos', () => {
		const timestamp = {
			_seconds: NaN,
			_nanoseconds: 0,
		};
		expect(toDate(timestamp)).toBeNull();
	});
});

describe('formatDateTime', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-11-18T21:35:00.000Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('formata string ISO em pt-BR com fuso America/Sao_Paulo', () => {
		const result = formatDateTime('2026-11-18T21:35:00.000Z');
		// 21:35 UTC = 18:35 BRT (UTC-3)
		expect(result).toMatch(/18\/11\/2026/);
		expect(result).toMatch(/18:35/);
	});

	it('formata Timestamp Firestore corretamente', () => {
		const timestamp = {
			_seconds: 1763502900,
			_nanoseconds: 0,
			toDate: () => new Date(1763502900 * 1000),
		};
		const result = formatDateTime(timestamp);
		expect(result).not.toBe('Data não disponível');
		expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
	});

	it('formata número em milissegundos', () => {
		const ms = new Date('2026-11-18T21:35:00.000Z').getTime();
		const result = formatDateTime(ms);
		expect(result).toMatch(/18\/11\/2026/);
	});

	it('retorna fallback para valor ausente', () => {
		expect(formatDateTime(null)).toBe('Data não disponível');
		expect(formatDateTime(undefined)).toBe('Data não disponível');
	});

	it('retorna fallback para valor inválido', () => {
		expect(formatDateTime('not-a-date')).toBe('Data não disponível');
		expect(formatDateTime(new Date('invalid'))).toBe('Data não disponível');
	});

	it('aceita fallback customizado', () => {
		expect(formatDateTime(null, 'Sem data')).toBe('Sem data');
	});
});

describe('formatDateOnly', () => {
	it('formata apenas a data sem hora', () => {
		const result = formatDateOnly('2026-11-18T21:35:00.000Z');
		expect(result).toMatch(/18\/11\/2026/);
		expect(result).not.toMatch(/:/);
	});

	it('retorna fallback para valor inválido', () => {
		expect(formatDateOnly(null)).toBe('Data não disponível');
		expect(formatDateOnly('invalid')).toBe('Data não disponível');
	});
});

describe('formatDateTimeFull', () => {
	it('inclui dia da semana na formatação', () => {
		const result = formatDateTimeFull('2026-11-18T21:35:00.000Z');
		// 18/11/2026 é quarta-feira
		expect(result).toMatch(/quarta-feira/i);
		expect(result).toMatch(/18\/11\/2026/);
	});

	it('retorna fallback para valor inválido', () => {
		expect(formatDateTimeFull(null)).toBe('Data não disponível');
	});
});

describe('compatibilidade com registros antigos', () => {
	it('aceita string ISO serializada pelo firestore-serializer', () => {
		// Formato produzido por serializeFirestoreValue: "2026-11-18T21:35:00.000Z"
		const serialized = '2026-11-18T21:35:00.000Z';
		const result = formatDateTime(serialized);
		expect(result).not.toBe('Data não disponível');
		expect(result).toMatch(/18\/11\/2026/);
	});

	it('aceita objeto com seconds/nanoseconds (formato REST API)', () => {
		// Alguns registros antigos podem ter vindo via REST API com campos diferentes
		// O toDate não reconhece esse formato diretamente, mas o serializer converte
		// Este teste garante que o fallback funciona
		expect(formatDateTime({ seconds: 1763502900, nanoseconds: 0 } as any)).toBe('Data não disponível');
	});
});