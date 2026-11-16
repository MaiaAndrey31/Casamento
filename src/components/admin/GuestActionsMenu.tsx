'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
	MoreHorizontal,
	Pencil,
	Mail,
	MessageCircle,
	Copy,
	Trash2,
	Loader2,
	Check,
	AlertCircle,
	Eye,
	RefreshCw,
	X,
	ExternalLink,
	Link as LinkIcon,
} from 'lucide-react';
import type { GuestWithInvitation } from '@/lib/repositories/guest.repository';
import { generateInvitationAction } from '@/app/actions/generate-invitation.action';
import { recoverInvitationLinkAction } from '@/app/actions/recover-invitation-link.action';
import { regenerateInvitationAction } from '@/app/actions/regenerate-invitation.action';
import { deactivateGuestAction } from '@/app/actions/deactivate-guest.action';

interface GuestActionsMenuProps {
	guest: GuestWithInvitation;
	onRefresh?: () => void;
}

/**
 * Menu dropdown de ações + Modal de token para cada convidado.
 *
 * TRÊS OPERAÇÕES SEPARADAS:
 * A) Gerar convite — somente quando NÃO existe convite ativo
 * B) Recuperar link — descriptografa token existente (sem modificar)
 * C) Regenerar link — cria novo token para convite ATIVO existente
 *
 * CONVITES LEGADOS:
 * Convites sem encryptedToken recebem aviso claro e opção de regeneração.
 * A recuperação falha com mensagem orientativa; regeneração funciona normalmente.
 */
