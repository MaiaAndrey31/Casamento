import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, LogOut, QrCode, Users } from 'lucide-react';

export const metadata: Metadata = {
	title: 'Painel do Validador — Casamento Andrey & Amanda',
	description: 'Acesso exclusivo para validadores de check-in no evento.',
};

const navItems = [
	{ href: '/validador', label: 'Leitor QR', icon: QrCode },
	{ href: '/validador/confirmados', label: 'Confirmados', icon: Users },
];

/**
 * Layout exclusivo do validador.
 * NÃO herda a sidebar administrativa dos noivos.
 * Interface simplificada otimizada para uso em dispositivos móveis no dia do evento.
 */
export default function ValidatorLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="flex min-h-screen flex-col bg-[#faf8f5]">
			{/* Header fixo */}
			<header className="sticky top-0 z-40 border-b border-[#17291F]/10 bg-[#17291F] px-4 py-3 shadow-md">
				<div className="mx-auto flex max-w-lg items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e4c286]/20">
							<ShieldCheck size={18} className="text-[#e4c286]" />
						</div>
						<div>
							<p className="text-sm font-semibold text-white">Validador</p>
							<p className="text-[10px] uppercase tracking-widest text-white/60">Casamento A&A</p>
						</div>
					</div>

					<form action="/api/validator/session" method="DELETE">
						<button
							type="submit"
							className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
						>
							<LogOut size={14} />
							Sair
						</button>
					</form>
				</div>
			</header>

			{/* Conteúdo principal */}
			<main className="flex-1 px-4 py-6">
				<div className="mx-auto max-w-lg">{children}</div>
			</main>

			{/* Navegação inferior mobile-first */}
			<nav className="fixed bottom-0 z-40 w-full border-t border-[#17291F]/10 bg-white/95 pb-safe backdrop-blur-xl">
				<div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
					{navItems.map((item) => {
						const Icon = item.icon;
						return (
							<Link
								key={item.href}
								href={item.href}
								className="flex flex-col items-center justify-center gap-1 rounded-lg px-4 py-2 text-[#17291F]/60 transition-colors hover:bg-[#17291F]/5 hover:text-[#17291F]"
							>
								<Icon size={22} />
								<span className="text-[10px] font-semibold uppercase tracking-wider">{item.label}</span>
							</Link>
						);
					})}
				</div>
			</nav>
		</div>
	);
}