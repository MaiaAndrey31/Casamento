'use client';

import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { WEDDING_CONFIG, getAssetPath } from '@/config/wedding';

/**
 * Hero — Nossa Aliança
 * Seção principal do convite com fotografia real do casal,
 * mensagem cristã e CTA para confirmação de presença.
 */
export function Hero() {
 const scrollToNext = () => {
 const nextSection = document.getElementById('countdown');
 nextSection?.scrollIntoView({ behavior: 'smooth' });
 };

 return (
 <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
 {/* Background image com overlay */}
 <div className="absolute inset-0 z-0">
 <Image
 src={getAssetPath('Casal Feliz no Jardim Dourado.png')}
 alt="Andrey e Amanda em jardim dourado"
 fill
 priority
 className="object-cover object-center"
 sizes="100vw"
 />
 {/* Overlay gradiente para legibilidade do texto */}
 <div className="absolute inset-0 bg-gradient-to-b from-primary/40 via-primary/20 to-surface" />
 </div>

 {/* Conteúdo */}
 <div className="relative z-10 flex flex-col items-center px-gutter text-center pt-safe">
 {/* Monograma */}
 <div className="mb-space-md flex h-24 w-24 items-center justify-center rounded-full border border-tertiary-fixed-dim/30 bg-surface-container-lowest/80 backdrop-blur-sm shadow-lg md:h-32 md:w-32">
 <span className="text-headline-md text-primary-container md:text-display-hero-mobile">
 {WEDDING_CONFIG.monogram}
 </span>
 </div>

 {/* Nomes */}
 <h1 className="mb-space-sm text-display-hero-mobile text-surface-container-lowest drop-shadow-lg md:text-display-hero">
 {WEDDING_CONFIG.coupleNames}
 </h1>

 {/* Mensagem principal */}
 <p className="max-w-lg text-body-lg italic text-surface-container-low drop-shadow-md md:text-headline-sm">
 &ldquo;{WEDDING_CONFIG.heroMessage}&rdquo;
 </p>

 {/* Versículo */}
 <div className="mt-space-md max-w-md">
 <p className="text-body-md text-surface-container-low/90">
 &ldquo;{WEDDING_CONFIG.heroVerse}&rdquo;
 </p>
 <p className="mt-space-xs text-label-md uppercase tracking-widest text-tertiary-fixed-dim">
 {WEDDING_CONFIG.heroVerseReference}
 </p>
 </div>

 {/* CTA */}
 <a
 href="/confirmar-presenca"
 className="mt-space-xl inline-flex items-center gap-2 rounded-md bg-primary-container px-8 py-4 text-label-md uppercase tracking-widest text-tertiary-fixed shadow-lg transition-all hover:bg-secondary hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-tertiary-fixed-dim focus:ring-offset-2 focus:ring-offset-primary-container"
 >
 Confirmar minha presença
 </a>
 </div>

 {/* Scroll indicator */}
 <button
 onClick={scrollToNext}
 aria-label="Rolar para próxima seção"
 className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-bounce text-surface-container-lowest/70 transition-colors hover:text-surface-container-lowest pb-safe"
 >
 <ChevronDown size={32} strokeWidth={1.5} />
 </button>
 </section>
 );
}