'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
	MoreHorizontal,
	Eye,
	Pencil,
	Mail,
	MessageCircle,
	Copy,
	Trash2,
	Loader2,
	Check,
	AlertCircle,
	ExternalLink,
} from 'lucide-react';
import type { GuestWithInvitation } from '@/lib/repositories/guest.repository';
import { generateInvitationAction } from '@/app/actions/generate-invitation.action';

interface GuestActionsMenuProps {
	guest: GuestWithInvitation;
	onEdit?: (guest: GuestWithInvitation) => void;
	onDeactivate?: (guest: GuestWithInvitation) => void;
}

/**
 * Menu dropdown de ações para cada convidado na listagem administrativa.
 *
 * Funcionalidades:
 * - Abrir/fechar por clique ou toque
 * - Fechar ao clicar fora ou pressionar Escape
 * - Navegação por teclado (setas + Enter)
 * - Atributos ARIA para acessibilidade
 * - Feedback visual de loading, sucesso e erro
 * - Geração de convite com token seguro (exibido apenas uma vez)
 * - Compartilhamento via WhatsApp (wa.me)
 * - Cópia de link via Clipboard API
 */
export function GuestActionsMenu({ guest, onEdit, onDeactivate }: GuestActionsMenuProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [loading, setLoading] = useState<string | null>(null);
	const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
	const [generatedToken, setGeneratedToken] = useState<string | null>(null);

	const menuRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const itemsRef = useRef<(HTMLButtonElement | HTMLAnchorElement | null)[]>([]);

	// Fechar ao clicar fora
	useEffect(() => {
		if (!isOpen) return;

		const handleClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setIsOpen(false);
				setGeneratedToken(null);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [isOpen]);

	// Fechar com Escape
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setIsOpen(false);
				setGeneratedToken(null);
				buttonRef.current?.focus();
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [isOpen]);

	// Focar no primeiro item ao abrir
	useEffect(() => {
		if (isOpen && itemsRef.current[0]) {
			itemsRef.current[0]?.focus();
		}
	}, [isOpen]);

	const showFeedback = useCallback((type: 'success' | 'error', message: string) => {
		setFeedback({ type, message });
		setTimeout(() => setFeedback(null), 4000);
	}, []);

	const handleGenerateInvitation = async () => {
		setLoading('generate');
		try {
			const result = await generateInvitationAction({
				guestId: guest.id,
				displayName: guest.fullName,
				maxCompanions: 0,
				category: (guest.category as 'familia_noiva' | 'familia_noivo' | 'padrinhos' | 'amigos' | 'colegas') || 'amigos',
			});

			if (result.success && result.data) {
				setGeneratedToken(result.data.inviteUrl);
				showFeedback('success', 'Convite gerado! Copie o link agora.');
			} else {
				showFeedback('error', result.error || 'Falha ao gerar convite.');
			}
		} catch {
			showFeedback('error', 'Erro inesperado ao gerar convite.');
		} finally {
			setLoading(null);
		}
	};

	const handleCopyLink = async (url: string) => {
		try {
			await navigator.clipboard.writeText(url);
			showFeedback('success', 'Link copiado para a área de transferência!');
		} catch {
			showFeedback('error', 'Não foi possível copiar. Tente manualmente.');
		}
	};

	const handleShareWhatsApp = (url: string) => {
		const phone = guest.phone.replace(/\D/g, '');
		// Normalizar telefone brasileiro
		let normalizedPhone = phone;
		if (phone.startsWith('55') && phone.length > 11) {
			normalizedPhone = phone;
		} else if (phone.length >= 10 && !phone.startsWith('55')) {
			normalizedPhone = `55${phone}`;
		}

		const message = encodeURIComponent(
			`Olá, ${guest.fullName}! 💚\n\n` +
			`Com muita alegria, queremos compartilhar com você um momento muito especial das nossas vidas!\n\n` +
			`No dia *12 de dezembro de 2026, às 19h*, celebraremos nosso casamento diante de Deus, e sua presença será muito importante para nós.\n\n` +
			`Preparamos um convite especial para você. 💍\n\n` +
			`💌 Acesse seu convite:\n${url}\n\n` +
			`Pedimos que confirme sua presença pelo próprio convite.\n\n` +
			`Com carinho,\n*Andrey & Amanda* 🤍`,
		);

		window.open(`https://wa.me/${normalizedPhone}?text=${message}`, '_blank', 'noopener,noreferrer');
	};

	const menuItems = [
		{
			id: 'view',
			label: 'Visualizar detalhes',
			icon: Eye,
			action: () => {
				setIsOpen(false);
				// TODO: Implementar modal ou rota de detalhes
				showFeedback('success', `Detalhes de ${guest.fullName}`);
			},
		},
		{
			id: 'edit',
			label: 'Editar convidado',
			icon: Pencil,
			action: () => {
				setIsOpen(false);
				onEdit?.(guest);
			},
		},
		...(guest.invitationId
			? [
					{
						id: 'whatsapp',
						label: 'Enviar pelo WhatsApp',
						icon: MessageCircle,
						action: () => {
							// Se já tem convite mas não temos o token, informar
							if (!generatedToken) {
								showFeedback('error', 'Link do convite não disponível. Gere um novo convite para compartilhar.');
								return;
							}
							handleShareWhatsApp(generatedToken);
						},
					},
					{
						id: 'copy',
						label: 'Copiar link do convite',
						icon: Copy,
						action: () => {
							if (!generatedToken) {
								showFeedback('error', 'Link do convite não disponível. Gere um novo convite para copiar.');
								return;
							}
							handleCopyLink(generatedToken);
						},
					},
					{
						id: 'preview',
						label: 'Visualizar prévia',
						icon: ExternalLink,
						href: `/convite/preview/${guest.invitationId}`,
					},
				]
			: [
					{
						id: 'generate',
						label: 'Gerar convite digital',
						icon: Mail,
						action: handleGenerateInvitation,
					},
				]),
		{
			id: 'deactivate',
			label: 'Desativar convidado',
			icon: Trash2,
			danger: true,
			action: () => {
				setIsOpen(false);
				if (confirm(`Tem certeza que deseja desativar ${guest.fullName}? Esta ação pode ser revertida.`)) {
					onDeactivate?.(guest);
				}
			},
		},
	];

	return (
		<div className="relative" ref={menuRef}>
			{/* Botão trigger */}
			<button
				ref={buttonRef}
				onClick={() => setIsOpen(!isOpen)}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						setIsOpen(!isOpen);
					}
				}}
				className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary focus:outline-none focus:ring-2 focus:ring-tertiary-fixed-dim"
				aria-haspopup="true"
				aria-expanded={isOpen}
				aria-label={`Ações para ${guest.fullName}`}
				title="Mais ações"
			>
				{loading ? <Loader2 size={16} className="animate-spin" /> : <MoreHorizontal size={16} />}
			</button>

			{/* Dropdown */}
			{isOpen && (
				<div
					className="absolute right-0 top-full z-50 mt-1 w-64 origin-top-right rounded-xl border border-outline-variant/20 bg-surface-container-lowest py-1 shadow-xl ring-1 ring-black/5"
					role="menu"
					aria-orientation="vertical"
				>
					{/* Header do menu */}
					<div className="border-b border-outline-variant/10 px-3 py-2">
						<p className="truncate text-body-sm font-semibold text-primary">{guest.fullName}</p>
						<p className="truncate text-[11px] text-on-surface-variant">{guest.phone}</p>
					</div>

					{/* Token gerado — exibido apenas uma vez */}
					{generatedToken && (
						<div className="mx-2 my-2 rounded-lg border border-green-200 bg-green-50 p-3">
							<div className="mb-1 flex items-center gap-1.5">
								<Check size={14} className="text-green-700" />
								<span className="text-[11px] font-semibold uppercase tracking-wider text-green-800">
									Convite gerado
								</span>
							</div>
							<p className="mb-2 break-all text-[11px] leading-relaxed text-green-900">{generatedToken}</p>
							<div className="flex gap-1">
								<button
									onClick={() => handleCopyLink(generatedToken)}
									className="flex flex-1 items-center justify-center gap-1 rounded-md bg-green-700 px-2 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-green-800"
								>
									<Copy size={12} /> Copiar
								</button>
								<button
									onClick={() => handleShareWhatsApp(generatedToken)}
									className="flex flex-1 items-center justify-center gap-1 rounded-md border border-green-300 bg-white px-2 py-1.5 text-[11px] font-medium text-green-800 transition-colors hover:bg-green-50"
								>
									<MessageCircle size={12} /> WhatsApp
								</button>
							</div>
							<p className="mt-1.5 text-[10px] italic text-green-700/70">
								Este link não será exibido novamente.
							</p>
						</div>
					)}

					{/* Feedback toast inline */}
					{feedback && !generatedToken && (
						<div
							className={`mx-2 mb-1 flex items-start gap-2 rounded-lg p-2 text-[11px] ${
								feedback.type === 'success'
									? 'bg-green-50 text-green-800'
									: 'bg-error-container/10 text-error'
							}`}
						>
							{feedback.type === 'success' ? (
								<Check size={14} className="mt-0.5 shrink-0" />
							) : (
								<AlertCircle size={14} className="mt-0.5 shrink-0" />
							)}
							<span className="leading-relaxed">{feedback.message}</span>
						</div>
					)}

					{/* Itens do menu */}
					{menuItems.map((item, index) => {
						const Icon = item.icon;
						const isDanger = 'danger' in item && item.danger;
						const isLoadingItem = loading === item.id;

						if ('href' in item && item.href) {
							return (
								<a
									key={item.id}
									ref={(el) => { itemsRef.current[index] = el; }}
									href={item.href}
									target="_blank"
									rel="noopener noreferrer"
									role="menuitem"
									tabIndex={0}
									onKeyDown={(e) => {
										if (e.key === 'ArrowDown') {
											e.preventDefault();
											itemsRef.current[index + 1]?.focus();
										} else if (e.key === 'ArrowUp') {
											e.preventDefault();
											itemsRef.current[index - 1]?.focus();
										}
									}}
									className={`flex w-full items-center gap-3 px-3 py-2.5 text-body-sm transition-colors focus:outline-none focus:bg-surface-container-low ${
										isDanger
											? 'text-error hover:bg-error-container/10'
											: 'text-on-surface hover:bg-surface-container-low hover:text-primary'
									}`}
								>
									<Icon size={16} />
									{item.label}
								</a>
							);
						}

						return (
							<button
								key={item.id}
								ref={(el) => { itemsRef.current[index] = el; }}
								onClick={item.action}
								disabled={isLoadingItem}
								role="menuitem"
								tabIndex={0}
								onKeyDown={(e) => {
									if (e.key === 'ArrowDown') {
										e.preventDefault();
										itemsRef.current[index + 1]?.focus();
									} else if (e.key === 'ArrowUp') {
										e.preventDefault();
										itemsRef.current[index - 1]?.focus();
									} else if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										item.action?.();
									}
								}}
								className={`flex w-full items-center gap-3 px-3 py-2.5 text-body-sm transition-colors focus:outline-none focus:bg-surface-container-low disabled:opacity-50 ${
									isDanger
										? 'text-error hover:bg-error-container/10'
										: 'text-on-surface hover:bg-surface-container-low hover:text-primary'
								}`}
							>
								{isLoadingItem ? (
									<Loader2 size={16} className="animate-spin" />
								) : (
									<Icon size={16} />
								)}
								{item.label}
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}