import { redirect } from 'next/navigation';
import { Users, CheckCircle, XCircle, Clock, MessageSquareHeart, Camera, Heart } from 'lucide-react';
import { getAdminSession } from '@/lib/auth/admin-session';
import { getDashboardStats } from '@/lib/repositories/stats.repository';

/**
 * Dashboard Administrativo — /admin
 *
 * Exibe indicadores reais calculados a partir do Firestore.
 * Requer sessão administrativa válida.
 */
export default async function AdminDashboardPage() {
	// Verificar sessão
	const session = await getAdminSession();
	if (!session) {
 redirect('/admin/login');
	}

	// Buscar estatísticas reais
	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';
	const stats = await getDashboardStats(eventId);

	const cards = [
 {
 label: 'Convidados',
 value: stats.totalGuests,
 icon: Users,
 color: 'text-primary-container',
 bg: 'bg-secondary-container/50',
 },
 {
 label: 'Convites Ativos',
 value: stats.totalInvitations,
 icon: Heart,
 color: 'text-primary-container',
 bg: 'bg-secondary-container/50',
 },
 {
 label: 'Presenças Confirmadas',
 value: stats.totalConfirmedPeople,
 subtext: `${stats.confirmedRSVPs} convites · ${stats.totalCompanions} acompanhantes`,
 icon: CheckCircle,
 color: 'text-green-700',
 bg: 'bg-green-100',
 },
 {
 label: 'Ausências',
 value: stats.declinedRSVPs,
 icon: XCircle,
 color: 'text-error',
 bg: 'bg-error-container/30',
 },
 {
 label: 'Respostas Pendentes',
 value: stats.pendingRSVPs,
 icon: Clock,
 color: 'text-on-surface-variant',
 bg: 'bg-surface-container-high',
 },
 {
 label: 'Recados Pendentes',
 value: stats.pendingMessages,
 subtext: `${stats.approvedMessages} aprovados`,
 icon: MessageSquareHeart,
 color: 'text-primary-container',
 bg: 'bg-tertiary-fixed/20',
 },
 {
 label: 'Check-ins Realizados',
 value: stats.totalCheckIns,
 icon: Camera,
 color: 'text-primary-container',
 bg: 'bg-secondary-container/50',
 },
	];

	return (
 <div className="space-y-space-xl">
 {/* Header */}
 <div>
 <h1 className="text-headline-lg-mobile text-primary md:text-headline-lg">
 Dashboard
 </h1>
 <p className="mt-space-xs text-body-md text-on-surface-variant">
 Visão geral do casamento de Andrey & Amanda
 </p>
 </div>

 {/* Grid de cards */}
 <div className="grid gap-space-md sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
 {cards.map((card) => {
 const Icon = card.icon;
 return (
 <div
 key={card.label}
 className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-space-lg shadow-sm transition-shadow hover:shadow-md"
 >
 <div className="mb-space-md flex items-center gap-3">
 <div className={`flex h-10 w-10 items-center justify-center rounded-full ${card.bg}`}>
 <Icon size={20} className={card.color} />
 </div>
 <span className="text-label-md uppercase tracking-widest text-on-surface-variant">
 {card.label}
 </span>
 </div>
 <p className="text-display-hero-mobile font-light tabular-nums text-primary md:text-headline-lg">
 {card.value}
 </p>
 {card.subtext && (
 <p className="mt-space-xs text-body-sm text-on-surface-variant">
 {card.subtext}
 </p>
 )}
 </div>
 );
 })}
 </div>

 {/* Taxa de confirmação */}
 <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-space-lg shadow-sm">
 <h2 className="mb-space-md text-headline-sm text-primary">Taxa de Confirmação</h2>
 <div className="flex items-end gap-4">
 <span className="text-display-hero-mobile font-light tabular-nums text-primary-container md:text-headline-lg">
 {stats.totalInvitations > 0
 ? Math.round((stats.confirmedRSVPs / stats.totalInvitations) * 100)
 : 0}%
 </span>
 <span className="mb-1 text-body-md text-on-surface-variant">
 dos convites respondidos com confirmação
 </span>
 </div>
 {/* Barra de progresso */}
 <div className="mt-space-md h-3 w-full overflow-hidden rounded-full bg-surface-container-high">
 <div
 className="h-full rounded-full bg-primary-container transition-all duration-500"
 style={{
 width: `${stats.totalInvitations > 0 ? (stats.confirmedRSVPs / stats.totalInvitations) * 100 : 0}%`,
 }}
 />
 </div>
 </div>

 {/* Aviso sobre dados */}
 <p className="text-center text-body-sm text-on-surface-variant">
 Dados atualizados em tempo real a partir do Firestore.
 </p>
 </div>
	);
}