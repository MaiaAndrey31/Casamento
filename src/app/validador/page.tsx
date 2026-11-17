import { getValidatorSession } from '@/lib/auth/admin-session';
import { redirect } from 'next/navigation';
import { QrCode, Users, ShieldAlert, Clock } from 'lucide-react';

/**
 * Painel Inicial do Validador — /validador
 *
 * Exibe identificação do operador e acesso às funcionalidades.
 * O leitor de QR Code e o registro de entradas estarão disponíveis
 * na Etapa 3, após correção dos bugs do check-in.repository.ts.
 *
 * SEGURANÇA: verifica sessão de validador no servidor.
 * Se não autenticado ou sem permissão, redireciona para login.
 */
export default async function ValidatorDashboardPage() {
	const session = await getValidatorSession();

	if (!session) {
 redirect('/validador/login');
	}

	return (
 <div className="space-y-6">
 {/* Identificação do operador */}
 <div className="rounded-xl border border-[#17291F]/10 bg-white p-5 shadow-sm">
 <div className="flex items-center gap-3">
 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#17291F]">
 <ShieldAlert size={20} className="text-[#e4c286]" />
 </div>
 <div>
 <p className="text-sm font-semibold text-[#17291F]">{session.email}</p>
 <p className="text-xs uppercase tracking-widest text-[#17291F]/50">
 {session.role === 'owner' ? 'Administrador' : 'Validador'}
 </p>
 </div>
 </div>
 </div>

 {/* Leitor QR Code — Indisponível até Etapa 3 */}
 <div className="rounded-xl border border-[#17291F]/10 bg-white p-6 shadow-sm">
 <div className="flex items-center gap-3 mb-4">
 <QrCode size={24} className="text-[#17291F]/40" />
 <h2 className="text-lg font-bold text-[#17291F]">Leitor de QR Code</h2>
 </div>
 <div className="rounded-lg border-2 border-dashed border-[#17291F]/10 bg-[#faf8f5] p-8 text-center">
 <Clock size={32} className="mx-auto mb-3 text-[#17291F]/20" />
 <p className="text-sm font-medium text-[#17291F]/60">
 Disponível na próxima atualização
 </p>
 <p className="mt-1 text-xs text-[#17291F]/40">
 O leitor de câmera e o registro de entradas serão ativados após a validação de segurança.
 </p>
 </div>
 </div>

 {/* Lista de Confirmados — Link ativo */}
 <a
 href="/validador/confirmados"
 className="block rounded-xl border border-[#17291F]/10 bg-white p-6 shadow-sm transition-all hover:border-[#e4c286]/50 hover:shadow-md"
 >
 <div className="flex items-center gap-3">
 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e4c286]/20">
 <Users size={20} className="text-[#a2854f]" />
 </div>
 <div>
 <h2 className="text-lg font-bold text-[#17291F]">Convidados Confirmados</h2>
 <p className="text-xs text-[#17291F]/50">
 Visualizar lista de RSVPs confirmados e status de entrada
 </p>
 </div>
 </div>
 </a>

 {/* Resumo — Placeholder */}
 <div className="rounded-xl border border-[#17291F]/10 bg-white p-6 shadow-sm opacity-60">
 <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#17291F]/50">
 Resumo da Recepção
 </h2>
 <div className="grid grid-cols-3 gap-3">
 <div className="rounded-lg bg-[#faf8f5] p-3 text-center">
 <p className="text-2xl font-bold text-[#17291F]/30">—</p>
 <p className="text-[10px] uppercase tracking-wider text-[#17291F]/40">Confirmados</p>
 </div>
 <div className="rounded-lg bg-[#faf8f5] p-3 text-center">
 <p className="text-2xl font-bold text-[#17291F]/30">—</p>
 <p className="text-[10px] uppercase tracking-wider text-[#17291F]/40">Entraram</p>
 </div>
 <div className="rounded-lg bg-[#faf8f5] p-3 text-center">
 <p className="text-2xl font-bold text-[#17291F]/30">—</p>
 <p className="text-[10px] uppercase tracking-wider text-[#17291F]/40">Aguardando</p>
 </div>
 </div>
 <p className="mt-3 text-center text-xs text-[#17291F]/30">
 Dados disponíveis após ativação do check-in
 </p>
 </div>
 </div>
	);
}