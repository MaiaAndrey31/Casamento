'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const STORAGE_KEY = 'wedding_invitation_token';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

interface InvitationContext {
	/** Token do convite ativo, ou null se não houver */
	token: string | null;
	/** URL completa do convite individual */
	invitationUrl: string | null;
	/** Limpar o contexto (ex: ao abrir um convite diferente) */
	clear: () => void;
}

/**
 * Hook para preservar o contexto do convite individual durante a navegação.
 *
 * - Detecta automaticamente quando o usuário está em `/convite/[token]`
 *   e persiste o token em sessionStorage.
 * - Recupera o token salvo quando o usuário navega para outras páginas públicas.
 * - Substitui o token anterior quando um novo convite é acessado (Cenário G).
 * - Expira após 7 dias para evitar tokens obsoletos.
 * - Não expõe o token em URLs, logs ou analytics.
 * - Retorna null quando não há contexto válido (Cenário E).
 *
 * SEGURANÇA: o token em sessionStorage é apenas uma referência de navegação.
 * A validação real do convite continua sendo feita server-side em cada acesso.
 */
export function useInvitationContext(): InvitationContext {
	const pathname = usePathname();
	const [token, setToken] = useState<string | null>(null);

	useEffect(() => {
		try {
			// Detectar token na URL atual (/convite/[token])
			const match = pathname.match(/^\/convite\/([^/]+)/);

			if (match?.[1]) {
				const currentToken = match[1];
				// Persistir com timestamp para expiração
				sessionStorage.setItem(
					STORAGE_KEY,
					JSON.stringify({ token: currentToken, savedAt: Date.now() }),
				);
				setToken(currentToken);
				return;
			}

			// Recuperar token salvo se não estamos na página do convite
			const stored = sessionStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored) as { token: string; savedAt: number };
				const isExpired = Date.now() - parsed.savedAt > MAX_AGE_MS;

				if (isExpired || !parsed.token) {
					sessionStorage.removeItem(STORAGE_KEY);
					setToken(null);
				} else {
					setToken(parsed.token);
				}
			} else {
				setToken(null);
			}
		} catch {
			// sessionStorage indisponível ou corrompido — degradar gracefully
			setToken(null);
		}
	}, [pathname]);

	const clear = () => {
		try {
			sessionStorage.removeItem(STORAGE_KEY);
		} catch {
			// Ignorar
		}
		setToken(null);
	};

	const invitationUrl = token ? `/convite/${token}` : null;

	return { token, invitationUrl, clear };
}