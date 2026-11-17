
'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { WEDDING_CONFIG, getAssetPath } from '@/config/wedding';
import { HOME_TIMELINE_SUMMARY, OUR_STORY } from '@/content/our-story';

export function OurStory() {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <section
            id="nossa-historia"
            className="relative overflow-hidden bg-[#F5EFE3] px-gutter py-24 md:py-32"
        >
            {/* Textura decorativa de fundo */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.16]"
                style={{
                    backgroundImage:
                        'radial-gradient(#C6A15B 0.6px, transparent 0.6px)',
                    backgroundSize: '24px 24px',
                }}
            />

            <div className="relative mx-auto max-w-6xl">

                {/* Cabeçalho */}
                <header className="mb-20 text-center md:mb-28">
                    <span className="inline-flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.35em] text-[#A8864E] md:text-xs">
                        <span className="h-px w-8 bg-[#C6A15B]/70" />
                        {OUR_STORY.subtitle}
                        <span className="h-px w-8 bg-[#C6A15B]/70" />
                    </span>

                    <h2 className="mt-6 font-serif text-4xl font-normal leading-tight tracking-tight text-[#26382D] sm:text-5xl md:text-6xl">
                        {WEDDING_CONFIG.storyTitle}
                    </h2>

                    <div className="mt-8 flex items-center justify-center gap-3">
                        <span className="h-px w-12 bg-[#C6A15B]/50" />
                        <span className="text-sm text-[#B18B50]">✦</span>
                        <span className="h-px w-12 bg-[#C6A15B]/50" />
                    </div>
                </header>

                {/* Timeline */}
                <div className="relative space-y-20 md:space-y-28">

                    {/* Linha vertical */}
                    <div
                        aria-hidden="true"
                        className="absolute bottom-0 left-[15px] top-0 w-px bg-[#C6A15B]/35 md:left-1/2"
                    />

                    {HOME_TIMELINE_SUMMARY.map((item, index) => {
                        const isEven = index % 2 === 0;

                        return (
                            <article
                                key={index}
                                className="relative pl-12 md:pl-0"
                            >
                                {/* Marcador da timeline */}
                                <div className="absolute left-[15px] top-5 z-10 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-[#C6A15B] bg-[#F5EFE3] md:left-1/2 md:top-1/2 md:-translate-y-1/2">
                                    <span className="font-serif text-[10px] text-[#9B7945]">
                                        {item.year || '✦'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-16">

                                    {/* Texto */}
                                    <div
                                        className={`flex flex-col justify-center ${
                                            isEven
                                                ? 'md:col-start-1 md:row-start-1 md:pr-8 md:text-right'
                                                : 'md:col-start-2 md:row-start-1 md:pl-8 md:text-left'
                                        }`}
                                    >
                                        <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#A8864E] md:text-xs">
                                            {item.label}
                                        </span>

                                        <h3 className="mt-4 font-serif text-3xl font-normal leading-tight text-[#26382D] md:text-4xl">
                                            {item.title}
                                        </h3>

                                        <div
                                            className={`mt-5 flex items-center gap-2 ${
                                                isEven
                                                    ? 'md:justify-end'
                                                    : 'md:justify-start'
                                            }`}
                                        >
                                            <span className="h-px w-8 bg-[#C6A15B]/70" />
                                            <span className="text-xs text-[#B18B50]">
                                                ✦
                                            </span>
                                        </div>

                                        <p className="mt-5 max-w-md text-sm leading-8 text-[#625E53] md:text-base md:leading-9">
                                            {item.description}
                                        </p>
                                    </div>

                                    {/* Fotografia */}
                                    <div
                                        className={`${
                                            isEven
                                                ? 'md:col-start-2 md:row-start-1 md:pl-8'
                                                : 'md:col-start-1 md:row-start-1 md:pr-8'
                                        }`}
                                    >
                                        <div className="group relative">
                                            {/* Moldura externa */}
                                            <div className="absolute -inset-2 border border-[#C6A15B]/35 transition-transform duration-700 group-hover:inset-0" />

                                            <div className="relative aspect-[4/3] overflow-hidden bg-[#E9DFCE]">
                                                <Image
                                                    src={getAssetPath(item.imageAsset)}
                                                    alt={`${item.title} — ${item.label}`}
                                                    fill
                                                    className="object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.04]"
                                                    sizes="(max-width: 768px) 100vw, 50vw"
                                                />

                                                <div className="pointer-events-none absolute inset-0 bg-[#26382D]/[0.06] transition-opacity duration-500 group-hover:opacity-0" />
                                            </div>

                                            {/* Detalhe inferior */}
                                            <div className="mt-4 flex items-center justify-between">
                                                <span className="text-[9px] uppercase tracking-[0.25em] text-[#9B8B70]">
                                                    {item.label}
                                                </span>
                                                <span className="text-xs text-[#B18B50]">
                                                    ✦
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </article>
                        );
                    })}
                </div>

                {/* História completa expansível */}
                <div className="mx-auto mt-24 max-w-3xl border-t border-[#C6A15B]/30 pt-12 md:mt-32 md:pt-16">

                    <div className="relative">
                        <div
                            className={`overflow-hidden transition-[max-height,opacity] duration-700 ease-in-out ${
                                isExpanded
                                    ? 'max-h-[5000px] opacity-100'
                                    : 'max-h-48 opacity-80'
                            }`}
                        >
                            <div className="whitespace-pre-line font-serif text-base leading-[2.1] text-[#625E53] md:text-lg md:leading-[2.2]">
                                {WEDDING_CONFIG.storyFullText}
                            </div>
                        </div>

                        {!isExpanded && (
                            <div
                                aria-hidden="true"
                                className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#F5EFE3] via-[#F5EFE3]/80 to-transparent"
                            />
                        )}
                    </div>

                    {/* Ações */}
                    <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">

                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            aria-expanded={isExpanded}
                            className="group inline-flex min-h-12 items-center justify-center gap-3 border border-[#C6A15B]/50 px-7 py-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[#526052] transition-all duration-300 hover:border-[#A8864E] hover:bg-[#EDE4D5] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:ring-offset-2 focus:ring-offset-[#F5EFE3]"
                        >
                            {isExpanded ? 'Ler menos' : 'Ler resumo'}

                            {isExpanded ? (
                                <ChevronUp size={15} strokeWidth={1.5} />
                            ) : (
                                <ChevronDown size={15} strokeWidth={1.5} />
                            )}
                        </button>

                        <Link
                            href="/nossa-historia"
                            className="group inline-flex min-h-12 items-center justify-center gap-3 bg-[#26382D] px-7 py-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[#F5EFE3] transition-all duration-300 hover:bg-[#354B3C] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:ring-offset-2 focus:ring-offset-[#F5EFE3]"
                        >
                            Nossa história completa

                            <ArrowRight
                                size={15}
                                strokeWidth={1.5}
                                className="transition-transform duration-300 group-hover:translate-x-1"
                            />
                        </Link>
                    </div>
                </div>

                {/* Assinatura */}
                <footer className="mt-24 text-center md:mt-32">
                    <p className="font-serif text-xl italic text-[#7B7568] md:text-2xl">
                        Com amor,
                    </p>

                    <p className="mt-3 font-serif text-3xl font-normal tracking-wide text-[#26382D] md:text-4xl">
                        {WEDDING_CONFIG.coupleNames}
                    </p>

                    <div className="mt-6 flex items-center justify-center gap-3">
                        <span className="h-px w-8 bg-[#C6A15B]/50" />
                        <span className="text-sm text-[#B18B50]">✦</span>
                        <span className="h-px w-8 bg-[#C6A15B]/50" />
                    </div>
                </footer>

            </div>
        </section>
    );
}
