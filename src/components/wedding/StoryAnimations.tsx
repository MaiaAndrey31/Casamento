'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Animações GSAP para a seção Nossa História.
 *
 * Desktop: composição lateral com texto e fotografia alternados,
 * revelação progressiva durante o scroll com pin discreto por momento.
 *
 * Mobile: narrativa vertical fluida com fade-in sequencial.
 *
 * Respeita prefers-reduced-motion: desativa todas as animações
 * e exibe o conteúdo estático imediatamente.
 */
export function StoryAnimations() {
	const sectionRef = useRef<HTMLElement>(null);
	const timelineItemsRef = useRef<HTMLDivElement[]>([]);

	useEffect(() => {
 // Verificar preferência de movimento reduzido
 const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 if (prefersReducedMotion) return;

 const ctx = gsap.context(() => {
 // Animação de entrada dos itens da timeline
 timelineItemsRef.current.forEach((item, index) => {
 if (!item) return;

 const isEven = index % 2 === 0;
 const imageEl = item.querySelector('[data-story-image]');
 const textEl = item.querySelector('[data-story-text]');
 const markerEl = item.querySelector('[data-story-marker]');

 // Marcador da timeline
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

 // Texto — slide lateral + fade
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

 // Fotografia — scale + fade com parallax discreto
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

 // Parallax sutil na imagem durante o scroll
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

 // Animação do título da seção
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

 // Animação do texto completo expansível
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
 Uma história escrita por Deus, vivida por nós.
 </span>
 <h2 className="mt-space-sm text-headline-lg-mobile text-primary md:text-headline-lg">
 Nossa História
 </h2>
 <div className="mx-auto mt-space-md h-px w-16 bg-tertiary-fixed-dim/40" />
 </div>

 {/* Timeline com 4 momentos */}
 <div className="relative space-y-space-2xl md:space-y-32">
 {/* Linha vertical decorativa (desktop) */}
 <div className="absolute left-4 top-0 bottom-0 hidden w-px bg-outline-variant/20 md:left-1/2 md:block md:-translate-x-px" />

 {/* Momento 1: 2011 */}
 <div
 ref={(el) => { if (el) timelineItemsRef.current[0] = el; }}
 className="relative flex flex-col gap-space-lg md:flex-row md:items-center"
 >
 <div data-story-marker className="absolute left-4 z-10 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border-2 border-tertiary-fixed-dim bg-surface-container-lowest shadow-sm md:left-1/2">
 <span className="text-body-sm font-bold text-primary-container">2011</span>
 </div>
 <div data-story-text className="ml-12 flex-1 md:ml-0 md:pr-16 md:text-right">
 <span className="text-label-sm uppercase tracking-widest text-on-surface-variant">Os primeiros olhares</span>
 <h3 className="mt-space-xs text-headline-md text-primary">Onde tudo começou</h3>
 <p className="mt-space-sm text-body-lg leading-relaxed text-on-surface-variant">
 Em meio à rotina de uma pequena loja no centro de Suzano e aos caminhos que o Andrey percorria todos os dias, nossos olhares começaram a se encontrar. Entre cumprimentos, sorrisos discretos e uma amizade sincera, algo bonito começava a nascer.
 </p>
 </div>
 <div data-story-image className="ml-12 flex-1 md:ml-0 md:pl-16">
 <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-outline-variant/20 shadow-lg">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img
 src="/assets/image.png"
 alt="Andrey e Amanda em 2011 — os primeiros olhares"
 className="h-full w-full object-cover"
 loading="lazy"
 />
 </div>
 </div>
 </div>

 {/* Momento 2: 2021 */}
 <div
 ref={(el) => { if (el) timelineItemsRef.current[1] = el; }}
 className="relative flex flex-col gap-space-lg md:flex-row-reverse md:items-center"
 >
 <div data-story-marker className="absolute left-4 z-10 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border-2 border-tertiary-fixed-dim bg-surface-container-lowest shadow-sm md:left-1/2">
 <span className="text-body-sm font-bold text-primary-container">2021</span>
 </div>
 <div data-story-text className="ml-12 flex-1 md:ml-0 md:pl-16 md:text-left">
 <span className="text-label-sm uppercase tracking-widest text-on-surface-variant">Nosso reencontro</span>
 <h3 className="mt-space-xs text-headline-md text-primary">Um simples &ldquo;oi&rdquo;</h3>
 <p className="mt-space-sm text-body-lg leading-relaxed text-on-surface-variant">
 Dez anos depois, nossos caminhos se cruzaram novamente. O que parecia ser somente um reencontro se transformou em conversas, novos sorrisos, um pedido de namoro e no início de uma das partes mais bonitas das nossas vidas.
 </p>
 </div>
 <div data-story-image className="ml-12 flex-1 md:ml-0 md:pr-16">
 <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-outline-variant/20 shadow-lg">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img
 src="/assets/WhatsApp Image 2026-11-14 at 20.14.43.jpeg"
 alt="Andrey e Amanda em 2021 — o reencontro"
 className="h-full w-full object-cover"
 loading="lazy"
 />
 </div>
 </div>
 </div>

 {/* Momento 3: Nossa Caminhada */}
 <div
 ref={(el) => { if (el) timelineItemsRef.current[2] = el; }}
 className="relative flex flex-col gap-space-lg md:flex-row md:items-center"
 >
 <div data-story-marker className="absolute left-4 z-10 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border-2 border-tertiary-fixed-dim bg-surface-container-lowest shadow-sm md:left-1/2">
 <span className="text-body-sm font-bold text-primary-container">✦</span>
 </div>
 <div data-story-text className="ml-12 flex-1 md:ml-0 md:pr-16 md:text-right">
 <span className="text-label-sm uppercase tracking-widest text-on-surface-variant">Nossa caminhada</span>
 <h3 className="mt-space-xs text-headline-md text-primary">Amor que amadureceu</h3>
 <p className="mt-space-sm text-body-lg leading-relaxed text-on-surface-variant">
 Encontramos um no outro acolhimento, companheirismo, compreensão e um amor que nos ajudou a crescer e a cuidar das feridas do passado. Em cada etapa, Deus foi nos ensinando que o verdadeiro amor se constrói na fé, na parceria e na decisão diária de cuidar um do outro.
 </p>
 </div>
 <div data-story-image className="ml-12 flex-1 md:ml-0 md:pl-16">
 <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-outline-variant/20 shadow-lg">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img
 src="/assets/bannerHero.png"
 alt="Andrey e Amanda — nossa caminhada de amor e fé"
 className="h-full w-full object-cover"
 loading="lazy"
 />
 </div>
 </div>
 </div>

 {/* Momento 4: Nossa Aliança */}
 <div
 ref={(el) => { if (el) timelineItemsRef.current[3] = el; }}
 className="relative flex flex-col gap-space-lg md:flex-row-reverse md:items-center"
 >
 <div data-story-marker className="absolute left-4 z-10 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border-2 border-tertiary-fixed-dim bg-surface-container-lowest shadow-sm md:left-1/2">
 <span className="text-body-sm font-bold text-primary-container">💍</span>
 </div>
 <div data-story-text className="ml-12 flex-1 md:ml-0 md:pl-16 md:text-left">
 <span className="text-label-sm uppercase tracking-widest text-on-surface-variant">Nossa aliança</span>
 <h3 className="mt-space-xs text-headline-md text-primary">Um novo capítulo</h3>
 <p className="mt-space-sm text-body-lg leading-relaxed text-on-surface-variant">
 Hoje firmamos uma aliança diante de Deus, colocando Jesus Cristo no centro da nossa família e entregando a Ele todos os capítulos que ainda vamos escrever. Porque o amor verdadeiro não é apenas encontrar alguém com quem dividir os dias, mas encontrar alguém com quem queremos viver os propósitos de Deus.
 </p>
 </div>
 <div data-story-image className="ml-12 flex-1 md:ml-0 md:pr-16">
 <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-outline-variant/20 shadow-lg">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img
 src="/assets/Abraço Romântico ao Pôr do Sol (1).png"
 alt="Andrey e Amanda — nossa aliança diante de Deus"
 className="h-full w-full object-cover"
 loading="lazy"
 />
 </div>
 </div>
 </div>
 </div>

 {/* Assinatura */}
 <div data-story-fulltext className="mt-space-2xl text-center">
 <p className="text-headline-sm italic text-primary">Com amor,</p>
 <p className="mt-space-xs text-title-md text-primary-container">Andrey & Amanda</p>
 </div>
 </div>
 </section>
	);
}