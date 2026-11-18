import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth/admin-session';

/**
 * Redirecionamento — /admin/check-in/validadores → /admin/validadores
 *
 * Preserva a página existente de gestão de validadores em /admin/validadores
 * sem duplicar código. Esta rota existe apenas para manter a consistência
 * da navegação dentro da seção "Check-in" do menu lateral.
 *
 * SEGURANÇA: verifica sessão admin antes de redirecionar.
 */
export default async function AdminCheckInValidatorsRedirectPage() {
	const session = await getAdminSession();

	if (!session) {
 redirect('/admin/login?redirect=/admin/check-in/validadores');
	}

	redirect('/admin/validadores');
}