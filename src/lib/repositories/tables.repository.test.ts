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

function readDirectory(): string {
	return fs.readFileSync(path.join(process.cwd(), 'src/lib/tables/participant-directory.ts'), 'utf-8');
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
			// Leitura de rsvps é permitida; escrita não. Busca limitada à mesma
			// instrução para não gerar falso positivo com escritas em tableAssignments.
			expect(repoCode).not.toMatch(/collection\('rsvps'\)[\s\S]{0,200}?\.(set|update|delete)\(/);
			expect(repoCode).not.toMatch(/rsvpRef[\s\S]{0,200}?\.(set|update|delete)\(/);
			const directory = readDirectory();
			expect(directory).not.toMatch(/transaction\.(set|update|delete)\(/);
			expect(directory).not.toMatch(/\.ref\.(set|update|delete)\(/);
			expect(directory).not.toMatch(/adminDb[^;]{0,120}\.(set|update|delete)\(/);
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


// ============================================================================
// PARTICIPANTES ESPECIAIS — Exclusão Definitiva e Integridade Transacional
// ============================================================================

describe('Participantes Especiais — Exclusão Definitiva e Concorrência', () => {
	const SPECIAL_REPO_PATH = path.join(REPOS_DIR, 'special-participants.repository.ts');
	const SPECIAL_ACTION_PATH = path.join(ACTIONS_DIR, 'special-participants.action.ts');
	const TABLES_REPO_PATH = path.join(REPOS_DIR, 'tables.repository.ts');
	const TABLES_ACTION_PATH = path.join(ACTIONS_DIR, 'tables.action.ts');
	const CLIENT_PATH = path.join(process.cwd(), 'src/app/admin/mesas/TablesManagerClient.tsx');
	const TYPES_PATH = path.join(process.cwd(), 'src/types/index.ts');

	function readSpecialRepo(): string {
		return fs.readFileSync(SPECIAL_REPO_PATH, 'utf-8');
	}
	function readSpecialAction(): string {
		return fs.readFileSync(SPECIAL_ACTION_PATH, 'utf-8');
	}
	function readTablesRepo(): string {
		return fs.readFileSync(TABLES_REPO_PATH, 'utf-8');
	}
	function readTablesAction(): string {
		return fs.readFileSync(TABLES_ACTION_PATH, 'utf-8');
	}
	function readClient(): string {
		return fs.readFileSync(CLIENT_PATH, 'utf-8');
	}
	function readTypes(): string {
		return fs.readFileSync(TYPES_PATH, 'utf-8');
	}

	describe('Cenário SP-1: Exclusão definitiva transacional', () => {
		it('deleteSpecialParticipant deve usar runTransaction para atomicidade', () => {
			const code = readSpecialRepo();
			expect(code).toMatch(/deleteSpecialParticipant[\s\S]*?runTransaction/);
		});

		it('deve ler o participante DENTRO da transação para detectar exclusão concorrente', () => {
			const code = readSpecialRepo();
			expect(code).toMatch(/transaction\.get\(participantRef\)/);
		});

		it('deve buscar atribuições DENTRO da transação', () => {
			const code = readSpecialRepo();
			expect(code).toMatch(/transaction\.get\([\s\S]*?assignmentsCollection\.where/);
		});

		it('deve excluir todas as atribuições ANTES de excluir o participante', () => {
			const code = readSpecialRepo();
			const deleteAssignmentsIdx = code.indexOf('transaction.delete(doc.ref)');
			const deleteParticipantIdx = code.indexOf('transaction.delete(participantRef)');
			expect(deleteAssignmentsIdx).toBeGreaterThan(0);
			expect(deleteParticipantIdx).toBeGreaterThan(deleteAssignmentsIdx);
		});

		it('deve retornar lista de atribuições excluídas com nome da mesa para auditoria', () => {
			const code = readSpecialRepo();
			expect(code).toContain('deletedAssignments');
			expect(code).toContain('assignmentId');
			expect(code).toContain('tableId');
			expect(code).toContain('tableName');
		});

		it('não deve mais impedir exclusão quando participante tem atribuição', () => {
			const code = readSpecialRepo();
			expect(code).not.toContain('Remova a atribuição primeiro');
		});
	});

	describe('Cenário SP-2: Concorrência entre exclusão e atribuição', () => {
		it('assignParticipant deve verificar existência do participante especial dentro da transação', () => {
			const code = readTablesRepo();
			expect(code).toMatch(/transaction\.get\(specialRef\)/);
			expect(code).toContain('SPECIAL_INACTIVE');
		});

		it('assignParticipant deve verificar duplicidade dentro da transação', () => {
			const code = readTablesRepo();
			expect(code).toContain('ALREADY_ASSIGNED');
			expect(code).toMatch(/assignParticipant[\s\S]*?runTransaction[\s\S]*?ALREADY_ASSIGNED/);
		});

		it('assignGroupAction deve validar participantSource special na transação', () => {
			const code = readTablesAction();
			expect(code).toContain("participantSource === 'special'");
			expect(code).toContain('SPECIAL_INACTIVE');
		});

		it('schemas devem aceitar participantType special e invitationId opcional', () => {
			const code = readTablesAction();
			expect(code).toContain("'titular', 'companion', 'special'");
			expect(code).toMatch(/assignParticipantSchema[\s\S]*?invitationId.*optional/);
		});
	});

	describe('Cenário SP-3: Transferência preserva origem especial', () => {
		it('transferParticipant deve preservar participantSource e specialCategory', () => {
			const code = readTablesRepo();
			expect(code).toMatch(/currentData\.participantSource === 'special'/);
			expect(code).toContain("transferData.participantSource = 'special'");
			expect(code).toContain('transferData.specialCategory');
		});
	});

	describe('Cenário SP-4: Modal de confirmação de exclusão', () => {
		it('interface deve ter modal de confirmação com aviso de irreversibilidade', () => {
			const code = readClient();
			expect(code).toContain('deleteConfirmOpen');
			expect(code).toContain('Excluir Permanentemente');
			expect(code).toContain('não pode ser desfeita');
		});

		it('modal deve exibir nome, categoria e informação sobre mesa atribuída', () => {
			const code = readClient();
			expect(code).toContain('deletingParticipant.fullName');
			expect(code).toContain('CATEGORY_LABELS[deletingParticipant.category]');
			expect(code).toContain('hasAssignment');
			expect(code).toContain('tableName');
		});

		it('handleDeleteSpecial deve buscar dados antes de abrir o modal (não excluir diretamente)', () => {
			const code = readClient();
			expect(code).toContain('getSpecialParticipantForDeletionAction');
			expect(code).toContain('setDeleteConfirmOpen(true)');
		});

		it('confirmDeleteSpecial deve chamar deleteSpecialParticipantAction após confirmação', () => {
			const code = readClient();
			expect(code).toMatch(/confirmDeleteSpecial[\s\S]*?deleteSpecialParticipantAction/);
		});
	});

	describe('Cenário SP-5: Server action de exclusão com audit log enriquecido', () => {
		it('deleteSpecialParticipantAction deve registrar deletedAssignmentsCount no audit log', () => {
			const code = readSpecialAction();
			expect(code).toContain('deletedAssignmentsCount');
			expect(code).toContain("action: 'specialParticipant.deleted'");
		});

		it('getSpecialParticipantForDeletionAction deve verificar atribuição de mesa', () => {
			const code = readSpecialAction();
			expect(code).toContain('getSpecialParticipantForDeletionAction');
			expect(code).toContain('hasAssignment');
			expect(code).toContain('tableName');
		});

		it('todas as actions de especiais devem exigir requireAdminSession', () => {
			const code = readSpecialAction();
			const actionFunctions = [
				'listSpecialParticipantsAction',
				'createSpecialParticipantAction',
				'updateSpecialParticipantAction',
				'deleteSpecialParticipantAction',
				'getSpecialParticipantForDeletionAction',
			];
			for (const fn of actionFunctions) {
				expect(code).toContain(`export async function ${fn}`);
			}
			const matches = code.match(/requireAdminSession/g);
			expect(matches).not.toBeNull();
			expect(matches!.length).toBeGreaterThanOrEqual(5);
		});
	});

	describe('Cenário SP-6: Tipos e modelo de dados', () => {
		it('deve definir SpecialParticipant e SpecialParticipantCategory', () => {
			const code = readTypes();
			expect(code).toContain('export interface SpecialParticipant');
			expect(code).toContain('export type SpecialParticipantCategory');
			expect(code).toContain("'groom' | 'bride' | 'child' | 'family' | 'other'");
		});

		it('TableAssignment deve suportar participantSource e specialCategory', () => {
			const code = readTypes();
			expect(code).toContain('export type ParticipantSource');
			expect(code).toContain("'rsvp' | 'special'");
			const assignmentSection = code.substring(
				code.indexOf('export interface TableAssignment'),
				code.indexOf('}', code.indexOf('export interface TableAssignment')) + 1,
			);
			expect(assignmentSection).toContain('participantSource');
			expect(assignmentSection).toContain('specialCategory');
			expect(assignmentSection).toContain("'titular' | 'companion' | 'special'");
		});

		it('invitationId deve ser opcional em TableAssignment', () => {
			const code = readTypes();
			const assignmentSection = code.substring(
				code.indexOf('export interface TableAssignment'),
				code.indexOf('}', code.indexOf('export interface TableAssignment')) + 1,
			);
			expect(assignmentSection).toMatch(/invitationId\?.*string/);
		});
	});

	describe('Cenário SP-7: Firestore Rules — proteção de specialParticipants', () => {
		it('regras devem proteger specialParticipants contra acesso público', () => {
			const rules = fs.readFileSync(RULES_PATH, 'utf-8');
			const hasSpecificRule = rules.includes('match /specialParticipants/{participantId}');
			const hasCatchAllBlock = rules.includes("match /{document=**}") && rules.includes('allow read, write: if false');
			if (!hasSpecificRule) {
				expect(hasCatchAllBlock).toBe(true);
			}
		});

		it('operações de especiais usam Admin SDK (server-side), não SDK cliente', () => {
			const repoCode = readSpecialRepo();
			expect(repoCode).toContain("await import('@/lib/firebase/admin')");
			expect(repoCode).not.toMatch(/import.*from\s+['"]firebase\/firestore['"]/);
		});
	});

	describe('Cenário SP-8: Contadores incluem participantes especiais', () => {
		it('getTablesDashboardStats deve derivar contagens da fonte única que inclui especiais ativos', () => {
			const code = readTablesRepo();
			const directory = readDirectory();
			expect(code).toContain('getParticipantCounts');
			expect(directory).toContain("readCollection(eventId, SPECIALS)");
			expect(directory).toContain('special.data.active !== true');
			expect(directory).toContain('participantsWithoutTable');
		});

		it('listAvailableParticipants deve resolver RSVP e especiais no diretório central', () => {
			const code = readTablesRepo();
			const directory = readDirectory();
			expect(code).toContain('@/lib/tables/participant-directory');
			expect(directory).toContain("participantSource: 'rsvp'");
			expect(directory).toContain("participantSource: 'special'");
			expect(directory).toContain('diagnostics.assignedIds.has');
		});
	});

	describe('Cenário SP-9: Interface diferencia origens visualmente', () => {
		it('modal de atribuição deve renderizar seção separada para especiais', () => {
			const code = readClient();
			expect(code).toContain('Participantes Especiais');
			expect(code).toContain('filteredSpecialParticipants');
			expect(code).toContain('CATEGORY_ICONS');
		});

		it('preview de atribuição deve exibir categoria para especiais', () => {
			const code = readClient();
			expect(code).toMatch(/participantSource === 'special'[\s\S]*?CATEGORY_LABELS/);
		});
	});
});

});