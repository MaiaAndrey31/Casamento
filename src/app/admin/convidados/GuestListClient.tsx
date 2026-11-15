'use client';

import { useState } from 'react';
import type { GuestWithInvitation } from '@/lib/repositories/guest.repository';
import { GuestActionsMenu } from '@/components/admin/GuestActionsMenu';

/**
 * Componente client-side para renderizar a lista de convidados
 * com o menu dropdown de ações funcional em cada card.
 *
 * NOTA: deactivateGuest é uma função server-only do repository.
 * A desativação deve ser feita via Server Action dedicada (não implementada ainda).
 * Este componente NÃO importa funções server-only diretamente.
 */
export function GuestListClient({ guests }: { guests: GuestWithInvitation[] }) {
	const [refreshKey, setRefreshKey] = useState(0);

	const handleEdit = (guest: GuestWithInvitation) => {
		// TODO: Implementar modal ou navegação para edição
		console.log('[GuestListClient] Editar convidado:', guest.id);
	};

	const handleDeactivate = async (_guest: GuestWithInvitation) => {
		// TODO: Implementar Server Action de desativação
		// deactivateGuest é server-only e não pode ser chamada diretamente do cliente
		console.warn('[GuestListClient] Desativação ainda não implementada. Requer Server Action.');
	};

	return (
		<div className="space-y-space-sm" key={refreshKey}>
			{guests.map((guest) => {
				const statusConfig = {
					confirmed: { label: 'Confirmado', color: 'bg-green-100 text-green-800 border-green-200' },
					declined: { label: 'Recusado', color: 'bg-error-container/30 text-error border-error/20' },
					pending: { label: 'Pendente', color: 'bg-surface-container-high text-on-surface-variant border-outline-variant/20' },
				};

				const status = guest.rsvpStatus || 'pending';
				const config = statusConfig[status];

				return (
					<div key={guest.id} className="group rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-space-md shadow-sm transition-shadow hover:shadow-md">
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

							{/* Menu dropdown de ações */}
							<GuestActionsMenu
								guest={guest}
								onEdit={handleEdit}
								onDeactivate={handleDeactivate}
							/>
						</div>
					</div>
				);
			})}
		</div>
	);
}