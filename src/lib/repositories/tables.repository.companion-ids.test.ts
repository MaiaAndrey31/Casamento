/**
 * Testes Comportamentais — Identidade Persistente de Acompanhantes
 *
 * Valida que listAvailableParticipants:
 * - NÃO gera UUIDs efêmeros durante leitura
 * - Ignora companions sem participantId persistente
 * - Filtra corretamente companions já atribuídos
 * - Mantém consistência entre consultas consecutivas
 *
 * Usa mocks do Firestore Admin SDK que simulam a cadeia real de chamadas:
 * adminDb.collection('events').doc(eventId).collection(subcollection)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Dados de teste configuráveis por cenário
interface TestFixture {
	assignments: Array<{ id: string; data: Record<string, unknown> }>;
	invitations: Array<{ id: string; data: Record<string, unknown> }>;
	rsvps: Array<{ id: string; data: Record<string, unknown> }>;
	guests: Map<string, { fullName: string; active: boolean }>;
}

function setupFirestoreMock(fixture: TestFixture) {
	vi.doMock('@/lib/firebase/admin', () => {
		const makeSnap = (docs: Array<{ id: string; data: Record<string, unknown> }>) => ({
			docs: docs.map(d => ({
				id: d.id,
				exists: true,
				data: () => d.data,
				ref: { id: d.id },
			})),
			empty: docs.length === 0,
			size: docs.length,
		});

		const makeDocRef = (guestId: string) => ({
			get: async () => {
				const guest = fixture.guests.get(guestId);
				if (!guest) return { exists: false, data: () => undefined };
				return {
					exists: true,
					data: () => ({ fullName: guest.fullName, active: guest.active }),
				};
			},
		});

		const adminDb = {
			collection: (name: string) => {
				if (name === 'events') {
					return {
						doc: (_eventId: string) => ({
							collection: (sub: string) => {
								if (sub === 'tableAssignments') {
									return {
										get: async () => makeSnap(fixture.assignments),
										where: () => ({
											limit: () => ({ get: async () => makeSnap([]) }),
											count: () => ({ get: async () => ({ data: () => ({ count: fixture.assignments.length }) }) }),
											get: async () => makeSnap(fixture.assignments),
										}),
									};
								}
								if (sub === 'invitations') {
									return {
										where: () => ({
											get: async () => makeSnap(fixture.invitations),
										}),
										doc: (id: string) => ({
											get: async () => {
												const inv = fixture.invitations.find(i => i.id === id);
												if (!inv) return { exists: false, data: () => undefined };
												return { exists: true, data: () => inv.data };
											},
										}),
									};
								}
								if (sub === 'rsvps') {
									return {
										where: () => ({
											get: async () => makeSnap(fixture.rsvps),
										}),
									};
								}
								if (sub === 'guests') {
									return {
										doc: (guestId: string) => makeDocRef(guestId),
									};
								}
								// Fallback para outras subcoleções
								return {
									get: async () => makeSnap([]),
									where: () => ({ get: async () => makeSnap([]), limit: () => ({ get: async () => makeSnap([]) }), count: () => ({ get: async () => ({ data: () => ({ count: 0 }) }) }) }),
									doc: () => ({ get: async () => ({ exists: false, data: () => undefined }) }),
								};
							},
						}),
					};
				}
				return {
					get: async () => makeSnap([]),
					where: () => ({ get: async () => makeSnap([]), limit: () => ({ get: async () => makeSnap([]) }), count: () => ({ get: async () => ({ data: () => ({ count: 0 }) }) }) }),
					doc: () => ({ get: async () => ({ exists: false, data: () => undefined }) }),
				};
			},
			runTransaction: vi.fn(),
		};

		return { adminDb };
	});

	// Mock do special-participants.repository
	vi.doMock('@/lib/repositories/special-participants.repository', () => ({
		listAvailableSpecialParticipants: vi.fn().mockResolvedValue([]),
	}));
}

describe('listAvailableParticipants — Identidade Persistente', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it('deve ignorar companions sem participantId persistente (dados legados)', async () => {
		setupFirestoreMock({
			assignments: [],
			invitations: [{ id: 'inv-001', data: { invitationStatus: 'active', guestIds: ['guest-titular'] } }],
			rsvps: [{
				id: 'inv-001',
				data: {
					attendanceStatus: 'confirmed',
					companions: [
						{ name: 'Companheiro Com ID', isMinor: false, participantId: 'uuid-existente-123' },
						{ name: 'Companheiro Sem ID', isMinor: false }, // Legado sem participantId
					],
				},
			}],
			guests: new Map([['guest-titular', { fullName: 'Titular Teste', active: true }]]),
		});

		const { listAvailableParticipants } = await import('./tables.repository');
		const result = await listAvailableParticipants('test-event');

		// Apenas o titular e o companion COM ID devem aparecer
		expect(result).toHaveLength(2);
		expect(result.find(p => p.participantName === 'Titular Teste')).toBeTruthy();
		expect(result.find(p => p.participantName === 'Companheiro Com ID')).toBeTruthy();
		expect(result.find(p => p.participantName === 'Companheiro Sem ID')).toBeUndefined();
	});

	it('deve filtrar companions já atribuídos usando participantId persistente', async () => {
		setupFirestoreMock({
			assignments: [{
				id: 'assign-001',
				data: {
					participantId: 'uuid-mariana-456',
					tableId: 'mesa-3',
					participantName: 'Mariana Lemes',
					participantType: 'companion',
					invitationId: 'inv-gilberto',
					participantSource: 'rsvp',
				},
			}],
			invitations: [{ id: 'inv-gilberto', data: { invitationStatus: 'active', guestIds: ['guest-gilberto'] } }],
			rsvps: [{
				id: 'inv-gilberto',
				data: {
					attendanceStatus: 'confirmed',
					companions: [
						{ name: 'Mariana Lemes', isMinor: false, participantId: 'uuid-mariana-456' },
						{ name: 'Outro Acompanhante', isMinor: false, participantId: 'uuid-outro-789' },
					],
				},
			}],
			guests: new Map([['guest-gilberto', { fullName: 'Gilberto Júnior', active: true }]]),
		});

		const { listAvailableParticipants } = await import('./tables.repository');
		const result = await listAvailableParticipants('test-event');

		// Gilberto (titular não atribuído) + Outro Acompanhante devem aparecer
		// Mariana Lemes NÃO deve aparecer (já atribuída com mesmo participantId)
		expect(result.find(p => p.participantName === 'Gilberto Júnior')).toBeTruthy();
		expect(result.find(p => p.participantName === 'Outro Acompanhante')).toBeTruthy();
		expect(result.find(p => p.participantName === 'Mariana Lemes')).toBeUndefined();
	});

	it('deve retornar resultados consistentes em consultas consecutivas (sem UUIDs efêmeros)', async () => {
		setupFirestoreMock({
			assignments: [],
			invitations: [{ id: 'inv-consist', data: { invitationStatus: 'active', guestIds: ['guest-consist'] } }],
			rsvps: [{
				id: 'inv-consist',
				data: {
					attendanceStatus: 'confirmed',
					companions: [
						{ name: 'Acompanhante A', isMinor: false, participantId: 'uuid-a-fix' },
						{ name: 'Acompanhante B', isMinor: false, participantId: 'uuid-b-fix' },
					],
				},
			}],
			guests: new Map([['guest-consist', { fullName: 'Titular Consistente', active: true }]]),
		});

		const { listAvailableParticipants } = await import('./tables.repository');

		const result1 = await listAvailableParticipants('test-event');
		const result2 = await listAvailableParticipants('test-event');

		// Mesmos IDs nas duas consultas — nenhum UUID efêmero gerado
		expect(result1).toHaveLength(result2.length);
		for (let i = 0; i < result1.length; i++) {
			expect(result1[i].participantId).toBe(result2[i].participantId);
		}
	});

	it('não deve chamar ensureCompanionIds durante a listagem', async () => {
		setupFirestoreMock({
			assignments: [],
			invitations: [{ id: 'inv-spy', data: { invitationStatus: 'active', guestIds: ['guest-spy'] } }],
			rsvps: [{
				id: 'inv-spy',
				data: {
					attendanceStatus: 'confirmed',
					companions: [{ name: 'Comp', isMinor: false, participantId: 'uuid-spy' }],
				},
			}],
			guests: new Map([['guest-spy', { fullName: 'Titular Spy', active: true }]]),
		});

		// Spy na função antes de importar o repositório
		const participantIdsModule = await import('@/lib/checkin/participant-ids');
		const spy = vi.spyOn(participantIdsModule, 'ensureCompanionIds');

		const { listAvailableParticipants } = await import('./tables.repository');
		await listAvailableParticipants('test-event');

		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
	});

	it('deve excluir convite totalmente distribuído da lista', async () => {
		setupFirestoreMock({
			assignments: [
				{ id: 'a1', data: { participantId: 'guest-full', tableId: 'm1', participantType: 'titular', invitationId: 'inv-full', participantSource: 'rsvp' } },
				{ id: 'a2', data: { participantId: 'uuid-comp-full', tableId: 'm1', participantType: 'companion', invitationId: 'inv-full', participantSource: 'rsvp' } },
			],
			invitations: [{ id: 'inv-full', data: { invitationStatus: 'active', guestIds: ['guest-full'] } }],
			rsvps: [{
				id: 'inv-full',
				data: {
					attendanceStatus: 'confirmed',
					companions: [{ name: 'Comp Full', isMinor: false, participantId: 'uuid-comp-full' }],
				},
			}],
			guests: new Map([['guest-full', { fullName: 'Titular Full', active: true }]]),
		});

		const { listAvailableParticipants } = await import('./tables.repository');
		const result = await listAvailableParticipants('test-event');

		// Nenhum participante deste convite deve aparecer
		expect(result.find(p => p.invitationId === 'inv-full')).toBeUndefined();
	});

	it('deve incluir acompanhante disponível quando titular está atribuído', async () => {
		setupFirestoreMock({
			assignments: [
				{ id: 'a1', data: { participantId: 'guest-pastor', tableId: 'm3', participantType: 'titular', invitationId: 'inv-pastor', participantSource: 'rsvp' } },
			],
			invitations: [{ id: 'inv-pastor', data: { invitationStatus: 'active', guestIds: ['guest-pastor'] } }],
			rsvps: [{
				id: 'inv-pastor',
				data: {
					attendanceStatus: 'confirmed',
					companions: [
						{ name: 'Acomp Pastor 1', isMinor: false, participantId: 'uuid-pastor-acomp1' },
						{ name: 'Acomp Pastor 2', isMinor: false, participantId: 'uuid-pastor-acomp2' },
					],
				},
			}],
			guests: new Map([['guest-pastor', { fullName: 'Pastor Léo', active: true }]]),
		});

		const { listAvailableParticipants } = await import('./tables.repository');
		const result = await listAvailableParticipants('test-event');

		// Titular atribuído NÃO aparece, mas acompanhantes disponíveis SIM
		expect(result.find(p => p.participantName === 'Pastor Léo')).toBeUndefined();
		expect(result.find(p => p.participantName === 'Acomp Pastor 1')).toBeTruthy();
		expect(result.find(p => p.participantName === 'Acomp Pastor 2')).toBeTruthy();
		expect(result.filter(p => p.invitationId === 'inv-pastor')).toHaveLength(2);
	});
});