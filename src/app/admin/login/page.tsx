'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Heart, Lock, Mail, AlertCircle } from 'lucide-react';

/**
 * Componente interno do formulário de login.
 * Separado para permitir o uso de useSearchParams() dentro de um Suspense boundary.
 */
function LoginForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const redirect = searchParams.get('redirect') || '/admin';

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			// Etapa 1: Autenticação com Firebase Auth
			let userCredential;
			try {
				userCredential = await signInWithEmailAndPassword(auth, email, password);
			} catch (authErr) {
				// Erros de autenticação do Firebase
				if (authErr instanceof Error && authErr.message.includes('auth/')) {
					setError('Email ou senha incorretos. Verifique suas credenciais.');
					return;
				}
				setError('Erro de conexão. Verifique sua internet e tente novamente.');
				return;
			}

			// Etapa 2: Obter ID Token
			const idToken = await userCredential.user.getIdToken();

			// Etapa 3: Enviar token para API de sessão
			let response;
			try {
				response = await fetch('/api/admin/session', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ idToken }),
				});
			} catch {
				setError('Não foi possível conectar ao servidor. Tente novamente em alguns instantes.');
				return;
			}

			// Etapa 4: Interpretar resposta da API com mensagens diferenciadas
			if (!response.ok) {
				let errorMessage = 'Erro desconhecido ao criar sessão.';
				try {
					const errorBody = await response.json();
					if (errorBody?.error) {
						errorMessage = errorBody.error;
					}
				} catch {
					// Se não conseguir parsear o JSON, usar status code
					switch (response.status) {
						case 400:
							errorMessage = 'Dados de autenticação inválidos.';
							break;
						case 401:
							errorMessage = 'Sessão expirada. Faça login novamente.';
							break;
						case 403:
							errorMessage = 'Seu usuário não possui permissão administrativa. Entre em contato com os noivos para ser autorizado.';
							break;
						case 500:
							errorMessage = 'Erro interno no servidor. Tente novamente em alguns instantes.';
							break;
					}
				}
				setError(errorMessage);
				return;
			}

			// Etapa 5: Sucesso — redirecionar
			router.push(redirect);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Erro inesperado ao fazer login.');
		} finally {
			setLoading(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-space-md rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-space-lg shadow-md md:p-space-xl">
			{/* Email */}
			<div>
				<label htmlFor="email" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
					Email
				</label>
				<div className="relative">
					<Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
					<input
						id="email"
						type="email"
						required
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder="admin@exemplo.com"
						className="w-full rounded-md border border-outline-variant/30 bg-surface-container-low py-3 pl-10 pr-4 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
					/>
				</div>
			</div>

			{/* Senha */}
			<div>
				<label htmlFor="password" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
					Senha
				</label>
				<div className="relative">
					<Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
					<input
						id="password"
						type="password"
						required
						minLength={6}
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="••••••••"
						className="w-full rounded-md border border-outline-variant/30 bg-surface-container-low py-3 pl-10 pr-4 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
					/>
				</div>
			</div>

			{/* Erro */}
			{error && (
				<div className="flex items-center gap-2 rounded-lg border border-error/30 bg-error-container/20 p-3">
					<AlertCircle size={16} className="shrink-0 text-error" />
					<p className="text-body-sm text-error">{error}</p>
				</div>
			)}

			{/* Botão */}
			<button
				type="submit"
				disabled={loading}
				className="inline-flex w-full items-center justify-center rounded-md bg-primary-container px-8 py-4 text-label-md uppercase tracking-widest text-tertiary-fixed shadow-md transition-all hover:bg-secondary hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-tertiary-fixed-dim focus:ring-offset-2 focus:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
			>
				{loading ? 'Entrando...' : 'Entrar'}
			</button>
		</form>
	);
}

/**
 * Página de Login Administrativo — /admin/login
 *
 * Autenticação via Firebase Authentication (email/senha).
 * Após login bem-sucedido, define cookie de sessão e redireciona ao dashboard.
 *
 * NOTA: useSearchParams() requer Suspense boundary no Next.js 15+.
 */
export default function AdminLoginPage() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-surface px-gutter">
			<div className="w-full max-w-md space-y-space-xl">
				{/* Header */}
				<div className="text-center">
					<div className="mx-auto mb-space-md flex h-16 w-16 items-center justify-center rounded-full bg-primary-container">
						<Heart size={28} className="text-tertiary-fixed-dim" />
					</div>
					<h1 className="text-headline-lg-mobile text-primary md:text-headline-lg">
						Painel dos Noivos
					</h1>
					<p className="mt-space-xs text-body-md text-on-surface-variant">
						Acesse para gerenciar o casamento de Andrey & Amanda
					</p>
				</div>

				{/* Formulário com Suspense boundary para useSearchParams */}
				<Suspense
					fallback={
						<div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-space-lg shadow-md md:p-space-xl">
							<p className="text-center text-body-md text-on-surface-variant">Carregando...</p>
						</div>
					}
				>
					<LoginForm />
				</Suspense>

				{/* Footer */}
				<p className="text-center text-body-sm text-on-surface-variant">
					Acesso restrito aos noivos e administradores autorizados.
				</p>
			</div>
		</div>
	);
}