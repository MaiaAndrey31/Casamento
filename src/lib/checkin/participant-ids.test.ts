/**
 * Testes Automatizados — Participant IDs
 *
 * Cobre:
 * 1. IDs persistentes de acompanhantes (UUID único)
 * 2. Dois acompanhantes com nomes iguais → IDs diferentes
 * 3. Alteração de nome não altera o ID
 * 4. Reordenação dos acompanhantes não altera IDs
 * 5. Migração idempotente (ensureCompanionIds)
 * 6. Construção e parse de check-in doc IDs
 * 7. Validação de participantId
 */

import { describe, it, expect } from 'vitest';
import {
	generateParticipantUuid,
	ensureCompanionIds,
	buildCheckInDocId,
	parseCheckInDocId,
	isValidParticipantId,
	sanitizeForDocId,
} from './participant-ids';

describe('generateParticipantUuid', () => {
	it('deve gerar UUIDs únicos a cada chamada', () => {
 const ids = new Set<string>();
 for (let i = 0; i < 100; i++) {
 ids.add(generateParticipantUuid());
 }
 expect(ids.size).toBe(100);
	});

	it('deve gerar UUID no formato v4 válido', () => {
 const uuid = generateParticipantUuid();
 expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
	});

	it('dois acompanhantes com nomes iguais devem ter IDs diferentes', () => {
 const id1 = generateParticipantUuid();
 const id2 = generateParticipantUuid();
 expect(id1).not.toBe(id2);
	});
});

describe('ensureCompanionIds', () => {
	it('deve atribuir UUIDs a companions sem participantId', () => {
 const companions = [
 { name: 'Maria Silva', isMinor: false },
 { name: 'João Silva', isMinor: true, age: 5 },
 ];

 const result = ensureCompanionIds(companions);

 expect(result).toHaveLength(2);
 expect(result[0].participantId).toBeTruthy();
 expect(result[1].participantId).toBeTruthy();
 expect(result[0].participantId).not.toBe(result[1].participantId);
 expect(result[0].name).toBe('Maria Silva');
 expect(result[1].name).toBe('João Silva');
 expect(result[1].isMinor).toBe(true);
 expect(result[1].age).toBe(5);
	});

	it('deve preservar participantId existente (idempotente)', () => {
 const existingId = 'existing-uuid-1234-5678-abcdef012345';
 const companions = [
 { name: 'Ana Santos', isMinor: false, participantId: existingId },
 { name: 'Carlos Santos', isMinor: false },
 ];

 const result = ensureCompanionIds(companions);

 expect(result[0].participantId).toBe(existingId);
 expect(result[1].participantId).toBeTruthy();
 expect(result[1].participantId).not.toBe(existingId);
	});

	it('reordenação não deve alterar IDs existentes', () => {
 const id1 = 'uuid-primeiro-participante-00001';
 const id2 = 'uuid-segundo-participante-00002';

 const original = [
 { name: 'Primeiro', isMinor: false, participantId: id1 },
 { name: 'Segundo', isMinor: false, participantId: id2 },
 ];

 // Reordenar
 const reordered = [original[1], original[0]];
 const result = ensureCompanionIds(reordered);

 expect(result[0].participantId).toBe(id2);
 expect(result[1].participantId).toBe(id1);
 expect(result[0].name).toBe('Segundo');
 expect(result[1].name).toBe('Primeiro');
	});

	it('alteração de nome não deve alterar o ID', () => {
 const stableId = 'uuid-imutavel-nome-corrigido-001';
 const companions = [
 { name: 'Nome Corrigido', isMinor: false, participantId: stableId },
 ];

 const result = ensureCompanionIds(companions);

 expect(result[0].participantId).toBe(stableId);
 expect(result[0].name).toBe('Nome Corrigido');
	});

	it('deve lidar com array vazio', () => {
 const result = ensureCompanionIds([]);
 expect(result).toEqual([]);
	});
});

describe('buildCheckInDocId', () => {
	it('deve construir ID no formato eventId_invitationId_participantId', () => {
 const result = buildCheckInDocId('evt123', 'inv456', 'part789');
 expect(result).toBe('evt123_inv456_part789');
	});

	it('deve sanitizar caracteres especiais', () => {
 const result = buildCheckInDocId('evt/123', 'inv@456', 'part#789');
 expect(result).toBe('evt_123_inv_456_part_789');
	});

	it('deve ser determinístico', () => {
 const a = buildCheckInDocId('e1', 'i1', 'p1');
 const b = buildCheckInDocId('e1', 'i1', 'p1');
 expect(a).toBe(b);
	});
});

describe('parseCheckInDocId', () => {
	it('deve extrair componentes corretamente', () => {
 const result = parseCheckInDocId('evt123_inv456_part789');
 expect(result).toEqual({
 eventId: 'evt123',
 invitationId: 'inv456',
 participantId: 'part789',
 });
	});

	it('deve retornar null para formato inválido', () => {
 expect(parseCheckInDocId('invalid')).toBeNull();
 expect(parseCheckInDocId('a_b')).toBeNull();
 expect(parseCheckInDocId('')).toBeNull();
	});

	it('deve fazer roundtrip com buildCheckInDocId', () => {
 const eventId = 'event-abc';
 const invitationId = 'invitation-xyz';
 const participantId = '550e8400-e29b-41d4-a716-446655440000';

 const docId = buildCheckInDocId(eventId, invitationId, participantId);
 const parsed = parseCheckInDocId(docId);

 expect(parsed?.eventId).toBe(eventId);
 expect(parsed?.invitationId).toBe(invitationId);
 expect(parsed?.participantId).toBe(participantId);
	});
});

describe('isValidParticipantId', () => {
	it('deve aceitar guestIds do Firestore', () => {
 expect(isValidParticipantId('abc123def456ghi789')).toBe(true);
	});

	it('deve aceitar UUIDs', () => {
 expect(isValidParticipantId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
	});

	it('deve rejeitar strings vazias ou curtas', () => {
 expect(isValidParticipantId('')).toBe(false);
 expect(isValidParticipantId('abc')).toBe(false);
 expect(isValidParticipantId('   ')).toBe(false);
	});

	it('deve rejeitar caracteres inválidos', () => {
 expect(isValidParticipantId('id/com/barra')).toBe(false);
 expect(isValidParticipantId('id@com#especial')).toBe(false);
	});
});

describe('sanitizeForDocId', () => {
	it('deve remover caracteres problemáticos', () => {
 expect(sanitizeForDocId('hello/world@test#foo')).toBe('hello_world_test_foo');
	});

	it('deve preservar caracteres seguros', () => {
 expect(sanitizeForDocId('abc123_-def')).toBe('abc123_-def');
	});
});