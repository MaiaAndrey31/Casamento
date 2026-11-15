'use client';

import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { WEDDING_CONFIG, getAssetPath } from '@/config/wedding';

/**
 * Hero — Nossa Aliança
 * Seção principal do convite com nova logo, fotografia real do casal,
 * data em destaque, mensagem cristã e CTA para confirmação de presença.
 *
 * REFINAMENTO VISUAL:
 * - Faixa branca eliminada: section ocupa 100dvh com overflow-hidden,
 *   background primário escuro no próprio elemento para cobrir qualquer
 *   gap entre o header transparente e a imagem durante o carregamento.
 * - Logo aumentada ~25% com clamp responsivo + sobreposição sutil para contraste.
 * - Textos com hierarquia reforçada no desktop (data em clamp fluido, horário dourado).
 * - Degradê branco substituído por verde floresta profundo (#17291F) em camadas.
 * - Conteúdo com padding-top dinâmico para não ficar atrás do header sticky.
 */
export function Hero() {
	const scrollToNext = () => {
 const nextSection = document.getElementById('countdown');
 nextSection?.scrollIntoView({ behavior: 'smooth' });
	};

	return (
 <section
 id="inicio"
 className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#17291F]"
 >
 {/* Background image com overlay verde floresta composto */}
 <div data-hero-image className="absolute inset-0 z-0">
 <Image
 src={getAssetPath('bannerHero.png')}
 alt="Andrey e Amanda"
 fill
 priority
 className="object-cover object-center"
 sizes="100vw"
 />
 {/* Camada 1: escurecimento uniforme sutil para contraste da logo */}
 <div className="absolute inset-0 bg-[#17291F]/25" />
 {/* Camada 2: gradiente vertical — topo suave para header, base forte para textos */}
 <div className="absolute inset-0 bg-gradient-to-b from-[#17291F]/40 via-[#17291F]/15 to-[#17291F]/95" />
 </div>

 {/* Conteúdo — padding-top compensa o header sticky (~80px desktop, ~64px mobile) */}
 <div className="relative z-10 flex flex-col items-center px-gutter pt-20 text-center md:pt-24">
 {/* Nova Logo do Casamento — aumentada ~25% com clamp responsivo */}
 <div data-hero-logo className="mb-space-lg w-full max-w-[clamp(280px,40vw,600px)]">
 {/* Sobreposição localizada sutil atrás da logo para contraste em áreas claras da foto */}
 <div className="relative">
 <div className="absolute inset-0 -inset-x-8 -inset-y-4 rounded-full bg-[#17291F]/30 blur-2xl" />
 <Image
 src={getAssetPath('Logo de casamento Andrey & Amanda.png')}
 alt="Logo do casamento Andrey e Amanda"
 width={600}
 height={400}
 priority
 className="relative h-auto w-full drop-shadow-lg"
 sizes="(max-width: 768px) 280px, (max-width: 1200px) 40vw, 600px"
 />
 </div>
 </div>

 {/* Data em destaque — tipografia aumentada com clamp fluido */}
 <div data-hero-date className="mb-space-md space-y-2">
 <p className="text-label-md uppercase tracking-[0.25em] text-tertiary-fixed/90 drop-shadow-md md:text-title-sm">
 Sábado
 </p>
 <p className="text-headline-lg-mobile font-light text-surface-container-lowest drop-shadow-lg md:text-[clamp(2rem,5vw,4rem)] md:leading-none">
 12 DE DEZEMBRO DE 2026
 </p>
 <p className="text-headline-md font-medium text-[#D4AF37] drop-shadow-md md:text-headline-lg">
 19H
 </p>
 </div>

 {/* Mensagem principal — largura e tamanho ajustados */}
 <p data-hero-message className="max-w-xl text-body-lg italic text-surface-container-low/95 leading-relaxed drop-shadow-md md:text-headline-sm md:leading-loose">
 &ldquo;{WEDDING_CONFIG.heroMessage}&rdquo;
 </p>

 {/* Versículo — legibilidade aumentada */}
 <div data-hero-verse className="mt-space-lg max-w-lg">
 <p className="text-body-md text-surface-container-low/90 md:text-body-lg">
 &ldquo;{WEDDING_CONFIG.heroVerse}&rdquo;
 </p>
 <p className="mt-space-xs text-label-md uppercase tracking-widest text-tertiary-fixed-dim/90 md:text-title-sm">
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