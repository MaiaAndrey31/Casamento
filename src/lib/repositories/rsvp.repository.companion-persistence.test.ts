/**
 * Testes comportamentais de persistência — submitRSVP com Firestore em memória.
 *
 * O mock simula a cadeia real de chamadas e, principalmente, um
 * runTransaction serializado (read-modify-write atômico). Não inspeciona
 * código-fonte: executa a validação e a escrita reais do repositório.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isValidParticipantId } from '@/lib/checkin/participant-ids';

interface StoredRsvp {
	attendanceStatus: string;
	companions: Array<{ participantId?: string; name: string; isMinor: boolean; age?: number }>;
	revision: number;
	[key: string]: unknown;
}

interface Harness {
	store: Map<string, unknown>;
	readRsvp: (id: string) => StoredRsvp;
}

function setupFirestoreMock(initial: Record<string, StoredRsvp> = {}): Harness {
	const store = new Map<string, unknown>(
		Object.entries(initial).map(([id, data]) => [`events/test-event/rsvps/${id}`, structuredClone(data)]),
	);

	let queue: Promise<unknown> = Promise.resolve();

	vi.doMock('@/lib/firebase/admin', () => {
		const docRef = (path: string) => ({ path });

		const adminDb = {
			collection: (name: string) => ({
				doc: (eventId: string) => ({
					collection: (sub: string) => ({
						doc: (docId: string) => docRef(`${name}/${eventId}/${sub}/${docId}`),
					}),
				}),
			}),
			runTransaction: (fn: (tx: unknown) => Promise<unknown>) => {
				const run = queue.then(async () => {
					const pending: Array<() => void> = [];
					const tx = {
						get: async (ref: { path: string }) => {
							const data = store.get(ref.path);
							return {
								exists: data !== undefined,
								data: () => (data === undefined ? undefined : structuredClone(data)),
							};
						},
						set: (ref: { path: string }, data: Record<string, unknown>) => {
							pending.push(() => store.set(ref.path, structuredClone(data)));
						},
						update: (ref: { path: string }, data: Record<string, unknown>) => {
							pending.push(() => {
								const current = (store.get(ref.path) || {}) as Record<string, unknown>;
								store.set(ref.path, { ...current, ...structuredClone(data) });
							});
						},
					};
					const result = await fn(tx);
					pending.forEach(apply => apply());
					return result;
				});
				queue = run.catch(() => undefined);
				return run;
			},
		};

		return { adminDb };
	});

	vi.doMock('firebase-admin/firestore', () => ({
		FieldValue: { serverTimestamp: () => ({ __serverTimestamp: true }) },
	}));

	return {
		store,
		readRsvp: (id: string) => {
			const data = store.get(`events/test-event/rsvps/${id}`);
			if (!data) throw new Error(`RSVP ${id} não encontrado`);
			return data as StoredRsvp;
		},
	};
}

function payload(companions: Array<{ name: string; isMinor: boolean; age?: number; participantId?: string }>) {
	return {
		attendanceStatus: 'confirmed' as const,
		confirmedGuestIds: [] as string[],
		companions,
		dietaryRestrictions: [] as string[],
		songSuggestion: '',
		personalMessage: '',
	};
}

describe('submitRSVP — persistência de identidade dos acompanhantes', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it('1. confirmação sem acompanhantes persiste array vazio', async () => {
		const harness = setupFirestoreMock();
		const { submitRSVP } = await import('./rsvp.repository');

		const result = await submitRSVP('test-event', 'inv-001', payload([]));

		expect(result.success).toBe(true);
		expect(harness.readRsvp('inv-001').companions).toEqual([]);
		expect(harness.readRsvp('inv-001').revision).toBe(1);
	});

	it('2/4. confirmação com um acompanhante persiste ID válido; edição não o regenera', async () => {
		const harness = setupFirestoreMock();
		const { submitRSVP } = await import('./rsvp.repository');

		await submitRSVP('test-event', 'inv-002', payload([{ name: 'Adriano', isMinor: false }]));
		const first = harness.readRsvp('inv-002').companions[0];
		expect(isValidParticipantId(first.participantId!)).toBe(true);

		await submitRSVP('test-event', 'inv-002', payload([
			{ name: 'Adriano', isMinor: false, age: 35, participantId: first.participantId },
		]));
		const second = harness.readRsvp('inv-002').companions[0];

		expect(second.participantId).toBe(first.participantId);
		expect(second.age).toBe(35);
		expect(harness.readRsvp('inv-002').revision).toBe(2);
	});

	it('3. vários acompanhantes são persistidos com IDs válidos e únicos', async () => {
		const harness = setupFirestoreMock();
		const { submitRSVP } = await import('./rsvp.repository');

		await submitRSVP('test-event', 'inv-003', payload([
			{ name: 'Ana', isMinor: false },
			{ name: 'Bruno', isMinor: false },
			{ name: 'Carla', isMinor: true, age: 8 },
		]));

		const companions = harness.readRsvp('inv-003').companions;
		expect(companions).toHaveLength(3);
		companions.forEach(c => expect(isValidParticipantId(c.participantId!)).toBe(true));
		expect(new Set(companions.map(c => c.participantId)).size).toBe(3);
	});

	it('6/7. edição real preserva IDs após renomeação e inclusão de novo acompanhante', async () => {
		const harness = setupFirestoreMock();
		const { submitRSVP } = await import('./rsvp.repository');

		await submitRSVP('test-event', 'inv-004', payload([
			{ name: 'Ana', isMinor: false },
			{ name: 'Bruno', isMinor: false },
		]));
		const original = harness.readRsvp('inv-004').companions;

		await submitRSVP('test-event', 'inv-004', payload([
			{ ...original[1], name: 'Bruno Souza' },
			{ ...original[0], name: 'Ana Maria' },
			{ name: 'Carla', isMinor: false },
		]));

		const updated = harness.readRsvp('inv-004').companions;
		expect(updated.map(c => c.participantId)).toEqual([
			original[1].participantId,
			original[0].participantId,
			updated[2].participantId,
		]);
		expect(isValidParticipantId(updated[2].participantId!)).toBe(true);
	});

	it('8. acompanhante legado sem ID é reconciliado automaticamente na escrita', async () => {
		const harness = setupFirestoreMock({
			'inv-legacy': {
				attendanceStatus: 'confirmed',
				companions: [{ name: 'Adriano ', isMinor: false }],
				revision: 1,
			},
		});
		const { submitRSVP } = await import('./rsvp.repository');

		await submitRSVP('test-event', 'inv-legacy', payload([{ name: 'Adriano ', isMinor: false }]));

		const companion = harness.readRsvp('inv-legacy').companions[0];
		expect(isValidParticipantId(companion.participantId!)).toBe(true);
	});

	it('16. atualizações concorrentes não produzem IDs inválidos nem duplicados', async () => {
		const harness = setupFirestoreMock();
		const { submitRSVP } = await import('./rsvp.repository');

		await submitRSVP('test-event', 'inv-concurrent', payload([{ name: 'Ana', isMinor: false }]));
		const originalId = harness.readRsvp('inv-concurrent').companions[0].participantId;

		await Promise.all([
			submitRSVP('test-event', 'inv-concurrent', payload([
				{ name: 'Ana Renomeada', isMinor: false, participantId: originalId },
				{ name: 'Bruno', isMinor: false },
			])),
			submitRSVP('test-event', 'inv-concurrent', payload([
				{ name: 'Ana Final', isMinor: false, participantId: originalId },
				{ name: 'Carla', isMinor: false },
			])),
		]);

		const final = harness.readRsvp('inv-concurrent');
		expect(final.companions.length).toBeGreaterThan(0);
		final.companions.forEach(c => expect(isValidParticipantId(c.participantId!)).toBe(true));
		expect(new Set(final.companions.map(c => c.participantId)).size).toBe(final.companions.length);
		expect(final.companions.some(c => c.participantId === originalId)).toBe(true);
		expect(final.revision).toBe(3);
	});

	it('18. nenhuma escrita deixa um acompanhante sem participantId no store', async () => {
		const harness = setupFirestoreMock();
		const { submitRSVP } = await import('./rsvp.repository');

		await submitRSVP('test-event', 'inv-a', payload([{ name: 'Ana', isMinor: false }]));
		await submitRSVP('test-event', 'inv-b', payload([
			{ name: 'Bruno', isMinor: false },
			{ name: 'Carla', isMinor: false },
		]));
		await submitRSVP('test-event', 'inv-a', payload([
			{ name: 'Ana', isMinor: false },
			{ name: 'Danilo', isMinor: false },
		]));

		for (const value of harness.store.values()) {
			const doc = value as StoredRsvp;
			(doc.companions || []).forEach(c => {
				expect(isValidParticipantId(c.participantId!)).toBe(true);
			});
		}
	});
});
