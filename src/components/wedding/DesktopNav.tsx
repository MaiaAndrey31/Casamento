
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Menu, X, ArrowUpRight } from 'lucide-react';
import { WEDDING_CONFIG } from '@/config/wedding';
import { useInvitationContext } from '@/hooks/useInvitationContext';

const NAV_ITEMS: {
	label: string;
	href: string;
	sectionId: string | null;
}[] = [
		{ label: 'Início', href: '/#inicio', sectionId: 'inicio' },
		{ label: 'Nossa História', href: '/nossa-historia', sectionId: null },
		{ label: 'O Grande Dia', href: '/#detalhes', sectionId: 'detalhes' },
		{ label: 'Recados e Orações', href: '/#recados', sectionId: 'recados' },
	];

export function DesktopNav() {
	const pathname = usePathname();
	const { invitationUrl } = useInvitationContext();

	const [scrolled, setScrolled] = useState(false);
	const [activeSection, setActiveSection] = useState('inicio');
	const [menuOpen, setMenuOpen] = useState(false);

	const isInvitationPage = pathname.startsWith('/convite/');
	const isHistoryPage = pathname.startsWith('/nossa-historia');

	// Se há contexto de convite ativo, redirecionar ao RSVP dentro do convite.
	// Caso contrário, manter o fluxo público existente.
	const ctaHref = invitationUrl
		? `${invitationUrl}#confirmar-presenca`
		: isInvitationPage
			? '#confirmar-presenca'
			: '/confirmar-presenca';

	// Detectar rolagem
	useEffect(() => {
		const handleScroll = () => {
			setScrolled(window.scrollY > 70);
		};

		window.addEventListener('scroll', handleScroll, { passive: true });
		handleScroll();

		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	// Scroll spy
	useEffect(() => {
		const prefersReducedMotion = window.matchMedia(
			'(prefers-reduced-motion: reduce)'
		).matches;

		if (prefersReducedMotion) return;

		const sectionIds = NAV_ITEMS
			.map((item) => item.sectionId)
			.filter((id): id is string => id !== null);

		const observers: IntersectionObserver[] = [];

		sectionIds.forEach((id) => {
			const element = document.getElementById(id);
			if (!element) return;

			const observer = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting) {
							setActiveSection(id);
						}
					});
				},
				{
					rootMargin: '-20% 0px -60% 0px',
					threshold: 0,
				}
			);

			observer.observe(element);
			observers.push(observer);
		});

		return () => observers.forEach((observer) => observer.disconnect());
	}, [pathname]);

	// Fechar menu ao navegar
	useEffect(() => {
		setMenuOpen(false);
	}, [pathname]);

	// Fechar menu com ESC e impedir rolagem do fundo
	useEffect(() => {
		if (!menuOpen) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setMenuOpen(false);
			}
		};

		document.body.style.overflow = 'hidden';
		window.addEventListener('keydown', handleKeyDown);

		return () => {
			document.body.style.overflow = '';
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [menuOpen]);

	const closeMenu = () => setMenuOpen(false);

	return (
		<>
			{/* DESKTOP NAVIGATION */}
			<nav
				aria-label="Navegação principal"
				className={`
                    fixed inset-x-0 top-0 z-40 hidden md:block
                    transition-all duration-500 ease-in-out
                    ${scrolled
						? 'border-b border-[#D6A45B]/15 bg-[#14251D]/95 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl'
						: 'border-b border-transparent bg-gradient-to-b from-[#14251D]/35 to-transparent py-5'
					}
                `}
			>
				<div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-8 lg:px-12">

					<Link
						href="/"
						aria-label={`${WEDDING_CONFIG.coupleNames} - Página inicial`}
						className="group flex shrink-0 items-center gap-3"
					>
						<Heart
							size={17}
							strokeWidth={1.4}
							className={scrolled ? 'text-[#D6A45B]' : 'text-[#E5C58D]'}
						/>

						<span
							className={`
                                font-serif text-xl tracking-tight transition-colors
                                lg:text-2xl
                                ${scrolled
									? 'text-[#F4EEE5]'
									: 'text-[#FFF9F0] drop-shadow-md'
								}
                            `}
						>
							{WEDDING_CONFIG.coupleNames}
						</span>
					</Link>

					<ul className="flex items-center gap-1 lg:gap-2">
						{NAV_ITEMS.map((item) => {
							const isActive = item.sectionId
								? pathname === '/' && activeSection === item.sectionId
								: isHistoryPage;
							return (
								<li key={item.href}>
									<Link
										href={item.href}
										aria-current={isActive ? 'location' : undefined}
										className={`
                                            group relative inline-flex items-center
                                            whitespace-nowrap px-3 py-3
                                            text-[9px] font-semibold uppercase
                                            tracking-[0.16em] transition-colors
                                            lg:px-4 lg:text-[10px]
                                            focus:outline-none focus-visible:ring-2
                                            focus-visible:ring-[#D6A45B]
                                            ${isActive
												? 'text-[#E5C58D]'
												: scrolled
													? 'text-[#D2D8D1]/75 hover:text-[#F4EEE5]'
													: 'text-[#F4EEE5]/80 hover:text-white'
											}
                                        `}
									>
										{item.label}

										<span
											className={`
                                                absolute bottom-1 left-1/2 h-px
                                                -translate-x-1/2 bg-[#D6A45B]
                                                transition-all duration-300
                                                ${isActive
													? 'w-5 opacity-100'
													: 'w-0 opacity-0 group-hover:w-5 group-hover:opacity-70'
												}
                                            `}
										/>
									</Link>
								</li>
							);
						})}
					</ul>

					<Link
						href={ctaHref}
						className={`
                            group inline-flex shrink-0 items-center gap-3
                            border px-5 py-3 text-[9px] font-bold uppercase
                            tracking-[0.17em] transition-all duration-300
                            focus:outline-none focus-visible:ring-2
                            focus-visible:ring-[#D6A45B]
                            ${scrolled
								? 'border-[#D6A45B]/60 bg-[#D6A45B] text-[#14251D] hover:bg-[#E5C58D]'
								: 'border-[#E5C58D]/60 bg-[#14251D]/35 text-[#14251D] backdrop-blur-sm hover:bg-[#D6A45B] hover:text-[#14251D]'
							}
                        `}
					>
						Confirmar Presença
						<span className="text-sm transition-transform group-hover:translate-x-1">
							→
						</span>
					</Link>
				</div>
			</nav>

			{/* MOBILE NAVIGATION */}
			<header
				className={`
                    fixed inset-x-0 top-0 z-50 md:hidden
                    border-b transition-all duration-500
                    ${scrolled || menuOpen
						? 'border-[#D6A45B]/15 bg-[#14251D]/95 shadow-lg backdrop-blur-xl'
						: 'border-white/10 bg-gradient-to-b from-[#14251D]/60 to-transparent'
					}
                `}
			>
				<div className="flex h-[72px] items-center justify-between px-5">

					{/* Logo / nomes */}
					<Link
						href="/"
						onClick={closeMenu}
						className="flex items-center gap-2.5"
					>
						<Heart
							size={16}
							strokeWidth={1.4}
							className="text-[#D6A45B]"
						/>

						<span className="font-serif text-xl tracking-tight text-[#F4EEE5]">
							{WEDDING_CONFIG.coupleNames}
						</span>
					</Link>

					{/* Botão hambúrguer */}
					<button
						type="button"
						onClick={() => setMenuOpen((open) => !open)}
						aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
						aria-expanded={menuOpen}
						aria-controls="mobile-navigation"
						className="
                            flex h-11 w-11 items-center justify-center
                            border border-[#D6A45B]/30
                            text-[#E5C58D] transition-all duration-300
                            hover:border-[#D6A45B]/70 hover:bg-white/5
                            focus:outline-none focus-visible:ring-2
                            focus-visible:ring-[#D6A45B]
                        "
					>
						{menuOpen ? (
							<X size={21} strokeWidth={1.5} />
						) : (
							<Menu size={22} strokeWidth={1.5} />
						)}
					</button>
				</div>

				{/* Painel do menu */}
				<div
					id="mobile-navigation"
					aria-hidden={!menuOpen}
					className={`
                        absolute inset-x-0 top-full overflow-hidden
                        border-b border-[#D6A45B]/20
                        bg-[#14251D]/[0.98] shadow-2xl backdrop-blur-2xl
                        transition-all duration-500 ease-in-out
                        ${menuOpen
							? 'visible translate-y-0 opacity-100'
							: 'invisible -translate-y-3 opacity-0'
						}
                    `}
				>
					<div className="px-6 pb-8 pt-5">

						{/* Identificação */}
						<div className="mb-5 flex items-center gap-3">
							<span className="h-px w-7 bg-[#D6A45B]/60" />

							<span className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[#D6A45B]">
								Navegação
							</span>

							<span className="h-px flex-1 bg-[#D6A45B]/20" />
						</div>

						{/* Links */}
						<nav aria-label="Navegação mobile">
							<ul className="space-y-1">
								{NAV_ITEMS.map((item, index) => {
									const isActive = item.sectionId
										? pathname === '/' && activeSection === item.sectionId
										: isHistoryPage;

									return (
										<li key={item.href}>
											<Link
												href={item.href}
												onClick={closeMenu}
												tabIndex={menuOpen ? 0 : -1}
												aria-current={isActive ? 'location' : undefined}
												className="
                                                    group flex min-h-[58px]
                                                    items-center justify-between
                                                    border-b border-white/[0.07]
                                                    py-3 transition-colors
                                                    hover:text-[#E5C58D]
                                                "
											>
												<span className="flex items-center gap-4">
													<span className="font-serif text-sm text-[#D6A45B]/50">
														0{index + 1}
													</span>

													<span
														className={`
                                                            font-serif text-xl
                                                            ${isActive
																? 'text-[#E5C58D]'
																: 'text-[#F4EEE5]'
															}
                                                        `}
													>
														{item.label}
													</span>
												</span>

												<ArrowUpRight
													size={16}
													strokeWidth={1.3}
													className="
                                                        text-[#D6A45B]/50
                                                        transition-transform
                                                        group-hover:-translate-y-0.5
                                                        group-hover:translate-x-0.5
                                                    "
												/>
											</Link>
										</li>
									);
								})}
							</ul>
						</nav>

						{/* CTA */}
						<Link
							href={ctaHref}
							onClick={closeMenu}
							tabIndex={menuOpen ? 0 : -1}
							className="
                                mt-7 flex min-h-[54px] w-full
                                items-center justify-center gap-3
                                bg-[#D6A45B] px-5 py-4
                                text-[10px] font-bold uppercase
                                tracking-[0.2em] text-[#14251D]
                                transition-all duration-300
                                hover:bg-[#E5C58D]
                                focus:outline-none focus-visible:ring-2
                                focus-visible:ring-[#F4EEE5]
                            "
						>
							<Heart size={15} strokeWidth={1.7} />
							Confirmar Presença
							<ArrowUpRight size={15} />
						</Link>

						{/* Rodapé decorativo */}
						<div className="mt-7 flex items-center justify-center gap-3">
							<span className="h-px w-8 bg-[#D6A45B]/30" />
							<span className="font-serif text-sm italic text-[#D6A45B]/70">
								Com amor, {WEDDING_CONFIG.coupleNames}
							</span>
							<span className="h-px w-8 bg-[#D6A45B]/30" />
						</div>
					</div>
				</div>
			</header>

			{/* Overlay para fechar ao tocar fora do menu */}
			{menuOpen && (
				<button
					type="button"
					aria-label="Fechar menu"
					onClick={closeMenu}
					className="fixed inset-0 z-40 cursor-default bg-black/35 md:hidden"
				/>
			)}
		</>
	);
}
