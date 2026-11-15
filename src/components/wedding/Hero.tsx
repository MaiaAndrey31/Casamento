'use client';

import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { WEDDING_CONFIG, getAssetPath } from '@/config/wedding';

/**
 * Hero — Nossa Aliança
 * Seção principal do convite com nova logo, fotografia real do casal,
 * data em destaque, mensagem cristã e CTA para confirmação de presença.
 */
export function Hero() {
	const scrollToNext = () => {
 const nextSection = document.getElementById('countdown');
 nextSection?.scrollIntoView({ behavior: 'smooth' });
	};

	return (
 <section id="inicio" className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
 {/* Background image com overlay */}
 <div data-hero-image className="absolute inset-0 z-0">
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
 {/* Nova Logo do Casamento */}
 <div data-hero-logo className="mb-space-lg w-full max-w-[320px] md:max-w-[480px]">
 <Image
 src={getAssetPath('Logo de casamento Andrey & Amanda.png')}
 alt="Logo do casamento Andrey e Amanda"
 width={480}
 height={320}
 priority
 className="h-auto w-full drop-shadow-lg"
 sizes="(max-width: 768px) 320px, 480px"
 />
 </div>

 {/* Data em destaque */}
 <div data-hero-date className="mb-space-md space-y-1">
 <p className="text-label-md uppercase tracking-[0.2em] text-tertiary-fixed drop-shadow-md md:text-title-md">
 Sábado
 </p>
 <p className="text-headline-lg-mobile font-light text-surface-container-lowest drop-shadow-lg md:text-display-hero-mobile">
 12 DE DEZEMBRO DE 2026
 </p>
 <p className="text-headline-sm text-tertiary-fixed-dim drop-shadow-md md:text-headline-md">
 19H
 </p>
 </div>

 {/* Mensagem principal */}
 <p data-hero-message className="max-w-lg text-body-lg italic text-surface-container-low drop-shadow-md md:text-headline-sm">
 &ldquo;{WEDDING_CONFIG.heroMessage}&rdquo;
 </p>

 {/* Versículo */}
 <div data-hero-verse className="mt-space-md max-w-md">
 <p className="text-body-md text-surface-container-low/90">
 &ldquo;{WEDDING_CONFIG.heroVerse}&rdquo;
 </p>
 <p className="mt-space-xs text-label-md uppercase tracking-widest text-tertiary-fixed-dim">
 {WEDDING_CONFIG.heroVerseReference}
 </p>
 </div>

 {/* CTA */}
 <a
 data-hero-cta
 href="/confirmar-presenca"
 className="mt-space-xl inline-flex items-center gap-2 rounded-md bg-primary-container px-8 py-4 text-label-md uppercase tracking-widest text-tertiary-fixed shadow-lg transition-all hover:bg-secondary hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-tertiary-fixed-dim focus:ring-offset-2 focus:ring-offset-primary-container"
 >
 Confirmar minha presença
 </a>
 </div>

 {/* Scroll indicator */}
 <button
 data-hero-scroll
 onClick={scrollToNext}
 aria-label="Rolar para próxima seção"
 className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-bounce text-surface-container-lowest/70 transition-colors hover:text-surface-container-lowest pb-safe"
 >
 <ChevronDown size={32} strokeWidth={1.5} />
 </button>
 </section>
	);
}