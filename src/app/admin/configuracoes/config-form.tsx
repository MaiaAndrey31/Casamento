'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { eventSettingsSchema } from '@/lib/validators/rsvp.schema';
import { saveEventSettings } from '@/app/actions/save-event-settings.action';
import type { WeddingEvent } from '@/types';

interface ConfigFormProps {
	event: WeddingEvent | null;
}

type ConfigFormData = {
	coupleNames: string;
	eventDate: string;
	timezone: string;
	ceremonyTime: string;
	receptionTime: string;
	venueName: string;
	venueAddress: string;
	mapsUrl: string;
	wazeUrl: string;
	dressCode: string;
	rsvpDeadline: string;
	rsvpEnabled: boolean;
	checkInEnabled: boolean;
	heroMessage: string;
	heroVerse: string;
	heroVerseReference: string;
	closingMessage: string;
	closingVerse: string;
	closingVerseReference: string;
};

/**
 * Formulário de Configurações — Componente client-side.
 *
 * Conectado à Server Action saveEventSettings via React Hook Form + Zod.
 * Preserva todos os dados digitados em caso de erro (NUNCA limpa o formulário).
 * Exibe feedback visual de loading, sucesso e erro.
 */
export function ConfigForm({ event }: ConfigFormProps) {
	const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
	const [statusMessage, setStatusMessage] = useState('');

	const form = useForm<ConfigFormData>({
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 resolver: zodResolver(eventSettingsSchema) as any,
 defaultValues: {
 coupleNames: event?.coupleNames || 'Andrey & Amanda',
 eventDate: event?.eventDate ? new Date(event.eventDate).toISOString().slice(0, 16) : '2026-12-12T19:00',
 timezone: event?.timezone || 'America/Sao_Paulo',
 ceremonyTime: event?.ceremonyTime || '19:00',
 receptionTime: event?.receptionTime || '',
 venueName: event?.venueName || '',
 venueAddress: event?.venueAddress || '',
 // Nota: venueName é opcional; venueAddress é a informação principal para espaços particulares
 mapsUrl: event?.mapsUrl || '',
 wazeUrl: event?.wazeUrl || '',
 dressCode: event?.dressCode || '',
 rsvpDeadline: event?.rsvpDeadline ? new Date(event.rsvpDeadline).toISOString().slice(0, 16) : '',
 rsvpEnabled: event?.rsvpEnabled ?? true,
 checkInEnabled: event?.checkInEnabled ?? false,
 heroMessage: event?.heroMessage || '',
 heroVerse: event?.heroVerse || '',
 heroVerseReference: event?.heroVerseReference || '',
 closingMessage: event?.closingMessage || '',
 closingVerse: event?.closingVerse || '',
 closingVerseReference: event?.closingVerseReference || '',
 },
	});

	async function onSubmit(data: ConfigFormData) {
 setSubmitStatus('loading');
 setStatusMessage('');

 const result = await saveEventSettings(data);

 if (result.success) {
 setSubmitStatus('success');
 setStatusMessage(result.message || 'Configurações salvas com sucesso!');
 // NÃO resetar o formulário — preservar dados digitados
 } else {
 setSubmitStatus('error');
 setStatusMessage(result.error || 'Falha ao salvar configurações.');
 // NÃO resetar o formulário — preservar dados digitados
 }
	}

	return (
 <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-space-xl">
 {/* Data e Horário */}
 <section className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-space-lg shadow-sm md:p-space-xl">
 <div className="mb-space-md flex items-center gap-3">
 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container/50">
 <Save size={20} className="text-primary-container" />
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
 {...form.register('eventDate')}
 className="w-full rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
 />
 </div>
 <div>
 <label htmlFor="timezone" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
 Fuso Horário
 </label>
 <select
 id="timezone"
 {...form.register('timezone')}
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
 {...form.register('ceremonyTime')}
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
 {...form.register('receptionTime')}
 className="w-full rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
 />
 </div>
 </div>
 </section>

 {/* Local */}
 <section className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-space-lg shadow-sm md:p-space-xl">
 <div className="mb-space-md flex items-center gap-3">
 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container/50">
 <Save size={20} className="text-primary-container" />
 </div>
 <h2 className="text-headline-sm text-primary">Local do Evento</h2>
 </div>
 <div className="space-y-space-md">
 <div>
 <label htmlFor="venueName" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
 Nome ou identificação do espaço (opcional)
 </label>
 <input
 id="venueName"
 type="text"
 placeholder="Ex.: Espaço particular, residência, sítio..."
 {...form.register('venueName')}
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
 placeholder="Rua Exemplo, 123 - Bairro, Cidade - UF"
 {...form.register('venueAddress')}
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
 placeholder="https://maps.google.com/..."
 {...form.register('mapsUrl')}
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
 placeholder="https://waze.com/ul?..."
 {...form.register('wazeUrl')}
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
 <Save size={20} className="text-primary-container" />
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
 placeholder="Ex: Traje Social Completo"
 {...form.register('dressCode')}
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
 {...form.register('rsvpDeadline')}
 className="w-full rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
 />
 </div>
 </div>
 </section>

 {/* Versículos e Mensagens */}
 <section className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-space-lg shadow-sm md:p-space-xl">
 <div className="mb-space-md flex items-center gap-3">
 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container/50">
 <Save size={20} className="text-primary-container" />
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
 {...form.register('heroMessage')}
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
 {...form.register('heroVerse')}
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
 placeholder="Ex: Colossenses 3:14"
 {...form.register('heroVerseReference')}
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
 {...form.register('closingMessage')}
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
 placeholder="Ex: 1 Samuel 7:12"
 {...form.register('closingVerseReference')}
 className="w-full rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
 />
 </div>
 </div>
 </section>

 {/* Feedback de status */}
 {submitStatus === 'success' && (
 <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
 <CheckCircle size={20} className="shrink-0 text-green-700" />
 <p className="text-body-md text-green-800">{statusMessage}</p>
 </div>
 )}

 {submitStatus === 'error' && (
 <div className="flex items-start gap-3 rounded-lg border border-error/30 bg-error-container/10 p-4">
 <AlertCircle size={20} className="mt-0.5 shrink-0 text-error" />
 <div>
 <p className="text-body-md text-error">{statusMessage}</p>
 <p className="mt-1 text-body-sm text-error/70">
 Seus dados foram preservados. Corrija os problemas acima e tente novamente.
 </p>
 </div>
 </div>
 )}

 {/* Botão Salvar */}
 <div className="flex justify-end">
 <button
 type="submit"
 disabled={submitStatus === 'loading'}
 className="inline-flex items-center gap-2 rounded-md bg-primary-container px-8 py-4 text-label-md uppercase tracking-widest text-tertiary-fixed shadow-md transition-all hover:bg-secondary hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-tertiary-fixed-dim focus:ring-offset-2 focus:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
 >
 {submitStatus === 'loading' ? (
 <>
 <Loader2 size={16} className="animate-spin" />
 Salvando...
 </>
 ) : (
 <>
 <Save size={16} />
 Salvar Configurações
 </>
 )}
 </button>
 </div>
 </form>
	);
}