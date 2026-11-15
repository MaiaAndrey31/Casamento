'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { WEDDING_CONFIG } from '@/config/wedding';
import { HOME_TIMELINE_SUMMARY, OUR_STORY } from '@/content/our-story';
import { getAssetPath } from '@/config/wedding';

gsap.registerPlugin(ScrollTrigger);

/**
 * StoryAnimations — Seção Nossa História da home com animações GSAP.
 *
 * Consome HOME_TIMELINE_SUMMARY da fonte canônica src/content/our-story.ts.
 * Desktop: composição lateral com texto e fotografia alternados,
 * revelação progressiva durante o scroll com pin discreto por momento.
 * Mobile: narrativa vertical fluida com fade-in sequencial.
 * Respeita prefers-reduced-motion.
 */
export function StoryAnimations() {
	const sectionRef = useRef<HTMLElement>(null);
	const timelineItemsRef = useRef<HTMLDivElement[]>([]);
	const [isExpanded, setIsExpanded] = useState(false);

	useEffect(() => {
		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (prefersReducedMotion) return;

		const ctx = gsap.context(() => {
			timelineItemsRef.current.forEach((item, index) => {
				if (!item) return;

				const isEven = index % 2 === 0;
				const imageEl = item.querySelector('[data-story-image]');
				const textEl = item.querySelector('[data-story-text]');
				const markerEl = item.querySelector('[data-story-marker]');

				if (markerEl) {
					gsap.from(markerEl, {
						scale: 0,
						opacity: 0,
						duration: 0.6,
						ease: 'back.out(1.7)',
						scrollTrigger: {
							trigger: item,
							start: 'top 80%',
							toggleActions: 'play none none reverse',
						},
					});
				}

				if (textEl) {
					gsap.from(textEl, {
						x: isEven ? -60 : 60,
						opacity: 0,
						duration: 0.8,
						ease: 'power3.out',
						scrollTrigger: {
							trigger: item,
							start: 'top 75%',
							toggleActions: 'play none none reverse',
						},
					});
				}

				if (imageEl) {
					gsap.from(imageEl, {
						scale: 0.9,
						opacity: 0,
						duration: 1,
						ease: 'power2.out',
						scrollTrigger: {
							trigger: item,
							start: 'top 75%',
							toggleActions: 'play none none reverse',
						},
					});

					gsap.to(imageEl, {
						yPercent: -8,
						ease: 'none',
						scrollTrigger: {
							trigger: item,
							start: 'top bottom',
							end: 'bottom top',
							scrub: 1,
						},
					});
				}
			});

			const titleEl = sectionRef.current?.querySelector('[data-story-title]');
			if (titleEl) {
				gsap.from(titleEl, {
					y: 40,
					opacity: 0,
					duration: 1,
					ease: 'power3.out',
					scrollTrigger: {
						trigger: titleEl,
						start: 'top 85%',
						toggleActions: 'play none none reverse',
					},
				});
			}

			const fullTextEl = sectionRef.current?.querySelector('[data-story-fulltext]');
			if (fullTextEl) {
				gsap.from(fullTextEl, {
					y: 30,
					opacity: 0,
					duration: 0.8,
					ease: 'power2.out',
					scrollTrigger: {
						trigger: fullTextEl,
						start: 'top 85%',
						toggleActions: 'play none none reverse',
					},
				});
			}
		}, sectionRef);

		return () => {
			ctx.revert();
		};
	}, []);

	return (
		<section
			ref={sectionRef}
			id="nossa-historia"
			className="bg-surface py-space-2xl px-gutter"
		>
			<div className="mx-auto max-w-4xl">
				{/* Título da seção */}
				<div data-story-title className="mb-space-2xl text-center">
					<span className="text-label-md uppercase tracking-widest text-tertiary-fixed-dim">
						{OUR_STORY.subtitle}
					</span>
					<h2 className="mt-space-sm text-headline-lg-mobile text-primary md:text-headline-lg">
						{WEDDING_CONFIG.storyTitle}
					</h2>
					<div className="mx-auto mt-space-md h-px w-16 bg-tertiary-fixed-dim/40" />
				</div>

				{/* Timeline com momentos da fonte canônica */}
				<div className="relative space-y-space-2xl md:space-y-32">
					{/* Linha vertical decorativa (desktop) */}
					<div className="absolute left-4 top-0 bottom-0 hidden w-px bg-outline-variant/20 md:left-1/2 md:block md:-translate-x-px" />

					{HOME_TIMELINE_SUMMARY.map((item, index) => {
						const isEven = index % 2 === 0;
						return (
							<div
								key={index}
								ref={(el) => { if (el) timelineItemsRef.current[index] = el; }}
								className={`relative flex flex-col gap-space-lg md:flex-row md:items-center ${
									isEven ? '' : 'md:flex-row-reverse'
								}`}
							>
								<div data-story-marker className="absolute left-4 z-10 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border-2 border-tertiary-fixed-dim bg-surface-container-lowest shadow-sm md:left-1/2">
									<span className="text-body-sm font-bold text-primary-container">
										{item.year || '✦'}
									</span>
								</div>
								<div data-story-text className={`ml-12 flex-1 md:ml-0 ${isEven ? 'md:pr-16 md:text-right' : 'md:pl-16 md:text-left'}`}>
									<span className="text-label-sm uppercase tracking-widest text-on-surface-variant">
										{item.label}
									</span>
									<h3 className="mt-space-xs text-headline-md text-primary">{item.title}</h3>
									<p className="mt-space-sm text-body-lg leading-relaxed text-on-surface-variant">
										{item.description}
									</p>
								</div>
								<div data-story-image className={`ml-12 flex-1 md:ml-0 ${isEven ? 'md:pl-16' : 'md:pr-16'}`}>
									<div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-outline-variant/20 shadow-lg">
										<Image
											src={getAssetPath(item.imageAsset)}
											alt={`${item.title} — ${item.label}`}
											fill
											className="object-cover"
											sizes="(max-width: 768px) 100vw, 50vw"
											loading="lazy"
										/>
									</div>
								</div>
							</div>
						);
					})}
				</div>

				{/* Texto completo expansível */}
				<div data-story-fulltext className="mt-space-2xl border-t border-outline-variant/20 pt-space-xl">
					<div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-48 opacity-80'}`}>
						<div className="prose prose-neutral mx-auto max-w-2xl text-body-md text-on-surface-variant leading-loose whitespace-pre-line">
							{WEDDING_CONFIG.storyFullText}
						</div>
					</div>

					{!isExpanded && (
						<div className="mt-[-4rem] h-16 bg-gradient-to-t from-surface to-transparent" />
					)}

					<div className="mt-space-md flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
						<button
							onClick={() => setIsExpanded(!isExpanded)}
							className="flex items-center gap-2 rounded-md border border-outline-variant/30 bg-surface-container-low px-6 py-3 text-label-md uppercase tracking-widest text-primary transition-colors hover:bg-surface-container hover:border-tertiary-fixed-dim/40 focus:outline-none focus:ring-2 focus:ring-tertiary-fixed-dim focus:ring-offset-2"
							aria-expanded={isExpanded}
						>
							{isExpanded ? (
								<>Ler menos <ChevronUp size={16} /></>
							) : (
								<>Ler resumo <ChevronDown size={16} /></>
							)}
						</button>
						<Link
							href="/nossa-historia"
							className="inline-flex items-center gap-2 rounded-md bg-primary-container px-6 py-3 text-label-md uppercase tracking-widest text-tertiary-fixed shadow-md transition-all hover:bg-secondary hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-tertiary-fixed-dim focus:ring-offset-2"
						>
							Leia nossa história completa <ArrowRight size={16} />
						</Link>
					</div>
				</div>

				{/* Assinatura */}
				<div className="mt-space-2xl text-center">
					<p className="text-headline-sm italic text-primary">Com amor,</p>
					<p className="mt-space-xs text-title-md text-primary-container">{WEDDING_CONFIG.coupleNames}</p>
				</div>
			</div>
		</section>
	);
}