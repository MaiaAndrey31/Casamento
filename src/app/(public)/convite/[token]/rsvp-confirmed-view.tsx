'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Users, MapPin, Calendar, Clock, Navigation, Heart, Edit3, QrCode } from 'lucide-react';
import type { RSVP, CompanionInfo } from '@/types';
import { QrCodeModal } from './qr-code-modal';

interface RsvpConfirmedViewProps {
	rsvp: RSVP;
	displayName: string;
	eventId: string;
	invitationId: string;
	token: string;
	eventDate: string | null;
	ceremonyTime: string | null;
	timezone: string;
	venueName: string | null;
	venueAddress: string | null;
	mapsUrl: string | null;
	wazeUrl: string | null;
	dressCode: string | null;
	canEdit: boolean;
	onEdit?: () => void;
}

/**
 * Vista de RSVP Confirmado/Recusado — Exibida quando já existe resposta no Firestore.
 *
 * Substitui o formulário de confirmação por uma apresentação elegante do estado atual.
 * Mantém a identidade visual Botanical Heirloom (verde-floresta, champanhe, dourado).
 *
 * PRIVACIDADE: Este componente só é renderizado após validação server-side do token.
 * O endereço completo e dados pessoais NUNCA são expostos sem autorização.
 */
export function RsvpConfirmedView({
	rsvp,
	displayName,
	eventId,
	invitationId,
	token,
	eventDate,
	ceremonyTime,
	timezone,
	venueName,
	venueAddress,
	mapsUrl,
	wazeUrl,
	dressCode,
	canEdit,
	onEdit,
}: RsvpConfirmedViewProps) {
	const [isQrModalOpen, setIsQrModalOpen] = useState(false);
	const isConfirmed = rsvp.attendanceStatus === 'confirmed';
	const confirmedCompanions = rsvp.companions.filter((c: CompanionInfo) => c.name.trim());

	// Links de navegação fallback
	const encodedAddress = venueAddress ? encodeURIComponent(venueAddress) : null;
	const effectiveMapsUrl = mapsUrl || (encodedAddress ? `https://www.google.com/maps/search/?api=1&query=${encodedAddress}` : null);
	const effectiveWazeUrl = wazeUrl || (encodedAddress ? `https://waze.com/ul?q=${encodedAddress}&navigate=yes` : null);

	return (
		<div className="space-y-8">
			{/* Banner de status */}
			<div className={`rounded-2xl border p-8 text-center ${
				isConfirmed
					? 'border-[#566250]/30 bg-[#566250]/10'
					: 'border-[#a2854f]/30 bg-[#a2854f]/10'
			}`}>
				<div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
					isConfirmed ? 'bg-[#566250]/20' : 'bg-[#a2854f]/20'
				}`}>
					{isConfirmed ? (
						<CheckCircle size={32} className="text-[#566250]" />
					) : (
						<XCircle size={32} className="text-[#a2854f]" />
					)}
				</div>

				<h3 className={`text-headline-md ${isConfirmed ? 'text-[#17291F]' : 'text-[#434843]'}`}>
					{isConfirmed ? 'Presença Confirmada!' : 'Resposta Registrada'}
				</h3>

				<p className="mt-3 text-body-lg text-[#434843]">
					{isConfirmed
						? 'Que alegria saber que você estará conosco nesse dia tão especial! Estamos preparando tudo com muito carinho e será uma bênção compartilhar esse momento com você.'
						: 'Recebemos sua resposta. Agradecemos por nos avisar.'}
				</p>
			</div>

			{/* Dados da confirmação */}
			{isConfirmed && (
				<div className="space-y-6">
					{/* Titular e acompanhantes */}
					<div className="rounded-xl border border-[#17291F]/10 bg-[#f6ece1]/50 p-6">
						<div className="mb-4 flex items-center gap-3">
							<Users size={20} className="text-[#17291F]" />
							<h4 className="text-title-md text-[#17291F]">Convidados Confirmados</h4>
						</div>

						<ul className="space-y-2">
							<li className="flex items-center gap-2 text-body-lg text-[#1f1b14]">
								<CheckCircle size={16} className="shrink-0 text-[#566250]" />
								<span>{displayName}</span>
								<span className="text-label-sm uppercase tracking-widest text-[#a2854f]">Titular</span>
							</li>
							{confirmedCompanions.map((companion: CompanionInfo, index: number) => (
								<li key={index} className="flex items-center gap-2 text-body-md text-[#1f1b14]">
									<CheckCircle size={14} className="shrink-0 text-[#566250]/70" />
									<span>{companion.name}</span>
									{companion.isMinor && (
										<span className="text-label-sm text-[#a2854f]/70">(menor)</span>
									)}
								</li>
							))}
						</ul>

						<div className="mt-4 rounded-lg bg-[#e4c286]/10 px-4 py-2 text-center">
							<p className="text-body-sm text-[#1f1b14]">
								Total: <strong>{1 + confirmedCompanions.length}</strong>{' '}
								{1 + confirmedCompanions.length === 1 ? 'pessoa' : 'pessoas'}
							</p>
						</div>
					</div>

					{/* Detalhes do evento */}
					<div className="grid gap-4 md:grid-cols-2">
						{/* Data e horário */}
						{eventDate && (
							<div className="rounded-xl border border-[#17291F]/10 bg-white p-5">
								<div className="mb-2 flex items-center gap-2">
									<Calendar size={18} className="text-[#a2854f]" />
									<h4 className="text-label-md uppercase tracking-widest text-[#434843]">Data</h4>
								</div>
								<p className="text-body-lg text-[#1f1b14]">
									{new Date(eventDate).toLocaleDateString('pt-BR', {
										day: 'numeric',
										month: 'long',
										year: 'numeric',
										timeZone: timezone,
									})}
								</p>
								{ceremonyTime && (
									<div className="mt-1 flex items-center gap-1.5 text-body-sm text-[#434843]">
										<Clock size={14} className="text-[#a2854f]/60" />
										<span>às {ceremonyTime}</span>
									</div>
								)}
							</div>
						)}

						{/* Dress code */}
						{dressCode && (
							<div className="rounded-xl border border-[#17291F]/10 bg-white p-5">
								<div className="mb-2 flex items-center gap-2">
									<Heart size={18} className="text-[#a2854f]" />
									<h4 className="text-label-md uppercase tracking-widest text-[#434843]">Dress Code</h4>
								</div>
								<p className="text-body-md text-[#1f1b14]">{dressCode}</p>
							</div>
						)}
					</div>

					{/* Local e navegação */}
					{(venueName || venueAddress) && (
						<div className="rounded-xl border border-[#17291F]/10 bg-white p-5">
							<div className="mb-3 flex items-center gap-2">
								<MapPin size={18} className="text-[#a2854f]" />
								<h4 className="text-label-md uppercase tracking-widest text-[#434843]">Local da Cerimônia</h4>
							</div>

							{venueName && (
								<p className="text-title-md text-[#17291F]">{venueName}</p>
							)}
							{venueAddress && (
								<p className={`text-body-md whitespace-pre-line text-[#434843] ${venueName ? 'mt-1' : ''}`}>
									{venueAddress}
								</p>
							)}

							{(effectiveMapsUrl || effectiveWazeUrl) && (
								<div className="mt-4 flex flex-wrap gap-2">
									{effectiveMapsUrl && (
										<a
											href={effectiveMapsUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1.5 rounded-md border border-[#17291F]/20 bg-[#17291F]/5 px-4 py-2 text-label-sm uppercase tracking-widest text-[#17291F] transition-colors hover:bg-[#17291F]/10"
										>
											<MapPin size={14} /> Ver no Google Maps
										</a>
									)}
									{effectiveWazeUrl && (
										<a
											href={effectiveWazeUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1.5 rounded-md border border-[#17291F]/20 bg-[#17291F]/5 px-4 py-2 text-label-sm uppercase tracking-widest text-[#17291F] transition-colors hover:bg-[#17291F]/10"
										>
											<Navigation size={14} /> Abrir no Waze
										</a>
									)}
								</div>
							)}
						</div>
					)}
				</div>
			)}

			{/* Mensagem para recusados */}
			{!isConfirmed && (
				<div className="rounded-xl border border-[#a2854f]/20 bg-[#a2854f]/5 p-6 text-center">
					<p className="text-body-md text-[#434843]">
						Sentiremos sua ausência, mas compreendemos. Obrigado por nos avisar.
					</p>
				</div>
			)}

			{/* Botão Visualizar QR Code — apenas para confirmados */}
			{isConfirmed && (
				<div className="text-center">
					<button
						type="button"
						onClick={() => setIsQrModalOpen(true)}
						className="inline-flex items-center gap-3 rounded-xl bg-[#17291F] px-8 py-4 text-label-md uppercase tracking-widest text-[#e4c286] shadow-lg transition-all hover:bg-[#0a1f12] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#e4c286]/50 focus:ring-offset-2"
					>
						<QrCode size={20} />
						Visualizar meu QR Code
					</button>
				</div>
			)}

			{/* Opção de alteração (apenas se permitido) */}
			{canEdit && onEdit && (
				<div className="border-t border-[#17291F]/10 pt-6 text-center">
					<button
						type="button"
						onClick={onEdit}
						className="inline-flex items-center gap-2 text-body-sm text-[#a2854f] underline decoration-[#a2854f]/30 underline-offset-4 transition-colors hover:text-[#17291F] hover:decoration-[#17291F]/40"
					>
						<Edit3 size={14} />
						Precisa alterar sua confirmação?
					</button>
				</div>
			)}

			{/* Modal de QR Code */}
			<QrCodeModal
				isOpen={isQrModalOpen}
				onClose={() => setIsQrModalOpen(false)}
				eventId={eventId}
				invitationId={invitationId}
				token={token}
				displayName={displayName}
			/>
		</div>
	);
}