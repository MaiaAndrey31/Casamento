import { getReceptionSummary } from '@/lib/repositories/validator-confirmed.repository';
import { Users, UserCheck, Clock, TrendingUp } from 'lucide-react';

const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

/**
 * Resumo da Recepção — Server Component (Etapa 4)
 *
 * Renderiza os contadores iniciais no servidor para evitar flash de loading.
 * Os dados são atualizados em tempo real via evento customizado no client.
 */
export async function ReceptionSummaryServer() {
	const summary = await getReceptionSummary(eventId);

	return (
		<div className="rounded-xl border border-[#17291F]/10 bg-white p-5 shadow-sm">
			<div className="mb-4 flex items-center gap-2">
				<TrendingUp size={18} className="text-[#a2854f]" />
				<h2 className="text-sm font-semibold uppercase tracking-widest text-[#17291F]/70">
					Resumo da Recepção
				</h2>
			</div>

			<div className="grid grid-cols-3 gap-3">
				<div className="rounded-lg bg-green-50 p-3 text-center">
					<p className="text-2xl font-bold text-green-700">{summary.totalCheckedInPeople}</p>
					<p className="text-[10px] uppercase tracking-wider text-green-600/70">Entraram</p>
				</div>
				<div className="rounded-lg bg-[#faf8f5] p-3 text-center">
					<p className="text-2xl font-bold text-[#17291F]">{summary.totalPendingPeople}</p>
					<p className="text-[10px] uppercase tracking-wider text-[#17291F]/50">Aguardando</p>
				</div>
				<div className="rounded-lg bg-blue-50 p-3 text-center">
					<p className="text-2xl font-bold text-blue-700">{summary.totalConfirmedPeople}</p>
					<p className="text-[10px] uppercase tracking-wider text-blue-600/70">Confirmados</p>
				</div>
			</div>

			<div className="mt-3 flex items-center justify-between rounded-lg bg-[#faf8f5] px-4 py-2">
				<div className="text-xs text-[#17291F]/50">
					<span className="font-semibold text-[#17291F]">{summary.partiallyUsedInvitations}</span> parcial(is) •{' '}
					<span className="font-semibold text-[#17291F]">{summary.fullyUsedInvitations}</span> completo(s)
				</div>
				<div className="text-xs text-[#17291F]/50">
					{summary.totalInvitations} convite(s)
				</div>
			</div>

			{/* Últimas entradas */}
			{summary.lastEntries.length > 0 && (
				<div className="mt-4 border-t border-[#17291F]/5 pt-3">
					<p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#17291F]/40">
						Últimas Entradas
					</p>
					<div className="space-y-1.5">
						{summary.lastEntries.map((entry, i) => (
							<div key={i} className="flex items-center justify-between text-xs">
								<div className="min-w-0 flex-1 truncate">
									<span className="font-medium text-[#17291F]">{entry.participantName}</span>
									{entry.invitationDisplayName && (
										<span className="text-[#17291F]/40"> — {entry.invitationDisplayName}</span>
									)}
								</div>
								<span className="shrink-0 text-[#17291F]/30">
									{entry.checkedInAt
										? new Date(entry.checkedInAt).toLocaleTimeString('pt-BR', {
												hour: '2-digit',
												minute: '2-digit',
										  })
										: ''}
								</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}