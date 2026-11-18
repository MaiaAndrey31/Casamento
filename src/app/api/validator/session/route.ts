import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { ApiResponse } from '@/types';

/**
 * POST /api/validator/session
 *
 * Autenticação exclusiva para validadores (checkin_operator).
 * Recebe ID Token do Firebase Auth client-side, valida no Admin SDK,
 * verifica se é validador ativo e define cookie de sessão seguro.
 *
 * DIFERENÇAS DO LOGIN ADMIN:
 * - Aceita type === 'validator' OU role === 'checkin_operator'
 * - Owners também passam (noivos podem acessar painel do validador)
 * - Registra último login para auditoria
 * - Rejeita admins que não são owners nem validadores
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
	try {
		// Etapa 1: Parsear corpo
		let body: { idToken?: string };
		try {
			body = await request.json();
		} catch {
			return NextResponse.json(
				{ success: false, error: 'Dados de autenticação inválidos.' },
				{ status: 400 },
			);
		}

		const { idToken } = body;
		if (!idToken || typeof idToken !== 'string') {
			return NextResponse.json(
				{ success: false, error: 'Token de autenticação não fornecido.' },
				{ status: 400 },
			);
		}

		// Etapa 2: Importar Admin SDK
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let adminAuth: any;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let getAdminProfile: any;

		try {
			const adminModule = await import('@/lib/firebase/admin');
			adminAuth = adminModule.adminAuth;
			getAdminProfile = adminModule.getAdminProfile;
		} catch {
			return NextResponse.json(
				{ success: false, error: 'Erro de configuração do servidor.' },
				{ status: 500 },
			);
		}

		// Etapa 3: Verificar ID Token
		let decoded: { uid: string; email?: string };
		try {
			decoded = await adminAuth.verifyIdToken(idToken);
		} catch {
			return NextResponse.json(
				{ success: false, error: 'Sessão expirada ou token inválido. Faça login novamente.' },
				{ status: 401 },
			);
		}

		// Etapa 4: Verificar perfil e permissões de validador
		const profile = await getAdminProfile(decoded.uid);

		if (!profile || !profile.active) {
			return NextResponse.json(
				{ success: false, error: 'Conta inativa ou não autorizada. Entre em contato com os noivos.' },
				{ status: 403 },
			);
		}

		// Validar permissão com regras estritas (Etapa 3):
		// - Owner (type=admin, role=owner): acesso total
		// - Validador (type=validator, role=checkin_operator): acesso restrito
		// - Combinações inconsistentes são REJEITADAS
		const isOwner = profile.type === 'admin' && profile.role === 'owner';
		const isValidValidator = profile.type === 'validator' && profile.role === 'checkin_operator';

		if (!isOwner && !isValidValidator) {
			return NextResponse.json(
				{ success: false, error: 'Seu usuário não possui permissão de validador.' },
				{ status: 403 },
			);
		}

		// Etapa 5: Definir cookie de sessão
		try {
			const cookieStore = await cookies();
			cookieStore.set('__session', idToken, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				maxAge: 60 * 60 * 12, // 12 horas (sessão mais curta para validadores)
				path: '/',
			});
		} catch {
			return NextResponse.json(
				{ success: false, error: 'Erro ao criar sessão. Tente novamente.' },
				{ status: 500 },
			);
		}

		// Etapa 6: Registrar login para auditoria
		try {
			const { recordValidatorLogin } = await import('@/lib/repositories/validator.repository');
			await recordValidatorLogin(decoded.uid);
		} catch {
			// Não crítico — login já foi bem-sucedido
		}

		console.log('[ValidatorSession] Login de validador bem-sucedido.', { uid: decoded.uid });

		return NextResponse.json({
			success: true,
			message: 'Sessão de validador criada com sucesso.',
		});
	} catch (error) {
		console.error('[ValidatorSession] Erro inesperado:', error);
		return NextResponse.json(
			{ success: false, error: 'Erro interno ao criar sessão.' },
			{ status: 500 },
		);
	}
}

/**
 * DELETE /api/validator/session
 *
 * Remove o cookie de sessão (logout do validador).
 */
export async function DELETE(): Promise<NextResponse<ApiResponse>> {
	try {
		const cookieStore = await cookies();
		cookieStore.delete('__session');

		return NextResponse.json({
			success: true,
			message: 'Sessão encerrada com sucesso.',
		});
	} catch (error) {
		console.error('[ValidatorSession] Erro ao encerrar sessão:', error);
		return NextResponse.json(
			{ success: false, error: 'Erro ao encerrar sessão.' },
			{ status: 500 },
		);
	}
}