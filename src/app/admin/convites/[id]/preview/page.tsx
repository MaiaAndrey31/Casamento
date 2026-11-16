import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Heart, Calendar, Clock, MapPin, Users } from 'lucide-react';
import { getAdminSession } from '@/lib/auth/admin-session';

/**
 * Prévia Administrativa do Convite — /admin/convites/[id]/preview
 *
 * Exibe os dados do convite sem exigir token original.
 * Rota protegida por sessão administrativa. Não expõe dados publicamente.
 */
export default async function AdminInvitationPreviewPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const session = await getAdminSession();
	if (!session) {
		redirect('/admin/login');
	}

	const { id } = await params;
	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

	let invitation: Record<string, unknown> | null = null;
	let guests: Array<{ fullName: string; isPrimaryGuest: boolean }> = [];

	try {
		const { adminDb } = await import('@/lib/firebase/admin');

		const invDoc = await adminDb
			.collection('events')
			.doc(eventId)
			.collection('invitations')
			.doc(id)
			.get();

		if (invDoc.exists) {
			invitation = { id: invDoc.id, ...invDoc.data() } as Record<string, unknown>;

			// Buscar convidados vinculados
			const guestsSnapshot = await adminDb
				.collection('events')
				.doc(eventId)
				.collection('guests')
				.where('invitationId', '==', id)
				.where('active', '==', true)
				.get();

			guests = guestsSnapshot.docs.map(doc => ({
				fullName: doc.data().fullName,
				isPrimaryGuest: doc.data().isPrimaryGuest ?? false,
			}));
		}
	} catch (e) {
		console.error('[InvitationPreview] Falha ao carregar convite:', e);
	}

	if (!invitation) {
		return (
			<div className="space-y-space-xl">
				<div className="flex items-center gap-4">
					<Link
						href="/admin/convidados"
						className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant/20 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
					>
						<ArrowLeft size={20} />
					</Link>
					<h1 className="text-headline-lg-mobile text-primary md:text-headline-lg">
						Convite não encontrado
					</h1>
				</div>
				<div className="rounded-xl border border-dashed border-outline-variant/30 bg-surface-container-low p-space-xl text-center">
					<p className="text-body-lg text-on-surface-variant">
						O convite solicitado não existe ou foi removido.
					</p>
					<Link
						href="/admin/convidados"
						className="mt-space-md inline-block text-label-md uppercase tracking-widest text-primary underline decoration-tertiary-fixed-dim underline-offset-4 hover:text-secondary"
					>
						Voltar para listagem
					</Link>
				</div>
			</div>
		);
	}

	const statusLabels: Record<string, string> = {
		active: 'Ativo',
		revoked: 'Revogado',
		expired: 'Expirado',
	};

	return (
		<div className="space-y-space-xl">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Link
					href="/admin/convidados"
					className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant/20 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
				>
					<ArrowLeft size={20} />
				</Link>
				<div>
					<h1 className="text-headline-lg-mobile text-primary md:text-headline-lg">
						Prévia do Convite
					</h1>
					<p className="mt-space-xs text-body-md text-on-surface-variant">
						Visualização administrativa — {String(invitation.displayName)}
					</p>
				</div>
			</div>

			{/* Card de prévia estilizado como convite */}
			<div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-tertiary-fixed-dim/30 bg-surface-container-lowest shadow-xl">
				{/* Banner decorativo */}
				<div className="bg-gradient-to-br from-[#17291F] to-[#2d4a3a] px-8 py-12 text-center">
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
						<Heart size={32} className="text-[#D4AF37]" />
					</div>
					<h2 className="font-serif text-3xl text-white md:text-4xl">
						Andrey & Amanda
					</h2>
					<p className="mt-3 text-sm uppercase tracking-[0.25em] text-[#D4AF37]/90">
						Vão se casar
					</p>
				</div>

				{/* Conteúdo do convite */}
				<div className="space-y-8 p-8">
					{/* Destinatário */}
					<div className="text-center">
						<p className="text-body-md italic text-on-surface-variant">Convidamos você e sua família</p>
						<h3 className="mt-2 font-serif text-2xl text-primary md:text-3xl">
							{String(invitation.displayName)}
						</h3>
					</div>

					<div className="mx-auto h-px w-24 bg-tertiary-fixed-dim/30" />

					{/* Detalhes do evento */}
					<div className="grid gap-6 sm:grid-cols-2">
						<div className="flex items-start gap-3">
							<Calendar size={20} className="mt-1 shrink-0 text-tertiary-fixed-dim" />
							<div>
								<p className="text-label-md uppercase tracking-widest text-on-surface-variant">Data</p>
								<p className="text-title-md text-primary">12 de Dezembro de 2026</p>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<Clock size={20} className="mt-1 shrink-0 text-tertiary-fixed-dim" />
							<div>
								<p className="text-label-md uppercase tracking-widest text-on-surface-variant">Horário</p>
								<p className="text-title-md text-primary">19h</p>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<MapPin size={20} className="mt-1 shrink-0 text-tertiary-fixed-dim" />
							<div>
								<p className="text-label-md uppercase tracking-widest text-on-surface-variant">Local</p>
								<p className="text-title-md text-primary">A confirmar</p>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<Users size={20} className="mt-1 shrink-0 text-tertiary-fixed-dim" />
							<div>
								<p className="text-label-md uppercase tracking-widest text-on-surface-variant">Pessoas autorizadas</p>
								<p className="text-title-md text-primary">{(Number(invitation.maxCompanions) || 0) + guests.length}</p>
							</div>
						</div>
					</div>

					<div className="mx-auto h-px w-24 bg-tertiary-fixed-dim/30" />

					{/* Lista de convidados vinculados */}
					<div>
						<p className="mb-3 text-center text-label-md uppercase tracking-widest text-on-surface-variant">
							Convidados neste convite
						</p>
						<ul className="space-y-1 text-center">
							{guests.map((g, i) => (
								<li key={i} className="text-body-lg text-primary">
									{g.fullName}
									{g.isPrimaryGuest && <span className="ml-2 text-xs text-tertiary-fixed-dim">(Titular)</span>}
								</li>
							))}
						</ul>
					</div>

					{/* Versículo */}
					<div className="text-center">
						<p className="italic text-on-surface-variant">
							&ldquo;E, sobre tudo isto, revesti-vos de amor, que é o vínculo da perfeição.&rdquo;
						</p>
						<p className="mt-1 text-label-sm uppercase tracking-widest text-tertiary-fixed-dim/80">
							Colossenses 3:14
						</p>
					</div>
				</div>
			</div>

			{/* Informações administrativas */}
			<div className="mx-auto max-w-2xl rounded-xl border border-outline-variant/20 bg-surface-container-low p-6">
				<h3 className="mb-4 text-headline-sm text-primary">Informações Administrativas</h3>
				<dl className="grid gap-3 sm:grid-cols-2">
					<div>
						<dt className="text-label-sm uppercase tracking-widest text-on-surface-variant">Status</dt>
						<dd className={`mt-1 text-body-md font-medium ${
							String(invitation.invitationStatus) === 'active' ? 'text-green-700' : 'text-error'
						}`}>
							{statusLabels[String(invitation.invitationStatus)] || String(invitation.invitationStatus)}
						</dd>
					</div>
					<div>
						<dt className="text-label-sm uppercase tracking-widest text-on-surface-variant">Categoria</dt>
						<dd className="mt-1 capitalize text-body-md text-on-surface">
							{String(invitation.category || '').replace('_', ' ')}
						</dd>
					</div>
					<div>
						<dt className="text-label-sm uppercase tracking-widest text-on-surface-variant">ID do Convite</dt>
						<dd className="mt-1 truncate text-body-sm font-mono text-on-surface-variant">{String(invitation.id)}</dd>
					</div>
					<div>
						<dt className="text-label-sm uppercase tracking-widest text-on-surface-variant">Token disponível</dt>
						<dd className="mt-1 text-body-sm text-error">
							Não — apenas o hash é armazenado
						</dd>
					</div>
				</dl>
			</div>
		</div>
	);
}