import { getValidatorSession } from '@/lib/auth/admin-session';
import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { QrCodeScanner } from './QrCodeScanner';
import { ReceptionSummaryServer } from './ReceptionSummaryServer';

/**
 * Painel do Validador — /validador (Etapa 4)
 *
 * Leitor de QR Code funcional + Resumo da Recepção em tempo real.
 *
 * SEGURANÇA: verifica sessão de validador no servidor.
 */
export default async function ValidatorDashboardPage() {
	const session = await getValidatorSession();

	if (!session) {
		redirect('/validador/login');
	}

	return (
		<div className="space-y-6">
			{/* Identificação do operador */}
			<div className="rounded-xl border border-[#17291F]/10 bg-white p-4 shadow-sm">
				<div className="flex items-center gap-3">
					<div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#17291F]">
						<ShieldCheck size={18} className="text-[#e4c286]" />
					</div>
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-semibold text-[#17291F]">{session.email}</p>
						<p className="text-[10px] uppercase tracking-widest text-[#17291F]/50">
							{session.role === 'owner' ? 'Administrador' : 'Validador'}
						</p>
					</div>
				</div>
			</div>

			{/* Resumo da Recepção (server component com dados iniciais) */}
			<ReceptionSummaryServer />

			{/* Leitor de QR Code + Painel de Check-in */}
			<QrCodeScanner />
		</div>
	);
}