'use client';

import { useState } from 'react';
import { LogOut, Loader2 } from 'lucide-react';

/**
 * Botão de logout do validador.
 *
 * Usa fetch com método DELETE para /api/validator/session (o navegador não suporta
 * method="DELETE" em formulários HTML nativos — converte para GET, causando HTTP 405).
 * Após sucesso, faz signOut do Firebase Auth no cliente e redireciona para /validador/login.
 */
export function ValidatorLogoutButton() {
	const [loading, setLoading] = useState(false);

	const handleLogout = async () => {
		if (loading) return;
		setLoading(true);

		try {
			// 1. Remover cookie de sessão via API
			const response = await fetch('/api/validator/session', { method: 'DELETE' });

			if (!response.ok) {
				console.error('[ValidatorLogout] Falha ao remover sessão:', response.status);
			}

			// 2. SignOut do Firebase Auth no cliente (limpa estado local)
			try {
				const { auth } = await import('@/lib/firebase/client');
				const { signOut } = await import('firebase/auth');
				await signOut(auth);
			} catch {
				// Firebase client pode não estar inicializado — não bloqueia o logout
			}

			// 3. Redirecionar para login do validador
			window.location.href = '/validador/login';
		} catch (e) {
			console.error('[ValidatorLogout] Erro inesperado:', e);
			// Fallback: redirecionar mesmo com erro
			window.location.href = '/validador/login';
		} finally {
			setLoading(false);
		}
	};

	return (
		<button
			type="button"
			onClick={handleLogout}
			disabled={loading}
			className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
		>
			{loading ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
			Sair
		</button>
	);
}