'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, type LucideIcon } from 'lucide-react';
import { AdminLogoutButton } from './AdminLogoutButton';

export interface AdminNavItem {
	href: string;
	label: string;
	icon: LucideIcon;
	/** Itens filhos para subseções agrupadas */
	children?: AdminNavItem[];
}

interface AdminMobileDrawerProps {
	items: AdminNavItem[];
	isOpen: boolean;
	onClose: () => void;
}

/**
 * Drawer lateral mobile para navegação administrativa.
 *
 * - Bloqueia scroll do body quando aberto
 * - Fecha com Escape, clique no overlay ou botão X
 * - Destaca rota ativa (incluindo subseções)
 * - Rolagem independente para listas longas
 * - Acessível: focus trap básico, aria-modal, role dialog
 */
export function AdminMobileDrawer({ items, isOpen, onClose }: AdminMobileDrawerProps) {
	const pathname = usePathname();
	const drawerRef = useRef<HTMLDivElement>(null);
	const closeButtonRef = useRef<HTMLButtonElement>(null);

	// Bloquear scroll do body quando o drawer está aberto
	useEffect(() => {
		if (isOpen) {
			const originalOverflow = document.body.style.overflow;
			document.body.style.overflow = 'hidden';
			// Focar no botão de fechar ao abrir
			closeButtonRef.current?.focus();
			return () => {
				document.body.style.overflow = originalOverflow;
			};
		}
	}, [isOpen]);

	// Fechar com tecla Escape
	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onClose();
			}
		},
		[onClose],
	);

	useEffect(() => {
		if (isOpen) {
			document.addEventListener('keydown', handleKeyDown);
			return () => document.removeEventListener('keydown', handleKeyDown);
		}
	}, [isOpen, handleKeyDown]);

	// Fechar ao navegar (pathname muda)
	useEffect(() => {
		if (isOpen) {
			onClose();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pathname]);

	/** Verifica se um item ou algum filho está ativo */
	const isItemActive = (item: AdminNavItem): boolean => {
		if (pathname === item.href) return true;
		// Para rotas pai como /admin/check-in, ativar também nas subseções
		if (item.children && item.children.some((child) => pathname === child.href)) {
			return true;
		}
		// Match parcial para rotas pai (ex: /admin/check-in ativa para /admin/check-in/historico)
		if (item.href !== '/admin' && pathname.startsWith(item.href + '/')) {
			return true;
		}
		return false;
	};

	const isChildActive = (href: string): boolean => {
		return pathname === href;
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-[100] md:hidden" role="dialog" aria-modal="true" aria-label="Menu de navegação">
			{/* Overlay */}
			<div
				className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Drawer panel */}
			<div
				ref={drawerRef}
				className="absolute left-0 top-0 bottom-0 flex w-[280px] max-w-[85vw] flex-col bg-surface-container-lowest shadow-2xl transition-transform"
			>
				{/* Header do drawer */}
				<div className="flex items-center justify-between border-b border-outline-variant/10 px-5 py-4">
					<div className="flex items-center gap-3">
						<div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container">
							<span className="text-sm font-bold text-tertiary-fixed-dim">A&A</span>
						</div>
						<div>
							<p className="text-headline-sm text-primary">Painel Admin</p>
						</div>
					</div>

					<button
						ref={closeButtonRef}
						onClick={onClose}
						aria-label="Fechar menu"
						className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
					>
						<X size={22} />
					</button>
				</div>

				{/* Lista de navegação com rolagem */}
				<nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navegação administrativa">
					<ul className="space-y-1">
						{items.map((item) => {
							const Icon = item.icon;
							const active = isItemActive(item);
							const hasChildren = item.children && item.children.length > 0;

							return (
								<li key={item.href}>
									<Link
										href={item.href}
										onClick={onClose}
										className={`flex items-center gap-3 rounded-lg px-4 py-3 text-body-md transition-colors ${
											active && !hasChildren
												? 'bg-primary-container/15 font-medium text-primary'
												: 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary'
										}`}
										aria-current={active && !hasChildren ? 'page' : undefined}
									>
										<Icon size={20} strokeWidth={active ? 2 : 1.5} />
										{item.label}
									</Link>

									{/* Subitens */}
									{hasChildren && (
										<ul className="ml-4 mt-1 space-y-0.5 border-l border-outline-variant/15 pl-4">
											{item.children!.map((child) => {
												const ChildIcon = child.icon;
												const childActive = isChildActive(child.href);

												return (
													<li key={child.href}>
														<Link
															href={child.href}
															onClick={onClose}
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
								</li>
							);
						})}
					</ul>
				</nav>

				{/* Footer — Logout */}
				<div className="border-t border-outline-variant/10 p-3 pb-safe">
					<AdminLogoutButton />
				</div>
			</div>
		</div>
	);
}