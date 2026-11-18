import { getAdminSession } from '@/lib/auth/admin-session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, History, Users, FileText, TrendingUp, QrCode, PlayCircle, StopCircle, RotateCcw } from 'lucide-react';
import { ReceptionControlPanel } from './ReceptionControlPanel';

/**
 * Painel Administrativo de Check-in — /admin/check-in (Lote 3)
 *
 * Hub central da seção "Check-in" no painel administrativo.
 * Inclui:
 * - Controle de abertura/encerramento/reabertura da recepção (§10)
 * - Navegação para subseções (validadores, histórico, solicitações)
 * - Indicadores rápidos da recepção
 *
 * COMPATIBILIDADE COM QR CODES EXISTENTES:
 * Se acessado com ?t={token} (QR Code antigo), redireciona para /validador
 * preservando o token via fragmento #t= (não exposto em logs/histórico).
 *
 * SEGURANÇA: apenas administradores podem acessar.
 */
export default async function AdminCheckInDashboardPage({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const session = await getAdminSession();

	if (!session) {
 redirect('/admin/login?redirect=/admin/check-in');
	}

	const params = await searchParams;

	// Compatibilidade com QR Codes antigos: se há token ?t=, redirecionar para /validador
	const token = typeof params.t === 'string' ? params.t : null;
	if (token) {
 redirect(`/validador#t=${encodeURIComponent(token)}`);
	}

	const navCards = [
 {
 href: '/admin/check-in/validadores',
 title: 'Validadores',
 description: 'Cadastrar, ativar e desativar operadores de check-in.',
 icon: Users,
 color: 'bg-blue-50 text-blue-700 border-blue-200',
 },
 {
 href: '/admin/check-in/historico',
 title: 'Histórico de Entradas',
 description: 'Auditoria completa de todos os check-ins registrados.',
 icon: History,
 color: 'bg-green-50 text-green-700 border-green-200',
 },
 {
 href: '/admin/check-in/solicitacoes',
 title: 'Solicitações',
 description: 'Aprovar ou recusar acompanhantes extras solicitados.',
 icon: FileText,
 color: 'bg-orange-50 text-orange-700 border-orange-200',
 },
 ];

	return (
 <div className="space-y-8">
 {/* Header */}
 <div>
 <div className="flex items-center gap-3">
 <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-container">
 <ShieldCheck size={24} className="text-tertiary-fixed-dim" />
 </div>
 <div>
 <h1 className="text-headline-md text-primary">Check-in</h1>
 <p className="text-body-md text-on-surface-variant">
 Painel administrativo de acompanhamento da recepção.
 </p>
 </div>
 </div>
 </div>

 {/* Controle de Recepção (Lote 3 §10) */}
 <ReceptionControlPanel />

 {/* Navegação para subseções */}
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
 {navCards.map((card) => {
 const Icon = card.icon;
 return (
 <Link
 key={card.href}
 href={card.href}
 className={`group relative overflow-hidden rounded-xl border p-6 transition-all hover:shadow-md hover:-translate-y-0.5 ${card.color}`}
 >
 <Icon size={28} />
 <h3 className="mt-4 text-title-md font-bold">{card.title}</h3>
 <p className="mt-1 text-body-sm opacity-80">{card.description}</p>
 </Link>
 );
 })}
 </div>

 {/* Aviso sobre painel do validador */}
 <div className="flex items-start gap-3 rounded-lg bg-[#fff8f3] border border-[#e4c286]/30 p-4">
 <QrCode size={20} className="shrink-0 text-[#a2854f]" />
 <div>
 <p className="text-body-sm font-semibold text-[#17291F]">Painel do Validador</p>
 <p className="mt-1 text-body-xs text-[#17291F]/60">
 O leitor de QR Code e o registro de entradas estão disponíveis em{' '}
 <Link href="/validador" className="font-medium underline hover:text-[#17291F]">
 /validador
 </Link>
 . Esta página é exclusiva para administradores acompanharem a recepção.
 </p>
 </div>
 </div>
 </div>
	);
}