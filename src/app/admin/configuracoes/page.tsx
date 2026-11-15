import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth/admin-session';
import { getActiveEvent } from '@/lib/repositories/event.repository';
import { ConfigForm } from './config-form';

/**
 * Configurações do Casamento — /admin/configuracoes
 *
 * Edição de data, horário, local, dress code, prazo RSVP, versículos e textos.
 * Preserva o texto oficial de Nossa História. Alterações refletem no convite público.
 * Requer sessão administrativa válida.
 *
 * O formulário é renderizado pelo componente client-side ConfigForm,
 * conectado à Server Action saveEventSettings via React Hook Form + Zod.
 */
export default async function AdminConfiguracoesPage() {
	const session = await getAdminSession();
	if (!session) {
 redirect('/admin/login');
	}

	const event = await getActiveEvent();

	return (
 <div className="space-y-space-xl">
 {/* Header */}
 <div>
 <h1 className="text-headline-lg-mobile text-primary md:text-headline-lg">
 Configurações do Casamento
 </h1>
 <p className="mt-space-xs text-body-md text-on-surface-variant">
 Edite as informações que aparecem no convite público
 </p>
 </div>

 {/* Aviso sobre preservação */}
 <div className="rounded-lg border border-tertiary-fixed-dim/30 bg-tertiary-fixed/10 p-4">
 <p className="text-body-sm text-on-surface-variant">
 <strong>Nota:</strong> O texto oficial de Nossa História é preservado automaticamente.
 Alterações nesta página refletem imediatamente no convite público.
 </p>
 </div>

 {/* Formulário client-side com persistência real */}
 <ConfigForm event={event} />
 </div>
	);
}