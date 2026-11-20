import { redirect } from 'next/navigation';
import { CheckCircle, XCircle, Clock, Users, UtensilsCrossed, Music, MessageSquareHeart } from 'lucide-react';
import { getAdminSession } from '@/lib/auth/admin-session';
import type { RSVP, CompanionInfo } from '@/types';
import { serializeFirestoreValue } from '@/lib/server/firestore-serializer';
import { formatDateTime } from '@/lib/utils/format-date';

/**
 * Gestão de Confirmações — /admin/confirmacoes
 *
 * Lista completa de RSVPs com status, acompanhantes, restrições e mensagens.
 * Requer sessão administrativa válida.
 */
export default async function AdminConfirmacoesPage() {
	const session = await getAdminSession();
	if (!session) {
		redirect('/admin/login');
	}

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

	// Buscar todos os RSVPs
	let rsvps: Array<RSVP & { invitationDisplayName?: string }> = [];
	try {
		const { adminDb } = await import('@/lib/firebase/admin');
		const snapshot = await adminDb
			.collection('events')
			.doc(eventId)
			.collection('rsvps')
			.orderBy('submittedAt', 'desc')
			.get();

		rsvps = snapshot.docs.map(doc => ({
			id: doc.id,
			...(serializeFirestoreValue(doc.data(), `rsvp.${doc.id}`) as Record<string, unknown>),
		})) as typeof rsvps;

		// Enriquecer com nome do convite
		const invitationIds = [...new Set(rsvps.map(r => r.invitationId).filter(Boolean))];
		const invitationMap = new Map<string, string>();

		await Promise.all(
			invitationIds.map(async (invId) => {
				try {
					const invDoc = await adminDb
						.collection('events')
						.doc(eventId)
						.collection('invitations')
						.doc(invId)
						.get();
					if (invDoc.exists) {
						invitationMap.set(invId, invDoc.data()?.displayName);
					}
				} catch { /* ignorar */ }
			})
		);

		rsvps = rsvps.map(r => ({
			...r,
			invitationDisplayName: invitationMap.get(r.invitationId),
		}));
	} catch (e) {
		console.error('[Confirmacoes] Falha ao carregar RSVPs:', e);
	}

	const confirmed = rsvps.filter(r => r.attendanceStatus === 'confirmed');
	const declined = rsvps.filter(r => r.attendanceStatus === 'declined');

	return (
		<div className="space-y-space-xl">
			{/* Header */}
			<div>
				<h1 className="text-headline-lg-mobile text-primary md:text-headline-lg">
					Confirmações
				</h1>
				<p className="mt-space-xs text-body-md text-on-surface-variant">
					{rsvps.length} resposta{rsvps.length !== 1 ? 's' : ''} recebida{rsvps.length !== 1 ? 's' : ''}
				</p>
			</div>

			{/* Resumo */}
			<div className="grid gap-space-md sm:grid-cols-3">
				<div className="rounded-xl border border-green-200 bg-green-50 p-space-md text-center">
					<CheckCircle size={24} className="mx-auto mb-2 text-green-700" />
					<p className="text-display-hero-mobile font-light tabular-nums text-green-800">{confirmed.length}</p>
					<p className="text-label-sm uppercase tracking-widest text-green-700">Confirmados</p>
				</div>
				<div className="rounded-xl border border-error/20 bg-error-container/10 p-space-md text-center">
					<XCircle size={24} className="mx-auto mb-2 text-error" />
					<p className="text-display-hero-mobile font-light tabular-nums text-error">{declined.length}</p>
					<p className="text-label-sm uppercase tracking-widest text-error">Recusados</p>
				</div>
				<div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-space-md text-center">
					<Users size={24} className="mx-auto mb-2 text-primary-container" />
					<p className="text-display-hero-mobile font-light tabular-nums text-primary-container">
						{confirmed.reduce((acc, r) => acc + 1 + (r.companions?.length || 0), 0)}
					</p>
					<p className="text-label-sm uppercase tracking-widest text-on-surface-variant">Pessoas Confirmadas</p>
				</div>
			</div>

			{/* Lista de RSVPs */}
			{rsvps.length === 0 ? (
				<div className="rounded-xl border border-dashed border-outline-variant/30 bg-surface-container-low p-space-xl text-center">
					<Clock size={48} className="mx-auto mb-space-md text-on-surface-variant/30" />
					<p className="text-body-lg text-on-surface-variant">
						Nenhuma confirmação recebida ainda.
					</p>
				</div>
			) : (
				<div className="space-y-space-md">
					{rsvps.map((rsvp) => (
						<RSVPCard key={rsvp.id} rsvp={rsvp} />
					))}
				</div>
			)}
		</div>
	);
}

function RSVPCard({ rsvp }: { rsvp: RSVP & { invitationDisplayName?: string } }) {
	const isConfirmed = rsvp.attendanceStatus === 'confirmed';

	return (
		<div className={`rounded-xl border bg-surface-container-lowest p-space-md shadow-sm ${
			isConfirmed ? 'border-green-200' : 'border-error/20'
		}`}>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<h3 className="truncate text-title-md text-primary">
							{rsvp.invitationDisplayName || rsvp.invitationId}
						</h3>
						<span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
							isConfirmed
								? 'bg-green-100 text-green-800'
								: 'bg-error-container/30 text-error'
						}`}>
							{isConfirmed ? 'Confirmado' : 'Recusado'}
						</span>
					</div>

					{isConfirmed && (
						<div className="mt-space-sm space-y-2">
							{/* Acompanhantes */}
							{rsvp.companions && rsvp.companions.length > 0 && (
								<div className="flex items-start gap-2 text-body-sm text-on-surface-variant">
									<Users size={14} className="mt-0.5 shrink-0" />
									<div>
										<span className="font-medium text-on-surface">Acompanhantes:</span>{' '}
										{rsvp.companions.map((c: CompanionInfo) => c.name).join(', ')}
									</div>
								</div>
							)}

							{/* Restrições alimentares */}
							{rsvp.dietaryRestrictions && rsvp.dietaryRestrictions.length > 0 && (
								<div className="flex items-start gap-2 text-body-sm text-on-surface-variant">
									<UtensilsCrossed size={14} className="mt-0.5 shrink-0" />
									<div>
										<span className="font-medium text-on-surface">Restrições:</span>{' '}
										{rsvp.dietaryRestrictions.join(', ')}
									</div>
								</div>
							)}

							{/* Sugestão musical */}
							{rsvp.songSuggestion && (
								<div className="flex items-start gap-2 text-body-sm text-on-surface-variant">
									<Music size={14} className="mt-0.5 shrink-0" />
									<div>
										<span className="font-medium text-on-surface">Música:</span>{' '}
										{rsvp.songSuggestion}
									</div>
								</div>
							)}

							{/* Mensagem pessoal */}
							{rsvp.personalMessage && (
								<div className="flex items-start gap-2 text-body-sm text-on-surface-variant">
									<MessageSquareHeart size={14} className="mt-0.5 shrink-0" />
									<p className="italic">&ldquo;{rsvp.personalMessage}&rdquo;</p>
								</div>
							)}
						</div>
					)}
				</div>

				{/* Data */}
				<span className="shrink-0 text-body-sm text-on-surface-variant">
					{formatDateTime(rsvp.submittedAt)}
				</span>
			</div>
		</div>
	);
}