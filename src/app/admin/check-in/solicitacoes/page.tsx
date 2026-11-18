import { getAdminSession } from '@/lib/auth/admin-session';
import { redirect } from 'next/navigation';
import { FileText } from 'lucide-react';
import { SolicitationsManagerClient } from './SolicitationsManagerClient';

/**
 * Solicitações de Acompanhantes Extras — /admin/check-in/solicitacoes (Lote 3 §8)
 *
 * Painel administrativo para aprovar ou recusar solicitações de acompanhantes
 * extras criadas pelos validadores na recepção.
 *
 * SEGURANÇA: apenas administradores podem acessar e decidir.
 */
export default async function AdminCheckInRequestsPage() {
	const session = await getAdminSession();

	if (!session) {
 redirect('/admin/login?redirect=/admin/check-in/solicitacoes');
	}

	return (
 <div className="space-y-6">
 {/* Header */}
 <div>
 <div className="flex items-center gap-3">
 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
 <FileText size={20} className="text-orange-700" />
 </div>
 <div>
 <h1 className="text-headline-md text-primary">Solicitações de Acompanhantes</h1>
 <p className="text-body-md text-on-surface-variant">
 Aprovar ou recusar acompanhantes extras solicitados pelos validadores na recepção.
 </p>
 </div>
 </div>
 </div>

 {/* Componente client com lista, filtros e ações de aprovação/recusa */}
 <SolicitationsManagerClient />
 </div>
	);
}