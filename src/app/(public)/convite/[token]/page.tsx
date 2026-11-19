import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Heart, Calendar, MapPin, Users, CheckCircle, Clock, Navigation } from 'lucide-react';
import { validateInvitation, type InvitationViewData } from '@/app/actions/validate-invitation.action';
import { WEDDING_CONFIG, getAssetPath } from '@/config/wedding';
import { getEventById } from '@/lib/repositories/event.repository';
import { getRSVP } from '@/lib/repositories/rsvp.repository';
import { RsvpForm } from './rsvp-form';
import { RsvpConfirmedView } from './rsvp-confirmed-view';

/**
 * Página de Convite Personalizado — /convite/[token]
 *
 * Design Botanical Heirloom Premium:
 * - Hero fotográfico imersivo com overlay verde-floresta
 * - Alternância de fundos: verde profundo → champanhe → marfim → verde
 * - Cards com bordas douradas discretas
 * - Logo original do casal
 * - Tipografia Playfair Display + DM Sans
 * - Totalmente responsivo (mobile-first)
 *
 * NÃO altera regras de RSVP, tokens, Firestore ou autenticação.
 */

interface PageProps {
	params: Promise<{ token: string }>;
}

export default async function InvitationPage({ params }: PageProps) {
	const { token } = await params;
	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

	// Validação server-side do token
	const result = await validateInvitation(eventId, token);

	if (!result.success || !result.data) {
		notFound();
	}

	const { invitation, guests } = result.data;

	// Carregar dados do evento do Firestore (sobrescreve WEDDING_CONFIG estático)
	// Isso garante que alterações no painel admin reflitam imediatamente no convite
	const eventData = await getEventById(eventId);

	// Mesclar configurações: Firestore tem prioridade sobre valores estáticos
	const config = {
		...WEDDING_CONFIG,
		venueName: eventData?.venueName || WEDDING_CONFIG.venueName,
		venueAddress: eventData?.venueAddress || WEDDING_CONFIG.venueAddress,
		mapsUrl: eventData?.mapsUrl || WEDDING_CONFIG.mapsUrl,
		wazeUrl: eventData?.wazeUrl || WEDDING_CONFIG.wazeUrl,
		eventDate: eventData?.eventDate || WEDDING_CONFIG.eventDate,
		ceremonyTime: eventData?.ceremonyTime || WEDDING_CONFIG.ceremonyTime,
		timezone: eventData?.timezone || WEDDING_CONFIG.timezone,
		rsvpDeadline: eventData?.rsvpDeadline || WEDDING_CONFIG.rsvpDeadline,
		heroMessage: eventData?.heroMessage || WEDDING_CONFIG.heroMessage,
		heroVerseReference: eventData?.heroVerseReference || WEDDING_CONFIG.heroVerseReference,
		closingMessage: eventData?.closingMessage || WEDDING_CONFIG.closingMessage,
		closingVerseReference: eventData?.closingVerseReference || WEDDING_CONFIG.closingVerseReference,
	};

	// Construir links de navegação fallback a partir do endereço quando URLs não estão configuradas
	const encodedAddress = config.venueAddress ? encodeURIComponent(config.venueAddress) : null;
	const fallbackMapsUrl = encodedAddress ? `https://www.google.com/maps/search/?api=1&query=${encodedAddress}` : null;
	const fallbackWazeUrl = encodedAddress ? `https://waze.com/ul?q=${encodedAddress}&navigate=yes` : null;
	const effectiveMapsUrl = config.mapsUrl || fallbackMapsUrl;
	const effectiveWazeUrl = config.wazeUrl || fallbackWazeUrl;
	const hasVenueInfo = !!(config.venueName || config.venueAddress);

	// Consultar RSVP existente no Firestore para determinar o estado do convite
	// Isso garante que convidados que já confirmaram vejam a vista de confirmação
	// em vez do formulário, mesmo após fechar e reabrir o link
	const existingRsvp = await getRSVP(eventId, invitation.id);

	// Determinar se alteração é permitida: apenas se RSVP existe e prazo não expirou
	const rsvpDeadlineDate = config.rsvpDeadline ? new Date(config.rsvpDeadline) : null;
	const isPastDeadline = rsvpDeadlineDate ? rsvpDeadlineDate < new Date() : false;
	const canEditRsvp = !!existingRsvp && !isPastDeadline;

	// Calcular total de pessoas autorizadas (titulares + acompanhantes)
	// A action validateInvitation já filtra apenas convidados ativos
	const totalAuthorized = guests.length + invitation.maxCompanions;

	return (
		<main className="min-h-screen">
			{/* ================================================================
				HERO FOTOGRÁFICO IMERSIVO
				Overlay verde-floresta escuro para contraste WCAG AA.
				Padding-top compensa DesktopNav sticky (~96px).
				Transição suave via clip-path para a seção seguinte.
			================================================================ */}
			<section
				id="inicio"
				className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-gutter text-center md:min-h-screen"
			>
				{/* Background fotográfico real */}
				<div className="absolute inset-0 z-0">
					<Image
						src={getAssetPath('bannerHero.webp')}
						alt="Andrey e Amanda"
						fill
						priority
						className="object-cover object-center"
						sizes="100vw"
					/>
					{/* Overlay verde-floresta sofisticado — garante contraste WCAG AA para texto branco */}
					<div className="absolute inset-0 bg-gradient-to-b from-[#0a1f12]/70 via-[#17291F]/60 to-[#17291F]/80" />
				</div>

				{/* Conteúdo do Hero — posicionado com padding-top para não ficar atrás do nav */}
				<div className="relative z-10 mx-auto max-w-2xl pt-28 pb-20 md:pt-32 md:pb-24">
					{/* Logo original do casal */}
					<div className="mx-auto mb-8 w-32 md:w-40">
						<Image
							src={getAssetPath('logo-aa-casamento.webp')}
							alt="Logo Andrey & Amanda"
							width={160}
							height={160}
							className="mx-auto drop-shadow-lg"
							priority
						/>
					</div>

					{/* Identificação elegante do convite */}
					<p className="mb-4 text-label-md uppercase tracking-[0.2em] text-[#e4c286] drop-shadow-sm">
						Você é nosso convidado especial
					</p>

					{/* Título principal */}
					<h1 className="mb-6 text-display-hero-mobile text-white drop-shadow-lg md:text-display-hero">
						{config.coupleNames}
					</h1>

					{/* Mensagem personalizada ao convidado */}
					<p className="mb-6 text-body-lg italic text-white/90 drop-shadow-md md:text-headline-sm">
						Com muito carinho, convidamos{' '}
						<strong className="not-italic text-[#ffdea5]">{invitation.displayName}</strong>{' '}
						para celebrar conosco este momento tão especial.
					</p>

					{/* Frase sobre Deus e a história do casal */}
					<div className="mx-auto max-w-lg rounded-xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur-sm">
						<p className="text-body-md leading-relaxed text-white/85">
							&ldquo;{config.heroMessage}&rdquo;
						</p>
						{config.heroVerseReference && (
							<p className="mt-2 text-label-sm uppercase tracking-widest text-[#e4c286]/80">
								{config.heroVerseReference}
							</p>
						)}
					</div>
				</div>

				{/* Transição suave para a seção seguinte — curva orgânica */}
				<div className="absolute bottom-0 left-0 right-0 z-10">
					<svg
						viewBox="0 0 1440 120"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						className="w-full"
						preserveAspectRatio="none"
					>
						<path
							d="M0 120L1440 120L1440 60C1440 60 1200 0 720 0C240 0 0 60 0 60L0 120Z"
							fill="#17291F"
						/>
					</svg>
				</div>
			</section>

			{/* ================================================================
				SEÇÃO DE INFORMAÇÕES — Fundo verde-floresta profundo
				Cards com bordas douradas discretas e ícones elegantes.
			================================================================ */}
			<section id="detalhes" className="bg-[#17291F] px-gutter py-16 md:py-24">
				<div className="mx-auto max-w-3xl">
					{/* Título da seção */}
					<div className="mb-12 text-center">
						<p className="mb-3 text-label-md uppercase tracking-[0.2em] text-[#e4c286]">
							O Grande Dia
						</p>
						<h2 className="text-headline-lg-mobile text-white md:text-headline-lg">
							Detalhes da Celebração
						</h2>
						{/* Divisória dourada */}
						<div className="mx-auto mt-6 h-px w-24 bg-gradient-to-r from-transparent via-[#e4c286] to-transparent" />
					</div>

					{/* Grid de informações */}
					<div className="grid gap-6 md:grid-cols-2">
						{/* Card Data */}
						<div className="group rounded-2xl border border-[#e4c286]/20 bg-white/5 p-8 backdrop-blur-sm transition-all duration-300 hover:border-[#e4c286]/40 hover:bg-white/8">
							<div className="mb-4 flex items-center gap-4">
								<div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#e4c286]/30 bg-[#e4c286]/10">
									<Calendar size={22} className="text-[#e4c286]" />
								</div>
								<h3 className="text-headline-sm text-white">Data</h3>
							</div>
							{config.eventDate ? (
								<div>
									<p className="text-title-md text-[#ffdea5]">
										{new Date(config.eventDate).toLocaleDateString('pt-BR', {
											day: 'numeric',
											month: 'long',
											year: 'numeric',
											timeZone: config.timezone,
										})}
									</p>
									<div className="mt-3 flex items-center gap-2 text-body-md text-white/70">
										<Clock size={16} className="text-[#e4c286]/60" />
										<span>
											às{' '}
											{new Date(config.eventDate).toLocaleTimeString('pt-BR', {
												hour: '2-digit',
												minute: '2-digit',
												timeZone: config.timezone,
												hour12: false,
											})}
										</span>
									</div>
								</div>
							) : (
								<p className="text-body-md italic text-white/50">Data a ser confirmada</p>
							)}
						</div>

						{/* Card Local */}
						<div className="group rounded-2xl border border-[#e4c286]/20 bg-white/5 p-8 backdrop-blur-sm transition-all duration-300 hover:border-[#e4c286]/40 hover:bg-white/8">
							<div className="mb-4 flex items-center gap-4">
								<div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#e4c286]/30 bg-[#e4c286]/10">
									<MapPin size={22} className="text-[#e4c286]" />
								</div>
								<h3 className="text-headline-sm text-white">Local</h3>
							</div>
							{hasVenueInfo ? (
								<div>
									{config.venueName && (
										<p className="text-title-md text-[#ffdea5]">{config.venueName}</p>
									)}
									{config.venueAddress && (
										<p className={`text-body-sm leading-relaxed text-white/70 whitespace-pre-line ${config.venueName ? 'mt-2' : ''}`}>
											{config.venueAddress}
										</p>
									)}
									{/* Botões de navegação — URLs cadastradas ou fallback pelo endereço */}
									{(effectiveMapsUrl || effectiveWazeUrl) && (
										<div className="mt-4 flex flex-wrap gap-2">
											{effectiveMapsUrl && (
												<a
													href={effectiveMapsUrl}
													target="_blank"
													rel="noopener noreferrer"
													className="inline-flex items-center gap-1.5 rounded-md border border-[#e4c286]/30 bg-[#e4c286]/10 px-3 py-1.5 text-label-sm uppercase tracking-widest text-[#e4c286] transition-colors hover:bg-[#e4c286]/20"
												>
													<MapPin size={12} /> Ver no Google Maps
												</a>
											)}
											{effectiveWazeUrl && (
												<a
													href={effectiveWazeUrl}
													target="_blank"
													rel="noopener noreferrer"
													className="inline-flex items-center gap-1.5 rounded-md border border-[#e4c286]/30 bg-[#e4c286]/10 px-3 py-1.5 text-label-sm uppercase tracking-widest text-[#e4c286] transition-colors hover:bg-[#e4c286]/20"
												>
													<Navigation size={12} /> Abrir no Waze
												</a>
											)}
										</div>
									)}
								</div>
							) : (
								<p className="text-body-md italic text-white/50">Local a ser confirmado</p>
							)}
						</div>
					</div>
				</div>
			</section>

			{/* ================================================================
				SEÇÃO DE CONVIDADOS AUTORIZADOS — Fundo champanhe/marfim
				Card elegante com destaque numérico para pessoas autorizadas.
			================================================================ */}
			<section className="bg-[#f6ece1] px-gutter py-16 md:py-24">
				<div className="mx-auto max-w-2xl">
					<div className="overflow-hidden rounded-2xl border border-[#17291F]/10 bg-white shadow-[0_4px_30px_rgba(23,41,31,0.06)]">
						{/* Header decorativo */}
						<div className="border-b border-[#17291F]/5 bg-[#17291F]/[0.02] px-8 py-6 text-center">
							<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#17291F]/5">
								<Users size={22} className="text-[#17291F]" />
							</div>
							<h3 className="text-headline-sm text-[#17291F]">Convidados Autorizados</h3>
						</div>

						{/* Lista de convidados */}
						<div className="p-8">
							<ul className="space-y-3">
								{guests.map((guest) => (
									<li
										key={guest.id}
										className="flex items-center gap-3 rounded-xl border border-[#17291F]/5 bg-[#f6ece1]/50 px-5 py-3.5 transition-colors hover:bg-[#f6ece1]"
									>
										<CheckCircle size={18} className="shrink-0 text-[#566250]" />
										<span className="text-body-lg text-[#1f1b14]">
											{guest.fullName}
											{guest.isPrimaryGuest && (
												<span className="ml-2 text-label-sm uppercase tracking-widest text-[#a2854f]">
													Titular
												</span>
											)}
										</span>
									</li>
								))}
							</ul>

							{/* Destaque numérico para acompanhantes */}
							{invitation.maxCompanions > 0 && (
								<div className="mt-6 rounded-xl border border-[#e4c286]/30 bg-[#e4c286]/10 p-5 text-center">
									<p className="text-body-md text-[#1f1b14]">
										Seu convite é válido para até{' '}
										<strong className="text-headline-sm text-[#17291F]">{totalAuthorized}</strong>{' '}
										{totalAuthorized === 1 ? 'pessoa' : 'pessoas'}
									</p>
									<p className="mt-1 text-body-sm text-[#434843]">
										Incluindo {invitation.maxCompanions} acompanhante
										{invitation.maxCompanions > 1 ? 's' : ''}
									</p>
								</div>
							)}

							{invitation.maxCompanions === 0 && (
								<div className="mt-6 rounded-xl border border-[#17291F]/5 bg-[#f6ece1]/30 p-4 text-center">
									<p className="text-body-sm text-[#434843]">Convite individual</p>
								</div>
							)}
						</div>
					</div>
				</div>
			</section>

			{/* ================================================================
				FORMULÁRIO RSVP — Fundo marfim suave com card bem definido
				Não altera lógica, schemas ou envio de dados.
			================================================================ */}
			<section id="confirmar-presenca" className="bg-[#fff8f3] px-gutter py-16 md:py-24">
				<div className="mx-auto max-w-2xl">
					<div className="overflow-hidden rounded-2xl border border-[#17291F]/10 bg-white p-6 shadow-[0_4px_30px_rgba(23,41,31,0.06)] md:p-10">
						{/* Header do formulário */}
						<div className="mb-8 text-center">
							<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#17291F]/5">
								<Heart size={26} className="text-[#17291F]" />
							</div>
							<h2 className="text-headline-md text-[#17291F]">Confirmar Presença</h2>
							<p className="mt-2 text-body-md text-[#434843]">
								Preencha os dados abaixo para confirmar sua presença neste dia tão especial.
							</p>
							{config.rsvpDeadline && (
								<p className="mt-2 text-label-sm uppercase tracking-widest text-[#a2854f]">
									Confirme até{' '}
									{new Date(config.rsvpDeadline).toLocaleDateString('pt-BR', {
										day: 'numeric',
										month: 'long',
										year: 'numeric',
										timeZone: config.timezone,
									})}
								</p>
							)}
						</div>

						{existingRsvp ? (
							/* ESTADO B/C: RSVP já existe — mostrar vista de confirmação/recusa */
							<RsvpConfirmedView
								rsvp={existingRsvp}
								displayName={invitation.displayName}
								eventId={eventId}
								invitationId={invitation.id}
								token={token}
								eventDate={config.eventDate}
								ceremonyTime={config.ceremonyTime}
								timezone={config.timezone || 'America/Sao_Paulo'}
								venueName={config.venueName}
								venueAddress={config.venueAddress}
								mapsUrl={config.mapsUrl}
								wazeUrl={config.wazeUrl}
								dressCode={config.dressCode}
								canEdit={canEditRsvp}
							/>
						) : (
							/* ESTADO A: Sem RSVP — mostrar formulário de confirmação */
							<RsvpForm
								invitationId={invitation.id}
								eventId={eventId}
								displayName={invitation.displayName}
								maxCompanions={invitation.maxCompanions}
								guests={guests}
							/>
						)}
					</div>
				</div>
			</section>

			{/* ================================================================
				ENCERRAMENTO — Retorno ao verde-floresta
				Mensagem espiritual delicada com divisória dourada.
			================================================================ */}
			<section className="bg-[#17291F] px-gutter py-16 text-center md:py-24">
				<div className="mx-auto max-w-lg">
					{/* Ornamento botânico sutil (SVG inline) */}
					<div className="mx-auto mb-6 flex items-center justify-center gap-3 opacity-40">
						<div className="h-px w-12 bg-[#e4c286]" />
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#e4c286]">
							<path
								d="M12 2C12 2 8 6 8 10C8 14 12 16 12 16C12 16 16 14 16 10C16 6 12 2 12 2Z"
								stroke="currentColor"
								strokeWidth="1"
								fill="none"
							/>
							<path d="M12 16V22" stroke="currentColor" strokeWidth="1" />
							<path d="M9 19H15" stroke="currentColor" strokeWidth="1" />
						</svg>
						<div className="h-px w-12 bg-[#e4c286]" />
					</div>

					<p className="text-headline-sm leading-relaxed text-white/90 md:text-headline-md">
						&ldquo;{config.closingMessage}&rdquo;
					</p>
					{config.closingVerseReference && (
						<p className="mt-3 text-label-md uppercase tracking-[0.15em] text-[#e4c286]/70">
							{config.closingVerseReference}
						</p>
					)}

					<div className="mx-auto mt-8 h-px w-16 bg-gradient-to-r from-transparent via-[#e4c286]/40 to-transparent" />

					<p className="mt-6 text-body-sm italic text-white/50">
						{config.closingSignature}
					</p>

					{/* Link para história completa */}
					<a
						href="/nossa-historia"
						className="mt-8 inline-flex items-center gap-2 text-label-md uppercase tracking-widest text-[#e4c286]/70 underline decoration-[#e4c286]/30 underline-offset-4 transition-colors hover:text-[#e4c286] hover:decoration-[#e4c286]/60"
					>
						Conheça nossa história completa
					</a>
				</div>
			</section>
		</main>
	);
}