import { Calendar, Clock, MapPin, Shirt, Navigation } from 'lucide-react';
import { WEDDING_CONFIG } from '@/config/wedding';

interface EventDetailsProps {
	eventDate?: string | null;
	timezone?: string | null;
	ceremonyTime?: string | null;
	receptionTime?: string | null;
	venueName?: string | null;
	venueAddress?: string | null;
	mapsUrl?: string | null;
	wazeUrl?: string | null;
	dressCode?: string | null;
	/** Modo de exibição: 'public' oculta endereço completo por privacidade; 'invitation' mostra tudo */
	mode?: 'public' | 'invitation';
}

/**
 * Detalhes do Grande Dia — Cards com informações do evento.
 * Recebe dados via props (Firestore) com fallback para WEDDING_CONFIG estático.
 * Exibe estado "não configurado" para dados ainda não preenchidos,
 * sem inventar endereços ou horários fictícios.
 *
 * PRIVACIDADE: No modo 'public', o endereço completo NÃO é exibido
 * (espaço particular/residencial). Apenas no modo 'invitation' (token válido)
 * ou 'admin' o endereço e botões de navegação são mostrados.
 */
export function EventDetails(props: EventDetailsProps) {
	// Mesclar props com fallback estático
	const eventDate = props.eventDate || WEDDING_CONFIG.eventDate;
	const timezone = props.timezone || WEDDING_CONFIG.timezone;
	const ceremonyTime = props.ceremonyTime || WEDDING_CONFIG.ceremonyTime;
	const receptionTime = props.receptionTime ?? WEDDING_CONFIG.receptionTime;
	const venueName = props.venueName || WEDDING_CONFIG.venueName;
	const venueAddress = props.venueAddress || WEDDING_CONFIG.venueAddress;
	const mapsUrl = props.mapsUrl || WEDDING_CONFIG.mapsUrl;
	const wazeUrl = props.wazeUrl || WEDDING_CONFIG.wazeUrl;
	const dressCode = props.dressCode || WEDDING_CONFIG.dressCode;

	const mode = props.mode || 'invitation';
	const isPublic = mode === 'public';

	const hasVenueInfo = !!(venueName || venueAddress);
	const hasDate = eventDate !== null && eventDate !== '';
	const hasTime = ceremonyTime !== null && ceremonyTime !== '';
	const hasDressCode = dressCode !== null && dressCode !== '';

	// Links de navegação fallback a partir do endereço (apenas em modo invitation/admin)
	const encodedAddress = !isPublic && venueAddress ? encodeURIComponent(venueAddress) : null;
	const fallbackMapsUrl = encodedAddress ? `https://www.google.com/maps/search/?api=1&query=${encodedAddress}` : null;
	const fallbackWazeUrl = encodedAddress ? `https://waze.com/ul?q=${encodedAddress}&navigate=yes` : null;
	const effectiveMapsUrl = !isPublic ? (mapsUrl || fallbackMapsUrl) : null;
	const effectiveWazeUrl = !isPublic ? (wazeUrl || fallbackWazeUrl) : null;

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
								{new Date(eventDate!).toLocaleDateString('pt-BR', {
									weekday: 'long',
									day: 'numeric',
									month: 'long',
									year: 'numeric',
									timeZone: timezone || 'America/Sao_Paulo',
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
									{ceremonyTime}
								</p>
								{receptionTime && (
									<p className="text-body-md text-on-surface">
										<span className="font-semibold text-primary-container">Recepção:</span>{' '}
										{receptionTime}
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
							<h3 className="text-headline-sm text-primary">Local da Cerimônia</h3>
						</div>
						{isPublic ? (
							/* Modo público: NÃO exibir endereço completo por privacidade (espaço particular/residencial) */
							<div className="space-y-2">
								<p className="text-body-lg font-medium text-primary-container">
									Espaço particular
								</p>
								<p className="text-body-md text-on-surface-variant">
									O endereço completo e as orientações de chegada estão disponíveis no seu convite individual.
								</p>
							</div>
						) : hasVenueInfo ? (
							/* Modo invitation/admin: exibir endereço completo e botões de navegação */
							<div className="space-y-2">
								{venueName && (
									<p className="text-body-lg font-medium text-primary-container">
										{venueName}
									</p>
								)}
								{venueAddress && (
									<p className={`text-body-md whitespace-pre-line text-on-surface-variant ${venueName ? '' : ''}`}>
										{venueAddress}
									</p>
								)}
								{/* Botões de navegação — URLs cadastradas ou fallback pelo endereço */}
								{(effectiveMapsUrl || effectiveWazeUrl) && (
									<div className="mt-space-md flex flex-wrap gap-3">
										{effectiveMapsUrl && (
											<a
												href={effectiveMapsUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="inline-flex items-center gap-2 rounded-md border border-primary-container bg-primary-container px-5 py-3 text-label-md uppercase tracking-widest text-tertiary-fixed transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-tertiary-fixed-dim focus:ring-offset-2"
											>
												<Navigation size={16} />
												Ver no Google Maps
											</a>
										)}
										{effectiveWazeUrl && (
											<a
												href={effectiveWazeUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="inline-flex items-center gap-2 rounded-md border border-primary-container px-5 py-3 text-label-md uppercase tracking-widest text-primary-container transition-colors hover:bg-secondary-container/30 focus:outline-none focus:ring-2 focus:ring-tertiary-fixed-dim focus:ring-offset-2"
											>
												<Navigation size={16} />
												Abrir no Waze
											</a>
										)}
									</div>
								)}
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
							<p className="text-body-md text-on-surface">{dressCode}</p>
						</div>
					)}
				</div>
			</div>
		</section>
	);
}