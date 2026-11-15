import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Heart, Calendar, MapPin, Users, CheckCircle } from 'lucide-react';
import { validateInvitation, type InvitationViewData } from '@/app/actions/validate-invitation.action';
import { WEDDING_CONFIG, getAssetPath } from '@/config/wedding';
import { RsvpForm } from './rsvp-form';

/**
 * Página de Convite Personalizado — /convite/[token]
 *
 * Valida o token no servidor e exibe convite personalizado com:
 * - Saudação com nome do convidado/família
 * - Informações do casamento
 * - Lista de convidados autorizados
 * - Formulário RSVP conectado ao backend
 *
 * Design fiel ao Google Stitch. Sem dados pessoais desnecessários.
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

	return (
 <main className="min-h-screen bg-surface pb-20">
 {/* Hero do convite personalizado */}
 <section className="relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden px-gutter text-center">
 {/* Background */}
 <div className="absolute inset-0 z-0">
 <Image
 src={getAssetPath('Casal Feliz no Jardim Dourado.png')}
 alt="Andrey e Amanda"
 fill
 priority
 className="object-cover object-center"
 sizes="100vw"
 />
 <div className="absolute inset-0 bg-gradient-to-b from-primary/50 via-primary/30 to-surface" />
 </div>

 {/* Conteúdo */}
 <div className="relative z-10 max-w-lg pt-safe">
 {/* Monograma */}
 <div className="mx-auto mb-space-md flex h-20 w-20 items-center justify-center rounded-full border border-tertiary-fixed-dim/30 bg-surface-container-lowest/80 backdrop-blur-sm shadow-lg">
 <span className="text-headline-md text-primary-container">
 {WEDDING_CONFIG.monogram}
 </span>
 </div>

 {/* Nomes */}
 <h1 className="mb-space-sm text-display-hero-mobile text-surface-container-lowest drop-shadow-lg md:text-display-hero">
 {WEDDING_CONFIG.coupleNames}
 </h1>

 {/* Saudação personalizada */}
 <p className="text-body-lg italic text-surface-container-low drop-shadow-md">
 Com muito carinho, convidamos <strong className="not-italic text-tertiary-fixed">{invitation.displayName}</strong> para celebrar conosco este momento tão especial.
 </p>

 {/* Mensagem cristã */}
 <p className="mt-space-md text-body-md text-surface-container-low/90">
 &ldquo;{WEDDING_CONFIG.heroMessage}&rdquo;
 </p>
 </div>
 </section>

 {/* Informações do evento */}
 <section className="mx-auto max-w-2xl px-gutter py-space-xl">
 <div className="grid gap-space-md md:grid-cols-2">
 {/* Data */}
 <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-space-lg shadow-sm">
 <div className="mb-space-sm flex items-center gap-3">
 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container/50">
 <Calendar size={20} className="text-primary-container" />
 </div>
 <h3 className="text-headline-sm text-primary">Data</h3>
 </div>
 {WEDDING_CONFIG.eventDate ? (
 <p className="text-body-lg text-on-surface">
 {new Date(WEDDING_CONFIG.eventDate).toLocaleDateString('pt-BR', {
 weekday: 'long',
 day: 'numeric',
 month: 'long',
 year: 'numeric',
 timeZone: WEDDING_CONFIG.timezone,
 })}
 </p>
 ) : (
 <p className="text-body-md italic text-on-surface-variant">Data a ser confirmada</p>
 )}
 </div>

 {/* Local */}
 <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-space-lg shadow-sm">
 <div className="mb-space-sm flex items-center gap-3">
 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container/50">
 <MapPin size={20} className="text-primary-container" />
 </div>
 <h3 className="text-headline-sm text-primary">Local</h3>
 </div>
 {WEDDING_CONFIG.venueName ? (
 <div>
 <p className="text-body-lg font-medium text-primary-container">{WEDDING_CONFIG.venueName}</p>
 {WEDDING_CONFIG.venueAddress && (
 <p className="mt-1 text-body-sm text-on-surface-variant">{WEDDING_CONFIG.venueAddress}</p>
 )}
 </div>
 ) : (
 <p className="text-body-md italic text-on-surface-variant">Local a ser confirmado</p>
 )}
 </div>
 </div>
 </section>

 {/* Convidados autorizados */}
 <section className="mx-auto max-w-2xl px-gutter pb-space-xl">
 <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-space-lg shadow-sm">
 <div className="mb-space-md flex items-center gap-3">
 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container/50">
 <Users size={20} className="text-primary-container" />
 </div>
 <h3 className="text-headline-sm text-primary">Convidados Autorizados</h3>
 </div>

 <ul className="space-y-space-sm">
 {guests.map((guest) => (
 <li key={guest.id} className="flex items-center gap-3 rounded-lg bg-surface-container-lowest px-4 py-3">
 <CheckCircle size={18} className="shrink-0 text-secondary" />
 <span className="text-body-md text-on-surface">
 {guest.fullName}
 {guest.isPrimaryGuest && (
 <span className="ml-2 text-label-sm uppercase tracking-widest text-tertiary-fixed-dim">
 (Titular)
 </span>
 )}
 </span>
 </li>
 ))}
 </ul>

 {invitation.maxCompanions > 0 && (
 <p className="mt-space-md text-body-sm text-on-surface-variant">
 + até {invitation.maxCompanions} acompanhante{invitation.maxCompanions > 1 ? 's' : ''}
 </p>
 )}
 </div>
 </section>

 {/* Formulário RSVP */}
 <section id="confirmar-presenca" className="mx-auto max-w-2xl px-gutter pb-space-2xl">
 <div className="rounded-xl border border-tertiary-fixed-dim/20 bg-surface-container-lowest p-space-lg shadow-md md:p-space-xl">
 <div className="mb-space-lg text-center">
 <Heart size={32} className="mx-auto mb-space-sm text-primary-container" />
 <h2 className="text-headline-md text-primary">Confirmar Presença</h2>
 <p className="mt-space-xs text-body-md text-on-surface-variant">
 Preencha os dados abaixo para confirmar sua presença neste dia tão especial.
 </p>
 </div>

 <RsvpForm
 invitationId={invitation.id}
 eventId={eventId}
 displayName={invitation.displayName}
 maxCompanions={invitation.maxCompanions}
 guests={guests}
 />
 </div>
 </section>

 {/* Link para história completa */}
 <section className="mx-auto max-w-2xl px-gutter pb-space-2xl text-center">
 <a
 href="/#nossa-historia"
 className="inline-flex items-center gap-2 text-label-md uppercase tracking-widest text-primary underline decoration-tertiary-fixed-dim underline-offset-4 transition-colors hover:text-secondary"
 >
 Conheça nossa história completa
 </a>
 </section>
 </main>
	);
}