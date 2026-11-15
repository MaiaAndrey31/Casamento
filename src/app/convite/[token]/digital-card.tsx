'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { CheckCircle, Share2 } from 'lucide-react';
import { WEDDING_CONFIG, getAssetPath } from '@/config/wedding';

interface DigitalCardProps {
	displayName: string;
	attendanceStatus: 'confirmed' | 'declined';
	confirmedGuests: string[];
	/** Token opaco exclusivo para check-in (NÃO é o invitationId) */
	checkInToken: string;
}

/**
 * Cartão Digital — Exibido após confirmação de presença bem-sucedida.
 *
 * Contém:
 * - Nome do convidado/família
 * - Nomes dos noivos
 * - Data e local
 * - QR Code com token opaco criptograficamente seguro (sem dados pessoais)
 * - Mensagem de agradecimento
 * - Botão de compartilhar
 *
 * O QR Code contém `/checkin?t={checkInToken}` onde checkInToken é um token
 * opaco cujo hash está armazenado no Firestore. Nunca expõe invitationId ou dados pessoais.
 */
export function DigitalCard({ displayName, attendanceStatus, confirmedGuests, checkInToken }: DigitalCardProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [qrDataUrl, setQrDataUrl] = useState<string>('');
	const [isGenerating, setIsGenerating] = useState(true);

	// Gerar QR Code client-side com token opaco
	useEffect(() => {
 async function generateQR() {
 try {
 const QRCode = await import('qrcode');
 // URL com token opaco — NÃO contém invitationId nem dados pessoais
 const origin = typeof window !== 'undefined' ? window.location.origin : '';
 const checkInUrl = `${origin}/admin/check-in?t=${encodeURIComponent(checkInToken)}`;
 const dataUrl = await QRCode.toDataURL(checkInUrl, {
 width: 256,
 margin: 2,
 color: {
 dark: '#18251b', // primary-container
 light: '#fff8f3', // surface
 },
 errorCorrectionLevel: 'M',
 });
 setQrDataUrl(dataUrl);
 } catch (e) {
 console.error('[DigitalCard] Falha ao gerar QR Code:', e);
 } finally {
 setIsGenerating(false);
 }
 }

 if (checkInToken) {
 generateQR();
 } else {
 setIsGenerating(false);
 }
	}, [checkInToken]);

	const handleShare = async () => {
 if (navigator.share) {
 try {
 await navigator.share({
 title: `Convite - ${WEDDING_CONFIG.coupleNames}`,
 text: `Confirmei minha presença no casamento de ${WEDDING_CONFIG.coupleNames}!`,
 url: window.location.href,
 });
 } catch {
 // Usuário cancelou o compartilhamento
 }
 } else {
 // Fallback: copiar URL
 await navigator.clipboard.writeText(window.location.href);
 }
	};

	const isConfirmed = attendanceStatus === 'confirmed';

	return (
 <div className="mx-auto max-w-sm animate-in fade-in duration-500">
 {/* Cartão */}
 <div className="overflow-hidden rounded-2xl border border-tertiary-fixed-dim/30 bg-surface-container-lowest shadow-xl">
 {/* Header com foto */}
 <div className="relative h-32 overflow-hidden">
 <Image
 src={getAssetPath('Abraço Romântico ao Pôr do Sol (1).png')}
 alt=""
 fill
 className="object-cover"
 sizes="(max-width: 640px) 100vw, 384px"
 />
 <div className="absolute inset-0 bg-gradient-to-b from-primary/30 to-primary-container/80" />
 <div className="absolute bottom-3 left-0 right-0 text-center">
 <p className="text-label-md uppercase tracking-widest text-tertiary-fixed">
 Passe Digital
 </p>
 </div>
 </div>

 {/* Conteúdo */}
 <div className="space-y-space-md p-space-lg text-center">
 {/* Status badge */}
 <div className={`mx-auto inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-label-md uppercase tracking-widest ${
 isConfirmed
 ? 'bg-secondary-container text-primary-container'
 : 'bg-error-container text-on-error-container'
 }`}>
 {isConfirmed && <CheckCircle size={14} />}
 {isConfirmed ? 'Presença Confirmada' : 'Não Poderei Comparecer'}
 </div>

 {/* Nome do convidado */}
 <div>
 <p className="text-label-sm uppercase tracking-widest text-on-surface-variant">Convidado</p>
 <p className="mt-1 text-headline-sm text-primary">{displayName}</p>
 </div>

 {/* Noivos */}
 <div>
 <p className="text-label-sm uppercase tracking-widest text-on-surface-variant">Casamento</p>
 <p className="mt-1 text-title-md text-primary-container">{WEDDING_CONFIG.coupleNames}</p>
 </div>

 {/* Data e local */}
 <div className="space-y-1">
 {WEDDING_CONFIG.eventDate && (
 <p className="text-body-md text-on-surface">
 {new Date(WEDDING_CONFIG.eventDate).toLocaleDateString('pt-BR', {
 day: 'numeric',
 month: 'long',
 year: 'numeric',
 timeZone: WEDDING_CONFIG.timezone,
 })}
 </p>
 )}
 {WEDDING_CONFIG.venueName && (
 <p className="text-body-sm text-on-surface-variant">{WEDDING_CONFIG.venueName}</p>
 )}
 </div>

 {/* Convidados confirmados */}
 {isConfirmed && confirmedGuests.length > 0 && (
 <div className="rounded-lg bg-surface-container-low p-3">
 <p className="text-label-sm uppercase tracking-widest text-on-surface-variant">Confirmados</p>
 <ul className="mt-1 space-y-0.5">
 {confirmedGuests.filter(Boolean).map((name, i) => (
 <li key={i} className="text-body-sm text-on-surface">{name}</li>
 ))}
 </ul>
 </div>
 )}

 {/* QR Code com token opaco */}
 {isConfirmed && (
 <div className="flex flex-col items-center">
 <p className="mb-2 text-label-sm uppercase tracking-widest text-on-surface-variant">
 Apresente na entrada
 </p>
 {isGenerating ? (
 <div className="flex h-48 w-48 items-center justify-center rounded-xl border border-outline-variant/20 bg-surface-container-low">
 <span className="text-body-sm text-on-surface-variant">Gerando...</span>
 </div>
 ) : qrDataUrl ? (
 /* eslint-disable-next-line @next/next/no-img-element */
 <img
 src={qrDataUrl}
 alt="QR Code de check-in"
 width={200}
 height={200}
 className="rounded-xl border border-outline-variant/20"
 />
 ) : (
 <div className="flex h-48 w-48 items-center justify-center rounded-xl border border-outline-variant/20 bg-surface-container-low">
 <span className="text-body-sm text-error">QR indisponível</span>
 </div>
 )}
 </div>
 )}

 {/* Mensagem de agradecimento */}
 <div className="border-t border-outline-variant/10 pt-space-md">
 <p className="text-body-sm italic text-on-surface-variant">
 {isConfirmed
 ? 'Estamos ansiosos para celebrar este momento especial com você!'
 : 'Sentiremos sua falta. Agradecemos por nos avisar.'}
 </p>
 <p className="mt-2 text-label-md uppercase tracking-widest text-tertiary-fixed-dim">
 {WEDDING_CONFIG.closingSignature}
 </p>
 </div>
 </div>
 </div>

 {/* Ações */}
 <div className="mt-space-md flex gap-3">
 <button
 onClick={handleShare}
 className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 text-label-md uppercase tracking-widest text-primary transition-colors hover:bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-tertiary-fixed-dim"
 >
 <Share2 size={16} /> Compartilhar
 </button>
 </div>

 {/* Canvas oculto para geração server-side se necessário */}
 <canvas ref={canvasRef} className="hidden" />
 </div>
	);
}