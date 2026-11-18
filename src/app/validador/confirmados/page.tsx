import { getValidatorSession } from '@/lib/auth/admin-session';
import { redirect } from 'next/navigation';
import { Users } from 'lucide-react';
import { ConfirmedListClient } from './ConfirmedListClient';

/**
 * Lista de Convidados Confirmados — /validador/confirmados (Etapa 4)
 *
 * Exibe RSVPs confirmados com status de entrada individual,
 * busca por nome, filtros e paginação.
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
							Lista de RSVPs com presença confirmada e status de entrada
						</p>
					</div>
				</div>
			</div>

			{/* Lista funcional (client component para interatividade) */}
			<ConfirmedListClient />
		</div>
	);
}