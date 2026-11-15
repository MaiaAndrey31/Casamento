import { redirect } from 'next/navigation';
import { Settings, Calendar, Clock, MapPin, Shirt, Heart, BookOpen, Save } from 'lucide-react';
import { getAdminSession } from '@/lib/auth/admin-session';
import { getActiveEvent } from '@/lib/repositories/event.repository';
import type { WeddingEvent } from '@/types';

/**
 * Configurações do Casamento — /admin/configuracoes
 *
 * Edição de data, horário, local, dress code, prazo RSVP, versículos, textos e fotografias.
 * Preserva o texto oficial de Nossa História. Alterações refletem no convite público.
 * Requer sessão administrativa válida.
 */
export default async function AdminConfiguracoesPage() {
	const session = await getAdminSession();
	if (!session) {
		redirect('/admin/login');
	}

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';
	const event = await getActiveEvent();

	return (
		<div className="space-y-space-xl">
			{/* Header */}
			<div>
				<h1 className="text-headline-lg-mobile text-primary md:text-headline-lg">
					Configurações do Casamento
				</h1>
				<p className="mt-space-xs text-body-md text-on-surface-variant">
					Edite as informações que aparecem no convite público
				</p>
			</div>

			{/* Aviso sobre preservação */}
			<div className="rounded-lg border border-tertiary-fixed-dim/30 bg-tertiary-fixed/10 p-4">
				<p className="text-body-sm text-on-surface-variant">
					<strong>Nota:</strong> O texto oficial de Nossa História é preservado automaticamente.
					Alterações nesta página refletem imediatamente no convite público.
				</p>
			</div>

			<form className="space-y-space-xl">
				{/* Data e Horário */}
				<section className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-space-lg shadow-sm md:p-space-xl">
					<div className="mb-space-md flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container/50">
							<Calendar size={20} className="text-primary-container" />
						</div>
						<h2 className="text-headline-sm text-primary">Data e Horário</h2>
					</div>
					<div className="grid gap-space-md md:grid-cols-2">
						<div>
							<label htmlFor="eventDate" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
								Data do Casamento
							</label>
							<input
								id="eventDate"
								type="datetime-local"
								defaultValue={event?.eventDate ? new Date(event.eventDate).toISOString().slice(0, 16) : ''}
								className="w-full rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
							/>
						</div>
						<div>
							<label htmlFor="timezone" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
								Fuso Horário
							</label>
							<select
								id="timezone"
								defaultValue={event?.timezone || 'America/Sao_Paulo'}
								className="w-full rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
							>
								<option value="America/Sao_Paulo">América/São Paulo (BRT)</option>
								<option value="America/Recife">América/Recife (BRT)</option>
								<option value="America/Manaus">América/Manaus (AMT)</option>
							</select>
						</div>
						<div>
							<label htmlFor="ceremonyTime" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
								Horário da Cerimônia
							</label>
							<input
								id="ceremonyTime"
								type="time"
								defaultValue={event?.ceremonyTime || ''}
								className="w-full rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
							/>
						</div>
						<div>
							<label htmlFor="receptionTime" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
								Horário da Recepção
							</label>
							<input
								id="receptionTime"
								type="time"
								defaultValue={event?.receptionTime || ''}
								className="w-full rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
							/>
						</div>
					</div>
				</section>

				{/* Local */}
				<section className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-space-lg shadow-sm md:p-space-xl">
					<div className="mb-space-md flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container/50">
							<MapPin size={20} className="text-primary-container" />
						</div>
						<h2 className="text-headline-sm text-primary">Local do Evento</h2>
					</div>
					<div className="space-y-space-md">
						<div>
							<label htmlFor="venueName" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
								Nome do Local
							</label>
							<input
								id="venueName"
								type="text"
								defaultValue={event?.venueName || ''}
								placeholder="Ex: Villa Casagrande"
								className="w-full rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
							/>
						</div>
						<div>
							<label htmlFor="venueAddress" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
								Endereço Completo
							</label>
							<textarea
								id="venueAddress"
								rows={2}
								defaultValue={event?.venueAddress || ''}
								placeholder="Rua Exemplo, 123 - Bairro, Cidade - UF"
								className="w-full resize-y rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
							/>
						</div>
						<div className="grid gap-space-md md:grid-cols-2">
							<div>
								<label htmlFor="mapsUrl" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
									URL Google Maps
								</label>
								<input
									id="mapsUrl"
									type="url"
									defaultValue={event?.mapsUrl || ''}
									placeholder="https://maps.google.com/..."
									className="w-full rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
								/>
							</div>
							<div>
								<label htmlFor="wazeUrl" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
									URL Waze
								</label>
								<input
									id="wazeUrl"
									type="url"
									defaultValue={event?.wazeUrl || ''}
									placeholder="https://waze.com/ul?..."
									className="w-full rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
								/>
							</div>
						</div>
					</div>
				</section>

				{/* Dress Code e Prazo RSVP */}
				<section className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-space-lg shadow-sm md:p-space-xl">
					<div className="mb-space-md flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container/50">
							<Shirt size={20} className="text-primary-container" />
						</div>
						<h2 className="text-headline-sm text-primary">Dress Code e RSVP</h2>
					</div>
					<div className="grid gap-space-md md:grid-cols-2">
						<div>
							<label htmlFor="dressCode" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
								Dress Code
							</label>
							<input
								id="dressCode"
								type="text"
								defaultValue={event?.dressCode || ''}
								placeholder="Ex: Traje Social Completo"
								className="w-full rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
							/>
						</div>
						<div>
							<label htmlFor="rsvpDeadline" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
								Prazo para Confirmação
							</label>
							<input
								id="rsvpDeadline"
								type="datetime-local"
								defaultValue={event?.rsvpDeadline ? new Date(event.rsvpDeadline).toISOString().slice(0, 16) : ''}
								className="w-full rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
							/>
						</div>
					</div>
				</section>

				{/* Versículos e Mensagens */}
				<section className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-space-lg shadow-sm md:p-space-xl">
					<div className="mb-space-md flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container/50">
							<BookOpen size={20} className="text-primary-container" />
						</div>
						<h2 className="text-headline-sm text-primary">Versículos e Mensagens</h2>
					</div>
					<div className="space-y-space-md">
						<div>
							<label htmlFor="heroMessage" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
								Mensagem Principal (Hero)
							</label>
							<textarea
								id="heroMessage"
								rows={2}
								defaultValue={event?.heroMessage || ''}
								className="w-full resize-y rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
							/>
						</div>
						<div className="grid gap-space-md md:grid-cols-2">
							<div>
								<label htmlFor="heroVerse" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
									Versículo do Hero
								</label>
								<input
									id="heroVerse"
									type="text"
									defaultValue={event?.heroVerse || ''}
									className="w-full rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
								/>
							</div>
							<div>
								<label htmlFor="heroVerseRef" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
									Referência
								</label>
								<input
									id="heroVerseRef"
									type="text"
									defaultValue={event?.heroVerseReference || ''}
									placeholder="Ex: Colossenses 3:14"
									className="w-full rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
								/>
							</div>
						</div>
						<div>
							<label htmlFor="closingMessage" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
								Mensagem de Encerramento
							</label>
							<input
								id="closingMessage"
								type="text"
								defaultValue={event?.closingMessage || ''}
								className="w-full rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
							/>
						</div>
						<div>
							<label htmlFor="closingVerseRef" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
								Referência do Encerramento
							</label>
							<input
								id="closingVerseRef"
								type="text"
								defaultValue={event?.closingVerseReference || ''}
								placeholder="Ex: 1 Samuel 7:12"
								className="w-full rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
							/>
						</div>
					</div>
				</section>

				{/* Botão Salvar */}
				<div className="flex justify-end">
					<button
						type="submit"
						className="inline-flex items-center gap-2 rounded-md bg-primary-container px-8 py-4 text-label-md uppercase tracking-widest text-tertiary-fixed shadow-md transition-all hover:bg-secondary hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-tertiary-fixed-dim focus:ring-offset-2 focus:ring-offset-surface"
					>
						<Save size={16} />
						Salvar Configurações
					</button>
				</div>
			</form>
		</div>
	);
}