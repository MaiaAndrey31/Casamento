'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Heart, ArrowLeft } from 'lucide-react';
import { getAssetPath } from '@/config/wedding';
import { OUR_STORY, GALLERY_PHOTOS } from '@/content/our-story';

gsap.registerPlugin(ScrollTrigger);

/**
 * Página Nossa História — /nossa-historia
 *
 * Layout editorial sofisticado tipo álbum de memórias.
 * Container amplo (max-w-7xl ~1280px), duas colunas equilibradas,
 * fotografias grandes com enquadramento individual por orientação,
 * tipografia reforçada para leitura confortável.
 *
 * Consome exclusivamente OUR_STORY de src/content/our-story.ts.
 */

/**
 * Define o aspect-ratio ideal por fotografia baseado na orientação real.
 * Fotos verticais usam containers verticais; horizontais usam containers horizontais.
 * Evita cortes de rosto e distorções.
 */
function getImageAspect(src: string): string {
	// Fotos conhecidas como verticais (retrato)
	const verticalPhotos = ['001.jpeg', '003.jpeg', '005.jpeg', '008.jpeg'];
	if (verticalPhotos.includes(src)) return 'aspect-[3/4]';
	// Fotos conhecidas como horizontais (paisagem) ou quadradas
	return 'aspect-[4/3]';
}

/**
 * Define object-position específico por fotografia para preservar rostos.
 */
function getImagePosition(src: string): string {
	const positions: Record<string, string> = {
		'001.jpeg': 'object-center object-top',
		'002.jpeg': 'object-center',
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
		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (prefersReducedMotion) return;

		const ctx = gsap.context(() => {
			// Título hero
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

			// Capítulos
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

			// Galeria extra
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

			// Encerramento
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
		<div ref={containerRef} className="min-h-screen bg-surface">
			{/* Hero */}
			<section className="relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden px-gutter py-space-2xl text-center">
				<div className="absolute inset-0 z-0 opacity-5">
					<Image
						src={getAssetPath('bannerHero.png')}
						alt=""
						fill
						className="object-cover grayscale"
						sizes="100vw"
					/>
				</div>
				<div className="relative z-10 mx-auto max-w-3xl space-y-space-md">
					<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary-container shadow-md">
						<Heart size={36} className="text-tertiary-fixed-dim" />
					</div>
					<h1 data-story-hero-title className="text-[clamp(2.5rem,6vw,4.5rem)] font-serif leading-tight text-primary">
						Nossa História
					</h1>
					<p data-story-hero-subtitle className="text-xl italic text-on-surface-variant md:text-2xl">
						{OUR_STORY.subtitle}
					</p>
					<div className="mx-auto h-px w-32 bg-tertiary-fixed-dim/40" />
				</div>
			</section>

			{/* Capítulos da história — Layout editorial amplo */}
			<section className="mx-auto max-w-7xl px-6 pb-24 md:px-12 lg:px-16">
				<div className="space-y-20 md:space-y-28">
					{OUR_STORY.chapters.map((chapter) => {
						const isImageRight = chapter.imagePosition === 'right';
						const aspectClass = getImageAspect(chapter.image);
						const positionClass = getImagePosition(chapter.image);

						return (
							<div
								key={chapter.id}
								data-story-chapter
								className={`flex flex-col gap-8 md:gap-16 lg:flex-row lg:items-start ${
									isImageRight ? '' : 'lg:flex-row-reverse'
								}`}
							>
								{/* Texto */}
								<div
									data-chapter-text
									className={`flex-1 lg:max-w-[55%] ${isImageRight ? 'lg:pr-8 lg:text-left' : 'lg:pl-8 lg:text-left'}`}
								>
									{chapter.year && (
										<span
											data-chapter-year
											className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-tertiary-fixed-dim bg-surface-container-lowest text-base font-bold text-primary-container shadow-sm"
										>
											{chapter.year}
										</span>
									)}
									<h2 className={`${chapter.year ? 'mt-3' : ''} text-[clamp(1.75rem,3.5vw,2.75rem)] font-serif leading-tight text-primary`}>
										{chapter.title}
									</h2>
									<div className="mt-6 space-y-5 text-lg leading-[1.8] text-on-surface-variant md:text-xl md:leading-[1.85]">
										{chapter.paragraphs.map((paragraph, pIndex) => (
											<p key={pIndex}>{paragraph}</p>
										))}
									</div>
								</div>

								{/* Fotografia */}
								<div
									data-chapter-image
									className={`flex-1 lg:max-w-[45%] ${isImageRight ? 'lg:pl-8' : 'lg:pr-8'}`}
								>
									<div className={`relative w-full overflow-hidden rounded-2xl border border-outline-variant/15 shadow-xl ${aspectClass}`}>
										<Image
											src={getAssetPath(chapter.image)}
											alt={chapter.imageAlt}
											fill
											className={`object-cover ${positionClass}`}
											sizes="(max-width: 768px) 100vw, (max-width: 1280px) 45vw, 560px"
											loading="lazy"
										/>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</section>

			{/* Galeria de momentos extras */}
			<section className="bg-surface-container-low px-6 py-24 md:px-12">
				<div className="mx-auto max-w-7xl">
					<h2 className="mb-12 text-center text-[clamp(1.75rem,3.5vw,2.75rem)] font-serif text-primary">
						Momentos Especiais
					</h2>
					<div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
						{GALLERY_PHOTOS.map((photo, i) => (
							<div
								key={i}
								data-gallery-item
								className="group relative aspect-square overflow-hidden rounded-xl border border-outline-variant/15 shadow-sm transition-shadow hover:shadow-lg"
							>
								<Image
									src={getAssetPath(photo.src)}
									alt={photo.alt}
									fill
									className="object-cover transition-transform duration-500 group-hover:scale-105"
									sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
									loading="lazy"
								/>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Encerramento */}
			<section data-story-closing className="mx-auto max-w-3xl px-6 py-24 text-center">
				<div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-tertiary-fixed/20">
					<Heart size={36} className="text-primary-container" />
				</div>
				<p className="text-[clamp(1.5rem,3vw,2.25rem)] font-serif italic leading-snug text-primary">
					&ldquo;{OUR_STORY.closingQuote}&rdquo;
				</p>
				<p className="mt-6 text-2xl font-serif text-primary-container">
					{OUR_STORY.signature}
				</p>
				<p className="mt-3 text-sm uppercase tracking-widest text-tertiary-fixed-dim/90">
					{OUR_STORY.closingVerseReference}
				</p>
				<div className="mx-auto mt-12 h-px w-32 bg-tertiary-fixed-dim/40" />
				<Link
					href="/"
					className="mt-12 inline-flex items-center gap-2 rounded-md border border-outline-variant/30 bg-surface-container-lowest px-8 py-4 text-label-md uppercase tracking-widest text-primary transition-colors hover:bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-tertiary-fixed-dim"
				>
					<ArrowLeft size={16} />
					Voltar ao Convite
				</Link>
			</section>
		</div>
	);
}