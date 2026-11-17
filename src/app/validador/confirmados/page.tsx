import { getValidatorSession } from '@/lib/auth/admin-session';
import { redirect } from 'next/navigation';
import { Users, Clock, Search } from 'lucide-react';

/**
 * Lista de Convidados Confirmados — /validador/confirmados
 *
 * Exibirá RSVPs confirmados com status de entrada individual.
 * Funcionalidade completa será implementada na Etapa 4.
 *
 * SEGURANÇA: verifica sessão de validador no servidor.
 */
export default async function ValidatorConfirmedPage() {
	const session = await getValidatorSession();

	if (!session) {
		redirect('/validador/login');
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="rounded-xl border border-[#17291F]/10 bg-white p-5 shadow-sm">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e4c286]/20">
						<Users size={20} className="text-[#a2854f]" />
					</div>
					<div>
						<h1 className="text-lg font-bold text-[#17291F]">Convidados Confirmados</h1>
						<p className="text-xs text-[#17291F]/50">
							Lista de RSVPs com presença confirmada
						</p>
					</div>
				</div>
			</div>

			{/* Busca — Placeholder */}
			<div className="relative opacity-50 pointer-events-none">
				<Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#17291F]/30" />
				<input
					type="search"
					placeholder="Buscar por nome do convidado..."
					disabled
					className="w-full rounded-lg border border-[#17291F]/10 bg-[#faf8f5] px-4 py-3 pl-10 text-sm text-[#17291F] placeholder:text-[#17291F]/30"
				/>
			</div>

			{/* Estado vazio — Indisponível até Etapa 4 */}
			<div className="rounded-xl border-2 border-dashed border-[#17291F]/10 bg-[#faf8f5] p-10 text-center">
				<Clock size={40} className="mx-auto mb-4 text-[#17291F]/20" />
				<h2 className="text-base font-semibold text-[#17291F]/60">
					Disponível na próxima atualização
				</h2>
				<p className="mt-2 text-sm text-[#17291F]/40">
					A lista de confirmados com busca, filtros e indicadores de entrada
					será ativada após a implementação do check-in transacional.
				</p>
			</div>
		</div>
	);
}