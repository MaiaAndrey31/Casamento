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
} from 'lucide-react';
import type { GuestWithInvitation } from '@/lib/repositories/guest.repository';
import { generateInvitationAction } from '@/app/actions/generate-invitation.action';
import { deactivateGuestAction } from '@/app/actions/deactivate-guest.action';

interface GuestActionsMenuProps {
	guest: GuestWithInvitation;
	onRefresh?: () => void;
}

/**
 * Menu dropdown de ações + Modal de token para cada convidado.
 *
 * FLUXO CORRIGIDO:
 * - Após gerar convite, o modal permanece aberto com o link visível.
 * - O modal NÃO fecha ao clicar fora ou pressionar Escape (apenas pelo botão X).
 * - Para convites existentes sem token disponível, oferece regeneração com confirmação.
 * - Copiar e WhatsApp funcionam diretamente no modal.
 *
 * SEGURANÇA: Nenhum import server-only. Todas as escritas via Server Actions.
 */
export function GuestActionsMenu({ guest, onRefresh }: GuestActionsMenuProps) {
	const router = useRouter();
	const [isOpen, setIsOpen] = useState(false);
	const [loading, setLoading] = useState<string | null>(null);
	const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

	// Estado do modal de token — persiste independente do dropdown
	const [tokenModal, setTokenModal] = useState<{
		open: boolean;
		url: string | null;
		isNew: boolean; // true = recém-gerado, false = regenerado
	}>({ open: false, url: null, isNew: false });

	const menuRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);

	// Fechar dropdown ao clicar fora (NÃO fecha o modal de token)
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

	// Fechar dropdown com Escape (NÃO fecha o modal de token)
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

	// Focar no primeiro item ao abrir dropdown
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
				// Abrir modal persistente com o link
				setTokenModal({
					open: true,
					url: result.data.inviteUrl,
					isNew: true,
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

	const handleRegenerateInvitation = async () => {
		if (!confirm(
			`Regenerar o link de acesso para ${guest.fullName}?\n\n` +
			'O link anterior deixará de funcionar imediatamente.\n' +
			'Se este convite já foi compartilhado, o destinatário perderá o acesso.',
		)) {
			return;
		}

		setLoading('regenerate');
		try {
			// Regeneração usa a mesma Server Action de geração,
			// mas o repository deve invalidar o hash anterior
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
					isNew: false,
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

	// Construir itens do menu dinamicamente
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

						{/* Feedback toast inline */}
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

						{/* Aviso para convites existentes sem token */}
						{guest.invitationId && (
							<div className="mx-2 mb-1 rounded-lg border border-amber-200 bg-amber-50 p-2">
								<p className="text-[11px] leading-relaxed text-amber-800">
									⚠️ O link original deste convite não pode ser recuperado. Use "Regenerar link de acesso" para criar um novo.
								</p>
							</div>
						)}

						{/* Itens do menu */}
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
						{/* Header do modal */}
						<div className="flex items-center justify-between border-b border-outline-variant/10 bg-gradient-to-r from-[#17291F] to-[#2d4a3a] px-6 py-4">
							<div className="flex items-center gap-2">
								<Check size={20} className="text-[#D4AF37]" />
								<h3 className="text-title-md text-white">
									{tokenModal.isNew ? 'Convite Gerado!' : 'Link Regenerado!'}
								</h3>
							</div>
							<button
								onClick={() => setTokenModal({ open: false, url: null, isNew: false })}
								className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
								aria-label="Fechar"
							>
								<X size={20} />
							</button>
						</div>

						{/* Conteúdo do modal */}
						<div className="space-y-4 p-6">
							<p className="text-body-md text-on-surface-variant">
								{tokenModal.isNew
									? 'Copie ou compartilhe o link abaixo. Ele não será exibido novamente após fechar esta janela.'
									: 'O link anterior foi invalidado. Copie ou compartilhe o novo link abaixo.'}
							</p>

							{/* Campo com link selecionável */}
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
									<Copy size={14} className="inline mr-1" />
									Copiar
								</button>
							</div>

							{/* Ações do modal */}
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