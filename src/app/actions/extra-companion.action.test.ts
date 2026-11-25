/**
 * Teste comportamental do fluxo administrativo de acompanhante extra.
 * Executa a action real com Firestore em memória e transação serializada.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isValidParticipantId } from '@/lib/checkin/participant-ids';

const UUID_EXISTENTE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

interface Harness {
	store: Map<string, unknown>;
}

function setupMock(requestData: Record<string, unknown>, rsvpData: Record<string, unknown> | null): Harness {
	const store = new Map<string, unknown>();
	store.set('events/test-event/extraCompanionRequests/req-1', structuredClone(requestData));
	if (rsvpData) {
		store.set('events/test-event/rsvps/inv-1', structuredClone(rsvpData));
	}

	let queue: Promise<unknown> = Promise.resolve();
	let autoId = 0;

	vi.doMock('@/lib/auth/admin-session', () => ({
		requireAdminSession: vi.fn().mockResolvedValue({ uid: 'admin-1', email: 'admin@teste.com' }),
		requireValidatorSession: vi.fn().mockResolvedValue({ uid: 'val-1', email: 'val@teste.com' }),
	}));

	vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }));

	vi.doMock('firebase-admin/firestore', () => ({
		FieldValue: { serverTimestamp: () => ({ __serverTimestamp: true }) },
	}));

	vi.doMock('@/lib/firebase/admin', () => {
		const docRef = (path: string) => ({ path });
		const adminDb = {
			collection: (name: string) => ({
				doc: (eventId: string) => ({
					collection: (sub: string) => ({
						doc: (id?: string) => docRef(`events/${eventId}/${sub}/${id || `auto-${++autoId}`}`),
						where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }),
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

	return { store };
}

describe('decideExtraCompanionRequestAction — identidade persistente', () => {
	const originalEnv = process.env.NEXT_PUBLIC_EVENT_ID;

	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
		process.env.NEXT_PUBLIC_EVENT_ID = 'test-event';
	});

	afterEach(() => {
		if (originalEnv === undefined) delete process.env.NEXT_PUBLIC_EVENT_ID;
		else process.env.NEXT_PUBLIC_EVENT_ID = originalEnv;
	});

	it('aprova acompanhante extra preservando IDs existentes e gerando um novo', async () => {
		const harness = setupMock(
			{
				invitationId: 'inv-1',
				companionName: 'Ana',
				isMinor: false,
				status: 'pending',
			},
			{
				attendanceStatus: 'confirmed',
				companions: [{ participantId: UUID_EXISTENTE, name: 'Ana', isMinor: false }],
				revision: 4,
			},
		);

		const { decideExtraCompanionRequestAction } = await import('./extra-companion.action');
		const response = await decideExtraCompanionRequestAction({
			requestId: 'req-1',
			decision: 'approved',
			reason: 'Autorizado pelos noivos',
		});

		expect(response.success).toBe(true);
		const request = harness.store.get('events/test-event/extraCompanionRequests/req-1') as Record<string, unknown>;
		const rsvp = harness.store.get('events/test-event/rsvps/inv-1') as {
			companions: Array<{ participantId: string; name: string }>;
			revision: number;
		};

		expect(request.status).toBe('approved');
		expect(isValidParticipantId(request.participantId as string)).toBe(true);
		expect(rsvp.companions).toHaveLength(2);
		expect(rsvp.companions[0].participantId).toBe(UUID_EXISTENTE);
		expect(isValidParticipantId(rsvp.companions[1].participantId)).toBe(true);
		expect(rsvp.companions[1].participantId).not.toBe(UUID_EXISTENTE);
		expect(request.participantId).toBe(rsvp.companions[1].participantId);
		expect(rsvp.revision).toBe(5);
	});

	it('aprova acompanhante extra mesmo sem RSVP prévio, com ID válido', async () => {
		const harness = setupMock(
			{
				invitationId: 'inv-1',
				companionName: 'Externo',
				isMinor: false,
				status: 'pending',
			},
			null,
		);

		const { decideExtraCompanionRequestAction } = await import('./extra-companion.action');
		const response = await decideExtraCompanionRequestAction({
			requestId: 'req-1',
			decision: 'approved',
			reason: 'Solicitação aprovada',
		});

		expect(response.success).toBe(true);
		const rsvp = harness.store.get('events/test-event/rsvps/inv-1') as {
			companions: Array<{ participantId: string }>;
			attendanceStatus: string;
		};
		expect(rsvp.attendanceStatus).toBe('confirmed');
		expect(rsvp.companions).toHaveLength(1);
		expect(isValidParticipantId(rsvp.companions[0].participantId)).toBe(true);
	});
});
