import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Users, CheckCircle, XCircle, Clock, MoreHorizontal, Share2, Trash2 } from 'lucide-react';
import { getAdminSession } from '@/lib/auth/admin-session';
import { listGuests, type GuestWithInvitation } from '@/lib/repositories/guest.repository';

/**
 * Gestão de Convidados — /admin/convidados
 *
 * Lista completa com pesquisa, filtros por categoria/status RSVP,
 * ações de editar/desativar/compartilhar convite.
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

 {/* Barra de pesquisa (client-side via componente separado) */}
 <div className="relative">
 <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
 <input
 type="search"
 placeholder="Pesquisar por nome..."
 className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest py-3 pl-10 pr-4 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
 />
 </div>

 {/* Lista de convidados */}
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
 <div className="space-y-space-sm">
 {guests.map((guest) => (
 <GuestCard key={guest.id} guest={guest} />
 ))}
 </div>
 )}
 </div>
	);
}

/**
 * Card individual de convidado com ações rápidas.
 */
function GuestCard({ guest }: { guest: GuestWithInvitation }) {
	const statusConfig = {
 confirmed: { label: 'Confirmado', color: 'bg-green-100 text-green-800 border-green-200' },
 declined: { label: 'Recusado', color: 'bg-error-container/30 text-error border-error/20' },
 pending: { label: 'Pendente', color: 'bg-surface-container-high text-on-surface-variant border-outline-variant/20' },
	};

	const status = guest.rsvpStatus || 'pending';
	const config = statusConfig[status];

	return (
 <div className="group rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-space-md shadow-sm transition-shadow hover:shadow-md">
 <div className="flex items-start justify-between gap-3">
 {/* Info principal */}
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-2">
 <h3 className="truncate text-title-md text-primary">{guest.fullName}</h3>
 <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${config.color}`}>
 {config.label}
 </span>
 </div>
 <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-on-surface-variant">
 <span>{guest.phone}</span>
 <span className="hidden sm:inline">•</span>
 <span className="capitalize">{guest.category.replace('_', ' ')}</span>
 {guest.isPrimaryGuest && (
 <>
 <span className="hidden sm:inline">•</span>
 <span className="text-tertiary-fixed-dim">Titular</span>
 </>
 )}
 </div>
 </div>

 {/* Ações */}
 <div className="flex shrink-0 items-center gap-1">
 {guest.invitationId && (
 <button
 title="Compartilhar convite via WhatsApp"
 className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-secondary-container/30 hover:text-primary"
 >
 <Share2 size={16} />
 </button>
 )}
 <button
 title="Editar convidado"
 className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
 >
 <MoreHorizontal size={16} />
 </button>
 </div>
 </div>
 </div>
	);
}