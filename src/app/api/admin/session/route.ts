import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { ApiResponse } from '@/types';

/**
 * POST /api/admin/session
 *
 * Recebe o ID Token do Firebase Auth (client-side), valida no Admin SDK,
 * verifica se o usuário é admin autorizado e define cookie de sessão seguro.
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
	try {
		const body = await request.json();
		const { idToken } = body;

		if (!idToken || typeof idToken !== 'string') {
			return NextResponse.json(
				{ success: false, error: 'Token de autenticação não fornecido.' },
				{ status: 400 },
			);
		}

		// Validar token e verificar permissão admin
		const { adminAuth, isAdmin } = await import('@/lib/firebase/admin');

		let decoded;
		try {
			decoded = await adminAuth.verifyIdToken(idToken);
		} catch {
			return NextResponse.json(
				{ success: false, error: 'Token de autenticação inválido ou expirado.' },
				{ status: 401 },
			);
		}

		const authorized = await isAdmin(decoded.uid);
		if (!authorized) {
			return NextResponse.json(
				{ success: false, error: 'Usuário não possui permissão administrativa.' },
				{ status: 403 },
			);
		}

		// Definir cookie de sessão seguro
		const cookieStore = await cookies();
		cookieStore.set('__session', idToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 5, // 5 dias
			path: '/',
		});

		return NextResponse.json({
			success: true,
			message: 'Sessão administrativa criada com sucesso.',
		});
	} catch (error) {
		console.error('[Session API] Erro inesperado:', error);
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