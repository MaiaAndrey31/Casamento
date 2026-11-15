'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WEDDING_CONFIG } from '@/config/wedding';

/**
 * Navegação Desktop — Header sticky com scroll spy e transição de opacidade.
 *
 * - Transparente sobre o Hero, opaco com blur ao rolar.
 * - Indicador visual da seção ativa via IntersectionObserver.
 * - CTA "Confirmar Presença" destacado.
 * - Respeita prefers-reduced-motion.
 * - Acessível: <nav>, aria-current, foco visível, navegação por teclado.
 * - Não interfere nas animações GSAP existentes.
 * - Oculto em mobile (< md), onde WeddingNavigation já atua.
 */

const NAV_ITEMS: { label: string; href: string; sectionId: string | null }[] = [
	{ label: 'Início', href: '#inicio', sectionId: 'inicio' },
	{ label: 'Nossa História', href: '/nossa-historia', sectionId: null },
	{ label: 'O Grande Dia', href: '#detalhes', sectionId: 'detalhes' },
	{ label: 'Recados e Orações', href: '#recados', sectionId: 'recados' },
];

export function DesktopNav() {
	const pathname = usePathname();
	const [scrolled, setScrolled] = useState(false);
	const [activeSection, setActiveSection] = useState('inicio');

	// Detectar scroll para transição de opacidade
	useEffect(() => {
		const handleScroll = () => {
			setScrolled(window.scrollY > 80);
		};
		window.addEventListener('scroll', handleScroll, { passive: true });
		handleScroll();
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	// Scroll spy via IntersectionObserver
	useEffect(() => {
		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (prefersReducedMotion) return;

		const sectionIds = NAV_ITEMS.map(item => item.sectionId).filter((id): id is string => id !== null);
		const observers: IntersectionObserver[] = [];

		sectionIds.forEach(id => {
			const el = document.getElementById(id);
			if (!el) return;

			const observer = new IntersectionObserver(
				(entries) => {
					entries.forEach(entry => {
						if (entry.isIntersecting) {
							setActiveSection(id);
						}
					});
				},
				{ rootMargin: '-20% 0px -60% 0px', threshold: 0 },
			);
			observer.observe(el);
			observers.push(observer);
		});

		return () => observers.forEach(o => o.disconnect());
	}, []);

	// Se estiver em /convite/[token], o CTA deve apontar para o formulário RSVP da própria página
	const isInvitationPage = pathname.startsWith('/convite/');
	const ctaHref = isInvitationPage ? '#confirmar-presenca' : '/confirmar-presenca';

	return (
		<nav
			aria-label="Navegação principal"
			className={`fixed top-0 right-0 left-0 z-40 hidden transition-all duration-500 ease-in-out md:block ${
				scrolled
					? 'bg-surface-container-lowest/95 shadow-[0_2px_20px_rgba(24,37,27,0.06)] backdrop-blur-xl py-3'
					: 'bg-transparent py-5'
			}`}
		>
			<div className="mx-auto flex max-w-6xl items-center justify-between px-gutter-desktop">
				{/* Identidade do casal */}
				<Link
					href="/"
					className={`text-headline-sm transition-colors duration-300 ${
						scrolled ? 'text-primary' : 'text-surface-container-lowest drop-shadow-md'
					}`}
				>
					{WEDDING_CONFIG.coupleNames}
				</Link>

				{/* Links de navegação */}
				<ul className="flex items-center gap-1">
					{NAV_ITEMS.map(item => {
						const isActive = activeSection === item.sectionId;
						return (
							<li key={item.sectionId}>
								<a
									href={item.href}
									aria-current={isActive ? 'true' : undefined}
									className={`relative rounded-md px-4 py-2 text-label-md uppercase tracking-widest transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-tertiary-fixed-dim focus-visible:ring-offset-2 ${
										scrolled
											? isActive
												? 'text-primary font-semibold'
												: 'text-on-surface-variant hover:text-primary'
											: isActive
												? 'text-tertiary-fixed font-semibold drop-shadow-sm'
												: 'text-surface-container-low/80 hover:text-surface-container-lowest drop-shadow-sm'
									}`}
								>
									{item.label}
									{/* Indicador ativo */}
									{isActive && (
										<span
											className={`absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full transition-colors duration-300 ${
												scrolled ? 'bg-tertiary-fixed-dim' : 'bg-tertiary-fixed'
											}`}
										/>
									)}
								</a>
							</li>
						);
					})}

					{/* CTA Confirmar Presença */}
					<li className="ml-3">
						<Link
							href={ctaHref}
							className={`inline-flex items-center rounded-md px-5 py-2.5 text-label-md uppercase tracking-widest shadow-sm transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-tertiary-fixed-dim focus-visible:ring-offset-2 ${
								scrolled
									? 'bg-primary-container text-tertiary-fixed hover:bg-secondary hover:shadow-md'
									: 'border border-tertiary-fixed/40 bg-primary-container/80 text-tertiary-fixed backdrop-blur-sm hover:bg-primary-container hover:border-tertiary-fixed/60'
							}`}
						>
							Confirmar Presença
						</Link>
					</li>
				</ul>
			</div>
		</nav>
	);
}