export function GuestActionsMenu({ guest, onRefresh }: GuestActionsMenuProps) {
	const router = useRouter();
	const [isOpen, setIsOpen] = useState(false);
	const [loading, setLoading] = useState<string | null>(null);
	const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

	const [tokenModal, setTokenModal] = useState<{
		open: boolean;
		url: string | null;
		isNew: boolean;
		title: string;
		description: string;
	}>({ open: false, url: null, isNew: false, title: '', description: '' });

	const menuRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);

	useEffect(() => {
		if (!isOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setIsOpen(false);
				buttonRef.current?.focus();
			}
		};
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [isOpen]);

	useEffect(() => {
		if (isOpen && itemsRef.current[0]) {
			itemsRef.current[0]?.focus();
		}
	}, [isOpen]);

	const showFeedback = useCallback((type: 'success' | 'error', message: string) => {
		setFeedback({ type, message });
		setTimeout(() => setFeedback(null), 5000);
	}, []);

	// OPERAÇÃO A — Gerar convite (somente sem convite ativo)
	const handleGenerateInvitation = async () => {
		setLoading('generate');
		setFeedback(null);
		try {
			const result = await generateInvitationAction({
				guestId: guest.id,
				displayName: guest.fullName,
				maxCompanions: 0,
				category: (guest.category as 'familia_noiva' | 'familia_noivo' | 'padrinhos' | 'amigos' | 'colegas') || 'amigos',
			});

			if (result.success && result.data) {
				setTokenModal({
					open: true,
					url: result.data.inviteUrl,
					isNew: true,
					title: 'Convite Gerado!',
					description: 'Copie ou compartilhe o link abaixo. Ele pode ser recuperado posteriormente pelo painel.',
				});
				setIsOpen(false);
				onRefresh?.();
			} else {
				showFeedback('error', result.error || 'Falha ao gerar convite.');
			}
		} catch {
			showFeedback('error', 'Erro inesperado ao gerar convite.');
		} finally {
			setLoading(null);
		}
	};

	// OPERAÇÃO B — Recuperar link (descriptografa token existente)
	const handleRecoverLink = async () => {
		setLoading('recover');
		setFeedback(null);
		try {
			const result = await recoverInvitationLinkAction({
				guestId: guest.id,
			});

			if (result.success && result.data) {
				setTokenModal({
					open: true,
					url: result.data.inviteUrl,
					isNew: false,
					title: 'Link Recuperado',
					description: 'Este é o link atual do convite. Copie ou compartilhe conforme necessário.',
				});
				setIsOpen(false);
			} else {
				showFeedback('error', result.error || 'Falha ao recuperar link.');
			}
		} catch {
			showFeedback('error', 'Erro inesperado ao recuperar link.');
		} finally {
			setLoading(null);
		}
	};

	// OPERAÇÃO C — Regenerar link (novo token para convite ativo)
	const handleRegenerateInvitation = async () => {
		if (!confirm(
			`Regenerar o link de acesso para ${guest.fullName}?\n\n` +
			'O link anterior deixará de funcionar imediatamente.\n' +
			'Se este convite já foi compartilhado, o destinatário perderá o acesso.',
		)) {
			return;
		}

		setLoading('regenerate');
		setFeedback(null);
		try {
			const result = await regenerateInvitationAction({
				guestId: guest.id,
			});

			if (result.success && result.data) {
				setTokenModal({
					open: true,
					url: result.data.inviteUrl,
					isNew: false,
					title: 'Link Regenerado!',
					description: 'O link anterior foi invalidado. Copie ou compartilhe o novo link abaixo.',
				});
				setIsOpen(false);
				onRefresh?.();
			} else {
				showFeedback('error', result.error || 'Falha ao regenerar convite.');
			}
		} catch {
			showFeedback('error', 'Erro inesperado ao regenerar convite.');
		} finally {
			setLoading(null);
		}
	};

	const handleCopyLink = async (url: string) => {
		try {
			await navigator.clipboard.writeText(url);
			showFeedback('success', 'Link copiado para a área de transferência!');
		} catch {
			showFeedback('error', 'Não foi possível copiar. Selecione o texto manualmente.');
		}
	};

	const handleShareWhatsApp = (url: string) => {
		const phone = guest.phone.replace(/\D/g, '');
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

	const handleDeactivate = async () => {
		if (!confirm(`Tem certeza que deseja desativar ${guest.fullName}?\n\nEsta ação é reversível, mas o convite associado poderá ser revogado se não houver outros convidados ativos.`)) {
			return;
		}

		setLoading('deactivate');
		setFeedback(null);
		try {
			const result = await deactivateGuestAction({ guestId: guest.id });

			if (result.success) {
				showFeedback('success', result.message || 'Convidado desativado com sucesso.');
				onRefresh?.();
			} else {
				showFeedback('error', result.error || 'Falha ao desativar convidado.');
			}
		} catch {
			showFeedback('error', 'Erro inesperado ao desativar convidado.');
		} finally {
			setLoading(null);
			setIsOpen(false);
		}
	};

	const menuItems = [
		{
			id: 'edit',
			label: 'Editar convidado',
			icon: Pencil,
			action: () => {
				setIsOpen(false);
				router.push(`/admin/convidados/${guest.id}/editar`);
			},
		},
		...(guest.invitationId
			? [
					{
						id: 'recover',
						label: 'Copiar link do convite',
						icon: LinkIcon,
						action: handleRecoverLink,
					},
					{
						id: 'regenerate',
						label: 'Regenerar link de acesso',
						icon: RefreshCw,
						action: handleRegenerateInvitation,
					},
					{
						id: 'preview',
						label: 'Visualizar prévia',
						icon: Eye,
						action: () => {
							setIsOpen(false);
							router.push(`/admin/convites/${guest.invitationId}/preview`);
						},
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
			action: handleDeactivate,
		},
	];

	return (
		<>
			<div className="relative" ref={menuRef}>
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

				{isOpen && (
					<div
						className="absolute right-0 top-full z-50 mt-1 w-64 origin-top-right rounded-xl border border-outline-variant/20 bg-surface-container-lowest py-1 shadow-xl ring-1 ring-black/5"
						role="menu"
						aria-orientation="vertical"
					>
						<div className="border-b border-outline-variant/10 px-3 py-2">
							<p className="truncate text-body-sm font-semibold text-primary">{guest.fullName}</p>
							<p className="truncate text-[11px] text-on-surface-variant">{guest.phone}</p>
						</div>

						{feedback && (
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

						{menuItems.map((item, index) => {
							const Icon = item.icon;
							const isDanger = 'danger' in item && item.danger;
							const isLoadingItem = loading === item.id;

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

			{/* MODAL DE TOKEN — Persiste independente do dropdown */}
			{tokenModal.open && tokenModal.url && (
				<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
					<div className="w-full max-w-md overflow-hidden rounded-2xl bg-surface-container-lowest shadow-2xl">
						<div className="flex items-center justify-between border-b border-outline-variant/10 bg-gradient-to-r from-[#17291F] to-[#2d4a3a] px-6 py-4">
							<div className="flex items-center gap-2">
								<Check size={20} className="text-[#D4AF37]" />
								<h3 className="text-title-md text-white">{tokenModal.title}</h3>
							</div>
							<button
								onClick={() => setTokenModal({ open: false, url: null, isNew: false, title: '', description: '' })}
								className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
								aria-label="Fechar"
							>
								<X size={20} />
							</button>
						</div>

						<div className="space-y-4 p-6">
							<p className="text-body-md text-on-surface-variant">{tokenModal.description}</p>

							<div className="flex items-center gap-2 rounded-lg border border-tertiary-fixed-dim/30 bg-surface-container-low p-3">
								<input
									type="text"
									readOnly
									value={tokenModal.url}
									onClick={(e) => (e.target as HTMLInputElement).select()}
									className="flex-1 truncate bg-transparent text-body-sm font-mono text-primary outline-none"
								/>
								<button
									onClick={() => handleCopyLink(tokenModal.url!)}
									className="shrink-0 rounded-md bg-primary-container px-3 py-1.5 text-label-sm uppercase tracking-widest text-tertiary-fixed transition-colors hover:bg-secondary"
								>
									<Copy size={14} className="mr-1 inline" />
									Copiar
								</button>
							</div>

							<div className="flex gap-3">
								<button
									onClick={() => handleShareWhatsApp(tokenModal.url!)}
									className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-3 text-body-sm font-semibold text-white transition-colors hover:bg-[#20bd5a]"
								>
									<MessageCircle size={16} />
									Enviar WhatsApp
								</button>
								<a
									href={tokenModal.url}
									target="_blank"
									rel="noopener noreferrer"
									className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-sm font-semibold text-primary transition-colors hover:bg-surface-container"
								>
									<ExternalLink size={16} />
									Abrir Convite
								</a>
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	);
}