/**
 * Testes — Desativação de Convidado e Invalidação de RSVP
 *
 * Validações estruturais e de contrato que garantem:
 * - A transação atômica existe e cobre guest + RSVP + audit log
 * - O bloqueio de check-in para guests inativos está implementado
 * - A reativação não restaura RSVP anterior
 * - A sessão admin é obrigatória
 * - Os indicadores filtram convites revogados
 *
 * Testes transacionais completos requerem Firebase Emulator
 * (ver validator-checkin.integration.test.ts para padrão).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ACTIONS_DIR = path.join(process.cwd(), 'src/app/actions');
const REPOS_DIR = path.join(process.cwd(), 'src/lib/repositories');

function readAction(name: string): string {
	return fs.readFileSync(path.join(ACTIONS_DIR, name), 'utf-8');
}

function readRepo(name: string): string {
	return fs.readFileSync(path.join(REPOS_DIR, name), 'utf-8');
}

describe('Desativação de Convidado — Regras de Negócio', () => {
	describe('Cenário 1: Operação transacional atômica', () => {
		it('deve usar runTransaction em deactivate-guest.action', () => {
			const code = readAction('deactivate-guest.action.ts');
			expect(code).toContain('runTransaction');
			expect(code).toContain('transaction.update');
			expect(code).toContain('transaction.get');
			expect(code).toContain('transaction.set');
		});

		it('deve desativar guest e processar RSVP na mesma transação', () => {
			const code = readAction('deactivate-guest.action.ts');
			// Guest é desativado dentro da transação
			expect(code).toMatch(/transaction\.update\(guestRef[\s\S]*?active:\s*false/);
			// RSVP é lido e atualizado dentro da mesma transação
			expect(code).toMatch(/transaction\.get\(rsvpRef\)/);
			expect(code).toMatch(/transaction\.update\(rsvpRef/);
		});
	});

	describe('Cenário 2: Invalidação de RSVP quando único confirmado é desativado', () => {
		it('deve invalidar RSVP inteiro quando remainingConfirmed.length === 0', () => {
			const code = readAction('deactivate-guest.action.ts');
			expect(code).toContain('remainingConfirmed.length === 0');
			expect(code).toContain("attendanceStatus: 'pending'");
			expect(code).toContain('rsvpInvalidated = true');
		});

		it('deve remover apenas o guest desativado de confirmedGuestIds quando há outros ativos', () => {
			const code = readAction('deactivate-guest.action.ts');
			expect(code).toContain('updatedConfirmedIds.filter');
			expect(code).toContain('otherActiveGuestIds.includes');
			expect(code).toContain('confirmedGuestIds: remainingConfirmed');
		});
	});

	describe('Cenário 3: Preservação de acompanhantes', () => {
		it('deve filtrar confirmedGuestIds por guest ativo, não por companion', () => {
			const code = readAction('deactivate-guest.action.ts');
			// A lógica filtra confirmedGuestIds (que são guestIds), não companions
			expect(code).toContain('confirmedGuestIds');
			expect(code).toContain('otherActiveGuestIds');
			// Companions não são removidos individualmente — permanecem no RSVP
			// desde que haja pelo menos um guest ativo confirmado
		});
	});

	describe('Cenário 4: Reativação sem restaurar RSVP', () => {
		it('deve existir activate-guest.action que reativa sem restaurar RSVP', () => {
			const code = readAction('activate-guest.action.ts');
			expect(code).toContain('active: true');
			expect(code).toContain('RSVP anterior não restaurado');
			expect(code).not.toContain('attendanceStatus');
			expect(code).not.toContain('confirmedGuestIds');
		});

		it('deve limpar campos de desativação ao reativar', () => {
			const code = readAction('activate-guest.action.ts');
			expect(code).toContain('deactivatedAt: FieldValue.delete()');
			expect(code).toContain('deactivatedBy: FieldValue.delete()');
		});

		it('deve reativar convite revogado se o primary guest for reativado', () => {
			const code = readAction('activate-guest.action.ts');
			expect(code).toContain("invitationStatus: 'active'");
			expect(code).toContain("invitationStatus === 'revoked'");
		});
	});

	describe('Cenário 5: Bloqueio de check-in para convidado inativo', () => {
		it('deve verificar active === false dentro da transação de check-in', () => {
			const code = readRepo('validator-checkin.repository.ts');
			expect(code).toContain('GUEST_INACTIVE');
			expect(code).toContain('active === false');
			expect(code).toContain('transaction.get(guestRef)');
		});

		it('deve retornar erro específico para GUEST_INACTIVE', () => {
			const code = readRepo('validator-checkin.repository.ts');
			expect(code).toContain('desativado e não pode realizar check-in');
		});
	});

	describe('Cenário 6: Registro de auditoria', () => {
		it('deve criar audit log com metadados do RSVP anterior na transação', () => {
			const code = readAction('deactivate-guest.action.ts');
			expect(code).toContain("action: 'guest.deactivated'");
			expect(code).toContain('previousRsvpStatus');
			expect(code).toContain('previousConfirmedGuestIds');
			expect(code).toContain('invalidationReason');
			expect(code).toContain('auditLogs');
		});

		it('deve criar audit log de reativação', () => {
			const code = readAction('activate-guest.action.ts');
			expect(code).toContain("action: 'guest.reactivated'");
			expect(code).toContain('auditLogs');
		});
	});

	describe('Cenário 7: Autorização administrativa obrigatória', () => {
		it('deve exigir requireAdminSession em deactivate-guest.action', () => {
			const code = readAction('deactivate-guest.action.ts');
			expect(code).toContain('requireAdminSession');
			expect(code).toContain('Sessão administrativa inválida');
		});

		it('deve exigir requireAdminSession em activate-guest.action', () => {
			const code = readAction('activate-guest.action.ts');
			expect(code).toContain('requireAdminSession');
			expect(code).toContain('Sessão administrativa inválida');
		});
	});

	describe('Cenário 8: Indicadores filtram convites revogados', () => {
		it('stats.repository deve filtrar RSVPs por invitationStatus active', () => {
			const code = readRepo('stats.repository.ts');
			expect(code).toContain('activeInvitationIds');
			expect(code).toContain("invitationStatus', '==', 'active'");
			expect(code).toContain('activeInvitationIds.has(doc.id)');
		});

		it('validator-confirmed.repository deve filtrar convites não-ativos em buildConfirmedItems', () => {
			const code = readRepo('validator-confirmed.repository.ts');
			expect(code).toContain("invData.invitationStatus === 'active'");
		});

		it('getReceptionSummary deve ignorar RSVPs de convites revogados', () => {
			const code = readRepo('validator-confirmed.repository.ts');
			expect(code).toContain('isActive');
			expect(code).toContain('if (!isActive) continue');
		});
	});

	describe('Cenário 9: Revalidação de cache após desativação/reativação', () => {
		it('deve revalidar todas as telas afetadas após desativação', () => {
			const code = readAction('deactivate-guest.action.ts');
			expect(code).toContain("revalidatePath('/admin/convidados')");
			expect(code).toContain("revalidatePath('/admin/confirmacoes')");
			expect(code).toContain("revalidatePath('/admin')");
			expect(code).toContain("revalidatePath('/validador/confirmados')");
		});

		it('deve revalidar todas as telas afetadas após reativação', () => {
			const code = readAction('activate-guest.action.ts');
			expect(code).toContain("revalidatePath('/admin/convidados')");
			expect(code).toContain("revalidatePath('/admin/confirmacoes')");
			expect(code).toContain("revalidatePath('/admin')");
			expect(code).toContain("revalidatePath('/validador/confirmados')");
		});
	});
});