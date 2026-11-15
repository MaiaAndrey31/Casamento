import { notFound } from 'next/navigation';
import Image from 'next/image';
import { CheckCircle, XCircle } from 'lucide-react';
import { validateInvitation } from '@/app/actions/validate-invitation.action';
import { WEDDING_CONFIG, getAssetPath } from '@/config/wedding';
import type { RSVP } from '@/types';

/**
 * Página de Recuperação do Cartão Digital — /confirmacao/[token]
 *
 * Permite que o convidado recupere seu cartão digital usando o token de acesso
 * ao convite (mesmo token da URL /convite/[token]).
 *
 * IMPORTANTE: O checkInToken NÃO pode ser recuperado (hash é unidirecional).
 * Esta página exibe o cartão digital SEM o QR Code se o convidado perdeu o token original.
 * Para obter um novo QR Code, o admin deve regenerar via painel administrativo.
 */

interface PageProps {
	params: Promise<{ token: string }>;
}

export default async function ConfirmationPage({ params }: PageProps) {
	const { token } = await params;
	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

	// Validar token de acesso ao convite
	const result = await validateInvitation(eventId, token);

	if (!result.success || !result.data) {
		notFound();
	}

	const { invitation } = result.data;

	// Buscar RSVP existente para este convite
	let rsvp: RSVP | null = null;
	try {
		const { adminDb } = await import('@/lib/firebase/admin');
		const doc = await adminDb
			.collection('events')
			.doc(eventId)
			.collection('rsvps')
			.doc(invitation.id)
			.get();

		if (doc.exists) {
			rsvp = { id: doc.id, ...doc.data() } as RSVP;
		}
	} catch {
		// Se Admin SDK não estiver configurado, tentar Client SDK
		try {
			const { db } = await import('@/lib/firebase/client');
			const { doc, getDoc } = await import('firebase/firestore');
			const docRef = doc(db, 'events', eventId, 'rsvps', invitation.id);
			const snapshot = await getDoc(docRef);
			if (snapshot.exists()) {
				rsvp = { id: snapshot.id, ...snapshot.data() } as RSVP;
			}
		} catch {
			// Ignorar — exibir estado sem RSVP
		}
	}

	if (!rsvp) {
		return (
			<main className="flex min-h-screen flex-col items-center justify-center bg-surface px-gutter text-center">
				<div className="max-w-md space-y-space-lg">
					<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high">
						<XCircle size={32} className="text-on-surface-variant" />
					</div>
					<h1 className="text-headline-md text-primary">Confirmação Não Encontrada</h1>
					<p className="text-body-lg text-on-surface-variant">
						Não encontramos uma confirmação de presença para <strong>{invitation.displayName}</strong>.
					</p>
					<a
						href={`/convite/${token}`}
						className="inline-flex items-center gap-2 rounded-md bg-primary-container px-6 py-3 text-label-md uppercase tracking-widest text-tertiary-fixed shadow-md transition-all hover:bg-secondary"
					>
						Voltar ao Convite
					</a>
				</div>
			</main>
		);
	}

	const isConfirmed = rsvp.attendanceStatus === 'confirmed';
	const confirmedNames = [
		...(rsvp.confirmedGuestIds?.length ? [] : [invitation.displayName]),
		...(rsvp.companions?.map(c => c.name) || []),
	].filter(Boolean);

	return (
		<main className="min-h-screen bg-surface py-space-2xl px-gutter">
			<div className="mx-auto max-w-sm">
				{/* Aviso sobre QR Code */}
				{isConfirmed && (
					<div className="mb-space-lg rounded-lg border border-tertiary-fixed-dim/30 bg-tertiary-fixed/10 p-4 text-center">
						<p className="text-body-sm text-on-surface-variant">
							<strong>Nota:</strong> Este é seu cartão digital de confirmação.
							O QR Code original foi exibido apenas no momento da confirmação por questões de segurança.
							Caso precise de um novo QR Code para o dia do evento, entre em contato com os noivos.
						</p>
					</div>
				)}

				{/* Cartão Digital (sem QR Code na recuperação) */}
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
							<p className="mt-1 text-headline-sm text-primary">{invitation.displayName}</p>
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
						{isConfirmed && confirmedNames.length > 0 && (
							<div className="rounded-lg bg-surface-container-low p-3">
								<p className="text-label-sm uppercase tracking-widest text-on-surface-variant">Confirmados</p>
								<ul className="mt-1 space-y-0.5">
									{confirmedNames.map((name, i) => (
										<li key={i} className="text-body-sm text-on-surface">{name}</li>
									))}
								</ul>
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

				{/* Link para voltar ao convite */}
				<div className="mt-space-lg text-center">
					<a
						href={`/convite/${token}`}
						className="text-label-md uppercase tracking-widest text-primary underline decoration-tertiary-fixed-dim underline-offset-4 transition-colors hover:text-secondary"
					>
						Voltar ao convite
					</a>
				</div>
			</div>
		</main>
	);
}