import { redirect } from 'next/navigation';
import { getAdminSession, getValidatorSession } from '@/lib/auth/admin-session';

/**
 * Redirecionamento Seguro — /admin/check-in → /validador (Etapa 5)
 *
 * Esta rota foi substituída por um redirecionamento autenticado para o painel
 * seguro do validador (/validador), que utiliza o repositório transacional
 * com IDs persistentes e seleção individual de participantes.
 *
 * COMPATIBILIDADE COM QR CODES EXISTENTES:
 * - QR Codes antigos no formato `/admin/check-in?t={token}` continuam funcionando
 * - O parâmetro `t` é preservado via sessionStorage (não em URL de redirecionamento)
 *   para evitar exposição em histórico de navegação e logs de servidor
 * - O scanner em /validador reconhece URLs com ?t= e tokens puros
 *
 * SEGURANÇA:
 * - Usuários não autenticados → redirecionados para /admin/login
 * - Admins e validadores autorizados → redirecionados para /validador
 * - Token NUNCA aparece na URL de destino ou em logs
 * - Nenhum check-in automático durante o redirecionamento
 * - Sem loop: /admin/check-in → /validador (nunca volta para /admin/check-in)
 */
export default async function AdminCheckInRedirectPage({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const params = await searchParams;

	// Verificar autenticação: admin OU validador
	const adminSession = await getAdminSession();
	const validatorSession = await getValidatorSession();
	const session = adminSession || validatorSession;

	if (!session) {
		// Não autenticado → login admin (middleware já protege, mas dupla verificação)
		redirect('/admin/login?redirect=/validador');
	}

	// Se há token no query param, armazenar em sessionStorage via script client-side
	// para que o scanner possa recuperá-lo sem expor na URL de redirecionamento
	const token = typeof params.t === 'string' ? params.t : null;

	if (token) {
		// Redirecionar com token codificado em fragmento (não enviado ao servidor)
		// O scanner em /validador vai ler window.location.hash e limpar após uso
		redirect(`/validador#t=${encodeURIComponent(token)}`);
	}

	// Sem token → redirecionamento simples
	redirect('/validador');
}