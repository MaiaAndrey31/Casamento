/**
 * Testes — Organização de Mesas e Atribuições
 *
 * Validações estruturais e de contrato que garantem:
 * - CRUD de mesas com validação de unicidade e capacidade
 * - Atribuição transacional com verificação de capacidade e duplicidade
 * - Transferência atômica entre mesas
 * - Bloqueio de atribuição para guests inativos
 * - Exclusão apenas de mesas vazias
 * - Auditoria de todas as operações
 * - Permissões administrativas obrigatórias
 * - Preservação de RSVP e check-in
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ACTIONS_DIR = path.join(process.cwd(), 'src/app/actions');
const REPOS_DIR = path.join(process.cwd(), 'src/lib/repositories');
const RULES_PATH = path.join(process.cwd(), 'firestore.rules');

function readAction(name: string): string {
	return fs.readFileSync(path.join(ACTIONS_DIR, name), 'utf-8');
}

function readRepo(name: string): string {
	return fs.readFileSync(path.join(REPOS_DIR, name), 'utf-8');
}

describe('Organização de Mesas — Regras de Negócio', () => {
	describe('Cenário 1: Criar mesa', () => {
		it('deve validar nome e capacidade via Zod no server action', () => {
			const code = readAction('tables.action.ts');
			expect(code).toContain('createTableSchema');
			expect(code).toContain("z.string().min(1");
			expect(code).toContain("z.number().int().positive");
		});

		it('deve verificar unicidade do nome da mesa no repositório', () => {
			const code = readRepo('tables.repository.ts');
			expect(code).toContain("where('name', '==', data.name)");
			expect(code).toContain('Já existe uma mesa com o nome');
		});

		it('deve criar audit log após criação', () => {
			const code = readAction('tables.action.ts');
			expect(code).toContain("action: 'table.created'");
		});
	});

	describe('Cenário 2: Editar mesa', () => {
		it('deve usar transação para validar capacidade vs ocupação', () => {
			const code = readRepo('tables.repository.ts');
			expect(code).toContain('CAPACITY_BELOW_OCCUPANCY');
			expect(code).toContain('runTransaction');
		});

		it('deve impedir reduzir capacidade abaixo da ocupação atual', () => {
			const code = readRepo('tables.repository.ts');
			expect(code).toContain('Não é possível reduzir a capacidade');
			expect(code).toContain('Remova participantes antes de alterar a capacidade');
		});

		it('deve validar unicidade do nome se alterado', () => {
			const code = readRepo('tables.repository.ts');
			expect(code).toContain('DUPLICATE_NAME');
			expect(code).toContain('Já existe outra mesa com este nome');
		});
	});

	describe('Cenário 3: Excluir mesa vazia', () => {
		it('deve verificar ocupação antes de excluir em transação', () => {
			const code = readRepo('tables.repository.ts');
			expect(code).toContain('TABLE_NOT_EMPTY');
		});

		it('deve impedir exclusão de mesa ocupada', () => {
			const code = readRepo('tables.repository.ts');
			expect(code).toContain('Não é possível excluir a mesa');
			expect(code).toContain('Remova-os antes de excluir');
		});
	});

	describe('Cenário 4: Atribuir convidado', () => {
		it('deve usar transação para verificar capacidade e duplicidade', () => {
			const code = readRepo('tables.repository.ts');
			expect(code).toContain('TABLE_FULL');
			expect(code).toContain('ALREADY_ASSIGNED');
			expect(code).toMatch(/assignParticipant[\s\S]*?runTransaction/);
		});

		it('deve bloquear atribuição quando mesa está cheia', () => {
			const code = readRepo('tables.repository.ts');
			expect(code).toContain('currentOccupancy >= capacity');
			expect(code).toContain('Esta mesa está cheia');
		});

		it('deve criar audit log de atribuição', () => {
			const code = readAction('tables.action.ts');
			expect(code).toContain("action: 'table.assignment.created'");
		});
	});

	describe('Cenário 5: Atribuir acompanhante', () => {
		it('deve aceitar participantType companion na atribuição', () => {
			const code = readAction('tables.action.ts');
			expect(code).toContain("'titular', 'companion'");
		});

		it('deve usar participantId persistente (não nome) como identificador', () => {
			const code = readRepo('tables.repository.ts');
			expect(code).toContain("where('participantId', '==', data.participantId)");
		});
	});

	describe('Cenário 6: Transferir participante', () => {
		it('deve usar transação para remover da origem e adicionar no destino', () => {
			const code = readRepo('tables.repository.ts');
			expect(code).toMatch(/transferParticipant[\s\S]*?runTransaction/);
			expect(code).toContain('transaction.delete(currentAssignment.ref)');
			expect(code).toContain('transaction.set(newAssignmentRef');
		});

		it('deve verificar capacidade da mesa destino', () => {
			const code = readRepo('tables.repository.ts');
			expect(code).toContain('TARGET_TABLE_FULL');
			expect(code).toContain('A mesa destino está cheia');
		});

		it('deve criar audit log de transferência', () => {
			const code = readAction('tables.action.ts');
			expect(code).toContain("action: 'table.assignment.transferred'");
		});
	});

	describe('Cenário 7: Impedir duplicidade', () => {
		it('deve verificar se participante já está atribuído a alguma mesa', () => {
			const code = readRepo('tables.repository.ts');
			expect(code).toContain("where('participantId', '==', data.participantId)");
			expect(code).toContain('ALREADY_ASSIGNED');
			expect(code).toContain('Este participante já está atribuído a outra mesa');
		});
	});

	describe('Cenário 8: Impedir ultrapassar capacidade', () => {
		it('deve contar atribuições atuais dentro da transação', () => {
			const code = readRepo('tables.repository.ts');
			expect(code).toContain("where('tableId', '==', data.tableId)");
			expect(code).toContain('.count()');
		});

		it('deve retornar erro claro quando mesa está cheia', () => {
			const code = readRepo('tables.repository.ts');
			expect(code).toContain('Escolha outra mesa ou aumente a capacidade');
		});
	});

	describe('Cenário 9: Impedir atribuição de participante inativo', () => {
		it('deve verificar active === false para titulares na transação', () => {
			const code = readRepo('tables.repository.ts');
			expect(code).toContain('GUEST_INACTIVE');
			expect(code).toContain('active === false');
		});

		it('deve retornar erro específico para guest inativo', () => {
			const code = readRepo('tables.repository.ts');
			expect(code).toContain('desativado e não pode ser atribuído');
		});
	});

	describe('Cenário 10: Preservar RSVP e check-in', () => {
		it('não deve escrever/modificar RSVP em operações CRUD e atribuição de mesas', () => {
			const actionCode = readAction('tables.action.ts');
			// Server actions de mesas nunca devem tocar em RSVPs
			expect(actionCode).not.toContain("collection('rsvps')");
			// O repositório pode LER rsvps para listar participantes disponíveis (read-only),
			// mas não deve conter operações de escrita (set/update/delete) em rsvps
			const repoCode = readRepo('tables.repository.ts');
			expect(repoCode).not.toMatch(/rsvps[\s\S]*?transaction\.(set|update|delete)/);
			expect(repoCode).not.toMatch(/rsvpRef[\s\S]*?\.(set|update|delete)\(/);
		});

		it('não deve modificar check-ins em nenhuma operação de mesa', () => {
			const repoCode = readRepo('tables.repository.ts');
			const actionCode = readAction('tables.action.ts');
			expect(repoCode).not.toContain("collection('checkins')");
			expect(actionCode).not.toContain("collection('checkins')");
		});
	});

	describe('Cenário 11: Validar permissões administrativas', () => {
		it('todas as actions devem exigir requireAdminSession', () => {
			const code = readAction('tables.action.ts');
			const actionFunctions = [
				'createTableAction',
				'updateTableAction',
				'deleteTableAction',
				'assignParticipantAction',
				'unassignParticipantAction',
				'transferParticipantAction',
			];
			for (const fn of actionFunctions) {
				expect(code).toContain(`export async function ${fn}`);
			}
			// Todas usam requireAdminSession
			const matches = code.match(/requireAdminSession/g);
			expect(matches).not.toBeNull();
			expect(matches!.length).toBeGreaterThanOrEqual(6);
		});
	});

	describe('Cenário 12: Firestore Rules', () => {
		it('deve ter regras para tables e tableAssignments', () => {
			const rules = fs.readFileSync(RULES_PATH, 'utf-8');
			expect(rules).toContain('match /tables/{tableId}');
			expect(rules).toContain('match /tableAssignments/{assignmentId}');
		});

		it('deve restringir acesso a admin apenas', () => {
			const rules = fs.readFileSync(RULES_PATH, 'utf-8');
			// Verificar que as regras de tables usam isAdmin()
			const tablesSection = rules.substring(
				rules.indexOf('match /tables/{tableId}'),
				rules.indexOf('match /tableAssignments/{assignmentId}'),
			);
			expect(tablesSection).toContain('isAdmin()');
		});
	});

	describe('Cenário 13: Tipos e estrutura de dados', () => {
		it('deve definir tipos Table, TableAssignment e TableWithOccupancy', () => {
			const typesCode = fs.readFileSync(path.join(process.cwd(), 'src/types/index.ts'), 'utf-8');
			expect(typesCode).toContain('export interface Table');
			expect(typesCode).toContain('export interface TableAssignment');
			expect(typesCode).toContain('export interface TableWithOccupancy');
			expect(typesCode).toContain('export interface TablesDashboardStats');
		});

		it('TableAssignment deve ter participantId, invitationId e participantType', () => {
			const typesCode = fs.readFileSync(path.join(process.cwd(), 'src/types/index.ts'), 'utf-8');
			const assignmentSection = typesCode.substring(
				typesCode.indexOf('export interface TableAssignment'),
				typesCode.indexOf('}', typesCode.indexOf('export interface TableAssignment')) + 1,
			);
			expect(assignmentSection).toContain('participantId');
			expect(assignmentSection).toContain('invitationId');
			expect(assignmentSection).toContain("participantType: 'titular' | 'companion'");
		});
	});

	describe('Cenário 14: Navegação admin', () => {
		it('deve ter item Mesas na navegação do layout admin', () => {
			const layoutCode = fs.readFileSync(
				path.join(process.cwd(), 'src/app/admin/layout.tsx'),
				'utf-8',
			);
			expect(layoutCode).toContain("/admin/mesas");
			expect(layoutCode).toContain("label: 'Mesas'");
			expect(layoutCode).toContain('Armchair');
		});
	});

	describe('Cenário 15: Página server + client component', () => {
		it('deve ter page.tsx server component que busca dados', () => {
			const pageCode = fs.readFileSync(
				path.join(process.cwd(), 'src/app/admin/mesas/page.tsx'),
				'utf-8',
			);
			expect(pageCode).toContain('listTables');
			expect(pageCode).toContain('getTablesDashboardStats');
			expect(pageCode).toContain('requireAdminSession');
			expect(pageCode).toContain('TablesManagerClient');
		});

		it('deve ter TablesManagerClient como client component', () => {
			const clientCode = fs.readFileSync(
				path.join(process.cwd(), 'src/app/admin/mesas/TablesManagerClient.tsx'),
				'utf-8',
			);
			expect(clientCode).toContain("'use client'");
			expect(clientCode).toContain('createTableAction');
			expect(clientCode).toContain('assignParticipantAction');
			expect(clientCode).toContain('transferParticipantAction');
		});
	});
});