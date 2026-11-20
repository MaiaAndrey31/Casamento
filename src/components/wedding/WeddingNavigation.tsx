'use client';

import { useState, useEffect } from 'react';
import { Heart, CalendarClock, CheckCircle, Flower2 } from 'lucide-react';
import { useInvitationContext } from '@/hooks/useInvitationContext';

/**
 * Navegação Mobile — Barra inferior fixa com links para as seções do convite.
 * Preserva o estilo visual do Stitch sem referência à lista de presentes.
 * O item RSVP redireciona ao convite individual quando há contexto ativo.
 */
export function WeddingNavigation() {
	const { invitationUrl } = useInvitationContext();
	const [activeSection, setActiveSection] = useState('inicio');

	useEffect(() => {
		const handleScroll = () => {
			const sections = ['inicio', 'detalhes', 'confirmar-presenca', 'recados'];
			const scrollPosition = window.scrollY + window.innerHeight / 3;

			for (const section of sections) {
				const element = document.getElementById(section === 'inicio' ? '' : section);
				if (element) {
					const top = element.offsetTop;
					const bottom = top + element.offsetHeight;
					if (scrollPosition >= top && scrollPosition < bottom) {
						setActiveSection(section);
						break;
					}
				}
			}
		};

		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	// RSVP redireciona ao convite individual se houver contexto ativo
	const rsvpHref = invitationUrl
		? `${invitationUrl}#confirmar-presenca`
		: '/confirmar-presenca';

	const navItems = [
		{ id: 'inicio', label: 'Início', icon: Heart, href: '#' },
		{ id: 'detalhes', label: 'Evento', icon: CalendarClock, href: '#detalhes' },
		{ id: 'confirmar-presenca', label: 'RSVP', icon: CheckCircle, href: rsvpHref },
		{ id: 'recados', label: 'Recados', icon: Flower2, href: '#recados' },
	];

	return (
		<nav className="fixed bottom-0 z-50 w-full bg-surface-container-lowest/90 pb-safe shadow-[0_-4px_24px_rgba(24,37,27,0.06)] backdrop-blur-xl md:hidden">
			<div className="flex h-16 items-center justify-around px-space-sm">
				{navItems.map((item) => {
					const isActive = activeSection === item.id;
					const Icon = item.icon;

					return (
						<a
							key={item.id}
							href={item.href}
							className={`flex h-12 min-w-[56px] flex-col items-center justify-center transition-colors ${
								isActive
									? 'font-semibold text-primary-container'
									: 'text-on-surface-variant hover:text-secondary'
							}`}
							aria-current={isActive ? 'page' : undefined}
						>
							<Icon size={22} strokeWidth={isActive ? 2 : 1.5} />
							<span className="mt-0.5 text-label-sm tracking-normal">{item.label}</span>
						</a>
					);
				})}
			</div>
		</nav>
	);
}