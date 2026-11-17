
'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Heart, ArrowLeft, Sparkles } from 'lucide-react';
import { getAssetPath } from '@/config/wedding';
import { OUR_STORY, GALLERY_PHOTOS } from '@/content/our-story';

gsap.registerPlugin(ScrollTrigger);

/**
 * Página Nossa História — /nossa-historia
 *
 * Identidade visual:
 * Verde-floresta, dourado champanhe, marfim e tons naturais.
 * Layout editorial com fotografias em destaque e leitura confortável.
 */

function getImageAspect(src: string): string {
	const verticalPhotos = ['001.jpeg', '002.jpeg', '003.jpeg', '005.jpeg', '008.jpeg'];

	if (verticalPhotos.includes(src)) return 'aspect-[3/4]';

	return 'aspect-[4/3]';
}

function getImagePosition(src: string): string {
	const positions: Record<string, string> = {
		'001.jpeg': 'object-center object-top',
		'002.jpeg': 'object-center object-top',
		'003.jpeg': 'object-center object-top',
		'005.jpeg': 'object-center',
		'008.jpeg': 'object-center object-top',
		'010.jpeg': 'object-center',
	};

	return positions[src] || 'object-center';
}

export default function NossaHistoriaPage() {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const prefersReducedMotion = window.matchMedia(
			'(prefers-reduced-motion: reduce)'
		).matches;

		if (prefersReducedMotion) return;

		const ctx = gsap.context(() => {
			const heroTitle = document.querySelector('[data-story-hero-title]');

			if (heroTitle) {
				gsap.from(heroTitle, {
					y: 40,
					opacity: 0,
					duration: 1.2,
					ease: 'power3.out',
				});
			}

			const heroSubtitle = document.querySelector('[data-story-hero-subtitle]');

			if (heroSubtitle) {
				gsap.from(heroSubtitle, {
					y: 25,
					opacity: 0,
					duration: 1,
					delay: 0.3,
					ease: 'power3.out',
				});
			}

			const chapters = document.querySelectorAll('[data-story-chapter]');

			chapters.forEach((chapter) => {
				const textEl = chapter.querySelector('[data-chapter-text]');
				const imageEl = chapter.querySelector('[data-chapter-image]');
				const yearEl = chapter.querySelector('[data-chapter-year]');

				if (yearEl) {
					gsap.from(yearEl, {
						scale: 0,
						opacity: 0,
						duration: 0.6,
						ease: 'back.out(1.7)',
						scrollTrigger: {
							trigger: chapter,
							start: 'top 80%',
							toggleActions: 'play none none reverse',
						},
					});
				}

				if (textEl) {
					gsap.from(textEl, {
						y: 40,
						opacity: 0,
						duration: 1,
						ease: 'power3.out',
						scrollTrigger: {
							trigger: chapter,
							start: 'top 75%',
							toggleActions: 'play none none reverse',
						},
					});
				}

				if (imageEl) {
					gsap.from(imageEl, {
						scale: 0.95,
						opacity: 0,
						duration: 1.2,
						ease: 'power2.out',
						scrollTrigger: {
							trigger: chapter,
							start: 'top 75%',
							toggleActions: 'play none none reverse',
						},
					});

					gsap.to(imageEl, {
						yPercent: -4,
						ease: 'none',
						scrollTrigger: {
							trigger: chapter,
							start: 'top bottom',
							end: 'bottom top',
							scrub: 1,
						},
					});
				}
			});

			const galleryItems = document.querySelectorAll('[data-gallery-item]');

			galleryItems.forEach((item, i) => {
				gsap.from(item, {
					y: 30,
					opacity: 0,
					duration: 0.8,
					delay: i * 0.1,
					ease: 'power3.out',
					scrollTrigger: {
						trigger: item,
						start: 'top 85%',
						toggleActions: 'play none none reverse',
					},
				});
			});

			const closingEl = document.querySelector('[data-story-closing]');

			if (closingEl) {
				gsap.from(closingEl, {
					y: 30,
					opacity: 0,
					duration: 1,
					ease: 'power3.out',
					scrollTrigger: {
						trigger: closingEl,
						start: 'top 85%',
						toggleActions: 'play none none reverse',
					},
				});
			}
		}, containerRef);

		return () => {
			ctx.revert();
		};
	}, []);

	return (
		<div
			ref={containerRef}
			className="min-h-screen overflow-hidden bg-[#14251D] text-[#F4EEE5]"
		>
			{/* HERO */}
			<section className="relative flex min-h-[68vh] flex-col items-center justify-center overflow-hidden px-6 pb-20 pt-32 text-center md:min-h-[76vh] md:pt-36">

				{/* Fotografia de fundo */}
				<div className="absolute inset-0 z-0">
					<Image
						src={getAssetPath('bannerHistoria.webp')}
						alt=""
						fill
						priority
						className="object-cover object-top opacity-[0.4] grayscale"
						sizes="100vw"
					/>

					{/* Escurece só um pouco no topo (navbar) e funde no rodapé */}
					<div className="absolute inset-0 bg-gradient-to-b from-[#14251D]/50 via-[#14251D]/10 to-[#14251D]" />

					{/* Laterais bem suaves */}
					<div className="absolute inset-0 bg-gradient-to-r from-[#14251D]/20 via-transparent to-[#14251D]/20" />
				</div>

				{/* Brilho decorativo */}
				<div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D6A45B]/[0.045] blur-[100px]" />

				<div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center">

					<div className="mb-8 flex items-center gap-4">
						<span className="h-px w-9 bg-[#D6A45B]/60" />
						<span className="text-[9px] font-semibold uppercase tracking-[0.35em] text-[#D6A45B] md:text-[10px]">
							Cada detalhe nos trouxe até aqui
						</span>
						<span className="h-px w-9 bg-[#D6A45B]/60" />
					</div>

					<div className="mb-8 flex h-[76px] w-[76px] items-center justify-center rounded-full border border-[#D6A45B]/35 bg-[#D6A45B]/[0.07] shadow-[0_0_50px_rgba(214,164,91,0.08)] md:h-24 md:w-24">
						<Heart
							size={36}
							strokeWidth={1.2}
							className="text-[#E5C58D] md:h-10 md:w-10"
						/>
					</div>

					<h1
						data-story-hero-title
						className="font-serif text-[clamp(3rem,8vw,6rem)] font-normal leading-[1.05] tracking-[-0.035em] text-[#F4EEE5]"
					>
						Nossa História
					</h1>

					<p
						data-story-hero-subtitle
						className="mt-7 max-w-2xl font-serif text-lg italic leading-relaxed text-[#D4C8B5] md:text-2xl"
					>
						{OUR_STORY.subtitle}
					</p>

					<div className="mt-10 flex items-center gap-3">
						<span className="h-px w-12 bg-[#D6A45B]/40" />
						<Sparkles size={14} className="text-[#D6A45B]/80" />
						<span className="h-px w-12 bg-[#D6A45B]/40" />
					</div>
				</div>

				{/* Indicador inferior */}
				<div className="absolute bottom-0 left-1/2 h-16 w-px -translate-x-1/2 bg-gradient-to-b from-[#D6A45B]/50 to-transparent" />
			</section>

			{/* CAPÍTULOS DA HISTÓRIA */}
			<section className="relative mx-auto max-w-[1440px] px-6 pb-28 pt-16 md:px-12 md:pb-36 md:pt-24 lg:px-20">

				<div className="mb-20 text-center md:mb-28">
					<span className="text-[9px] font-semibold uppercase tracking-[0.35em] text-[#D6A45B]">
						Um pouco de nós
					</span>

					<h2 className="mt-4 font-serif text-3xl font-normal text-[#F4EEE5] md:text-4xl">
						Capítulos de uma vida
					</h2>

					<div className="mx-auto mt-6 h-px w-16 bg-[#D6A45B]/50" />
				</div>

				<div className="space-y-28 md:space-y-40">
					{OUR_STORY.chapters.map((chapter, index) => {
						const isImageRight = chapter.imagePosition === 'right';
						const aspectClass = getImageAspect(chapter.image);
						const positionClass = getImagePosition(chapter.image);

						return (
							<div
								key={chapter.id}
								data-story-chapter
								className={`relative flex flex-col gap-10 md:gap-14 lg:flex-row lg:items-center lg:gap-20 ${isImageRight ? '' : 'lg:flex-row-reverse'
									}`}
							>
								{/* TEXTO */}
								<div
									data-chapter-text
									className={`relative flex-1 lg:max-w-[50%] ${isImageRight ? 'lg:pr-4' : 'lg:pl-4'
										}`}
								>
									<div className="mb-7 flex items-center gap-4">
										{chapter.year ? (
											<>
												<span
													data-chapter-year
													className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-full border border-[#D6A45B]/55 bg-[#D6A45B]/[0.07] px-3 font-serif text-sm text-[#E5C58D] shadow-[0_0_25px_rgba(214,164,91,0.06)]"
												>
													{chapter.year}
												</span>

												<span className="h-px w-10 bg-[#D6A45B]/40" />
											</>
										) : (
											<span className="h-px w-12 bg-[#D6A45B]/50" />
										)}

										<span className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[#B7A991]">
											Capítulo {String(index + 1).padStart(2, '0')}
										</span>
									</div>

									<h2 className="font-serif text-[clamp(2rem,4vw,3.4rem)] font-normal leading-[1.12] tracking-[-0.025em] text-[#F4EEE5]">
										{chapter.title}
									</h2>

									<div className="mt-7 h-px w-16 bg-[#D6A45B]/50" />

									<div className="mt-7 space-y-5 text-[15px] leading-[1.95] text-[#C7C8BD] md:text-[17px] md:leading-[2]">
										{chapter.paragraphs.map((paragraph, pIndex) => (
											<p key={pIndex}>{paragraph}</p>
										))}
									</div>
								</div>

								{/* FOTOGRAFIA */}
								<div
									data-chapter-image
									className={`flex-1 lg:max-w-[50%] ${isImageRight ? 'lg:pl-4' : 'lg:pr-4'
										}`}
								>
									<div className="group relative">

										{/* Moldura decorativa */}
										<div className="absolute -bottom-3 -right-3 h-full w-full border border-[#D6A45B]/25 transition-transform duration-700 group-hover:translate-x-1 group-hover:translate-y-1 md:-bottom-4 md:-right-4" />

										<div
											className={`relative w-full overflow-hidden border border-[#D6A45B]/20 bg-[#1B3025] shadow-[0_25px_70px_rgba(0,0,0,0.28)] ${aspectClass}`}
										>
											<Image
												src={getAssetPath(chapter.image)}
												alt={chapter.imageAlt}
												fill
												className={`object-cover transition-transform duration-1000 group-hover:scale-[1.035] ${positionClass}`}
												sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 600px"
												loading="lazy"
											/>

											<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#14251D]/20 via-transparent to-transparent opacity-70" />
										</div>

										{/* Detalhe da moldura */}
										<div className="absolute -left-2 -top-2 h-8 w-8 border-l border-t border-[#D6A45B]/60" />
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</section>

			{/* GALERIA DE MOMENTOS */}
			<section className="relative overflow-hidden border-y border-[#D6A45B]/10 bg-[#101D17] px-6 py-24 md:px-12 md:py-32">

				{/* Luz de fundo */}
				<div className="pointer-events-none absolute -right-40 top-0 h-[400px] w-[400px] rounded-full bg-[#D6A45B]/[0.035] blur-[100px]" />

				<div className="relative mx-auto max-w-[1440px]">

					<div className="mb-14 text-center md:mb-20">
						<span className="text-[9px] font-semibold uppercase tracking-[0.35em] text-[#D6A45B]">
							Fragmentos de felicidade
						</span>

						<h2 className="mt-4 font-serif text-3xl font-normal text-[#F4EEE5] md:text-5xl">
							Momentos Especiais
						</h2>

						<p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-[#AEB5AA] md:text-base">
							Pequenos instantes que guardamos com carinho e que fazem parte da nossa história.
						</p>

						<div className="mx-auto mt-7 h-px w-16 bg-[#D6A45B]/50" />
					</div>

					<div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
						{GALLERY_PHOTOS.map((photo, i) => (
							<div
								key={i}
								data-gallery-item
								className="group relative aspect-square overflow-hidden border border-[#D6A45B]/15 bg-[#1B3025] shadow-[0_10px_35px_rgba(0,0,0,0.18)] transition-all duration-500 hover:-translate-y-1 hover:border-[#D6A45B]/45 hover:shadow-[0_18px_45px_rgba(0,0,0,0.3)]"
							>
								<Image
									src={getAssetPath(photo.src)}
									alt={photo.alt}
									fill
									className="object-cover transition-transform duration-700 group-hover:scale-110"
									sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
									loading="lazy"
								/>

								<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#14251D]/35 via-transparent to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-100" />

								<div className="pointer-events-none absolute inset-2 border border-white/0 transition-all duration-500 group-hover:inset-3 group-hover:border-white/30" />
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ENCERRAMENTO */}
			<section
				data-story-closing
				className="relative overflow-hidden px-6 py-28 text-center md:py-36"
			>
				<div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D6A45B]/[0.045] blur-[100px]" />

				<div className="relative mx-auto max-w-3xl">

					<div className="mx-auto mb-10 flex h-[76px] w-[76px] items-center justify-center rounded-full border border-[#D6A45B]/35 bg-[#D6A45B]/[0.07]">
						<Heart
							size={34}
							strokeWidth={1.2}
							className="text-[#E5C58D]"
						/>
					</div>

					<span className="text-[9px] font-semibold uppercase tracking-[0.35em] text-[#D6A45B]">
						E a nossa história continua
					</span>

					<p className="mt-8 font-serif text-[clamp(1.7rem,4vw,3rem)] font-normal italic leading-[1.45] text-[#F4EEE5]">
						&ldquo;{OUR_STORY.closingQuote}&rdquo;
					</p>

					<div className="mx-auto mt-9 h-px w-16 bg-[#D6A45B]/50" />

					<p className="mt-8 font-serif text-2xl text-[#E5C58D] md:text-3xl">
						{OUR_STORY.signature}
					</p>

					<p className="mt-4 text-[9px] font-medium uppercase tracking-[0.3em] text-[#B7A991]">
						{OUR_STORY.closingVerseReference}
					</p>

					<div className="mt-14">
						<Link
							href="/"
							className="group inline-flex min-h-[54px] items-center justify-center gap-3 border border-[#D6A45B]/45 bg-[#D6A45B]/[0.06] px-8 py-4 text-[9px] font-semibold uppercase tracking-[0.22em] text-[#E5C58D] transition-all duration-300 hover:border-[#D6A45B] hover:bg-[#D6A45B] hover:text-[#14251D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D6A45B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#14251D]"
						>
							<ArrowLeft
								size={15}
								className="transition-transform duration-300 group-hover:-translate-x-1"
							/>
							Voltar ao Convite
						</Link>
					</div>
				</div>
			</section>
		</div>
	);
}
