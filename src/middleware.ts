import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware — Proteção de Rotas Administrativas
 *
 * Verifica a existência do cookie de sessão `__session` para rotas /admin/*.
 * Redireciona para /admin/login se não autenticado.
 *
 * NOTA: A validação completa do token (verifyIdToken + isAdmin) é feita
 * nas Server Actions e Route Handlers. O middleware faz apenas verificação
 * rápida de presença do cookie para evitar carregamento desnecessário.
 */
export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Proteger todas as rotas /admin/* exceto /admin/login e /admin/api/*
	if (pathname.startsWith('/admin') && pathname !== '/admin/login' && !pathname.startsWith('/admin/api')) {
 const sessionCookie = request.cookies.get('__session')?.value;

 if (!sessionCookie) {
 const loginUrl = new URL('/admin/login', request.url);
 loginUrl.searchParams.set('redirect', pathname);
 return NextResponse.redirect(loginUrl);
 }
	}

	// Proteger todas as rotas /validador/* exceto /validador/login e /api/validator/*
	if (pathname.startsWith('/validador') && pathname !== '/validador/login') {
 const sessionCookie = request.cookies.get('__session')?.value;

 if (!sessionCookie) {
 const loginUrl = new URL('/validador/login', request.url);
 loginUrl.searchParams.set('redirect', pathname);
 return NextResponse.redirect(loginUrl);
 }
	}

	return NextResponse.next();
}

export const config = {
	matcher: ['/admin/:path*', '/validador/:path*'],
};