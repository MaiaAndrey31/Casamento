/**
 * Testes Automatizados — Permissões de Sessão (Etapa 2 + Etapa 3)
 *
 * Cobre:
 * - Owner (type=admin, role=owner) → acesso admin + validador
 * - Validador (type=validator, role=checkin_operator) → acesso apenas validador
 * - Combinações inconsistentes rejeitadas
 * - Editor/viewer sem acesso ao validador
 * - Conta inativa rejeitada
 * - Administradores legados (sem type/role) tratados com segurança
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dos módulos server-only e next/headers
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
	cookies: vi.fn(),
}));

// Mock do Firebase Admin
vi.mock('@/lib/firebase/admin', () => ({
	adminAuth: {
 verifyIdToken: vi.fn(),
	},
	getAdminProfile: vi.fn(),
}));

describe('getValidatorSession — Permissões Estritas', () => {
	let getValidatorSession: typeof import('./admin-session').getValidatorSession;
	let mockCookies: ReturnType<typeof vi.fn>;
	let mockVerifyIdToken: ReturnType<typeof vi.fn>;
	let mockGetAdminProfile: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
 vi.resetModules();

 const headersModule = await import('next/headers');
 mockCookies = headersModule.cookies as unknown as ReturnType<typeof vi.fn>;

 const adminModule = await import('@/lib/firebase/admin');
 mockVerifyIdToken = adminModule.adminAuth.verifyIdToken as ReturnType<typeof vi.fn>;
 mockGetAdminProfile = adminModule.getAdminProfile as ReturnType<typeof vi.fn>;

 const sessionModule = await import('./admin-session');
 getValidatorSession = sessionModule.getValidatorSession;
	});

	function setupSession(token: string | null, profile: Record<string, unknown> | null) {
 mockCookies.mockResolvedValue({
 get: (name: string) => name === '__session' && token ? { value: token } : undefined,
 });
 mockVerifyIdToken.mockResolvedValue({ uid: 'test-uid', email: 'test@test.com' });
 mockGetAdminProfile.mockResolvedValue(profile);
	}

	it('deve aceitar owner (type=admin, role=owner)', async () => {
 setupSession('valid-token', { role: 'owner', type: 'admin', active: true });
 const session = await getValidatorSession();
 expect(session).not.toBeNull();
 expect(session?.role).toBe('owner');
 expect(session?.type).toBe('admin');
	});

	it('deve aceitar validador (type=validator, role=checkin_operator)', async () => {
 setupSession('valid-token', { role: 'checkin_operator', type: 'validator', active: true });
 const session = await getValidatorSession();
 expect(session).not.toBeNull();
 expect(session?.role).toBe('checkin_operator');
 expect(session?.type).toBe('validator');
	});

	it('deve REJEITAR type=validator sem role=checkin_operator', async () => {
 setupSession('valid-token', { role: 'viewer', type: 'validator', active: true });
 const session = await getValidatorSession();
 expect(session).toBeNull();
	});

	it('deve REJEITAR role=checkin_operator sem type=validator', async () => {
 setupSession('valid-token', { role: 'checkin_operator', type: 'admin', active: true });
 const session = await getValidatorSession();
 expect(session).toBeNull();
	});

	it('deve REJEITAR editor (type=admin, role=editor)', async () => {
 setupSession('valid-token', { role: 'editor', type: 'admin', active: true });
 const session = await getValidatorSession();
 expect(session).toBeNull();
	});

	it('deve REJEITAR viewer (type=admin, role=viewer)', async () => {
 setupSession('valid-token', { role: 'viewer', type: 'admin', active: true });
 const session = await getValidatorSession();
 expect(session).toBeNull();
	});

	it('deve REJEITAR conta inativa mesmo com role correta', async () => {
 setupSession('valid-token', { role: 'checkin_operator', type: 'validator', active: false });
 const session = await getValidatorSession();
 expect(session).toBeNull();
	});

	it('deve REJEITAR quando não há sessão', async () => {
 setupSession(null, null);
 const session = await getValidatorSession();
 expect(session).toBeNull();
	});

	it('deve REJEITAR quando perfil não existe', async () => {
 setupSession('valid-token', null);
 const session = await getValidatorSession();
 expect(session).toBeNull();
	});

	it('deve tratar legado sem type como admin (não validador)', async () => {
 // getAdminProfile retorna type='admin' para legados sem type
 setupSession('valid-token', { role: 'owner', type: 'admin', active: true });
 const session = await getValidatorSession();
 expect(session).not.toBeNull();
 expect(session?.type).toBe('admin');
	});

	it('deve REJEITAR combinação type=validator + role=owner', async () => {
 setupSession('valid-token', { role: 'owner', type: 'validator', active: true });
 const session = await getValidatorSession();
 expect(session).toBeNull();
	});

	it('deve REJEITAR combinação type=admin + role=checkin_operator', async () => {
 setupSession('valid-token', { role: 'checkin_operator', type: 'admin', active: true });
 const session = await getValidatorSession();
 expect(session).toBeNull();
	});
});

describe('getAdminSession — Rejeita Validadores', () => {
	let getAdminSession: typeof import('./admin-session').getAdminSession;
	let mockCookies: ReturnType<typeof vi.fn>;
	let mockVerifyIdToken: ReturnType<typeof vi.fn>;
	let mockGetAdminProfile: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
 vi.resetModules();

 const headersModule = await import('next/headers');
 mockCookies = headersModule.cookies as unknown as ReturnType<typeof vi.fn>;

 const adminModule = await import('@/lib/firebase/admin');
 mockVerifyIdToken = adminModule.adminAuth.verifyIdToken as ReturnType<typeof vi.fn>;
 mockGetAdminProfile = adminModule.getAdminProfile as ReturnType<typeof vi.fn>;

 const sessionModule = await import('./admin-session');
 getAdminSession = sessionModule.getAdminSession;
	});

	function setupSession(token: string | null, profile: Record<string, unknown> | null) {
 mockCookies.mockResolvedValue({
 get: (name: string) => name === '__session' && token ? { value: token } : undefined,
 });
 mockVerifyIdToken.mockResolvedValue({ uid: 'test-uid', email: 'test@test.com' });
 mockGetAdminProfile.mockResolvedValue(profile);
	}

	it('deve aceitar admin (type=admin)', async () => {
 setupSession('valid-token', { role: 'owner', type: 'admin', active: true });
 const session = await getAdminSession();
 expect(session).not.toBeNull();
 expect(session?.type).toBe('admin');
	});

	it('deve REJEITAR validador (type=validator)', async () => {
 setupSession('valid-token', { role: 'checkin_operator', type: 'validator', active: true });
 const session = await getAdminSession();
 expect(session).toBeNull();
	});

	it('deve REJEITAR conta inativa', async () => {
 setupSession('valid-token', { role: 'owner', type: 'admin', active: false });
 const session = await getAdminSession();
 expect(session).toBeNull();
	});
});