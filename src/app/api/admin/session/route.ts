import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { Auth } from 'firebase-admin/auth';
import type { ApiResponse } from '@/types';

/**
 * POST /api/admin/session
 *
 * Recebe o ID Token do Firebase Auth (client-side), valida no Admin SDK,
 * verifica se o usuário é admin autorizado e define cookie de sessão seguro.
 *
 * Logs diagnósticos estruturados: registram etapa da falha sem expor
 * tokens, senhas, cookies ou chaves privadas.
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
	try {
		// Etapa 1: Parsear corpo da requisição
		let body: { idToken?: string };
		try {
			body = await request.json();
		} catch {
			console.error('[Session API] Etapa 1 FALHA: corpo da requisição não é JSON válido');
			return NextResponse.json(
				{ success: false, error: 'Dados de autenticação inválidos.' },
				{ status: 400 },
			);
		}

		const { idToken } = body;

		if (!idToken || typeof idToken !== 'string') {
			console.error('[Session API] Etapa 1 FALHA: idToken ausente ou não é string');
			return NextResponse.json(
				{ success: false, error: 'Token de autenticação não fornecido.' },
				{ status: 400 },
			);
		}

		// Etapa 2: Importar e inicializar Firebase Admin SDK
		let adminAuth: Auth;
		let isAdmin: (uid: string) => Promise<boolean>;

		try {
			const adminModule = await import('@/lib/firebase/admin');
			adminAuth = adminModule.adminAuth;
			isAdmin = adminModule.isAdmin;
		} catch (e) {
			console.error('[Session API] Etapa 2 FALHA: Firebase Admin SDK não pôde ser inicializado.', {
				errorType: e instanceof Error ? e.constructor.name : 'unknown',
				errorMessage: e instanceof Error ? e.message : String(e),
				hint: 'Verifique se FIREBASE_SERVICE_ACCOUNT_JSON está configurada na Vercel (Settings > Environment Variables).',
			});
			return NextResponse.json(
				{ success: false, error: 'Erro de configuração do servidor. Entre em contato com os administradores.' },
				{ status: 500 },
			);
		}

		// Etapa 3: Verificar ID Token
		let decoded: { uid: string; email?: string };
		try {
			decoded = await adminAuth.verifyIdToken(idToken);
		} catch (e) {
			console.error('[Session API] Etapa 3 FALHA: verifyIdToken rejeitou o token.', {
				errorType: e instanceof Error ? e.constructor.name : 'unknown',
				errorCode: (e as { code?: string })?.code,
			});
			return NextResponse.json(
				{ success: false, error: 'Sessão expirada ou token inválido. Faça login novamente.' },
				{ status: 401 },
			);
		}

		// Etapa 4: Verificar permissão administrativa no Firestore
		let authorized: boolean;
		try {
			authorized = await isAdmin(decoded.uid);
		} catch (e) {
			console.error('[Session API] Etapa 4 FALHA: erro ao consultar admins/{uid} no Firestore.', {
				uid: decoded.uid,
				errorType: e instanceof Error ? e.constructor.name : 'unknown',
				errorMessage: e instanceof Error ? e.message : String(e),
			});
			return NextResponse.json(
				{ success: false, error: 'Erro interno ao verificar permissões. Tente novamente.' },
				{ status: 500 },
			);
		}

		if (!authorized) {
			console.warn('[Session API] Etapa 4 FALHA: usuário autenticado mas sem documento admin ativo.', {
				uid: decoded.uid,
				email: decoded.email || '(não disponível)',
				hint: 'Crie o documento admins/{uid} com { active: true, role: "owner" } no Firestore.',
			});
			return NextResponse.json(
				{ success: false, error: 'Seu usuário não possui permissão administrativa. Entre em contato com os noivos para ser autorizado.' },
				{ status: 403 },
			);
		}

		// Etapa 5: Definir cookie de sessão seguro
		try {
			const cookieStore = await cookies();
			cookieStore.set('__session', idToken, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				maxAge: 60 * 60 * 24 * 5, // 5 dias
				path: '/',
			});
		} catch (e) {
			console.error('[Session API] Etapa 5 FALHA: erro ao definir cookie __session.', {
				errorType: e instanceof Error ? e.constructor.name : 'unknown',
				errorMessage: e instanceof Error ? e.message : String(e),
			});
			return NextResponse.json(
				{ success: false, error: 'Erro ao criar sessão. Tente novamente.' },
				{ status: 500 },
			);
		}

		console.log('[Session API] Login bem-sucedido.', { uid: decoded.uid });

		return NextResponse.json({
			success: true,
			message: 'Sessão administrativa criada com sucesso.',
		});
	} catch (error) {
		console.error('[Session API] Erro inesperado não capturado:', {
			errorType: error instanceof Error ? error.constructor.name : 'unknown',
			errorMessage: error instanceof Error ? error.message : String(error),
		});
		return NextResponse.json(
			{ success: false, error: 'Erro interno ao criar sessão.' },
			{ status: 500 },
		);
	}
}

/**
 * DELETE /api/admin/session
 *
 * Remove o cookie de sessão (logout).
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
		console.error('[Session API] Erro ao encerrar sessão:', error);
		return NextResponse.json(
			{ success: false, error: 'Erro ao encerrar sessão.' },
			{ status: 500 },
		);
	}
}