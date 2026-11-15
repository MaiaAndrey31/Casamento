'use client';

import { useCountdown } from '@/hooks/useCountdown';
import { WEDDING_CONFIG } from '@/config/wedding';

/**
 * Contagem Regressiva — Componente visual do timer até o casamento.
 * Exibe estado "não configurado" quando a data ainda não foi definida,
 * sem inventar datas fictícias.
 */
export function Countdown() {
	const { days, hours, minutes, seconds, isExpired, isConfigured } = useCountdown(
		WEDDING_CONFIG.eventDate,
		WEDDING_CONFIG.timezone,
	);

	if (!isConfigured) {
		return (
			<section id="countdown" className="bg-surface-container-low py-space-2xl px-gutter">
				<div className="mx-auto max-w-2xl text-center">
					<h2 className="text-headline-md text-primary md:text-headline-lg">
						Contagem Regressiva
					</h2>
					<p className="mt-space-md text-body-lg text-on-surface-variant">
						A data do nosso grande dia será anunciada em breve.
					</p>
					<p className="mt-space-sm text-body-md italic text-secondary">
						&ldquo;Tudo tem o seu tempo determinado, e há tempo para todo propósito debaixo do céu.&rdquo;
					</p>
					<p className="mt-space-xs text-label-md uppercase tracking-widest text-on-surface-variant">
						Eclesiastes 3:1
					</p>
				</div>
			</section>
		);
	}

	if (isExpired) {
		return (
			<section id="countdown" className="bg-surface-container-low py-space-2xl px-gutter">
				<div className="mx-auto max-w-2xl text-center">
					<div className="mb-space-md inline-flex h-20 w-20 items-center justify-center rounded-full bg-tertiary-fixed/20">
						<span className="text-3xl">💍</span>
					</div>
					<h2 className="text-headline-md text-primary md:text-headline-lg">
						O grande dia chegou!
					</h2>
					<p className="mt-space-md text-body-lg text-on-surface-variant">
						Hoje celebramos nossa aliança diante de Deus.
					</p>
					<p className="mt-space-sm text-body-md italic text-secondary">
						&ldquo;{WEDDING_CONFIG.closingMessage}&rdquo;
					</p>
					<p className="mt-space-xs text-label-md uppercase tracking-widest text-on-surface-variant">
						{WEDDING_CONFIG.closingVerseReference}
					</p>
				</div>
			</section>
		);
	}

	const units = [
		{ value: days, label: 'Dias' },
		{ value: hours, label: 'Horas' },
		{ value: minutes, label: 'Minutos' },
		{ value: seconds, label: 'Segundos' },
	];

	return (
		<section id="countdown" className="bg-surface-container-low py-space-2xl px-gutter">
			<div className="mx-auto max-w-3xl text-center">
				<h2 data-countdown-title className="mb-space-xl text-headline-md text-primary md:text-headline-lg">
					Contagem Regressiva
				</h2>

				<div className="grid grid-cols-2 gap-space-md md:grid-cols-4 md:gap-space-lg">
					{units.map((unit) => (
						<div
							data-countdown-card
							key={unit.label}
							className="flex flex-col items-center rounded-xl bg-surface-container-lowest p-space-lg shadow-sm border border-outline-variant/20"
						>
							<span className="text-display-hero-mobile font-light tabular-nums text-primary-container md:text-display-hero">
								{String(unit.value).padStart(2, '0')}
							</span>
							<span className="mt-space-xs text-label-md uppercase tracking-widest text-on-surface-variant">
								{unit.label}
							</span>
						</div>
					))}
				</div>

				<p className="mt-space-xl text-body-md text-on-surface-variant">
					até o nosso grande dia
				</p>
			</div>
		</section>
	);
}