'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Heart, ArrowLeft } from 'lucide-react';
import { WEDDING_CONFIG, getAssetPath } from '@/config/wedding';

gsap.registerPlugin(ScrollTrigger);

/**
 * Página Nossa História — /nossa-historia
 *
 * Narrativa editorial completa com fotografias reais intercaladas.
 * Experiência de leitura elegante, responsiva e com animações GSAP suaves.
 * Preserva o texto oficial aprovado e a identidade visual do Google Stitch.
 */

const STORY_CHAPTERS = [
	{
		year: '2011',
		title: 'Os Primeiros Olhares',
		text: `Nossa história começou em 2011, de um jeito simples, daqueles que a gente nem imagina que um dia se transformarão em algo tão especial.

Em meio à rotina de uma pequena loja no centro de Suzano e aos caminhos que o Andrey percorria todos os dias, nossos olhares começaram a se encontrar. Entre cumprimentos, sorrisos discretos e uma amizade sincera, algo bonito começava a nascer.

Naquele momento, não sabíamos o que o futuro nos reservava, muito menos que aqueles pequenos encontros fariam parte de uma história tão grande.`,
		image: 'image.png',
		imageAlt: 'Andrey e Amanda em 2011 — os primeiros olhares em Suzano',
		imagePosition: 'right' as const,
	},
	{
		year: '',
		title: 'O Tempo e os Caminhos da Vida',
		text: `Mas a vida tinha outros caminhos para nós.

O tempo passou, seguimos direções diferentes, vivemos nossas próprias histórias, enfrentamos desafios, conhecemos alegrias e também atravessamos momentos difíceis. Foram anos de aprendizados, mudanças e amadurecimento.

Cada um carregou suas experiências, algumas cicatrizes e muitos sonhos.`,
		image: '003.jpeg',
		imageAlt: 'Andrey e Amanda — caminhos da vida e amadurecimento',
		imagePosition: 'left' as const,
	},
	{
		year: '2021',
		title: 'O Reencontro',
		text: `Até que, dez anos depois, em 2021, nossos caminhos se cruzaram novamente.

E pensar que tudo começou com a intenção de dar apenas um simples "oi"...

O que parecia ser somente um reencontro se transformou em conversas, novos sorrisos, um pedido de namoro e, sem que percebêssemos, no início de uma das partes mais bonitas das nossas vidas.

Dessa vez, já não éramos as mesmas pessoas de 2011. Mas encontramos um no outro algo que talvez nem soubéssemos que precisávamos: acolhimento, companheirismo, compreensão e um amor que nos ajudou a crescer e a cuidar das feridas do passado.`,
		image: 'WhatsApp Image 2026-11-14 at 20.14.43.jpeg',
		imageAlt: 'Andrey e Amanda em 2021 — o reencontro que mudou tudo',
		imagePosition: 'right' as const,
	},
	{
		year: '',
		title: 'Nossa Caminhada Juntos',
		text: `Não foi uma caminhada sem desafios. Aprendemos que amar também é ter paciência, perdoar, compreender, escolher ficar e, principalmente, caminhar juntos, mesmo quando a estrada não é tão fácil.

E, em cada etapa, Deus foi nos ensinando que o verdadeiro amor não se constrói apenas nos dias felizes, mas também na fé, na parceria e na decisão diária de cuidar um do outro.

Hoje, quando olhamos para trás, conseguimos enxergar algo que antes não compreendíamos: Deus estava presente em cada detalhe da nossa história, mesmo quando ainda não conseguíamos perceber.`,
		image: '005.jpeg',
		imageAlt: 'Andrey e Amanda — caminhada de amor, fé e parceria',
		imagePosition: 'left' as const,
	},
	{
		year: '2026',
		title: 'Nossa Aliança Diante de Deus',
		text: `Aquele olhar de 2011 continua aqui. Mas agora ele carrega muito mais do que admiração. Carrega a certeza de um amor que amadureceu, de uma história que foi construída dia após dia e de dois corações que escolheram seguir na mesma direção.

Em 12 de dezembro de 2026, às 19h, celebraremos nosso casamento. Mais do que uma cerimônia, esse momento representa nossa decisão de construir uma família e uma vida juntos, colocando Jesus Cristo no centro do nosso relacionamento.

Porque, se aprendemos alguma coisa durante essa caminhada, é que o amor verdadeiro não é apenas encontrar alguém com quem dividir os dias, mas encontrar alguém com quem queremos viver os propósitos de Deus.

Nossa história começou com um olhar, ganhou um novo capítulo com um reencontro e agora se transforma em uma promessa para toda a vida.

E, se Deus nos permitiu chegar até aqui, é com Ele à frente que queremos continuar.`,
		image: '010.jpeg',
		imageAlt: 'Andrey e Amanda — aliança diante de Deus, 12 de dezembro de 2026',
		imagePosition: 'right' as const,
	},
];

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
 scale: 0.92,
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
 yPercent: -6,
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
 <section className="relative flex min-h-[50vh] flex-col items-center justify-center overflow-hidden px-gutter py-space-2xl text-center">
 <div className="absolute inset-0 z-0 opacity-5">
 <Image
 src={getAssetPath('bannerHero.png')}
 alt=""
 fill
 className="object-cover grayscale"
 sizes="100vw"
 />
 </div>
 <div className="relative z-10 mx-auto max-w-2xl space-y-space-md">
 <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-container shadow-md">
 <Heart size={28} className="text-tertiary-fixed-dim" />
 </div>
 <h1 data-story-hero-title className="text-display-hero-mobile text-primary md:text-display-hero">
 Nossa História
 </h1>
 <p data-story-hero-subtitle className="text-body-lg italic text-on-surface-variant md:text-headline-sm">
 Uma história escrita por Deus, vivida por nós.
 </p>
 <div className="mx-auto h-px w-24 bg-tertiary-fixed-dim/40" />
 </div>
 </section>

 {/* Capítulos da história */}
 <section className="mx-auto max-w-4xl px-gutter pb-space-2xl">
 <div className="space-y-space-2xl md:space-y-32">
 {STORY_CHAPTERS.map((chapter, index) => {
 const isImageRight = chapter.imagePosition === 'right';
 return (
 <div
 key={index}
 data-story-chapter
 className={`flex flex-col gap-space-lg md:flex-row md:items-center ${
 isImageRight ? '' : 'md:flex-row-reverse'
 }`}
 >
 {/* Texto */}
 <div
 data-chapter-text
 className={`flex-1 ${isImageRight ? 'md:pr-12 md:text-right' : 'md:pl-12 md:text-left'}`}
 >
 {chapter.year && (
 <span
 data-chapter-year
 className="mb-space-sm inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-tertiary-fixed-dim bg-surface-container-lowest text-body-sm font-bold text-primary-container shadow-sm"
 >
 {chapter.year}
 </span>
 )}
 <h2 className={`${chapter.year ? 'mt-space-sm' : ''} text-headline-md text-primary md:text-headline-lg`}>
 {chapter.title}
 </h2>
 <div className="mt-space-md whitespace-pre-line text-body-md leading-loose text-on-surface-variant md:text-body-lg">
 {chapter.text}
 </div>
 </div>

 {/* Fotografia */}
 <div
 data-chapter-image
 className={`flex-1 ${isImageRight ? 'md:pl-12' : 'md:pr-12'}`}
 >
 <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-outline-variant/20 shadow-lg">
 <Image
 src={getAssetPath(chapter.image)}
 alt={chapter.imageAlt}
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
 </section>

 {/* Galeria de momentos extras */}
 <section className="bg-surface-container-low px-gutter py-space-2xl">
 <div className="mx-auto max-w-4xl">
 <h2 className="mb-space-xl text-center text-headline-md text-primary md:text-headline-lg">
 Momentos Especiais
 </h2>
 <div className="grid grid-cols-2 gap-space-md md:grid-cols-3">
 {[
 { src: '001.jpeg', alt: 'Andrey e Amanda — momento especial 1' },
 { src: '0001.png', alt: 'Andrey e Amanda — momento especial 2' },
 { src: '002.jpeg', alt: 'Andrey e Amanda — momento especial 3' },
 { src: '008.jpeg', alt: 'Andrey e Amanda — momento especial 4' },
 { src: 'Casal Feliz no Jardim Dourado.png', alt: 'Andrey e Amanda no jardim dourado' },
 { src: 'Abraço Romântico ao Pôr do Sol (1).png', alt: 'Abraço romântico ao pôr do sol' },
 ].map((photo, i) => (
 <div
 key={i}
 data-gallery-item
 className="group relative aspect-square overflow-hidden rounded-xl border border-outline-variant/20 shadow-sm transition-shadow hover:shadow-md"
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
 <section data-story-closing className="mx-auto max-w-2xl px-gutter py-space-2xl text-center">
 <div className="mx-auto mb-space-md flex h-16 w-16 items-center justify-center rounded-full bg-tertiary-fixed/20">
 <Heart size={28} className="text-primary-container" />
 </div>
 <p className="text-headline-md italic text-primary md:text-headline-lg">
 &ldquo;Com Deus à frente, o amor nos conduz.&rdquo;
 </p>
 <p className="mt-space-sm text-title-md text-primary-container">
 {WEDDING_CONFIG.coupleNames}
 </p>
 <div className="mx-auto mt-space-xl h-px w-24 bg-tertiary-fixed-dim/40" />
 <Link
 href="/"
 className="mt-space-xl inline-flex items-center gap-2 rounded-md border border-outline-variant/30 bg-surface-container-lowest px-6 py-3 text-label-md uppercase tracking-widest text-primary transition-colors hover:bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-tertiary-fixed-dim"
 >
 <ArrowLeft size={16} />
 Voltar ao Convite
 </Link>
 </section>
 </div>
	);
}