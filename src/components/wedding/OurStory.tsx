'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { WEDDING_CONFIG, getAssetPath } from '@/config/wedding';

/**
 * Nossa História — Seção com timeline visual e texto completo.
 * Apresenta os 4 momentos da história de Andrey e Amanda
 * com fotografias reais e texto oficial fornecido pelos noivos.
 */
export function OurStory() {
	const [isExpanded, setIsExpanded] = useState(false);

	return (
		<section id="nossa-historia" className="bg-surface py-space-2xl px-gutter">
			<div className="mx-auto max-w-3xl">
				{/* Título da seção */}
				<div className="mb-space-2xl text-center">
					<span className="text-label-md uppercase tracking-widest text-tertiary-fixed-dim">
						{WEDDING_CONFIG.storySubtitle}
					</span>
					<h2 className="mt-space-sm text-headline-lg-mobile text-primary md:text-headline-lg">
						{WEDDING_CONFIG.storyTitle}
					</h2>
					<div className="mx-auto mt-space-md h-px w-16 bg-tertiary-fixed-dim/40" />
				</div>

				{/* Timeline visual */}
				<div className="relative space-y-space-xl">
					{/* Linha vertical decorativa */}
					<div className="absolute left-4 top-0 bottom-0 w-px bg-outline-variant/30 md:left-1/2 md:-translate-x-px" />

					{WEDDING_CONFIG.storyTimeline.map((item, index) => {
						const isEven = index % 2 === 0;
						const hasImage = item.imageAsset !== undefined;

						return (
							<div
								key={index}
								className={`relative flex flex-col gap-space-md md:flex-row md:items-center ${
									isEven ? 'md:flex-row' : 'md:flex-row-reverse'
								}`}
							>
								{/* Marcador na timeline */}
								<div className="absolute left-4 z-10 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border-2 border-tertiary-fixed-dim bg-surface-container-lowest shadow-sm md:left-1/2">
									<span className="text-body-sm font-semibold text-primary-container">
										{item.year || '✦'}
									</span>
								</div>

								{/* Conteúdo textual */}
								<div className={`ml-12 flex-1 md:ml-0 ${isEven ? 'md:pr-12 md:text-right' : 'md:pl-12 md:text-left'}`}>
									<span className="text-label-sm uppercase tracking-widest text-on-surface-variant">
										{item.label}
									</span>
									<h3 className="mt-space-xs text-headline-sm text-primary">
										{item.title}
									</h3>
									<p className="mt-space-sm text-body-md text-on-surface-variant leading-relaxed">
										{item.description}
									</p>
								</div>

								{/* Fotografia */}
								{hasImage && (
									<div className={`ml-12 flex-1 md:ml-0 ${isEven ? 'md:pl-12' : 'md:pr-12'}`}>
										<div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-outline-variant/20 shadow-md">
											<Image
												src={getAssetPath(item.imageAsset!)}
												alt={`${item.title} — ${item.label}`}
												fill
												className="object-cover"
												sizes="(max-width: 768px) 100vw, 50vw"
											/>
										</div>
									</div>
								)}
							</div>
						);
					})}
				</div>

				{/* Texto completo expansível */}
				<div className="mt-space-2xl border-t border-outline-variant/20 pt-space-xl">
					<div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-48 opacity-80'}`}>
						<div className="prose prose-neutral mx-auto max-w-2xl text-body-md text-on-surface-variant leading-loose whitespace-pre-line">
							{WEDDING_CONFIG.storyFullText}
						</div>
					</div>

					{/* Gradiente de fade quando colapsado */}
					{!isExpanded && (
						<div className="mt-[-4rem] h-16 bg-gradient-to-t from-surface to-transparent" />
					)}

					{/* Botões de ação */}
					<div className="mt-space-md flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
						<button
							onClick={() => setIsExpanded(!isExpanded)}
							className="flex items-center gap-2 rounded-md border border-outline-variant/30 bg-surface-container-low px-6 py-3 text-label-md uppercase tracking-widest text-primary transition-colors hover:bg-surface-container hover:border-tertiary-fixed-dim/40 focus:outline-none focus:ring-2 focus:ring-tertiary-fixed-dim focus:ring-offset-2"
							aria-expanded={isExpanded}
						>
							{isExpanded ? (
								<>
									Ler menos <ChevronUp size={16} />
								</>
							) : (
								<>
									Ler resumo <ChevronDown size={16} />
								</>
							)}
						</button>
						<Link
							href="/nossa-historia"
							className="inline-flex items-center gap-2 rounded-md bg-primary-container px-6 py-3 text-label-md uppercase tracking-widest text-tertiary-fixed shadow-md transition-all hover:bg-secondary hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-tertiary-fixed-dim focus:ring-offset-2"
						>
							Conheça nossa história completa <ArrowRight size={16} />
						</Link>
					</div>
				</div>

				{/* Assinatura */}
				<div className="mt-space-2xl text-center">
					<p className="text-headline-sm italic text-primary">
						Com amor,
					</p>
					<p className="mt-space-xs text-title-md text-primary-container">
						{WEDDING_CONFIG.coupleNames}
					</p>
				</div>
			</div>
		</section>
	);
}