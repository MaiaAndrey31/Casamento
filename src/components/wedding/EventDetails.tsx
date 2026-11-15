import { Calendar, Clock, MapPin, Shirt, Navigation } from 'lucide-react';
import { WEDDING_CONFIG } from '@/config/wedding';

/**
 * Detalhes do Grande Dia — Cards com informações do evento.
 * Exibe estado "não configurado" para dados ainda não preenchidos,
 * sem inventar endereços ou horários fictícios.
 */
export function EventDetails() {
	const hasVenue = WEDDING_CONFIG.venueName !== null;
	const hasDate = WEDDING_CONFIG.eventDate !== null;
	const hasTime = WEDDING_CONFIG.ceremonyTime !== null;
	const hasDressCode = WEDDING_CONFIG.dressCode !== null;

	return (
		<section id="detalhes" className="bg-surface-container-low py-space-2xl px-gutter">
			<div className="mx-auto max-w-3xl">
				{/* Título */}
				<div data-details-title className="mb-space-xl text-center">
					<span className="text-label-md uppercase tracking-widest text-tertiary-fixed-dim">
						Informações
					</span>
					<h2 className="mt-space-sm text-headline-lg-mobile text-primary md:text-headline-lg">
						Detalhes do Grande Dia
					</h2>
					<div className="mx-auto mt-space-md h-px w-16 bg-tertiary-fixed-dim/40" />
				</div>

				{/* Grid de cards */}
				<div className="grid gap-space-md md:grid-cols-2">
					{/* Data */}
					<div data-details-card className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-space-lg shadow-sm">
						<div className="mb-space-sm flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container/50">
								<Calendar size={20} className="text-primary-container" />
							</div>
							<h3 className="text-headline-sm text-primary">Data</h3>
						</div>
						{hasDate ? (
							<p className="text-body-lg text-on-surface">
								{new Date(WEDDING_CONFIG.eventDate!).toLocaleDateString('pt-BR', {
									weekday: 'long',
									day: 'numeric',
									month: 'long',
									year: 'numeric',
									timeZone: WEDDING_CONFIG.timezone,
								})}
							</p>
						) : (
							<p className="text-body-md italic text-on-surface-variant">
								Data a ser confirmada
							</p>
						)}
					</div>

					{/* Horário */}
					<div data-details-card className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-space-lg shadow-sm">
						<div className="mb-space-sm flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container/50">
								<Clock size={20} className="text-primary-container" />
							</div>
							<h3 className="text-headline-sm text-primary">Horário</h3>
						</div>
						{hasTime ? (
							<div className="space-y-1">
								<p className="text-body-md text-on-surface">
									<span className="font-semibold text-primary-container">Cerimônia:</span>{' '}
									{WEDDING_CONFIG.ceremonyTime}
								</p>
								{WEDDING_CONFIG.receptionTime && (
									<p className="text-body-md text-on-surface">
										<span className="font-semibold text-primary-container">Recepção:</span>{' '}
										{WEDDING_CONFIG.receptionTime}
									</p>
								)}
							</div>
						) : (
							<p className="text-body-md italic text-on-surface-variant">
								Horário a ser confirmado
							</p>
						)}
					</div>

					{/* Local */}
					<div data-details-card className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-space-lg shadow-sm md:col-span-2">
						<div className="mb-space-sm flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container/50">
								<MapPin size={20} className="text-primary-container" />
							</div>
							<h3 className="text-headline-sm text-primary">Local</h3>
						</div>
						{hasVenue ? (
							<div className="space-y-2">
								<p className="text-body-lg font-medium text-primary-container">
									{WEDDING_CONFIG.venueName}
								</p>
								{WEDDING_CONFIG.venueAddress && (
									<p className="text-body-md text-on-surface-variant">
										{WEDDING_CONFIG.venueAddress}
									</p>
								)}
								{/* Botões de navegação */}
								<div className="mt-space-md flex flex-wrap gap-3">
									{WEDDING_CONFIG.mapsUrl && (
										<a
											href={WEDDING_CONFIG.mapsUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-2 rounded-md border border-primary-container bg-primary-container px-5 py-3 text-label-md uppercase tracking-widest text-tertiary-fixed transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-tertiary-fixed-dim focus:ring-offset-2"
										>
											<Navigation size={16} />
											Google Maps
										</a>
									)}
									{WEDDING_CONFIG.wazeUrl && (
										<a
											href={WEDDING_CONFIG.wazeUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-2 rounded-md border border-primary-container px-5 py-3 text-label-md uppercase tracking-widest text-primary-container transition-colors hover:bg-secondary-container/30 focus:outline-none focus:ring-2 focus:ring-tertiary-fixed-dim focus:ring-offset-2"
										>
											<Navigation size={16} />
											Waze
										</a>
									)}
								</div>
							</div>
						) : (
							<p className="text-body-md italic text-on-surface-variant">
								Local a ser confirmado
							</p>
						)}
					</div>

					{/* Dress Code */}
					{hasDressCode && (
						<div data-details-card className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-space-lg shadow-sm md:col-span-2">
							<div className="mb-space-sm flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container/50">
									<Shirt size={20} className="text-primary-container" />
								</div>
								<h3 className="text-headline-sm text-primary">Dress Code</h3>
							</div>
							<p className="text-body-md text-on-surface">{WEDDING_CONFIG.dressCode}</p>
						</div>
					)}
				</div>
			</div>
		</section>
	);
}