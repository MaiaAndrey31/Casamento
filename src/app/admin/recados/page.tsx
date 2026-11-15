import { redirect } from 'next/navigation';
import { MessageSquareHeart, CheckCircle, XCircle, Clock, Trash2, Search } from 'lucide-react';
import { getAdminSession } from '@/lib/auth/admin-session';
import type { Message } from '@/types';

/**
 * Moderação de Recados — /admin/recados
 *
 * Lista recados pendentes, aprovados e rejeitados com ações de moderação.
 * Apenas mensagens aprovadas aparecem no convite público.
 */
export default async function AdminRecadosPage() {
	const session = await getAdminSession();
	if (!session) {
		redirect('/admin/login');
	}

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

	let messages: Message[] = [];
	try {
		const { adminDb } = await import('@/lib/firebase/admin');
		const snapshot = await adminDb
			.collection('events')
			.doc(eventId)
			.collection('messages')
			.orderBy('createdAt', 'desc')
			.limit(100)
			.get();

		messages = snapshot.docs.map(doc => ({ id: doc.id, eventId, ...doc.data() })) as Message[];
	} catch (e) {
		console.error('[Recados] Falha ao carregar mensagens:', e);
	}

	const pending = messages.filter(m => m.moderationStatus === 'pending');
	const approved = messages.filter(m => m.moderationStatus === 'approved');
	const rejected = messages.filter(m => m.moderationStatus === 'rejected');

	return (
		<div className="space-y-space-xl">
			{/* Header */}
			<div>
				<h1 className="text-headline-lg-mobile text-primary md:text-headline-lg">
					Recados e Orações
				</h1>
				<p className="mt-space-xs text-body-md text-on-surface-variant">
					{messages.length} mensagem{messages.length !== 1 ? 'ns' : ''} recebida{messages.length !== 1 ? 's' : ''}
				</p>
			</div>

			{/* Resumo por status */}
			<div className="grid gap-space-md sm:grid-cols-3">
				<div className="rounded-xl border border-tertiary-fixed-dim/30 bg-tertiary-fixed/10 p-space-md text-center">
					<Clock size={24} className="mx-auto mb-2 text-on-surface-variant" />
					<p className="text-display-hero-mobile font-light tabular-nums text-primary-container">{pending.length}</p>
					<p className="text-label-sm uppercase tracking-widest text-on-surface-variant">Pendentes</p>
				</div>
				<div className="rounded-xl border border-green-200 bg-green-50 p-space-md text-center">
					<CheckCircle size={24} className="mx-auto mb-2 text-green-700" />
					<p className="text-display-hero-mobile font-light tabular-nums text-green-800">{approved.length}</p>
					<p className="text-label-sm uppercase tracking-widest text-green-700">Aprovados</p>
				</div>
				<div className="rounded-xl border border-error/20 bg-error-container/10 p-space-md text-center">
					<XCircle size={24} className="mx-auto mb-2 text-error" />
					<p className="text-display-hero-mobile font-light tabular-nums text-error">{rejected.length}</p>
					<p className="text-label-sm uppercase tracking-widest text-error">Rejeitados</p>
				</div>
			</div>

			{/* Seção Pendentes (destaque) */}
			{pending.length > 0 && (
				<div>
					<h2 className="mb-space-md flex items-center gap-2 text-headline-sm text-primary">
						<Clock size={20} />
						Aguardando Moderação ({pending.length})
					</h2>
					<div className="space-y-space-sm">
						{pending.map(msg => (
							<MessageCard key={msg.id} message={msg} showActions />
						))}
					</div>
				</div>
			)}

			{/* Seção Aprovados */}
			{approved.length > 0 && (
				<div>
					<h2 className="mb-space-md flex items-center gap-2 text-headline-sm text-primary">
						<CheckCircle size={20} />
						Aprovados ({approved.length})
					</h2>
					<div className="space-y-space-sm">
						{approved.map(msg => (
							<MessageCard key={msg.id} message={msg} />
						))}
					</div>
				</div>
			)}

			{/* Empty state */}
			{messages.length === 0 && (
				<div className="rounded-xl border border-dashed border-outline-variant/30 bg-surface-container-low p-space-xl text-center">
					<MessageSquareHeart size={48} className="mx-auto mb-space-md text-on-surface-variant/30" />
					<p className="text-body-lg text-on-surface-variant">
						Nenhum recado recebido ainda.
					</p>
				</div>
			)}
		</div>
	);
}

function MessageCard({ message, showActions }: { message: Message; showActions?: boolean }) {
	const statusColors = {
		pending: 'border-tertiary-fixed-dim/30 bg-surface-container-low',
		approved: 'border-green-200 bg-green-50/30',
		rejected: 'border-error/20 bg-error-container/10',
	};

	return (
		<div className={`rounded-xl border p-space-md shadow-sm ${statusColors[message.moderationStatus]}`}>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<span className="text-title-md font-medium text-primary">{message.authorName}</span>
						<span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
							message.moderationStatus === 'pending' ? 'bg-tertiary-fixed/20 text-on-surface-variant' :
							message.moderationStatus === 'approved' ? 'bg-green-100 text-green-800' :
							'bg-error-container/30 text-error'
						}`}>
							{message.moderationStatus === 'pending' ? 'Pendente' :
							 message.moderationStatus === 'approved' ? 'Aprovado' : 'Rejeitado'}
						</span>
					</div>
					<p className="mt-space-sm text-body-md text-on-surface italic">
						&ldquo;{message.message}&rdquo;
					</p>
					{message.createdAt && (
						<p className="mt-space-xs text-body-sm text-on-surface-variant">
							{new Date(message.createdAt).toLocaleString('pt-BR')}
						</p>
					)}
				</div>

				{/* Ações de moderação (apenas para pendentes) */}
				{showActions && message.moderationStatus === 'pending' && (
					<div className="flex shrink-0 flex-col gap-2">
						<form action={`/api/admin/messages/${message.id}/approve`} method="POST">
							<button
								type="submit"
								title="Aprovar recado"
								className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 text-green-700 transition-colors hover:bg-green-200"
							>
								<CheckCircle size={16} />
							</button>
						</form>
						<form action={`/api/admin/messages/${message.id}/reject`} method="POST">
							<button
								type="submit"
								title="Rejeitar recado"
								className="flex h-9 w-9 items-center justify-center rounded-lg bg-error-container/30 text-error transition-colors hover:bg-error-container/50"
							>
								<XCircle size={16} />
							</button>
						</form>
					</div>
				)}
			</div>
		</div>
	);
}