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

/**
 * Tipo interno do formulário — usa strings simples para inputs HTML,
 * transformadas para ISO 8601 antes de enviar à Server Action.
 */
type ConfigFormInput = {
	coupleNames: string;
	eventDateLocal: string; // "YYYY-MM-DDTHH:mm" para datetime-local
	timezone: string;
	ceremonyTime: string; // "HH:mm"
	receptionTime: string; // "HH:mm" ou ""
	venueName: string;
	venueAddress: string;
	mapsUrl: string;
	wazeUrl: string;
	dressCode: string;
	rsvpDeadlineLocal: string; // "YYYY-MM-DDTHH:mm" para datetime-local
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
 * Converte string datetime-local ("2026-12-12T19:00") + timezone para ISO 8601 completo.
 *
 * O input datetime-local não contém timezone. Interpretamos os componentes
 * (ano, mês, dia, hora, minuto) como valores literais no fuso horário configurado,
 * calculando o offset UTC correto para aquela data específica (respeitando DST).
 *
 * Retorna string vazia se o input estiver vazio ou inválido.
 */
function localToISO(localValue: string, tz: string): string {
	if (!localValue) return '';
	try {
		const [datePart, timePart] = localValue.split('T');
		if (!datePart || !timePart) return '';

		const [year, month, day] = datePart.split('-').map(Number);
		const [hour, minute] = timePart.split(':').map(Number);

		if ([year, month, day, hour, minute].some((v) => isNaN(v))) return '';

		const timezone = tz || 'America/Sao_Paulo';

		// Estratégia: criar um timestamp UTC provisório e medir quanto ele
		// "desloca" quando formatado no timezone alvo. A diferença é o offset.
		const utcProvisional = Date.UTC(year, month - 1, day, hour, minute, 0);

		const fmt = new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false,
		});

		const parts = fmt.formatToParts(new Date(utcProvisional));
		const get = (type: string) =>
			parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);

		const tzY = get('year');
		const tzM = get('month');
		const tzD = get('day');
		const tzH = get('hour');
		const tzMin = get('minute');

		// Timestamp que o timezone alvo representa para esses mesmos valores literais
		const tzAsUTC = Date.UTC(tzY, tzM - 1, tzD, tzH, tzMin, 0);

		// Offset em milissegundos: quanto o tz está à frente (+) ou atrás (-) do UTC
		const offsetMs = utcProvisional - tzAsUTC;

		// Construir ISO 8601 com offset explícito
		const pad = (n: number) => String(n).padStart(2, '0');
		const base = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00`;

		const totalOffsetMin = Math.round(offsetMs / 60000);
		const sign = totalOffsetMin >= 0 ? '+' : '-';
		const absMin = Math.abs(totalOffsetMin);
		const offH = pad(Math.floor(absMin / 60));
		const offM = pad(absMin % 60);

		return `${base}${sign}${offH}:${offM}`;
	} catch {
		return '';
	}
}

/**
 * Converte ISO 8601 para formato datetime-local ("YYYY-MM-DDTHH:mm").
 * Retorna string vazia se o input for inválido ou vazio.
 */
function isoToLocal(isoValue: string | null | undefined): string {
	if (!isoValue) return '';
	try {
		const date = new Date(isoValue);
		if (isNaN(date.getTime())) return '';
		// Formatar para datetime-local: YYYY-MM-DDTHH:mm
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		return `${year}-${month}-${day}T${hours}:${minutes}`;
	} catch {
		return '';
	}
}

/**
 * Formulário de Configurações — Componente client-side.
 *
 * CAUSA RAIZ DO BUG ANTERIOR:
 * 1. coupleNames estava apenas em defaultValues, sem <input> registrado → RHF não enviava
 * 2. eventDate usava datetime-local ("2026-12-12T19:00") mas schema exigia ISO 8601 completo
 * 3. Erros de validação Zod eram silenciosamente ignorados (nenhum formState.errors renderizado)
 *
 * CORREÇÃO:
 * - Campo hidden para coupleNames garante envio
 * - Transformação explícita de datetime-local → ISO 8601 antes do submit
 * - Renderização de erros de validação abaixo de cada campo
 * - Feedback visual claro de loading/sucesso/erro
 */
export function ConfigForm({ event }: ConfigFormProps) {
	const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
	const [statusMessage, setStatusMessage] = useState('');

	const form = useForm<ConfigFormInput>({
		defaultValues: {
			coupleNames: event?.coupleNames || 'Andrey & Amanda',
			eventDateLocal: isoToLocal(event?.eventDate) || '2026-12-12T19:00',
			timezone: event?.timezone || 'America/Sao_Paulo',
			ceremonyTime: event?.ceremonyTime || '19:00',
			receptionTime: event?.receptionTime || '',
			venueName: event?.venueName || '',
			venueAddress: event?.venueAddress || '',
			mapsUrl: event?.mapsUrl || '',
			wazeUrl: event?.wazeUrl || '',
			dressCode: event?.dressCode || '',
			rsvpDeadlineLocal: isoToLocal(event?.rsvpDeadline) || '',
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

	const { formState: { errors } } = form;

	async function onSubmit(data: ConfigFormInput) {
		setSubmitStatus('loading');
		setStatusMessage('Salvando configurações...');

		// Transformar dados do formulário para o formato esperado pelo schema/Firestore
		const payload: Record<string, unknown> = {
			coupleNames: data.coupleNames,
			eventDate: localToISO(data.eventDateLocal, data.timezone),
			timezone: data.timezone,
			ceremonyTime: data.ceremonyTime,
			receptionTime: data.receptionTime || '',
			venueName: data.venueName || '',
			venueAddress: data.venueAddress || '',
			mapsUrl: data.mapsUrl || '',
			wazeUrl: data.wazeUrl || '',
			dressCode: data.dressCode || '',
			rsvpDeadline: data.rsvpDeadlineLocal ? localToISO(data.rsvpDeadlineLocal, data.timezone) : '',
			rsvpEnabled: data.rsvpEnabled,
			checkInEnabled: data.checkInEnabled,
			heroMessage: data.heroMessage || '',
			heroVerse: data.heroVerse || '',
			heroVerseReference: data.heroVerseReference || '',
			closingMessage: data.closingMessage || '',
			closingVerse: data.closingVerse || '',
			closingVerseReference: data.closingVerseReference || '',
		};

		try {
			const result = await saveEventSettings(payload);

			if (result.success) {
				setSubmitStatus('success');
				setStatusMessage(result.message || 'Configurações salvas com sucesso!');
				// Auto-limpar mensagem de sucesso após 5 segundos
				setTimeout(() => {
					setSubmitStatus('idle');
					setStatusMessage('');
				}, 5000);
			} else {
				setSubmitStatus('error');
				setStatusMessage(result.error || 'Falha ao salvar configurações. Verifique os campos e tente novamente.');
			}
		} catch (e) {
			setSubmitStatus('error');
			setStatusMessage(e instanceof Error ? e.message : 'Erro inesperado ao salvar. Tente novamente.');
		}
	}

	/** Helper para renderizar erro de campo */
	function FieldError({ name }: { name: keyof ConfigFormInput }) {
		const error = errors[name];
		if (!error) return null;
		return (
			<p className="mt-1 text-body-sm text-error">
				{Array.isArray(error) ? error[0]?.message : error.message}
			</p>
		);
	}

	return (
		<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-space-xl">
			{/* Campo hidden obrigatório — coupleNames */}
			<input type="hidden" {...form.register('coupleNames')} />

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
						<label htmlFor="eventDateLocal" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
							Data do Casamento
						</label>
						<input
							id="eventDateLocal"
							type="datetime-local"
							{...form.register('eventDateLocal')}
							className="w-full rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
						/>
						<FieldError name="eventDateLocal" />
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
						<FieldError name="ceremonyTime" />
					</div>
					<div>
						<label htmlFor="receptionTime" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
							Horário da Recepção (opcional)
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
						<label htmlFor="venueAddress" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
							Endereço Completo do Casamento
						</label>
						<textarea
							id="venueAddress"
							rows={3}
							placeholder="Rua Exemplo, 123&#10;Bairro Exemplo&#10;Cidade — SP&#10;CEP 00000-000"
							{...form.register('venueAddress')}
							className="w-full resize-y rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
						/>
						<FieldError name="venueAddress" />
					</div>
					<div>
						<label htmlFor="venueName" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
							Identificação do espaço (opcional)
						</label>
						<input
							id="venueName"
							type="text"
							placeholder="Ex.: Espaço particular, residência, sítio..."
							{...form.register('venueName')}
							className="w-full rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
						/>
					</div>
					<div className="grid gap-space-md md:grid-cols-2">
						<div>
							<label htmlFor="mapsUrl" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
								URL Google Maps (opcional)
							</label>
							<input
								id="mapsUrl"
								type="url"
								placeholder="https://maps.google.com/..."
								{...form.register('mapsUrl')}
								className="w-full rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
							/>
							<FieldError name="mapsUrl" />
						</div>
						<div>
							<label htmlFor="wazeUrl" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
								URL Waze (opcional)
							</label>
							<input
								id="wazeUrl"
								type="url"
								placeholder="https://waze.com/ul?..."
								{...form.register('wazeUrl')}
								className="w-full rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
							/>
							<FieldError name="wazeUrl" />
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
							Dress Code (opcional)
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
						<label htmlFor="rsvpDeadlineLocal" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
							Prazo para Confirmação (opcional)
						</label>
						<input
							id="rsvpDeadlineLocal"
							type="datetime-local"
							{...form.register('rsvpDeadlineLocal')}
							className="w-full rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
						/>
						<FieldError name="rsvpDeadlineLocal" />
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
							<label htmlFor="heroVerseReference" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
								Referência
							</label>
							<input
								id="heroVerseReference"
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
					<div className="grid gap-space-md md:grid-cols-2">
						<div>
							<label htmlFor="closingVerse" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
								Versículo do Encerramento
							</label>
							<input
								id="closingVerse"
								type="text"
								{...form.register('closingVerse')}
								className="w-full rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
							/>
						</div>
						<div>
							<label htmlFor="closingVerseReference" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
								Referência do Encerramento
							</label>
							<input
								id="closingVerseReference"
								type="text"
								placeholder="Ex: 1 Samuel 7:12"
								{...form.register('closingVerseReference')}
								className="w-full rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
							/>
						</div>
					</div>
				</div>
			</section>

			{/* Resumo de erros de validação — visível quando há erros e o usuário tentou submeter */}
			{Object.keys(errors).length > 0 && (
				<div className="rounded-lg border border-error/30 bg-error-container/10 p-4">
					<div className="flex items-start gap-3">
						<AlertCircle size={20} className="mt-0.5 shrink-0 text-error" />
						<div>
							<p className="text-body-md font-medium text-error">Corrija os erros abaixo antes de salvar:</p>
							<ul className="mt-2 list-disc pl-5 text-body-sm text-error/80">
								{Object.entries(errors).map(([key, err]) => (
									<li key={key}>
										<strong>{key}:</strong> {Array.isArray(err) ? err[0]?.message : err?.message || 'Campo inválido'}
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			)}

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

			{submitStatus === 'loading' && (
				<div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
					<Loader2 size={20} className="shrink-0 animate-spin text-blue-700" />
					<p className="text-body-md text-blue-800">{statusMessage}</p>
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