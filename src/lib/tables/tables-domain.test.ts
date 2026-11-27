/**
 * Testes comportamentais do domínio de mesas.
 *
 * Executa a lógica real de repositórios e Server Actions com um Firestore em
 * memória que suporta transações serializadas e leitura via query dentro da
 * transação. Não inspeciona código-fonte.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const EVENT = 'test-event';
const BASE = `events/${EVENT}`;

type Data = Record<string, unknown>;

interface Harness {
	store: Map<string, Data>;
	docs: (collection: string) => Array<{ id: string; path: string; data: Data }>;
	count: (collection: string) => number;
	quantities: () => { eligible: number; withTable: number; withoutTable: number };
}

function createHarness(initial: Record<string, Array<{ id: string; data: Data }>>): Harness {
	const store = new Map<string, Data>();
	for (const [name, docs] of Object.entries(initial)) {
		for (const doc of docs) store.set(`${BASE}/${name}/${doc.id}`, structuredClone(doc.data));
	}

	let seq = 0;
	let queue: Promise<unknown> = Promise.resolve();

	const docsOf = (name: string) => [...store.entries()]
		.filter(([path]) => path.startsWith(`${BASE}/${name}/`) && path.split('/').length === 4)
		.map(([path, data]) => ({ id: path.split('/').pop()!, path, data }));

	const matches = (name: string, filters: Array<{ field: string; op: string; value: unknown }>, limit?: number) => {
		let result = docsOf(name);
		for (const f of filters) {
			result = result.filter(d => {
				const actual = f.field === '__name__' ? d.id : d.data[f.field];
				if (f.op === '==') return actual === f.value;
				if (f.op === 'in') return Array.isArray(f.value) && f.value.includes(actual);
				return false;
			});
		}
		return limit ? result.slice(0, limit) : result;
	};

	const snap = (items: Array<{ id: string; path: string; data: Data }>) => ({
		docs: items.map(d => ({
			id: d.id,
			exists: true,
			path: d.path,
			ref: { path: d.path, _ref: true },
			data: () => structuredClone(d.data),
		})),
		empty: items.length === 0,
		size: items.length,
	});

	const makeQuery = (name: string, filters: Array<{ field: string; op: string; value: unknown }> = [], limit?: number): Record<string, unknown> => ({
		_query: true,
		name,
		filters,
		_limit: limit,
		where: (field: string, op: string, value: unknown) => makeQuery(name, [...filters, { field, op, value }], limit),
		// Emula a ausência do índice composto active+fullName em produção:
		// qualquer where+orderBy falha, como acontece no Firebase real.
		orderBy: () => { throw new Error('FAILED_PRECONDITION: The query requires an index.'); },
		limit: (n: number) => makeQuery(name, filters, n),
		get: async () => snap(matches(name, filters, limit)),
		count: () => ({ get: async () => ({ data: () => ({ count: matches(name, filters, limit).length }) }) }),
	});

	const docRef = (name: string, id?: string) => {
		const docId = id || `auto-${++seq}`;
		const path = `${BASE}/${name}/${docId}`;
		return {
			path,
			_ref: true,
			collection: (sub: string) => collectionRef(sub),
			get: async () => {
				const data = store.get(path);
				return { exists: data !== undefined, id: docId, data: () => (data ? structuredClone(data) : undefined) };
			},
			set: (data: Data) => { store.set(path, structuredClone(data)); },
			update: (data: Data) => { store.set(path, { ...(store.get(path) || {}), ...structuredClone(data) }); },
			delete: () => { store.delete(path); },
		};
	};

	const collectionRef = (name: string): Record<string, unknown> => ({
		where: (field: string, op: string, value: unknown) => makeQuery(name, [{ field, op, value }]),
		orderBy: () => makeQuery(name),
		get: async () => snap(docsOf(name)),
		doc: (id?: string) => docRef(name, id),
		add: async (data: Data) => docRef(name),
		count: () => ({ get: async () => ({ data: () => ({ count: docsOf(name).length }) }) }),
	});

	const adminDb = {
		collection: (name: string) => collectionRef(name),
		runTransaction: (fn: (tx: unknown) => Promise<unknown>) => {
			const run = queue.then(async () => {
				const pending: Array<() => void> = [];
				const tx = {
					get: async (target: Record<string, unknown>) => {
						if (target._query) return snap(matches(String(target.name), target.filters as never, target._limit as number | undefined));
						const path = String(target.path);
						const data = store.get(path);
						return { exists: data !== undefined, data: () => (data ? structuredClone(data) : undefined) };
					},
					set: (ref: Record<string, unknown>, data: Data) => {
						const path = String(ref.path);
						pending.push(() => store.set(path, structuredClone(data)));
					},
					update: (ref: Record<string, unknown>, data: Data) => {
						const path = String(ref.path);
						pending.push(() => store.set(path, { ...(store.get(path) || {}), ...structuredClone(data) }));
					},
					delete: (ref: Record<string, unknown>) => {
						const path = String(ref.path);
						pending.push(() => store.delete(path));
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

	vi.doMock('@/lib/firebase/admin', () => ({ adminDb }));
	vi.doMock('firebase-admin/firestore', () => ({ FieldValue: { serverTimestamp: () => ({ __serverTimestamp: true }) } }));
	vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }));
	vi.doMock('@/lib/auth/admin-session', () => ({
		requireAdminSession: vi.fn().mockResolvedValue({ uid: 'admin-1' }),
	}));

	return {
		store,
		docs: docsOf,
		count: (name: string) => docsOf(name).length,
		quantities: () => {
			const guests = docsOf('guests');
			const rsvps = docsOf('rsvps');
			const invitations = docsOf('invitations');
			const specials = docsOf('specialParticipants');
			const activeInv = new Set(invitations.filter(i => (i.data.invitationStatus ?? 'active') === 'active').map(i => i.id));
			let eligible = 0;
			for (const rsvp of rsvps.filter(r => r.data.attendanceStatus === 'confirmed' && activeInv.has(r.id))) {
				const inv = invitations.find(i => i.id === rsvp.id);
				for (const gid of (inv?.data.guestIds as string[] | undefined) || []) {
					const g = guests.find(x => x.id === gid);
					if (g && g.data.active !== false) eligible++;
				}
				for (const c of (rsvp.data.companions as Data[] | undefined) || []) {
					if (c?.participantId) eligible++;
				}
			}
			for (const sp of specials.filter(s => s.data.active === true)) eligible++;
			const assigned = new Set(docsOf('tableAssignments').map(a => a.data.participantId));
			const withTable = [...assigned].filter(id => {
				return guests.some(g => g.id === id)
					|| specials.some(s => s.id === id)
					|| rsvps.some(r => ((r.data.companions as Data[] | undefined) || []).some(c => c.participantId === id));
			}).length;
			return { eligible, withTable, withoutTable: eligible - withTable };
		},
	};
}

function baseFixture() {
	return {
		tables: [
			{ id: 't1', data: { name: 'Mesa dos noivos', capacity: 5, eventId: EVENT } },
			{ id: 't2', data: { name: 'Mesa 2', capacity: 4, eventId: EVENT } },
		],
		tableAssignments: [] as Array<{ id: string; data: Data }>,
		invitations: [
			{ id: 'inv-1', data: { invitationStatus: 'active', guestIds: ['g1'], maxCompanions: 1 } },
		],
		guests: [{ id: 'g1', data: { fullName: 'Titular', active: true, invitationId: 'inv-1' } }],
		rsvps: [{
			id: 'inv-1',
			data: {
				attendanceStatus: 'confirmed',
				companions: [{ participantId: 'comp-0001', name: 'Acompanhante', isMinor: false }],
			},
		}],
		specialParticipants: [
			{ id: 'sp-a', data: { fullName: 'Amanda', category: 'bride', active: true, eventId: EVENT } },
			{ id: 'sp-and', data: { fullName: 'Andrey', category: 'groom', active: true, eventId: EVENT } },
			{ id: 'sp-h', data: { fullName: 'Heloá', category: 'child', active: true, eventId: EVENT } },
			{ id: 'sp-j', data: { fullName: 'Julia', category: 'child', active: true, eventId: EVENT } },
		],
		auditLogs: [] as Array<{ id: string; data: Data }>,
	};
}

const directory = async () => await import('@/lib/tables/participant-directory');
const tablesRepo = async () => await import('@/lib/repositories/tables.repository');
const tablesAction = async () => await import('@/app/actions/tables.action');

describe('Domínio de mesas — matriz comportamental', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it('B: especiais ativos aparecem sem índice composto e sem invitationId', async () => {
		const h = createHarness(baseFixture());
		const { listAvailableSpecialParticipants, listAvailableParticipants } = await directory();

		const specials = await listAvailableSpecialParticipants(EVENT);
		expect(specials).toHaveLength(4);
		expect(specials.map(s => s.participantName)).toEqual(['Amanda', 'Andrey', 'Heloá', 'Julia']);
		specials.forEach(s => {
			expect(s.participantSource).toBe('special');
			expect(s.invitationId).toBe('');
			expect(s.specialCategory).toBeTruthy();
		});

		const all = await listAvailableParticipants(EVENT);
		expect(all).toHaveLength(6); // 1 titular + 1 acompanhante + 4 especiais
		expect(h.count('tableAssignments')).toBe(0);
	});

	it('A: remover atribuição devolve titular, acompanhante e especial à disponibilidade', async () => {
		const fixture = baseFixture();
		fixture.tableAssignments = [
			{ id: 'a1', data: { tableId: 't1', participantId: 'g1', participantName: 'Titular', participantType: 'titular', participantSource: 'rsvp' } },
			{ id: 'a2', data: { tableId: 't1', participantId: 'comp-0001', participantName: 'Acompanhante', participantType: 'companion', participantSource: 'rsvp', invitationId: 'inv-1' } },
			{ id: 'a3', data: { tableId: 't1', participantId: 'sp-a', participantName: 'Amanda', participantType: 'special', participantSource: 'special', specialCategory: 'bride' } },
		];
		const h = createHarness(fixture);
		const repo = await tablesRepo();
		const dir = await directory();

		for (const id of ['g1', 'comp-0001', 'sp-a']) {
			const result = await repo.unassignParticipant(EVENT, id);
			expect(result.success).toBe(true);
			expect(result.removedCount).toBe(1);
		}

		const available = await dir.listAvailableParticipants(EVENT);
		expect(available.map(p => p.participantId)).toEqual(expect.arrayContaining(['g1', 'comp-0001', 'sp-a']));
		expect(h.count('guests')).toBe(1);
		expect(h.count('rsvps')).toBe(1);
		expect(h.count('specialParticipants')).toBe(4);
		const counts = await dir.getParticipantCounts(EVENT);
		expect(counts).toMatchObject({ eligibleParticipants: 6, participantsWithTable: 0, participantsWithoutTable: 6 });
	});

	it('A: remoção é idempotente e limpa duplicatas legadas', async () => {
		const fixture = baseFixture();
		fixture.tableAssignments = [
			{ id: 'd1', data: { tableId: 't1', participantId: 'sp-a', participantName: 'Amanda', participantType: 'special' } },
			{ id: 'd2', data: { tableId: 't2', participantId: 'sp-a', participantName: 'Amanda', participantType: 'special' } },
		];
		const h = createHarness(fixture);
		const repo = await tablesRepo();

		const first = await repo.unassignParticipant(EVENT, 'sp-a');
		expect(first.removedCount).toBe(2);
		expect(h.count('tableAssignments')).toBe(0);
		const second = await repo.unassignParticipant(EVENT, 'sp-a');
		expect(second).toMatchObject({ success: true, removedCount: 0 });
	});

	it('Cenário integrado: 4 especiais em mesa de capacidade 5, remoção, reatribuição e transferência', async () => {
		const fixture = baseFixture();
		fixture.tableAssignments = [
			{ id: 'seed', data: { tableId: 't1', participantId: 'g1', participantName: 'Titular', participantType: 'titular', participantSource: 'rsvp', invitationId: 'inv-1', assignedAt: 1 } },
		];
		const h = createHarness(fixture);
		const action = await tablesAction();
		const repo = await tablesRepo();
		const dir = await directory();

		const specials = await dir.listAvailableSpecialParticipants(EVENT);
		const result = await action.assignGroupAction({
			tableId: 't1',
			participants: specials.map(s => ({
				participantId: s.participantId,
				participantName: s.participantName,
				participantType: s.participantType,
				participantSource: s.participantSource,
				specialCategory: s.specialCategory,
			})),
		});
		expect(result.success).toBe(true);
		expect(result.data?.assignedCount).toBe(4);
		expect(h.count('tableAssignments')).toBe(5);

		let available = await dir.listAvailableSpecialParticipants(EVENT);
		expect(available).toHaveLength(0);
		let counts = await dir.getParticipantCounts(EVENT);
		expect(counts).toMatchObject({ eligibleParticipants: 6, participantsWithTable: 5, participantsWithoutTable: 1 });

		await repo.unassignParticipant(EVENT, 'sp-a');
		available = await dir.listAvailableSpecialParticipants(EVENT);
		expect(available.map(p => p.participantId)).toEqual(['sp-a']);
		counts = await dir.getParticipantCounts(EVENT);
		expect(counts).toMatchObject({ participantsWithTable: 4, participantsWithoutTable: 2 });

		await action.assignParticipantAction({
			tableId: 't1',
			participantId: 'sp-a',
			participantName: 'Amanda',
			participantType: 'special',
			participantSource: 'special',
			specialCategory: 'bride',
		});
		const assigned = h.docs('tableAssignments').find(a => a.data.participantId === 'sp-a');
		expect(assigned?.data.participantSource).toBe('special');
		expect(assigned?.data.specialCategory).toBe('bride');

		const transfer = await repo.transferParticipant(EVENT, { participantId: 'sp-a', targetTableId: 't2' }, 'admin-1');
		expect(transfer.success).toBe(true);
		const after = h.docs('tableAssignments').filter(a => a.data.participantId === 'sp-a');
		expect(after).toHaveLength(1);
		expect(after[0].data.tableId).toBe('t2');
		expect(after[0].data.participantId).toBe('sp-a');
		expect(after[0].data.participantSource).toBe('special');

		const map = await repo.getTableAssignmentsByParticipantIds(EVENT, ['sp-a']);
		expect(map.get('sp-a')?.tableName).toBe('Mesa 2');

		const stillAvailable = await dir.listAvailableSpecialParticipants(EVENT);
		expect(stillAvailable).toHaveLength(0);
	});

	it('titular e acompanhante: atribuir, remover, reatribuir e transferir preservando ID', async () => {
		const h = createHarness(baseFixture());
		const action = await tablesAction();
		const repo = await tablesRepo();
		const dir = await directory();

		await action.assignGroupAction({
			tableId: 't1',
			participants: [
				{ participantId: 'g1', participantName: 'Titular', participantType: 'titular', participantSource: 'rsvp', invitationId: 'inv-1' },
				{ participantId: 'comp-0001', participantName: 'Acompanhante', participantType: 'companion', participantSource: 'rsvp', invitationId: 'inv-1' },
			],
		});
		expect(h.count('tableAssignments')).toBe(2);
		expect((await dir.listAvailableParticipants(EVENT)).filter(p => ['g1', 'comp-0001'].includes(p.participantId))).toHaveLength(0);

		await repo.unassignParticipant(EVENT, 'comp-0001');
		expect((await dir.listAvailableParticipants(EVENT)).some(p => p.participantId === 'comp-0001')).toBe(true);

		await action.assignParticipantAction({
			tableId: 't2', participantId: 'comp-0001', participantName: 'Acompanhante', participantType: 'companion', invitationId: 'inv-1',
		});
		const transfer = await repo.transferParticipant(EVENT, { participantId: 'comp-0001', targetTableId: 't1' }, 'admin-1');
		expect(transfer.success).toBe(true);
		const final = h.docs('tableAssignments').filter(a => a.data.participantId === 'comp-0001');
		expect(final).toHaveLength(1);
		expect(final[0].data.tableId).toBe('t1');
		expect(final[0].data.participantId).toBe('comp-0001');
	});

	it('impede duplicidade no grupo, mesa cheia e transferência para mesa cheia', async () => {
		const fixture = baseFixture();
		fixture.tableAssignments = [
			{ id: 'f1', data: { tableId: 't2', participantId: 'sp-h', participantName: 'Heloá', participantType: 'special', participantSource: 'special' } },
			{ id: 'f2', data: { tableId: 't2', participantId: 'sp-j', participantName: 'Julia', participantType: 'special', participantSource: 'special' } },
			{ id: 'f3', data: { tableId: 't2', participantId: 'sp-and', participantName: 'Andrey', participantType: 'special', participantSource: 'special' } },
			{ id: 'f4', data: { tableId: 't2', participantId: 'sp-x', participantName: 'Externo', participantType: 'special', participantSource: 'special' } },
		];
		const h = createHarness(fixture);
		const action = await tablesAction();
		const repo = await tablesRepo();

		const duplicate = await action.assignGroupAction({
			tableId: 't1',
			participants: [
				{ participantId: 'g1', participantName: 'Titular', participantType: 'titular', participantSource: 'rsvp' },
				{ participantId: 'g1', participantName: 'Titular', participantType: 'titular', participantSource: 'rsvp' },
			],
		});
		expect(duplicate.success).toBe(false);
		expect(duplicate.error).toMatch(/mesmo participante/);

		const full = await action.assignGroupAction({
			tableId: 't2',
			participants: [{ participantId: 'g1', participantName: 'Titular', participantType: 'titular', participantSource: 'rsvp' }],
		});
		expect(full.success).toBe(false);
		expect(full.error).toMatch(/Capacidade insuficiente/);

		const before = h.count('tableAssignments');
		const transfer = await repo.transferParticipant(EVENT, { participantId: 'sp-a', targetTableId: 't2' }, 'admin-1');
		expect(transfer.success).toBe(false);
		expect(h.count('tableAssignments')).toBe(before);
		expect(h.docs('tableAssignments').find(a => a.data.participantId === 'sp-a')).toBeUndefined();
	});

	it('concorrência lógica: duas atribuições do mesmo participante e disputa da última vaga', async () => {
		const fixture = baseFixture();
		fixture.tables = [{ id: 't1', data: { name: 'Mesa', capacity: 1, eventId: EVENT } }];
		createHarness(fixture);
		const action = await tablesAction();

		const [a, b] = await Promise.all([
			action.assignGroupAction({
				tableId: 't1',
				participants: [{ participantId: 'sp-a', participantName: 'Amanda', participantType: 'special', participantSource: 'special' }],
			}),
			action.assignGroupAction({
				tableId: 't1',
				participants: [{ participantId: 'sp-a', participantName: 'Amanda', participantType: 'special', participantSource: 'special' }],
			}),
		]);
		expect([a.success, b.success].filter(Boolean)).toHaveLength(1);
		expect([a.error, b.error].filter(Boolean)).toHaveLength(1);
	});

	it('invariante dos contadores após cada operação', async () => {
		const h = createHarness(baseFixture());
		const repo = await tablesRepo();
		const dir = await directory();

		const assertInvariant = async () => {
			const counts = await dir.getParticipantCounts(EVENT);
			expect(counts.eligibleParticipants).toBe(counts.participantsWithTable! + counts.participantsWithoutTable!);
			const available = await dir.listAvailableParticipants(EVENT);
			expect(available.filter(p => !p.pendingReconciliation)).toHaveLength(counts.participantsWithoutTable!);
			expect(h.quantities().eligible).toBe(counts.eligibleParticipants);
		};

		await assertInvariant();
		await repo.unassignParticipant(EVENT, 'g1'); // idempotente
		await assertInvariant();
		await repo.assignParticipant(EVENT, {
			tableId: 't1', participantId: 'sp-a', participantName: 'Amanda',
			participantType: 'special', participantSource: 'special', specialCategory: 'bride',
		}, 'admin-1');
		await assertInvariant();
		await repo.transferParticipant(EVENT, { participantId: 'sp-a', targetTableId: 't2' }, 'admin-1');
		await assertInvariant();
		await repo.unassignParticipant(EVENT, 'sp-a');
		await assertInvariant();
	});
});
