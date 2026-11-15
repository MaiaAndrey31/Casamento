import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import { getAdminSession } from '@/lib/auth/admin-session';
import { listGuests, type GuestWithInvitation } from '@/lib/repositories/guest.repository';
import { GuestListClient } from './GuestListClient';

/**
 * Gestão de Convidados — /admin/convidados
 *
 * Lista completa com pesquisa, filtros por categoria/status RSVP,
 * menu dropdown de ações por convidado (editar, gerar convite, WhatsApp, etc.).
 * Requer sessão administrativa válida.
 */
export default async function AdminGuestsPage() {
	const session = await getAdminSession();
	if (!session) {
		redirect('/admin/login');
	}

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';
	const { guests, total } = await listGuests(eventId, { limit: 100 });

	// Contadores por status RSVP
	const confirmed = guests.filter(g => g.rsvpStatus === 'confirmed').length;
	const declined = guests.filter(g => g.rsvpStatus === 'declined').length;
	const pending = guests.filter(g => !g.rsvpStatus || g.rsvpStatus === 'pending').length;

	return (
		<div className="space-y-space-xl">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-headline-lg-mobile text-primary md:text-headline-lg">
						Convidados
					</h1>
					<p className="mt-space-xs text-body-md text-on-surface-variant">
						{total} convidado{total !== 1 ? 's' : ''} cadastrado{total !== 1 ? 's' : ''}
					</p>
				</div>
				<Link
					href="/admin/convidados/novo"
					className="inline-flex items-center justify-center gap-2 rounded-md bg-primary-container px-6 py-3 text-label-md uppercase tracking-widest text-tertiary-fixed shadow-md transition-all hover:bg-secondary hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-tertiary-fixed-dim focus:ring-offset-2"
				>
					<Plus size={16} /> Novo Convidado
				</Link>
			</div>

			{/* Filtros rápidos */}
			<div className="flex flex-wrap gap-3">
				<div className="flex items-center gap-2 rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-4 py-2 shadow-sm">
					<Users size={16} className="text-on-surface-variant" />
					<span className="text-body-sm font-medium text-on-surface">{total} Total</span>
				</div>
				<div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 shadow-sm">
					<CheckCircle size={16} className="text-green-700" />
					<span className="text-body-sm font-medium text-green-800">{confirmed} Confirmados</span>
				</div>
				<div className="flex items-center gap-2 rounded-lg border border-error/20 bg-error-container/10 px-4 py-2 shadow-sm">
					<XCircle size={16} className="text-error" />
					<span className="text-body-sm font-medium text-error">{declined} Recusados</span>
				</div>
				<div className="flex items-center gap-2 rounded-lg border border-outline-variant/20 bg-surface-container-high px-4 py-2 shadow-sm">
					<Clock size={16} className="text-on-surface-variant" />
					<span className="text-body-sm font-medium text-on-surface-variant">{pending} Pendentes</span>
				</div>
			</div>

			{/* Barra de pesquisa */}
			<div className="relative">
				<Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
				<input
					type="search"
					placeholder="Pesquisar por nome..."
					className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest py-3 pl-10 pr-4 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
				/>
			</div>

			{/* Lista de convidados — componente client-side com menu de ações */}
			{guests.length === 0 ? (
				<div className="rounded-xl border border-dashed border-outline-variant/30 bg-surface-container-low p-space-xl text-center">
					<Users size={48} className="mx-auto mb-space-md text-on-surface-variant/30" />
					<p className="text-body-lg text-on-surface-variant">
						Nenhum convidado cadastrado ainda.
					</p>
					<Link
						href="/admin/convidados/novo"
						className="mt-space-md inline-block text-label-md uppercase tracking-widest text-primary underline decoration-tertiary-fixed-dim underline-offset-4 hover:text-secondary"
					>
						Cadastrar primeiro convidado
					</Link>
				</div>
			) : (
				<GuestListClient guests={guests} />
			)}
		</div>
	);
}