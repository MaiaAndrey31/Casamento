'use client';

import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { WEDDING_CONFIG, getAssetPath } from '@/config/wedding';
import {
	formatWeekday,
	formatFullDate,
	formatDayNumber,
	formatWeddingTime,
} from '@/lib/format-wedding-date';

interface HeroProps {
	heroMessage?: string | null;
	heroVerse?: string | null;
	heroVerseReference?: string | null;
	eventDate?: string | null;
	timezone?: string | null;
	/** URL do convite individual ativo (preservada via sessionStorage) */
	invitationUrl?: string | null;
}

export function Hero(props: HeroProps) {
	const heroMessage =
		props.heroMessage || WEDDING_CONFIG.heroMessage;

	const heroVerse =
		props.heroVerse || WEDDING_CONFIG.heroVerse;

	const heroVerseReference =
		props.heroVerseReference || WEDDING_CONFIG.heroVerseReference;

	const eventDate = props.eventDate || WEDDING_CONFIG.eventDate;
	const timezone = props.timezone || WEDDING_CONFIG.timezone;

	const hasDate = !!eventDate;
	const weekday = hasDate ? formatWeekday(eventDate, timezone) : '';
	const fullDate = hasDate ? formatFullDate(eventDate, timezone) : '';
	const dayNumber = hasDate ? formatDayNumber(eventDate, timezone) : '';
	const timeFormatted = hasDate ? formatWeddingTime(eventDate, timezone) : '';

	const scrollToNext = () => {
		const nextSection = document.getElementById('countdown');
		nextSection?.scrollIntoView({ behavior: 'smooth' });
	};

	return (
		<section
			id="inicio"
			className="
				relative flex min-h-[100svh] w-full
				flex-col items-center justify-center
				overflow-hidden bg-[#17231D]
			"
		>
			{/* BACKGROUND */}

			<div data-hero-image className="absolute inset-0 z-0">
				<Image
					src={getAssetPath('bannerHero.webp')}
					alt="Andrey e Amanda"
					fill
					priority
					sizes="100vw"
					className="object-cover object-center"
				/>

				{/* Overlay quente */}
				<div className="absolute inset-0 bg-[#211A15]/25" />

				{/* Degradê superior */}
				<div
					className="
						absolute inset-0
						bg-gradient-to-b
						from-[#171713]/60
						via-[#171713]/10
						to-transparent
					"
				/>

				{/* Contraste central */}
				<div
					className="
						absolute inset-0
						bg-[radial-gradient(ellipse_at_center,rgba(25,22,17,0.25)_0%,transparent_75%)]
					"
				/>

				{/* Degradê inferior */}
				<div
					className="
						absolute inset-0
						bg-gradient-to-b
						from-transparent
						via-[#17231D]/10
						to-[#101C17]/80
					"
				/>

				{/* Vinheta lateral */}
				<div
					className="
						absolute inset-0
						bg-gradient-to-r
						from-[#151B16]/20
						via-transparent
						to-[#151B16]/20
					"
				/>
			</div>

			{/* CONTEÚDO */}

			<div
				className="
					relative z-10 flex w-full
					max-w-[1100px] flex-col
					items-center text-center

					px-4
					pt-24 pb-24

					sm:px-6
					sm:pt-28 sm:pb-24

					md:px-8
					md:pt-28 md:pb-24
				"
			>

				{/* LOGO */}

				<div
					data-hero-logo
					className="
						mb-5 flex w-full
						justify-center

						sm:mb-6
						md:mb-7
					"
				>
					<Image
						src={getAssetPath('logo-aa-casamento.webp')}
						alt="Andrey & Amanda — Logo do casamento"
						width={2172}
						height={724}
						priority
						sizes="
							(max-width: 480px) 88vw,
							(max-width: 768px) 420px,
							(max-width: 1200px) 540px,
							620px
						"
						className="
							h-auto
							w-[min(88vw,620px)]
							drop-shadow-[0_4px_14px_rgba(0,0,0,0.4)]
						"
					/>
				</div>

				{/* DATA */}

				<div
					data-hero-date
					className="
						mb-4 flex flex-col
						items-center gap-2

						sm:mb-5
						md:mb-6 md:gap-2.5
					"
				>
					{hasDate && (
						<>
							<p
								className="
									font-sans text-[10px]
									font-semibold uppercase
									tracking-[0.30em]
									text-[#E5C58D]
									drop-shadow-md

									sm:text-xs
									md:text-sm
								"
							>
								{weekday}
							</p>

							<p
								className="
									max-w-[92vw]
									font-serif font-normal
									uppercase leading-tight
									tracking-[0.055em]
									text-[#F5EFE3]
									drop-shadow-[0_3px_10px_rgba(0,0,0,0.65)]

									text-[clamp(1.05rem,4.5vw,1.55rem)]

									sm:text-[clamp(1.4rem,3.4vw,2rem)]

									md:text-[clamp(1.8rem,2.5vw,2.2rem)]
								"
							>
								<span
									className="
										inline-block
										text-[1.2em]
										font-semibold
										text-[#E5C58D]
										leading-none
										align-middle
										relative -top-[0.08em]
										tracking-normal
										[font-variant-numeric:lining-nums]
									"
								>
									{dayNumber}
								</span>{' '}
								{fullDate.replace(`${dayNumber} DE `, '')}
							</p>

							<div className="flex items-center justify-center gap-4">
								<span className="h-px w-9 bg-[#C6A15B]/70 sm:w-14 md:w-16" />

								<p
									className="
										font-serif text-xl
										font-semibold
										text-[#D9B56F]
										drop-shadow-md

										sm:text-2xl
										md:text-2xl
									"
								>
									{timeFormatted}
								</p>

								<span className="h-px w-9 bg-[#C6A15B]/70 sm:w-14 md:w-16" />
							</div>
						</>
					)}
				</div>

				{/* MENSAGEM PRINCIPAL */}

				<p
					data-hero-message
					className="
						max-w-[570px]
						font-serif text-sm italic
						leading-relaxed
						text-[#F5EFE3]
						drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]

						sm:text-base
						md:text-lg
					"
				>
					&ldquo;{heroMessage}&rdquo;
				</p>

				{/* VERSÍCULO */}

				<div
					data-hero-verse
					className="
						mt-4 max-w-[540px]

						sm:mt-5
						md:mt-6
					"
				>
					<p
						className="
							font-serif text-xs
							leading-relaxed
							text-[#E9DFD0]
							drop-shadow-md

							sm:text-sm
							md:text-base
						"
					>
						&ldquo;{heroVerse}&rdquo;
					</p>

					<p
						className="
							mt-2 font-sans
							text-[9px] font-semibold
							uppercase tracking-[0.24em]
							text-[#D9B56F]

							sm:text-[10px]
							md:text-xs
						"
					>
						{heroVerseReference}
					</p>
				</div>

				{/* BOTÃO */}

				<a
					data-hero-cta
					href={props.invitationUrl ? `${props.invitationUrl}#confirmar-presenca` : '/confirmar-presenca'}
					className="
						mt-6 inline-flex
						items-center justify-center

						rounded-md
						border border-[#C6A15B]/75
						bg-[#17231D]/80

						px-6 py-3
						font-sans text-[10px]
						font-semibold uppercase
						tracking-[0.16em]

						text-[#E9C98E]

						shadow-[0_8px_25px_rgba(0,0,0,0.25)]
						backdrop-blur-sm

						transition-all duration-300

						hover:border-[#E5C58D]
						hover:bg-[#C6A15B]
						hover:text-[#17231D]

						focus:outline-none
						focus:ring-2
						focus:ring-[#D9B56F]

						sm:mt-7
						sm:px-7 sm:py-3.5
						sm:text-[11px]

						md:mt-8
					"
				>
					Confirmar minha presença
				</a>

			</div>

			{/* SCROLL INDICATOR */}

			<button
				data-hero-scroll
				onClick={scrollToNext}
				aria-label="Rolar para próxima seção"
				className="
					absolute bottom-5 left-1/2
					z-10 -translate-x-1/2

					animate-bounce
					pb-safe

					text-[#E9DFD0]/75
					transition-colors duration-300
					hover:text-[#D9B56F]

					sm:bottom-7
				"
			>
				<ChevronDown size={28} strokeWidth={1.3} />
			</button>

		</section>
	);
}