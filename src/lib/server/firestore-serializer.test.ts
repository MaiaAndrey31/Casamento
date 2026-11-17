/**
 * Testes Automatizados — Firestore Serializer
 *
 * Cobre:
 * 15. Serialização de Timestamp (Firestore → ISO string)
 * - Timestamp com toDate() → ISO string
 * - Timestamp sem toDate() (fallback manual) → ISO string
 * - null/undefined preservados
 * - Arrays e objetos aninhados serializados recursivamente
 * - DocumentReference → { id, path }
 * - GeoPoint → { latitude, longitude }
 * - Date nativo → ISO string
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { serializeFirestoreValue, serializeFirestoreDoc } from './firestore-serializer';

describe('serializeFirestoreValue', () => {
	it('deve preservar primitivos', () => {
		expect(serializeFirestoreValue('hello')).toBe('hello');
		expect(serializeFirestoreValue(42)).toBe(42);
		expect(serializeFirestoreValue(true)).toBe(true);
		expect(serializeFirestoreValue(null)).toBeNull();
		expect(serializeFirestoreValue(undefined)).toBeUndefined();
	});

	it('deve converter Date nativo para ISO string', () => {
		const date = new Date('2025-10-11T16:30:00.000Z');
		expect(serializeFirestoreValue(date)).toBe('2025-10-11T16:30:00.000Z');
	});

	it('deve converter Firestore Timestamp com toDate()', () => {
		const timestamp = {
			_seconds: 1728664200,
			_nanoseconds: 500000000,
			toDate: () => new Date('2024-10-11T16:30:00.500Z'),
		};
		expect(serializeFirestoreValue(timestamp)).toBe('2024-10-11T16:30:00.500Z');
	});

	it('deve converter Firestore Timestamp sem toDate() (fallback)', () => {
		const timestamp = {
			_seconds: 1728664200,
			_nanoseconds: 0,
		};
		const result = serializeFirestoreValue(timestamp);
		expect(typeof result).toBe('string');
		expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
	});

	it('deve converter DocumentReference para objeto simples', () => {
		const ref = {
			id: 'doc123',
			path: 'events/evt1/guests/doc123',
			firestore: {},
		};
		expect(serializeFirestoreValue(ref)).toEqual({
			id: 'doc123',
			path: 'events/evt1/guests/doc123',
		});
	});

	it('deve converter GeoPoint para objeto simples', () => {
		const geo = { latitude: -23.5505, longitude: -46.6333 };
		expect(serializeFirestoreValue(geo)).toEqual({
			latitude: -23.5505,
			longitude: -46.6333,
		});
	});

	it('deve serializar arrays recursivamente', () => {
		const arr = [
			'string',
			42,
			new Date('2025-01-01T00:00:00.000Z'),
			{ _seconds: 1728664200, _nanoseconds: 0, toDate: () => new Date('2024-10-11T16:30:00.000Z') },
		];
		const result = serializeFirestoreValue(arr);
		expect(result).toEqual([
			'string',
			42,
			'2025-01-01T00:00:00.000Z',
			'2024-10-11T16:30:00.000Z',
		]);
	});

	it('deve serializar objetos aninhados recursivamente', () => {
		const obj = {
			name: 'Teste',
			createdAt: {
				_seconds: 1728664200,
				_nanoseconds: 0,
				toDate: () => new Date('2024-10-11T16:30:00.000Z'),
			},
			nested: {
				value: true,
				date: new Date('2025-06-15T12:00:00.000Z'),
			},
		};
		const result = serializeFirestoreValue(obj);
		expect(result).toEqual({
			name: 'Teste',
			createdAt: '2024-10-11T16:30:00.000Z',
			nested: {
				value: true,
				date: '2025-06-15T12:00:00.000Z',
			},
		});
	});

	it('deve retornar null para classes desconhecidas em produção', () => {
		class UnknownClass {
			value = 42;
		}
		vi.stubEnv('NODE_ENV', 'production');

		const result = serializeFirestoreValue(new UnknownClass());
		expect(result).toBeNull();

		vi.unstubAllEnvs();
	});
});

describe('serializeFirestoreDoc', () => {
	it('deve adicionar id ao documento serializado', () => {
		const data = {
			name: 'João Silva',
			createdAt: {
				_seconds: 1728664200,
				_nanoseconds: 0,
				toDate: () => new Date('2024-10-11T16:30:00.000Z'),
			},
		};
		const result = serializeFirestoreDoc('guest123', data);
		expect(result).toHaveProperty('id', 'guest123');
		expect((result as Record<string, unknown>).name).toBe('João Silva');
		expect((result as Record<string, unknown>).createdAt).toBe('2024-10-11T16:30:00.000Z');
	});

	it('deve lidar com documento vazio', () => {
		const result = serializeFirestoreDoc('empty-doc', {});
		expect(result).toEqual({ id: 'empty-doc' });
	});
});