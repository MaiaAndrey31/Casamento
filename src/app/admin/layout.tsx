import type { Metadata } from 'next';
import Link from 'next/link';
import { Heart, Users, CheckCircle, MessageSquareHeart, Image as ImageIcon, Settings, LogOut, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
	title: 'Painel Administrativo — Casamento Andrey & Amanda',
	description: 'Gestão de convidados, confirmações, recados e configurações do casamento.',
};

const navItems = [
	{ href: '/admin', label: 'Dashboard', icon: Heart },
	{ href: '/admin/convidados', label: 'Convidados', icon: Users },
	{ href: '/admin/confirmacoes', label: 'Confirmações', icon: CheckCircle },
	{ href: '/admin/recados', label: 'Recados', icon: MessageSquareHeart },
	{ href: '/admin/galeria', label: 'Galeria', icon: ImageIcon },
	{ href: '/admin/configuracoes', label: 'Configurações', icon: Settings },
	{ href: '/admin/check-in', label: 'Check-in', icon: ShieldCheck },
];

export default function AdminLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="flex min-h-screen flex-col bg-surface md:flex-row">
			{/* Sidebar desktop */}
			<aside className="hidden w-64 flex-col border-r border-outline-variant/20 bg-surface-container-lowest md:flex">
				<div className="flex items-center gap-3 border-b border-outline-variant/10 p-space-lg">
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container">
						<Heart size={20} className="text-tertiary-fixed-dim" />
					</div>
					<div>
						<p className="text-headline-sm text-primary">A & A</p>
						<p className="text-label-sm uppercase tracking-widest text-on-surface-variant">Painel Admin</p>
					</div>
				</div>

				<nav className="flex-1 space-y-1 p-space-md">
					{navItems.map((item) => {
						const Icon = item.icon;
						return (
							<Link
								key={item.href}
								href={item.href}
								className="flex items-center gap-3 rounded-lg px-4 py-3 text-body-md text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
							>
								<Icon size={20} />
								{item.label}
							</Link>
						);
					})}
				</nav>

				<div className="border-t border-outline-variant/10 p-space-md">
					<form action="/api/admin/session" method="DELETE">
						<button
							type="submit"
							className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-body-md text-on-surface-variant transition-colors hover:bg-error-container/20 hover:text-error"
						>
							<LogOut size={20} />
							Sair
						</button>
					</form>
				</div>
			</aside>

			{/* Conteúdo principal */}
			<main className="flex-1 overflow-auto pb-20 md:pb-0">
				{/* Header mobile */}
				<header className="flex items-center justify-between border-b border-outline-variant/20 bg-surface-container-lowest px-gutter py-4 md:hidden">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container">
							<Heart size={16} className="text-tertiary-fixed-dim" />
						</div>
						<span className="text-headline-sm text-primary">A & A Admin</span>
					</div>
				</header>

				<div className="mx-auto max-w-5xl p-gutter md:p-gutter-desktop">
					{children}
				</div>
			</main>

			{/* Nav mobile bottom */}
			<nav className="fixed bottom-0 z-50 w-full border-t border-outline-variant/20 bg-surface-container-lowest/95 pb-safe backdrop-blur-xl md:hidden">
				<div className="flex h-16 items-center justify-around px-2">
					{navItems.slice(0, 4).map((item) => {
						const Icon = item.icon;
						return (
							<Link
								key={item.href}
								href={item.href}
								className="flex flex-col items-center justify-center gap-1 text-on-surface-variant transition-colors hover:text-primary"
							>
								<Icon size={20} />
								<span className="text-[10px] font-semibold uppercase tracking-wider">{item.label}</span>
							</Link>
						);
					})}
				</div>
			</nav>
		</div>
	);
}