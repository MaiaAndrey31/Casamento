/**
 * Testes comportamentais da regra central de identidade de acompanhantes.
 *
 * Executam a lógica real de preparação + validação Zod, não inspeção de strings.
 */

import { describe, it, expect } from 'vitest';
import { preparePersistedCompanions, companionPersistenceSchema } from './companion-identity';
import { isValidParticipantId } from '@/lib/checkin/participant-ids';
import { rsvpFormRefinedSchema } from '@/lib/validators/rsvp.schema';

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';
const UUID_C = '33333333-3333-4333-8333-333333333333';

describe('preparePersistedCompanions — regra central', () => {
	it('1. confirmação sem acompanhantes gera array vazio válido', () => {
		expect(preparePersistedCompanions({ incoming: [] })).toEqual([]);
	});

	it('2. confirmação com um acompanhante gera ID válido e persistível', () => {
		const [companion] = preparePersistedCompanions({
			incoming: [{ name: 'Adriano', isMinor: false }],
		});

		expect(isValidParticipantId(companion.participantId)).toBe(true);
		expect(() => companionPersistenceSchema.parse(companion)).not.toThrow();
	});

	it('3. confirmação com vários acompanhantes gera IDs únicos', () => {
		const result = preparePersistedCompanions({
			incoming: [
				{ name: 'Ana', isMinor: false },
				{ name: 'Bruno', isMinor: false },
				{ name: 'Carla', isMinor: true, age: 9 },
			],
		});

		expect(result).toHaveLength(3);
		expect(new Set(result.map(c => c.participantId)).size).toBe(3);
		result.forEach(c => expect(isValidParticipantId(c.participantId)).toBe(true));
	});

	it('4/5. todos os acompanhantes preparados atendem ao schema de persistência', () => {
		const result = preparePersistedCompanions({
			incoming: [{ name: 'Ana', isMinor: false }, { name: 'Bruno', isMinor: false }],
		});

		expect(() => result.forEach(c => companionPersistenceSchema.parse(c))).not.toThrow();
	});

	it('6/10. edição preserva IDs após múltiplas atualizações com nome e idade alterados', () => {
		const first = preparePersistedCompanions({
			incoming: [{ name: 'Mariana', isMinor: false, age: 30 }],
		});
		const originalId = first[0].participantId;

		const second = preparePersistedCompanions({
			incoming: [{ name: 'Mariana Souza', isMinor: false, age: 31, participantId: originalId }],
			existing: first,
		});
		const third = preparePersistedCompanions({
			incoming: [{ name: 'Mariana Souza Lima', isMinor: false, age: 32, participantId: originalId }],
			existing: second,
		});

		expect(second[0].participantId).toBe(originalId);
		expect(third[0].participantId).toBe(originalId);
		expect(third[0].name).toBe('Mariana Souza Lima');
		expect(third[0].age).toBe(32);
	});

	it('7. adicionar acompanhante a confirmação existente preserva o antigo e gera o novo', () => {
		const existing = preparePersistedCompanions({
			incoming: [{ name: 'Ana', isMinor: false }],
		});

		const result = preparePersistedCompanions({
			incoming: [existing[0], { name: 'Novo', isMinor: false }],
			existing,
		});

		expect(result[0].participantId).toBe(existing[0].participantId);
		expect(isValidParticipantId(result[1].participantId)).toBe(true);
		expect(result[1].participantId).not.toBe(existing[0].participantId);
	});

	it('8. alterar nome de acompanhante já atribuído preserva o ID (com ID enviado)', () => {
		const existing = [{
			participantId: UUID_A,
			name: 'Mariana Lemes',
			isMinor: false,
			assignedToTable: 'mesa-3',
		}];

		const result = preparePersistedCompanions({
			incoming: [{ name: 'Mariana Lemes da Silva', isMinor: false, participantId: UUID_A }],
			existing,
		});

		expect(result[0].participantId).toBe(UUID_A);
		expect(result[0].assignedToTable).toBe('mesa-3');
	});

	it('9. reordenar acompanhantes preserva cada ID reenviado explicitamente', () => {
		const existing = preparePersistedCompanions({
			incoming: [{ name: 'Ana', isMinor: false }, { name: 'Bruno', isMinor: false }],
		});

		const result = preparePersistedCompanions({
			incoming: [existing[1], existing[0]],
			existing,
		});

		expect(result.map(c => c.participantId)).toEqual([
			existing[1].participantId,
			existing[0].participantId,
		]);
	});

	it('remover acompanhante não reutiliza nem regenera o ID dos demais', () => {
		const existing = preparePersistedCompanions({
			incoming: [{ name: 'Ana', isMinor: false }, { name: 'Bruno', isMinor: false }],
		});

		const result = preparePersistedCompanions({
			incoming: [existing[0]],
			existing,
		});

		expect(result).toHaveLength(1);
		expect(result[0].participantId).toBe(existing[0].participantId);
	});

	it('registro legado sem ID é promovido na primeira escrita e preservado depois', () => {
		const legacy = [{ name: 'Adriano ', isMinor: false }];

		const first = preparePersistedCompanions({ incoming: legacy, existing: legacy });
		expect(isValidParticipantId(first[0].participantId)).toBe(true);

		const second = preparePersistedCompanions({
			incoming: [{ name: 'Adriano', isMinor: false, participantId: first[0].participantId }],
			existing: first,
		});
		expect(second[0].participantId).toBe(first[0].participantId);
	});

	it('BLOQUEIA renomeação sem IDs de identidade já estabelecida', () => {
		const existing = [{ participantId: UUID_A, name: 'Ana', isMinor: false }];

		expect(() => preparePersistedCompanions({
			incoming: [{ name: 'Ana Maria', isMinor: false }],
			existing,
		})).toThrow(/IDENTIDADE_AMBIGUA/);
	});

	it('edição id-aware com inclusão/remoção: preserva o ID enviado e gera um novo para quem entra', () => {
		const existing = [
			{ participantId: UUID_A, name: 'Ana', isMinor: false },
			{ participantId: UUID_B, name: 'Bruno', isMinor: false },
		];

		const result = preparePersistedCompanions({
			incoming: [existing[0], { name: 'Carla', isMinor: false }],
			existing,
		});

		expect(result.map(c => c.participantId)).toEqual([
			UUID_A,
			result[1].participantId,
		]);
		expect(result[1].participantId).not.toBe(UUID_B);
	});

	it('dois acompanhantes com o mesmo nome: IDs reenviados preservam cada identidade', () => {
		const existing = [
			{ participantId: UUID_A, name: 'Ana', isMinor: false },
			{ participantId: UUID_B, name: 'Ana', isMinor: false },
		];

		const result = preparePersistedCompanions({
			incoming: [
				{ name: 'Ana', isMinor: false, participantId: UUID_B },
				{ name: 'Ana', isMinor: false, participantId: UUID_A },
			],
			existing,
		});

		expect(result.map(c => c.participantId)).toEqual([UUID_B, UUID_A]);
	});

	it('dois acompanhantes com o mesmo nome sem IDs: BLOQUEIA em vez de adivinhar', () => {
		const existing = [
			{ name: 'Ana', isMinor: false },
			{ name: 'Ana', isMinor: false },
		];

		expect(() => preparePersistedCompanions({
			incoming: [{ name: 'Ana', isMinor: false }, { name: 'Ana', isMinor: false }],
			existing,
		})).toThrow(/IDENTIDADE_AMBIGUA/);
	});

	it('remoção + inclusão na mesma posição sem IDs: BLOQUEIA; com IDs preserva o restante', () => {
		const existing = [
			{ participantId: UUID_A, name: 'Ana', isMinor: false },
			{ participantId: UUID_B, name: 'Bruno', isMinor: false },
		];

		expect(() => preparePersistedCompanions({
			incoming: [{ name: 'Ana', isMinor: false }, { name: 'Carla', isMinor: false }],
			existing,
		})).toThrow(/IDENTIDADE_AMBIGUA/);

		const result = preparePersistedCompanions({
			incoming: [{ name: 'Ana', isMinor: false, participantId: UUID_A }, { name: 'Carla', isMinor: false }],
			existing,
		});

		expect(result[0].participantId).toBe(UUID_A);
		expect(result[1].participantId).not.toBe(UUID_B);
		expect(isValidParticipantId(result[1].participantId)).toBe(true);
	});

	it('alteração de nome + reordenação sem IDs: BLOQUEIA; com IDs preserva as identidades', () => {
		const existing = [
			{ participantId: UUID_A, name: 'Ana', isMinor: false },
			{ participantId: UUID_B, name: 'Bruno', isMinor: false },
		];

		expect(() => preparePersistedCompanions({
			incoming: [{ name: 'Bruno Novo', isMinor: false }, { name: 'Ana Nova', isMinor: false }],
			existing,
		})).toThrow(/IDENTIDADE_AMBIGUA/);

		const result = preparePersistedCompanions({
			incoming: [
				{ name: 'Bruno Novo', isMinor: false, participantId: UUID_B },
				{ name: 'Ana Nova', isMinor: false, participantId: UUID_A },
			],
			existing,
		});
		expect(result.map(c => c.participantId)).toEqual([UUID_B, UUID_A]);
	});

	it('substituição completa sem IDs: BLOQUEIA em vez de transferir o ID antigo', () => {
		const existing = [{ participantId: UUID_A, name: 'Ana', isMinor: false }];

		expect(() => preparePersistedCompanions({
			incoming: [{ name: 'Pessoa Diferente', isMinor: false }],
			existing,
		})).toThrow(/IDENTIDADE_AMBIGUA/);
	});

	it('acompanhante com atribuição de mesa/check-in: sem ID a edição é bloqueada', () => {
		const existing = [{
			participantId: UUID_A,
			name: 'Ana',
			isMinor: false,
			tableAssignmentId: 'assign-1',
			checkInId: 'checkin-1',
		}];

		expect(() => preparePersistedCompanions({
			incoming: [{ name: 'Ana', isMinor: false }],
			existing,
		})).toThrow(/IDENTIDADE_AMBIGUA/);

		const result = preparePersistedCompanions({
			incoming: [{ name: 'Ana Maria', isMinor: false, participantId: UUID_A }],
			existing,
		});
		expect(result[0].participantId).toBe(UUID_A);
		expect(result[0].tableAssignmentId).toBe('assign-1');
		expect(result[0].checkInId).toBe('checkin-1');
	});

	it('rejeita ID explícito que não pertence ao RSVP (identidade conflitante)', () => {
		expect(() => preparePersistedCompanions({
			incoming: [{ name: 'Ana', isMinor: false, participantId: UUID_C }],
			existing: [{ participantId: UUID_A, name: 'Ana', isMinor: false }],
		})).toThrow(/IDENTIDADE_CONFLITANTE/);
	});

	it('rejeita IDs duplicados na mesma edição', () => {
		expect(() => preparePersistedCompanions({
			incoming: [
				{ name: 'Ana', isMinor: false, participantId: UUID_A },
				{ name: 'Bruno', isMinor: false, participantId: UUID_A },
			],
			existing: [
				{ participantId: UUID_A, name: 'Ana', isMinor: false },
				{ participantId: UUID_B, name: 'Bruno', isMinor: false },
			],
		})).toThrow(/IDENTIDADE_CONFLITANTE/);
	});

	it('acompanhante extra com nome idêntico a um existente recebe ID novo', () => {
		const existing = [{ participantId: UUID_A, name: 'Ana', isMinor: false }];

		const result = preparePersistedCompanions({
			incoming: [existing[0], { name: 'Ana', isMinor: false }],
			existing,
			forceNewIndexes: [1],
		});

		expect(result[0].participantId).toBe(UUID_A);
		expect(result[1].participantId).not.toBe(UUID_A);
		expect(isValidParticipantId(result[1].participantId)).toBe(true);
	});

	it('homônimos legítimos são pareados em ordem sem colidir', () => {
		const existing = [
			{ participantId: UUID_A, name: 'Ana', isMinor: false },
			{ participantId: UUID_B, name: 'Ana', isMinor: false },
		];

		const result = preparePersistedCompanions({
			incoming: [existing[0], existing[1]],
			existing,
		});

		expect(result.map(c => c.participantId)).toEqual([UUID_A, UUID_B]);
	});

	it('o schema do formulário NÃO descarta participantId enviado pelo cliente', () => {
		const parsed = rsvpFormRefinedSchema.safeParse({
			invitationId: 'inv-1',
			fullName: 'Titular Teste',
			phone: '11997519440',
			attendanceStatus: 'confirmed',
			companions: [{ name: 'Ana', isMinor: false, participantId: UUID_A }],
			dietaryRestrictions: [],
		});

		expect(parsed.success).toBe(true);
		if (parsed.success) {
			expect(parsed.data.companions[0].participantId).toBe(UUID_A);
		}
	});

	it('18. nenhum resultado inválido escapa do schema de persistência', () => {
		const result = preparePersistedCompanions({
			incoming: [
				{ name: 'Ana', isMinor: false },
				{ name: 'Bruno', isMinor: true, age: 7 },
			],
		});

		result.forEach(c => {
			expect(() => companionPersistenceSchema.parse(c)).not.toThrow();
			expect(c.participantId).toBeTruthy();
		});
	});
});
