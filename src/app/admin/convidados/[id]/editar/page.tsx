import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getAdminSession } from '@/lib/auth/admin-session';
import { GuestEditForm } from './GuestEditForm';

/**
 * Edição de Convidado — /admin/convidados/[id]/editar
 *
 * Página server component que carrega os dados reais do convidado
 * e passa para o formulário client-side. Requer sessão administrativa.
 */
export default async function AdminEditGuestPage({
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

	// Carregar dados do convidado via Admin SDK (server-only)
	let guest: Record<string, unknown> | null = null;
	try {
		const { adminDb } = await import('@/lib/firebase/admin');
		const doc = await adminDb
			.collection('events')
			.doc(eventId)
			.collection('guests')
			.doc(id)
			.get();

		if (doc.exists) {
			guest = { id: doc.id, ...doc.data() } as Record<string, unknown>;
		}
	} catch (e) {
		console.error('[EditGuest] Falha ao carregar convidado:', e);
	}

	if (!guest) {
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
						Convidado não encontrado
					</h1>
				</div>
				<div className="rounded-xl border border-dashed border-outline-variant/30 bg-surface-container-low p-space-xl text-center">
					<p className="text-body-lg text-on-surface-variant">
						O convidado solicitado não existe ou foi removido.
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
						Editar Convidado
					</h1>
					<p className="mt-space-xs text-body-md text-on-surface-variant">
						Altere os dados de <strong>{String(guest.fullName)}</strong>
					</p>
				</div>
			</div>

			{/* Formulário client-side com dados pré-carregados */}
			<GuestEditForm guest={guest as unknown as Parameters<typeof GuestEditForm>[0]['guest']} />
		</div>
	);
}