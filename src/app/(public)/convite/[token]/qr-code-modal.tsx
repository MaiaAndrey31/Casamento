'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Download, Share2, QrCode, Loader2, AlertCircle } from 'lucide-react';
import { getCheckInTokenAction } from '@/app/actions/get-checkin-token.action';

interface QrCodeModalProps {
	isOpen: boolean;
	onClose: () => void;
	eventId: string;
	invitationId: string;
	token: string;
	displayName: string;
}

/**
 * Modal de QR Code — Acesso permanente ao código de check-in.
 *
 * Recupera o checkInTokenPlain via Server Action (validação server-side),
 * gera o QR Code client-side com a mesma lógica do DigitalCard,
 * e oferece download PNG + compartilhamento nativo.
 *
 * SEGURANÇA: O token só é retornado se o convite for válido, ativo e
 * tiver RSVP confirmado. Nenhum dado sensível é exposto no cliente.
 */
export function QrCodeModal({ isOpen, onClose, eventId, invitationId, token, displayName }: QrCodeModalProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [qrDataUrl, setQrDataUrl] = useState('');
	const [modalData, setModalData] = useState<{
		displayName: string;
		eventDate: string | null;
		ceremonyTime: string | null;
		timezone: string;
		companions: Array<{ name: string; isMinor: boolean }>;
	} | null>(null);

	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		if (!isOpen) {
			setQrDataUrl('');
			setError('');
			setModalData(null);
			return;
		}

		async function fetchAndGenerate() {
			setLoading(true);
			setError('');

			try {
				const result = await getCheckInTokenAction(eventId, invitationId, token);

				if (!result.success || !result.data) {
					setError(result.error || 'Não foi possível carregar o QR Code.');
					setLoading(false);
					return;
				}

				setModalData({
					displayName: result.data.displayName,
					eventDate: result.data.eventDate,
					ceremonyTime: result.data.ceremonyTime,
					timezone: result.data.timezone,
					companions: result.data.companions,
				});

				// Gerar QR Code com a mesma URL do check-in
				const QRCode = await import('qrcode');
				const origin = typeof window !== 'undefined' ? window.location.origin : '';
				const checkInUrl = `${origin}/admin/check-in?t=${encodeURIComponent(result.data.checkInToken)}`;
				const dataUrl = await QRCode.toDataURL(checkInUrl, {
					width: 300,
					margin: 2,
					color: {
						dark: '#18251b',
						light: '#ffffff',
					},
					errorCorrectionLevel: 'H',
				});
				setQrDataUrl(dataUrl);
			} catch (e) {
				console.error('[QrCodeModal] Erro:', e);
				setError('Erro inesperado ao gerar QR Code.');
			} finally {
				setLoading(false);
			}
		}

		fetchAndGenerate();
	}, [isOpen, eventId, invitationId, token]);

	async function handleDownload() {
		if (!qrDataUrl) return;
		try {
			const link = document.createElement('a');
			link.download = `QR-Code-${displayName.replace(/\s+/g, '-')}.png`;
			link.href = qrDataUrl;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} catch (e) {
			console.error('[QrCodeModal] Falha no download:', e);
		}
	}

	async function handleShare() {
		if (navigator.share && qrDataUrl) {
			try {
				const response = await fetch(qrDataUrl);
				const blob = await response.blob();
				const file = new File([blob], `QR-Code-${displayName}.png`, { type: 'image/png' });
				await navigator.share({
					title: 'Meu QR Code - Casamento',
					text: 'Guarde este QR Code para apresentar na entrada do casamento!',
					files: [file],
				});
			} catch {
				// Usuário cancelou ou API não suporta arquivos
				await navigator.clipboard.writeText(window.location.href).catch(() => {});
			}
		} else {
			await navigator.clipboard.writeText(window.location.href).catch(() => {});
		}
	}

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-[#0a1f12]/80 backdrop-blur-sm transition-opacity"
				onClick={onClose}
			/>

			{/* Modal */}
			<div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
				<div className="overflow-hidden rounded-2xl border border-[#e4c286]/30 bg-[#fff8f3] shadow-2xl">
					{/* Header */}
					<div className="flex items-center justify-between border-b border-[#17291F]/10 bg-[#17291F] px-6 py-4">
						<div className="flex items-center gap-2">
							<QrCode size={20} className="text-[#e4c286]" />
							<h3 className="text-title-md text-white">Seu acesso ao nosso grande dia</h3>
						</div>
						<button
							onClick={onClose}
							className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
							aria-label="Fechar"
						>
							<X size={20} />
						</button>
					</div>

					{/* Conteúdo */}
					<div className="p-6 text-center">
						{loading && (
							<div className="flex flex-col items-center gap-4 py-8">
								<Loader2 size={40} className="animate-spin text-[#17291F]" />
								<p className="text-body-md text-[#434843]">Carregando seu QR Code...</p>
							</div>
						)}

						{error && (
							<div className="flex flex-col items-center gap-4 py-8">
								<AlertCircle size={40} className="text-error" />
								<p className="text-body-md text-error">{error}</p>
								<button
									onClick={onClose}
									className="mt-2 rounded-md border border-[#17291F]/20 px-4 py-2 text-label-sm uppercase tracking-widest text-[#17291F] hover:bg-[#17291F]/5"
								>
									Fechar
								</button>
							</div>
						)}

						{!loading && !error && qrDataUrl && modalData && (
							<div className="space-y-5">
								<p className="text-body-md text-[#434843]">
									Guarde este QR Code para apresentar na entrada. Estamos muito felizes em ter você conosco!
								</p>

								{/* QR Code */}
								<div className="mx-auto inline-block rounded-xl border-2 border-[#e4c286]/30 bg-white p-3 shadow-sm">
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img
										src={qrDataUrl}
										alt="QR Code de check-in"
										width={240}
										height={240}
										className="block"
									/>
								</div>

								{/* Nome do titular */}
								<div>
									<p className="text-label-sm uppercase tracking-widest text-[#a2854f]">Convidado</p>
									<p className="text-headline-sm text-[#17291F]">{modalData.displayName}</p>
								</div>

								{/* Acompanhantes confirmados */}
								{modalData.companions.length > 0 && (
									<div className="rounded-lg bg-[#f6ece1]/60 p-3">
										<p className="text-label-sm uppercase tracking-widest text-[#a2854f]">Acompanhantes Confirmados</p>
										<ul className="mt-1 space-y-0.5">
											{modalData.companions.map((c, i) => (
												<li key={i} className="text-body-sm text-[#1f1b14]">
													{c.name}{c.isMinor && ' (menor)'}
												</li>
											))}
										</ul>
									</div>
								)}

								{/* Data */}
								{modalData.eventDate && (
									<div>
										<p className="text-label-sm uppercase tracking-widest text-[#a2854f]">Data</p>
										<p className="text-body-md text-[#1f1b14]">
											{new Date(modalData.eventDate).toLocaleDateString('pt-BR', {
												day: 'numeric',
												month: 'long',
												year: 'numeric',
												timeZone: modalData.timezone,
											})}
											{modalData.ceremonyTime && ` às ${modalData.ceremonyTime}`}
										</p>
									</div>
								)}

								<p className="text-body-sm italic text-[#434843]/70">
									Apresente este código na entrada do evento.
								</p>

								{/* Botões de ação */}
								<div className="flex gap-3 pt-2">
									<button
										onClick={handleDownload}
										className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#17291F] px-4 py-3 text-label-md uppercase tracking-widest text-[#e4c286] shadow-md transition-all hover:bg-[#0a1f12] hover:shadow-lg"
									>
										<Download size={16} /> Baixar
									</button>
									<button
										onClick={handleShare}
										className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#17291F]/20 bg-white px-4 py-3 text-label-md uppercase tracking-widest text-[#17291F] transition-all hover:bg-[#f6ece1]"
									>
										<Share2 size={16} /> Compartilhar
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Canvas oculto para uso futuro se necessário */}
			<canvas ref={canvasRef} className="hidden" />
		</div>
	);
}