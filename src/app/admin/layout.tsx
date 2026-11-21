'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
	Heart,
	Users,
	CheckCircle,
	MessageSquareHeart,
	Image as ImageIcon,
	Settings,
	ShieldCheck,
	History,
	FileText,
	Menu,
	Armchair,
} from 'lucide-react';
import { AdminMobileDrawer, type AdminNavItem } from '@/components/admin/AdminMobileDrawer';
import { AdminLogoutButton } from '@/components/admin/AdminLogoutButton';

/**
 * Fonte única de navegação administrativa.
 * Desktop (sidebar) e Mobile (drawer) consomem a mesma lista,
 * evitando dessincronização de menus.
 */
const NAV_ITEMS: AdminNavItem[] = [
	{ href: '/admin', label: 'Dashboard', icon: Heart },
	{ href: '/admin/convidados', label: 'Convidados', icon: Users },
	{ href: '/admin/confirmacoes', label: 'Confirmações', icon: CheckCircle },
	{ href: '/admin/recados', label: 'Recados', icon: MessageSquareHeart },
	{ href: '/admin/galeria', label: 'Galeria', icon: ImageIcon },
	{ href: '/admin/configuracoes', label: 'Configurações', icon: Settings },
	{ href: '/admin/mesas', label: 'Mesas', icon: Armchair },
	{
		href: '/admin/check-in',
		label: 'Check-in',
		icon: ShieldCheck,
		children: [
			{ href: '/admin/check-in', label: 'Recepção', icon: ShieldCheck },
			{ href: '/admin/check-in/historico', label: 'Histórico', icon: History },
			{ href: '/admin/check-in/solicitacoes', label: 'Solicitações', icon: FileText },
			{ href: '/admin/validadores', label: 'Validadores', icon: Users },
		],
	},
];

export default function AdminLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const pathname = usePathname();
	const [drawerOpen, setDrawerOpen] = useState(false);

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

				<nav className="flex-1 overflow-y-auto space-y-1 p-space-md">
					{NAV_ITEMS.map((item) => {
						const Icon = item.icon;
						const isActive =
							pathname === item.href ||
							(item.href !== '/admin' && pathname.startsWith(item.href + '/')) ||
							(item.children?.some((c) => pathname === c.href) ?? false);
						const hasChildren = item.children && item.children.length > 0;

						return (
							<div key={item.href}>
								<Link
									href={item.href}
									className={`flex items-center gap-3 rounded-lg px-4 py-3 text-body-md transition-colors ${
										isActive && !hasChildren
											? 'bg-primary-container/15 font-medium text-primary'
											: 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary'
									}`}
									aria-current={isActive && !hasChildren ? 'page' : undefined}
								>
									<Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
									{item.label}
								</Link>

								{/* Subitens desktop */}
								{hasChildren && isActive && (
									<ul className="ml-4 mt-1 space-y-0.5 border-l border-outline-variant/15 pl-4">
										{item.children!.map((child) => {
											const ChildIcon = child.icon;
											const childActive = pathname === child.href;

											return (
												<li key={child.href}>
													<Link
														href={child.href}
														className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-body-sm transition-colors ${
															childActive
																? 'bg-primary-container/15 font-medium text-primary'
																: 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary'
														}`}
														aria-current={childActive ? 'page' : undefined}
													>
														<ChildIcon size={16} strokeWidth={childActive ? 2 : 1.5} />
														{child.label}
													</Link>
												</li>
											);
										})}
									</ul>
								)}
							</div>
						);
					})}
				</nav>

				<div className="border-t border-outline-variant/10 p-space-md">
					<AdminLogoutButton />
				</div>
			</aside>

			{/* Conteúdo principal */}
			<main className="flex-1 overflow-auto pb-20 md:pb-0">
				{/* Header mobile com botão hamburger */}
				<header className="flex items-center justify-between border-b border-outline-variant/20 bg-surface-container-lowest px-gutter py-4 md:hidden">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container">
							<Heart size={16} className="text-tertiary-fixed-dim" />
						</div>
						<span className="text-headline-sm text-primary">A & A Admin</span>
					</div>

					<button
						onClick={() => setDrawerOpen(true)}
						aria-label="Abrir menu de navegação"
						className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
					>
						<Menu size={24} />
					</button>
				</header>

				<div className="mx-auto max-w-5xl p-gutter md:p-gutter-desktop">
					{children}
				</div>
			</main>

			{/* Drawer mobile — substitui a bottom nav limitada */}
			<AdminMobileDrawer
				items={NAV_ITEMS}
				isOpen={drawerOpen}
				onClose={() => setDrawerOpen(false)}
			/>
		</div>
	);
}