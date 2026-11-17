'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { ShieldCheck, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

/**
 * Login Exclusivo do Validador — /validador/login
 *
 * Wrapper com Suspense para compatibilidade com useSearchParams no Next.js 15.
 */
export default function ValidatorLoginPage() {
	return (
		<Suspense fallback={<ValidatorLoginLoading />}>
			<ValidatorLoginForm />
		</Suspense>
	);
}

function ValidatorLoginLoading() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-[#faf8f5] px-4">
			<div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#17291F] shadow-lg animate-pulse">
				<ShieldCheck size={32} className="text-[#e4c286]" />
			</div>
			<p className="mt-4 text-sm text-[#17291F]/60">Carregando...</p>
		</div>
	);
}

/**
 * Formulário de Login do Validador.
 *
 * Autentica via Firebase Auth Client SDK e cria sessão server-side
 * via POST /api/validator/session. Valida permissões de validador
 * no servidor antes de redirecionar.
 *
 * NÃO compartilha fluxo com /admin/login.
 */
function ValidatorLoginForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const redirect = searchParams.get('redirect') || '/validador';

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			// 1. Autenticar via Firebase Auth Client SDK
			const userCredential = await signInWithEmailAndPassword(auth, email, password);
			const idToken = await userCredential.user.getIdToken();

			// 2. Criar sessão server-side via API route do validador
			const response = await fetch('/api/validator/session', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ idToken }),
			});

			const data = await response.json();

			if (!response.ok || !data.success) {
				// Se o servidor rejeitar (não é validador, conta inativa, etc.)
				// fazer logout do Firebase Auth para limpar estado local
				await auth.signOut().catch(() => {});
				setError(data.error || 'Acesso negado. Verifique suas credenciais ou entre em contato com os noivos.');
				setLoading(false);
				return;
			}

			// 3. Redirecionar para o painel do validador
			router.push(redirect);
			router.refresh();
		} catch (e) {
			const code = (e as { code?: string })?.code;

			if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
				setError('Email ou senha incorretos.');
			} else if (code === 'auth/too-many-requests') {
				setError('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
			} else if (code === 'auth/user-disabled') {
				setError('Esta conta foi desativada. Entre em contato com os noivos.');
			} else if (code === 'auth/network-request-failed') {
				setError('Erro de conexão. Verifique sua internet e tente novamente.');
			} else {
				console.error('[ValidatorLogin] Erro inesperado:', e);
				setError('Erro inesperado. Tente novamente.');
			}
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-[#faf8f5] px-4">
			<div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
				{/* Header */}
				<div className="mb-8 text-center">
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#17291F] shadow-lg">
						<ShieldCheck size={32} className="text-[#e4c286]" />
					</div>
					<h1 className="text-2xl font-bold text-[#17291F]">Painel do Validador</h1>
					<p className="mt-1 text-sm text-[#17291F]/60">Casamento Andrey & Amanda</p>
				</div>

				{/* Formulário */}
				<form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-[#17291F]/10 bg-white p-6 shadow-xl">
					{error && (
						<div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
							<AlertCircle size={16} className="mt-0.5 shrink-0" />
							<span>{error}</span>
						</div>
					)}

					<div>
						<label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[#17291F]/70">
							Email
						</label>
						<input
							id="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							autoComplete="email"
							placeholder="seu@email.com"
							className="w-full rounded-lg border border-[#17291F]/20 bg-[#faf8f5] px-4 py-3 text-sm text-[#17291F] placeholder:text-[#17291F]/30 focus:border-[#17291F] focus:outline-none focus:ring-1 focus:ring-[#17291F] transition-colors"
						/>
					</div>

					<div>
						<label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[#17291F]/70">
							Senha
						</label>
						<div className="relative">
							<input
								id="password"
								type={showPassword ? 'text' : 'password'}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								autoComplete="current-password"
								placeholder="••••••••"
								className="w-full rounded-lg border border-[#17291F]/20 bg-[#faf8f5] px-4 py-3 pr-10 text-sm text-[#17291F] placeholder:text-[#17291F]/30 focus:border-[#17291F] focus:outline-none focus:ring-1 focus:ring-[#17291F] transition-colors"
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-[#17291F]/40 hover:text-[#17291F] transition-colors"
							>
								{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
							</button>
						</div>
					</div>

					<button
						type="submit"
						disabled={loading}
						className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#17291F] px-4 py-3 text-sm font-semibold uppercase tracking-widest text-[#e4c286] shadow-md transition-all hover:bg-[#0a1f12] hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
					>
						{loading ? (
							<>
								<Loader2 size={18} className="animate-spin" />
								Entrando...
							</>
						) : (
							'Entrar'
						)}
					</button>
				</form>

				<p className="mt-6 text-center text-xs text-[#17291F]/40">
					Acesso exclusivo para validadores autorizados.
				</p>
			</div>
		</div>
	);
}