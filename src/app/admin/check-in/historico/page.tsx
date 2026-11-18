import { getAdminSession } from '@/lib/auth/admin-session';
import { redirect } from 'next/navigation';
import { History, Search, Filter } from 'lucide-react';
import { CheckInHistoryClient } from './CheckInHistoryClient';

/**
 * Histórico e Auditoria de Entradas — /admin/check-in/historico
 *
 * Exibe todos os check-ins registrados com informações completas:
 * participante, convite, validador responsável, data/hora, origem (QR/manual).
 *
 * Permite pesquisa por nome, filtro por validador e exportação.
 * Inclui registros desfeitos/corrigidos com marcação visual.
 *
 * SEGURANÇA: apenas administradores podem acessar.
 */
export default async function AdminCheckInHistoryPage() {
	const session = await getAdminSession();

	if (!session) {
		redirect('/admin/login?redirect=/admin/check-in/historico');
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-headline-md text-primary">Histórico de Entradas</h1>
				<p className="mt-1 text-body-md text-on-surface-variant">
					Auditoria completa de todos os check-ins registrados no evento.
				</p>
			</div>

			{/* Componente client com busca, filtros e tabela */}
			<CheckInHistoryClient />
		</div>
	);
}