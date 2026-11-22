'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
	Armchair,
	Plus,
	Search,
	Users,
	UserMinus,
	ArrowRightLeft,
	Trash2,
	Pencil,
	Check,
	X,
	Loader2,
	AlertCircle,
	ChevronDown,
	ChevronUp,
	Heart,
	Crown,
	Baby,
	User as UserIcon,
	ToggleLeft,
	ToggleRight,
} from 'lucide-react';
import type { TableWithOccupancy, TablesDashboardStats, SpecialParticipantCategory } from '@/types';
import {
	createTableAction,
	updateTableAction,
	deleteTableAction,
	assignGroupAction,
	unassignParticipantAction,
	transferParticipantAction,
	listAvailableParticipantsAction,
	refreshTablesDataAction,
	getInvitationTitularNamesAction,
} from '@/app/actions/tables.action';
import {
	createSpecialParticipantAction,
	updateSpecialParticipantAction,
	deleteSpecialParticipantAction,
	listSpecialParticipantsAction,
} from '@/app/actions/special-participants.action';

// ============================================================================
// TYPES
// ============================================================================

interface Props {
	initialTables: TableWithOccupancy[];
	initialStats: TablesDashboardStats;
	adminUid: string;
}

type ModalMode = 'create' | 'edit' | null;

interface TableFormData {
	name: string;
	capacity: string;
}

interface AvailableParticipant {
	participantId: string;
	participantName: string;
	participantType: 'titular' | 'companion' | 'special';
	invitationId: string;
	alreadyAssigned?: boolean; // true se já está em outra mesa (não selecionável)
	participantSource?: 'rsvp' | 'special';
	specialCategory?: SpecialParticipantCategory;
}

interface SpecialParticipantItem {
	id: string;
	fullName: string;
	category: SpecialParticipantCategory;
	active: boolean;
	notes?: string;
}

type SpecialModalMode = 'create' | 'edit' | null;

interface SpecialFormData {
	fullName: string;
	category: SpecialParticipantCategory;
	notes: string;
	active: boolean;
}

const CATEGORY_LABELS: Record<SpecialParticipantCategory, string> = {
	groom: 'Noivo',
	bride: 'Noiva',
	child: 'Filho(a)',
	family: 'Familiar',
	other: 'Outro',
};

const CATEGORY_ICONS: Record<SpecialParticipantCategory, React.ElementType> = {
	groom: Crown,
	bride: Heart,
	child: Baby,
	family: Users,
	other: UserIcon,
};

interface InvitationGroup {
	invitationId: string;
	titular: AvailableParticipant | null;
	companions: AvailableParticipant[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TablesManagerClient({ initialTables, initialStats }: Props) {
	const [tables, setTables] = useState(initialTables);
	const [stats, setStats] = useState(initialStats);
	const [loading, setLoading] = useState(false);
	const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

	// Modal state
	const [modalMode, setModalMode] = useState<ModalMode>(null);
	const [editingTableId, setEditingTableId] = useState<string | null>(null);
	const [formData, setFormData] = useState<TableFormData>({ name: '', capacity: '' });

	// Assignment modal state
	const [assignModalOpen, setAssignModalOpen] = useState(false);
	const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [availableParticipants, setAvailableParticipants] = useState<AvailableParticipant[]>([]);
	const [loadingParticipants, setLoadingParticipants] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);

	// Group selection state
	const [selectedParticipantIds, setSelectedParticipantIds] = useState<Set<string>>(new Set());
	const [expandedInvitationId, setExpandedInvitationId] = useState<string | null>(null);

	// Transfer modal
	const [transferModalOpen, setTransferModalOpen] = useState(false);
	const [transferParticipantId, setTransferParticipantId] = useState<string | null>(null);
	const [transferParticipantName, setTransferParticipantName] = useState('');

	// Delete confirmation
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

	// Search filter for tables
	const [tableSearch, setTableSearch] = useState('');

	// Special Participants state
	const [specialParticipants, setSpecialParticipants] = useState<SpecialParticipantItem[]>([]);
	const [specialModalMode, setSpecialModalMode] = useState<SpecialModalMode>(null);
	const [editingSpecialId, setEditingSpecialId] = useState<string | null>(null);
	const [specialFormData, setSpecialFormData] = useState<SpecialFormData>({
		fullName: '',
		category: 'groom',
		notes: '',
		active: true,
	});
	const [loadingSpecial, setLoadingSpecial] = useState(false);
	const [specialSectionOpen, setSpecialSectionOpen] = useState(false);

	// Refs for focus management
	const assignModalRef = useRef<HTMLDivElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

	const showFeedback = useCallback((type: 'success' | 'error', message: string) => {
		setFeedback({ type, message });
		setTimeout(() => setFeedback(null), 4000);
	}, []);

	// ---- SPECIAL PARTICIPANTS CRUD ----

	const loadSpecialParticipants = useCallback(async () => {
		setLoadingSpecial(true);
		try {
			const result = await listSpecialParticipantsAction();
			if (result.success && result.data) {
				setSpecialParticipants(result.data as SpecialParticipantItem[]);
			}
		} catch {
			// Silent fail
		} finally {
			setLoadingSpecial(false);
		}
	}, []);

	useEffect(() => {
		if (specialSectionOpen) {
			loadSpecialParticipants();
		}
	}, [specialSectionOpen, loadSpecialParticipants]);

	const handleCreateSpecial = async () => {
		if (!specialFormData.fullName.trim()) return;

		setLoading(true);
		const result = await createSpecialParticipantAction({
			fullName: specialFormData.fullName.trim(),
			category: specialFormData.category,
			notes: specialFormData.notes.trim() || undefined,
			active: specialFormData.active,
		});
		setLoading(false);

		if (result.success) {
			showFeedback('success', result.message || 'Participante especial cadastrado.');
			setSpecialModalMode(null);
			setSpecialFormData({ fullName: '', category: 'groom', notes: '', active: true });
			await loadSpecialParticipants();
			await refreshData();
		} else {
			showFeedback('error', result.error || 'Erro ao cadastrar participante.');
		}
	};

	const handleUpdateSpecial = async () => {
		if (!editingSpecialId || !specialFormData.fullName.trim()) return;

		setLoading(true);
		const result = await updateSpecialParticipantAction({
			participantId: editingSpecialId,
			fullName: specialFormData.fullName.trim(),
			category: specialFormData.category,
			notes: specialFormData.notes.trim(),
			active: specialFormData.active,
		});
		setLoading(false);

		if (result.success) {
			showFeedback('success', result.message || 'Participante atualizado.');
			setSpecialModalMode(null);
			setEditingSpecialId(null);
			setSpecialFormData({ fullName: '', category: 'groom', notes: '', active: true });
			await loadSpecialParticipants();
			await refreshData();
		} else {
			showFeedback('error', result.error || 'Erro ao atualizar participante.');
		}
	};

	// ---- DELETE CONFIRMATION STATE ----
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [deletingParticipant, setDeletingParticipant] = useState<{
		participantId: string;
		fullName: string;
		category: SpecialParticipantCategory;
		hasAssignment: boolean;
		tableName?: string;
	} | null>(null);

	const handleDeleteSpecial = async (participantId: string) => {
		// 1. Buscar dados do participante para o modal de confirmação
		setLoading(true);
		try {
			const { getSpecialParticipantForDeletionAction } = await import('@/app/actions/special-participants.action');
			const result = await getSpecialParticipantForDeletionAction({ participantId });

			if (!result.success || !result.data) {
				showFeedback('error', result.error || 'Erro ao obter dados do participante.');
				return;
			}

			setDeletingParticipant(result.data);
			setDeleteConfirmOpen(true);
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Erro desconhecido';
			showFeedback('error', `Falha ao preparar exclusão: ${message}`);
		} finally {
			setLoading(false);
		}
	};

	const confirmDeleteSpecial = async () => {
		if (!deletingParticipant) return;

		setLoading(true);
		const result = await deleteSpecialParticipantAction({ participantId: deletingParticipant.participantId });
		setLoading(false);

		if (result.success) {
			showFeedback('success', result.message || 'Participante excluído permanentemente.');
			setDeleteConfirmOpen(false);
			setDeletingParticipant(null);
			await loadSpecialParticipants();
			await refreshData();
		} else {
			showFeedback('error', result.error || 'Erro ao excluir participante.');
		}
	};

	const openEditSpecialModal = (participant: SpecialParticipantItem) => {
		setEditingSpecialId(participant.id);
		setSpecialFormData({
			fullName: participant.fullName,
			category: participant.category,
			notes: participant.notes || '',
			active: participant.active,
		});
		setSpecialModalMode('edit');
	};

	const openCreateSpecialModal = () => {
		setSpecialFormData({ fullName: '', category: 'groom', notes: '', active: true });
		setSpecialModalMode('create');
	};

	// ---- TABLE CRUD ----

	const handleCreateTable = async () => {
		if (!formData.name.trim() || !formData.capacity) return;

		setLoading(true);
		const result = await createTableAction({
			name: formData.name.trim(),
			capacity: parseInt(formData.capacity, 10),
		});
		setLoading(false);

		if (result.success) {
			showFeedback('success', result.message || 'Mesa criada com sucesso.');
			setModalMode(null);
			setFormData({ name: '', capacity: '' });
			await refreshData();
		} else {
			showFeedback('error', result.error || 'Erro ao criar mesa.');
		}
	};

	const handleUpdateTable = async () => {
		if (!editingTableId) return;

		setLoading(true);
		const data: Record<string, unknown> = { tableId: editingTableId };
		if (formData.name.trim()) data.name = formData.name.trim();
		if (formData.capacity) data.capacity = parseInt(formData.capacity, 10);

		const result = await updateTableAction(data);
		setLoading(false);

		if (result.success) {
			showFeedback('success', result.message || 'Mesa atualizada com sucesso.');
			setModalMode(null);
			setEditingTableId(null);
			setFormData({ name: '', capacity: '' });
			await refreshData();
		} else {
			showFeedback('error', result.error || 'Erro ao atualizar mesa.');
		}
	};

	const handleDeleteTable = async (tableId: string) => {
		setLoading(true);
		const result = await deleteTableAction({ tableId });
		setLoading(false);

		if (result.success) {
			showFeedback('success', result.message || 'Mesa excluída com sucesso.');
			setDeleteConfirmId(null);
			await refreshData();
		} else {
			showFeedback('error', result.error || 'Erro ao excluir mesa.');
		}
	};

	const openEditModal = (table: TableWithOccupancy) => {
		setEditingTableId(table.id);
		setFormData({ name: table.name, capacity: String(table.capacity) });
		setModalMode('edit');
	};

	const openCreateModal = () => {
		setFormData({ name: '', capacity: '' });
		setModalMode('create');
	};

	// ---- ASSIGNMENT ----

	const openAssignModal = async (tableId: string) => {
		setSelectedTableId(tableId);
		setAssignModalOpen(true);
		setSearchTerm('');
		setSelectedParticipantIds(new Set());
		setExpandedInvitationId(null);
		setLoadError(null);
		setLoadingParticipants(true);

		try {
			const result = await listAvailableParticipantsAction({});
			if (result.success && result.data) {
				setAvailableParticipants(result.data);
				if (result.data.length === 0) {
					setLoadError(null); // Not an error — just no eligible participants
				}
			} else {
				setLoadError(result.error || 'Erro ao carregar participantes disponíveis.');
			}
		} catch {
			setLoadError('Erro ao carregar participantes disponíveis.');
		} finally {
			setLoadingParticipants(false);
		}
	};

	// Focus search input when modal opens
	useEffect(() => {
		if (assignModalOpen && searchInputRef.current) {
			setTimeout(() => searchInputRef.current?.focus(), 100);
		}
	}, [assignModalOpen]);

	// Close modal on Escape
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				if (assignModalOpen) setAssignModalOpen(false);
				if (transferModalOpen) setTransferModalOpen(false);
				if (deleteConfirmId) setDeleteConfirmId(null);
				if (modalMode) { setModalMode(null); setEditingTableId(null); }
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [assignModalOpen, transferModalOpen, deleteConfirmId, modalMode]);

	// Estado para nomes dos titulares originais (buscados via server action)
	const [titularNames, setTitularNames] = useState<Record<string, string>>({});

	// Buscar nomes dos titulares originais para convites cujo titular não está na lista de disponíveis
	useEffect(() => {
		if (!assignModalOpen || availableParticipants.length === 0) return;

		const groups = new Map<string, InvitationGroup>();
		for (const p of availableParticipants) {
			if (!groups.has(p.invitationId)) {
				groups.set(p.invitationId, { invitationId: p.invitationId, titular: null, companions: [] });
			}
			const group = groups.get(p.invitationId)!;
			if (p.participantType === 'titular') {
				group.titular = p;
			} else {
				group.companions.push(p);
			}
		}

		// Identificar convites sem titular na lista de disponíveis
		const missingTitularInvitationIds = Array.from(groups.values())
			.filter(g => !g.titular)
			.map(g => g.invitationId);

		if (missingTitularInvitationIds.length === 0) return;

		// Buscar nomes dos titulares originais via server action dedicada
		(async () => {
			try {
				const result = await getInvitationTitularNamesAction({ invitationIds: missingTitularInvitationIds });
				if (result.success && result.data) {
					setTitularNames(prev => ({ ...prev, ...result.data }));
				}
			} catch {
				// Silencioso — fallback seguro: grupo será exibido como "Convite"
			}
		})();
	}, [assignModalOpen, availableParticipants]);

	// Separar participantes especiais dos convidados RSVP
	const specialParticipantsList = availableParticipants.filter(p => p.participantSource === 'special');
	const rsvpParticipantsList = availableParticipants.filter(p => p.participantSource !== 'special');

	// Group RSVP participants by invitationId
	const invitationGroups: InvitationGroup[] = (() => {
		const groups = new Map<string, InvitationGroup>();

		for (const p of rsvpParticipantsList) {
			if (!groups.has(p.invitationId)) {
				groups.set(p.invitationId, { invitationId: p.invitationId, titular: null, companions: [] });
			}
			const group = groups.get(p.invitationId)!;
			if (p.participantType === 'titular') {
				group.titular = p;
			} else {
				group.companions.push(p);
			}
		}

		return Array.from(groups.values()).sort((a, b) => {
			const nameA = a.titular?.participantName || titularNames[a.invitationId] || 'Convite';
			const nameB = b.titular?.participantName || titularNames[b.invitationId] || 'Convite';
			return nameA.localeCompare(nameB);
		});
	})();

	// Filter by search term
	const normalizedSearch = searchTerm.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

	const filteredSpecialParticipants = normalizedSearch
		? specialParticipantsList.filter(p =>
			p.participantName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(normalizedSearch),
		)
		: specialParticipantsList;

	const filteredGroups = normalizedSearch
		? invitationGroups.filter(g => {
			const allNames = [
				g.titular?.participantName,
				...g.companions.map(c => c.participantName),
			].filter(Boolean) as string[];
			return allNames.some(name =>
				name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(normalizedSearch),
			);
		})
		: invitationGroups;

	const toggleParticipant = (participantId: string) => {
		setSelectedParticipantIds(prev => {
			const next = new Set(prev);
			if (next.has(participantId)) {
				next.delete(participantId);
			} else {
				next.add(participantId);
			}
			return next;
		});
	};

	const selectEntireGroup = (group: InvitationGroup) => {
		setSelectedParticipantIds(prev => {
			const next = new Set(prev);
			// Excluir titulares já atribuídos da seleção — eles não são selecionáveis
			const selectableIds = [
				(group.titular && !group.titular.alreadyAssigned) ? group.titular.participantId : null,
				...group.companions.filter(c => !c.alreadyAssigned).map(c => c.participantId),
			].filter(Boolean) as string[];

			// If all selectable are already selected, deselect all; otherwise select all
			const allSelected = selectableIds.length > 0 && selectableIds.every(id => next.has(id));
			if (allSelected) {
				selectableIds.forEach(id => next.delete(id));
			} else {
				selectableIds.forEach(id => next.add(id));
			}
			return next;
		});
	};

	const selectedParticipants = availableParticipants.filter(p => selectedParticipantIds.has(p.participantId));
	const selectedCount = selectedParticipants.length;

	const selectedTable = tables.find(t => t.id === selectedTableId);
	const availableSeats = selectedTable ? selectedTable.availableSeats : 0;
	const exceedsCapacity = selectedCount > availableSeats;

	const handleAssignGroup = async () => {
		if (!selectedTableId || selectedCount === 0 || exceedsCapacity) return;

		setLoading(true);
		const result = await assignGroupAction({
			tableId: selectedTableId,
			participants: selectedParticipants.map(p => ({
				participantId: p.participantId,
				participantName: p.participantName,
				participantType: p.participantType,
				invitationId: p.invitationId,
				participantSource: p.participantSource || 'rsvp',
				specialCategory: p.specialCategory,
			})),
		});
		setLoading(false);

		if (result.success) {
			showFeedback('success', result.message || `${selectedCount} participante(s) atribuído(s) com sucesso.`);
			setAssignModalOpen(false);
			setSelectedParticipantIds(new Set());
			await refreshData();
		} else {
			showFeedback('error', result.error || 'Erro ao atribuir participantes.');
		}
	};

	const handleUnassign = async (participantId: string, participantName: string) => {
		setLoading(true);
		const result = await unassignParticipantAction({ participantId });
		setLoading(false);

		if (result.success) {
			showFeedback('success', `${participantName} removido(a) da mesa.`);
			await refreshData();
		} else {
			showFeedback('error', result.error || 'Erro ao remover participante.');
		}
	};

	const openTransferModal = (participantId: string, participantName: string) => {
		setTransferParticipantId(participantId);
		setTransferParticipantName(participantName);
		setTransferModalOpen(true);
	};

	const handleTransfer = async (targetTableId: string) => {
		if (!transferParticipantId) return;

		setLoading(true);
		const result = await transferParticipantAction({
			participantId: transferParticipantId,
			targetTableId,
		});
		setLoading(false);

		if (result.success) {
			showFeedback('success', `${transferParticipantName} transferido(a) com sucesso.`);
			setTransferModalOpen(false);
			setTransferParticipantId(null);
			setTransferParticipantName('');
			await refreshData();
		} else {
			showFeedback('error', result.error || 'Erro ao transferir participante.');
		}
	};

	// ---- REFRESH ----

	const refreshData = async () => {
		try {
			const result = await refreshTablesDataAction();
			if (result.success && result.data) {
				setTables(result.data.tables as TableWithOccupancy[]);
				setStats(result.data.stats as TablesDashboardStats);
			}
		} catch {
			// Silent fail — data will refresh on next page load
		}
	};

	// ---- FILTERED TABLES ----

	const filteredTables = tables.filter(t =>
		t.name.toLowerCase().includes(tableSearch.toLowerCase()),
	);

	// ---- RENDER ----

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-headline-sm font-bold text-primary">Organização de Mesas</h1>
					<p className="text-body-sm text-on-surface-variant">
						Gerencie mesas e distribua convidados para o evento.
					</p>
				</div>
				<div className="flex flex-wrap gap-3">
					<button
						onClick={() => setSpecialSectionOpen(prev => !prev)}
						className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-label-sm font-bold uppercase tracking-wider transition-colors ${
							specialSectionOpen
								? 'border-amber-300 bg-amber-50 text-amber-700'
								: 'border-outline-variant/30 bg-surface text-on-surface-variant hover:border-amber-300 hover:text-amber-700'
						}`}
					>
						<Crown size={18} />
						Participantes Especiais
					</button>
					<button
						onClick={openCreateModal}
						className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-label-sm font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90"
					>
						<Plus size={18} />
						Nova Mesa
					</button>
				</div>
			</div>

			{/* Special Participants Section */}
			{specialSectionOpen && (
				<div className="rounded-xl border border-amber-200/60 bg-amber-50/20 p-4">
					<div className="mb-4 flex items-center justify-between">
						<div>
							<h2 className="text-title-md font-bold text-amber-800">Participantes Especiais</h2>
							<p className="text-body-xs text-amber-700/70">
								Noivos, filhos e familiares que participam da distribuição de mesas sem convite RSVP.
							</p>
						</div>
						<button
							onClick={openCreateSpecialModal}
							disabled={loading}
							className="flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-label-sm font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-50"
						>
							<Plus size={16} />
							Adicionar
						</button>
					</div>

					{loadingSpecial ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 size={24} className="animate-spin text-amber-600/50" />
						</div>
					) : specialParticipants.length === 0 ? (
						<div className="py-8 text-center">
							<Crown size={32} className="mx-auto mb-2 text-amber-300" />
							<p className="text-body-sm text-amber-700/60">Nenhum participante especial cadastrado.</p>
						</div>
					) : (
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{specialParticipants.map(sp => {
								const CategoryIcon = CATEGORY_ICONS[sp.category];
								return (
									<div
										key={sp.id}
										className={`rounded-lg border p-3 transition-colors ${
											sp.active
												? 'border-amber-200/60 bg-surface-container-lowest'
												: 'border-outline-variant/20 bg-surface-container-low opacity-60'
										}`}
									>
										<div className="flex items-start justify-between gap-2">
											<div className="flex items-center gap-2 min-w-0">
												<CategoryIcon size={16} className="shrink-0 text-amber-600" />
												<div className="min-w-0">
													<p className="truncate text-body-sm font-semibold text-on-surface">
														{sp.fullName}
													</p>
													<p className="text-body-xs text-amber-700/70">
														{CATEGORY_LABELS[sp.category]}
													</p>
												</div>
											</div>
											<div className="flex shrink-0 gap-1">
												<button
													onClick={() => openEditSpecialModal(sp)}
													disabled={loading}
													className="rounded p-1 text-on-surface-variant hover:bg-amber-100 hover:text-amber-700 disabled:opacity-30"
													title="Editar"
												>
													<Pencil size={14} />
												</button>
												<button
													onClick={() => handleDeleteSpecial(sp.id)}
													disabled={loading}
													className="rounded p-1 text-on-surface-variant hover:bg-error-container/20 hover:text-error disabled:opacity-30"
													title="Excluir"
												>
													<Trash2 size={14} />
												</button>
											</div>
										</div>
										{sp.notes && (
											<p className="mt-2 truncate text-body-xs text-on-surface-variant/70">
												{sp.notes}
											</p>
										)}
										<div className="mt-2 flex items-center gap-2">
											<span
												className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
													sp.active
														? 'bg-green-100 text-green-700'
														: 'bg-outline-variant/20 text-on-surface-variant'
												}`}
											>
												{sp.active ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
												{sp.active ? 'Ativo' : 'Inativo'}
											</span>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			)}

			{/* Feedback */}
			{feedback && (
				<div
					className={`flex items-start gap-2 rounded-lg p-3 text-body-sm ${
						feedback.type === 'success'
							? 'bg-green-50 text-green-700'
							: 'bg-error-container/20 text-error'
					}`}
				>
					{feedback.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
					{feedback.message}
				</div>
			)}

			{/* Stats Cards */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
				<StatCard label="Mesas" value={stats.totalTables} icon={Armchair} />
				<StatCard label="Total Lugares" value={stats.totalSeats} icon={Users} />
				<StatCard label="Ocupados" value={stats.occupiedSeats} icon={UserMinus} color="text-tertiary-fixed-dim" />
				<StatCard label="Disponíveis" value={stats.availableSeats} icon={Plus} color="text-green-600" />
				<StatCard label="Sem Mesa" value={stats.guestsWithoutTable} icon={AlertCircle} color="text-error" />
			</div>

			{/* Table Search */}
			<div className="relative">
				<Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
				<input
					type="text"
					placeholder="Buscar mesa por nome..."
					value={tableSearch}
					onChange={e => setTableSearch(e.target.value)}
					className="w-full rounded-lg border border-outline-variant/30 bg-surface py-2 pl-10 pr-4 text-body-sm text-on-surface focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim"
				/>
			</div>

			{/* Tables Grid */}
			{filteredTables.length === 0 ? (
				<div className="rounded-xl border-2 border-dashed border-outline-variant/20 bg-surface-container-low p-8 text-center">
					<Armchair size={48} className="mx-auto mb-3 text-on-surface-variant/30" />
					<p className="text-body-md font-medium text-on-surface-variant">
						{tableSearch ? 'Nenhuma mesa encontrada.' : 'Nenhuma mesa cadastrada ainda.'}
					</p>
					{!tableSearch && (
						<button
							onClick={openCreateModal}
							className="mt-3 text-label-sm font-bold uppercase tracking-wider text-primary hover:underline"
						>
							Criar primeira mesa
						</button>
					)}
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{filteredTables.map(table => (
						<TableCard
							key={table.id}
							table={table}
							onEdit={() => openEditModal(table)}
							onDelete={() => setDeleteConfirmId(table.id)}
							onAssign={() => openAssignModal(table.id)}
							onUnassign={handleUnassign}
							onTransfer={openTransferModal}
							allTables={tables}
							isLoading={loading}
						/>
					))}
				</div>
			)}

			{/* Create/Edit Modal */}
			{modalMode && (
				<ModalOverlay onClose={() => { setModalMode(null); setEditingTableId(null); }}>
					<div className="w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 shadow-2xl">
						<h2 className="mb-4 text-headline-sm font-bold text-primary">
							{modalMode === 'create' ? 'Nova Mesa' : 'Editar Mesa'}
						</h2>

						<div className="space-y-4">
							<div>
								<label className="mb-1 block text-label-sm font-medium text-on-surface-variant">
									Nome / Identificação
								</label>
								<input
									type="text"
									value={formData.name}
									onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
									placeholder="Ex: Mesa 01, Família, VIP"
									className="w-full rounded-lg border border-outline-variant/30 bg-surface px-3 py-2 text-body-sm text-on-surface focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim"
									maxLength={100}
								/>
							</div>

							<div>
								<label className="mb-1 block text-label-sm font-medium text-on-surface-variant">
									Capacidade (lugares)
								</label>
								<input
									type="number"
									value={formData.capacity}
									onChange={e => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
									placeholder="Ex: 8"
									min={1}
									max={500}
									className="w-full rounded-lg border border-outline-variant/30 bg-surface px-3 py-2 text-body-sm text-on-surface focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim"
								/>
							</div>
						</div>

						<div className="mt-6 flex justify-end gap-3">
							<button
								onClick={() => { setModalMode(null); setEditingTableId(null); }}
								className="rounded-lg border border-outline-variant/30 bg-surface px-4 py-2 text-label-sm font-medium text-on-surface-variant hover:bg-surface-container-low"
							>
								Cancelar
							</button>
							<button
								onClick={modalMode === 'create' ? handleCreateTable : handleUpdateTable}
								disabled={loading || !formData.name.trim() || !formData.capacity}
								className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-label-sm font-bold uppercase tracking-wider text-white disabled:opacity-50"
							>
								{loading && <Loader2 size={16} className="animate-spin" />}
								{modalMode === 'create' ? 'Criar' : 'Salvar'}
							</button>
						</div>
					</div>
				</ModalOverlay>
			)}

			{/* Delete Confirmation Modal */}
			{deleteConfirmId && (
				<ModalOverlay onClose={() => setDeleteConfirmId(null)}>
					<div className="w-full max-w-sm rounded-2xl bg-surface-container-lowest p-6 shadow-2xl">
						<h2 className="mb-2 text-headline-sm font-bold text-error">Excluir Mesa</h2>
						<p className="mb-6 text-body-sm text-on-surface-variant">
							Tem certeza que deseja excluir esta mesa? Esta ação não pode ser desfeita.
						</p>
						<div className="flex justify-end gap-3">
							<button
								onClick={() => setDeleteConfirmId(null)}
								className="rounded-lg border border-outline-variant/30 bg-surface px-4 py-2 text-label-sm font-medium text-on-surface-variant"
							>
								Cancelar
							</button>
							<button
								onClick={() => handleDeleteTable(deleteConfirmId)}
								disabled={loading}
								className="flex items-center gap-2 rounded-lg bg-error px-4 py-2 text-label-sm font-bold uppercase tracking-wider text-white disabled:opacity-50"
							>
								{loading && <Loader2 size={16} className="animate-spin" />}
								Excluir
							</button>
						</div>
					</div>
				</ModalOverlay>
			)}

			{/* Assign Participant Modal — Group Selection */}
						{assignModalOpen && (
							<ModalOverlay onClose={() => { setAssignModalOpen(false); setSelectedParticipantIds(new Set()); }}>
								<div
									ref={assignModalRef}
									role="dialog"
									aria-modal="true"
									aria-labelledby="assign-modal-title"
									className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-2xl"
								>
									{/* Header */}
									<div className="flex items-center justify-between border-b border-outline-variant/10 p-4">
										<div>
											<h2 id="assign-modal-title" className="text-headline-sm font-bold text-primary">
												Adicionar Participantes
											</h2>
											<p className="text-body-xs text-on-surface-variant">
												Selecione os participantes do convite para atribuir à mesa.
											</p>
										</div>
										<button
											onClick={() => { setAssignModalOpen(false); setSelectedParticipantIds(new Set()); }}
											className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-low"
											aria-label="Fechar"
										>
											<X size={20} />
										</button>
									</div>

									{/* Search */}
									<div className="border-b border-outline-variant/10 p-3">
										<div className="relative">
											<Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
											<input
												ref={searchInputRef}
												type="text"
												placeholder="Buscar por nome do convidado ou acompanhante..."
												value={searchTerm}
												onChange={e => setSearchTerm(e.target.value)}
												className="w-full rounded-lg border border-outline-variant/30 bg-surface py-2.5 pl-9 pr-3 text-body-sm text-on-surface focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim"
											/>
										</div>
									</div>

									{/* Participants List */}
									<div className="flex-1 overflow-y-auto p-2">
										{loadingParticipants ? (
											<div className="flex flex-col items-center justify-center py-12">
												<Loader2 size={32} className="animate-spin text-on-surface-variant/30" />
												<p className="mt-3 text-body-sm text-on-surface-variant">Carregando participantes...</p>
											</div>
										) : loadError ? (
											<div className="flex flex-col items-center justify-center py-12">
												<AlertCircle size={32} className="text-error" />
												<p className="mt-3 text-body-sm text-error">{loadError}</p>
												<button
													onClick={() => openAssignModal(selectedTableId!)}
													className="mt-3 text-label-sm font-bold uppercase tracking-wider text-primary hover:underline"
												>
													Tentar novamente
												</button>
											</div>
										) : filteredGroups.length === 0 && filteredSpecialParticipants.length === 0 ? (
											<div className="py-12 text-center">
												<Users size={32} className="mx-auto mb-3 text-on-surface-variant/30" />
												<p className="text-body-sm font-medium text-on-surface-variant">
													{normalizedSearch
														? 'Nenhum participante encontrado para esta busca.'
														: 'Nenhum participante disponível para atribuição.'}
												</p>
												{!normalizedSearch && (
													<p className="mt-1 text-body-xs text-on-surface-variant/60">
														Todos os participantes já estão atribuídos a mesas.
													</p>
												)}
											</div>
										) : (
											<div className="space-y-4">
												{/* Seção: Participantes Especiais */}
												{filteredSpecialParticipants.length > 0 && (
													<div>
														<div className="mb-2 flex items-center gap-2 px-1">
															<Crown size={14} className="text-amber-600" />
															<span className="text-label-sm font-bold uppercase tracking-wider text-amber-700">
																Participantes Especiais
															</span>
															<span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
																{filteredSpecialParticipants.length}
															</span>
														</div>
														<div className="space-y-1">
															{filteredSpecialParticipants.map(sp => {
																const isSelected = selectedParticipantIds.has(sp.participantId);
																const CategoryIcon = CATEGORY_ICONS[sp.specialCategory || 'other'];
																return sp.alreadyAssigned ? (
																	<div key={sp.participantId} className="flex items-center gap-3 rounded-lg px-3 py-2 opacity-60">
																		<div className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-outline-variant/40 bg-outline-variant/20">
																			<Check size={10} className="text-on-surface-variant" />
																		</div>
																		<CategoryIcon size={14} className="shrink-0 text-amber-600" />
																		<span className="text-body-sm text-on-surface line-through">{sp.participantName}</span>
																		<span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
																			{CATEGORY_LABELS[sp.specialCategory || 'other']}
																		</span>
																		<span className="ml-auto text-[10px] font-medium text-on-surface-variant">Já em outra mesa</span>
																	</div>
																) : (
																	<label
																		key={sp.participantId}
																		className="flex cursor-pointer items-center gap-3 rounded-lg border border-amber-200/50 bg-amber-50/30 px-3 py-2 hover:bg-amber-50"
																	>
																		<input
																			type="checkbox"
																			checked={isSelected}
																			onChange={() => toggleParticipant(sp.participantId)}
																			className="h-4 w-4 rounded border-outline-variant/40 text-primary accent-primary"
																		/>
																		<CategoryIcon size={14} className="shrink-0 text-amber-600" />
																		<span className="text-body-sm font-medium text-on-surface">{sp.participantName}</span>
																		<span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
																			{CATEGORY_LABELS[sp.specialCategory || 'other']}
																		</span>
																	</label>
																);
															})}
														</div>
													</div>
												)}

												{/* Seção: Convidados Confirmados (RSVP) */}
												{filteredGroups.length > 0 && (
													<div>
														{filteredSpecialParticipants.length > 0 && (
															<div className="mb-2 flex items-center gap-2 px-1">
																<Users size={14} className="text-on-surface-variant" />
																<span className="text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">
																	Convidados Confirmados
																</span>
															</div>
														)}
														<div className="space-y-2">
															{filteredGroups.map(group => {
																const isExpanded = expandedInvitationId === group.invitationId;
																const groupIds = [
																	group.titular?.participantId,
																	...group.companions.map(c => c.participantId),
																].filter(Boolean) as string[];
																const allSelected = groupIds.every(id => selectedParticipantIds.has(id));
																const someSelected = groupIds.some(id => selectedParticipantIds.has(id));
																const groupName = group.titular?.participantName || titularNames[group.invitationId] || 'Convite';

																return (
																	<div key={group.invitationId} className="rounded-xl border border-outline-variant/15 bg-surface-container-low overflow-hidden">
																		{/* Group Header */}
																		<div className="flex items-center gap-3 p-3">
																			<button
																				onClick={() => selectEntireGroup(group)}
																				className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 transition-colors ${
																					allSelected
																						? 'border-primary bg-primary text-white'
																						: someSelected
																							? 'border-primary bg-primary/20 text-primary'
																							: 'border-outline-variant/40 text-transparent'
																				}`}
																				aria-label={allSelected ? `Desmarcar ${groupName}` : `Selecionar ${groupName}`}
																			>
																				<Check size={14} />
																			</button>

																			<div className="flex-1 min-w-0">
																				<p className="truncate text-body-sm font-semibold text-on-surface">
																					{groupName}
																				</p>
																				<p className="text-body-xs text-on-surface-variant">
																					{groupIds.length} {groupIds.length === 1 ? 'participante' : 'participantes'}
																					{group.companions.length > 0 && ` · ${group.companions.length} acompanhante${group.companions.length > 1 ? 's' : ''}`}
																				</p>
																			</div>

																			{group.companions.length > 0 && (
																				<button
																					onClick={() => setExpandedInvitationId(isExpanded ? null : group.invitationId)}
																					className="shrink-0 rounded-lg p-1.5 text-on-surface-variant hover:bg-surface"
																					aria-label={isExpanded ? 'Recolher' : 'Expandir'}
																				>
																					{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
																				</button>
																			)}
																		</div>

																		{/* Expanded: Titular + Companions */}
																		{isExpanded && (
																			<div className="border-t border-outline-variant/10 bg-surface-container-lowest/50 px-3 pb-2 pt-1">
																				{group.titular && (
																					group.titular.alreadyAssigned ? (
																						<div className="flex items-center gap-3 rounded-lg px-2 py-2 opacity-60">
																							<div className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-outline-variant/40 bg-outline-variant/20">
																								<Check size={10} className="text-on-surface-variant" />
																							</div>
																							<span className="text-body-sm text-on-surface line-through">{group.titular.participantName}</span>
																							<span className="rounded-full bg-surface-container-low px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
																								Titular
																							</span>
																							<span className="ml-auto text-[10px] font-medium text-on-surface-variant">Já em outra mesa</span>
																						</div>
																					) : (
																						<label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-container-low">
																							<input
																								type="checkbox"
																								checked={selectedParticipantIds.has(group.titular.participantId)}
																								onChange={() => toggleParticipant(group.titular!.participantId)}
																								className="h-4 w-4 rounded border-outline-variant/40 text-primary accent-primary"
																							/>
																							<span className="text-body-sm font-medium text-on-surface">{group.titular.participantName}</span>
																							<span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
																								Titular
																							</span>
																						</label>
																					)
																				)}
																				{group.companions.map(companion => (
																					companion.alreadyAssigned ? (
																						<div key={companion.participantId} className="flex items-center gap-3 rounded-lg px-2 py-2 opacity-60">
																							<div className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-outline-variant/40 bg-outline-variant/20">
																								<Check size={10} className="text-on-surface-variant" />
																							</div>
																							<span className="text-body-sm text-on-surface line-through">{companion.participantName}</span>
																							<span className="rounded-full bg-surface-container-low px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
																								Acompanhante
																							</span>
																							<span className="ml-auto text-[10px] font-medium text-on-surface-variant">Já em outra mesa</span>
																						</div>
																					) : (
																						<label
																							key={companion.participantId}
																							className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-container-low"
																						>
																							<input
																								type="checkbox"
																								checked={selectedParticipantIds.has(companion.participantId)}
																								onChange={() => toggleParticipant(companion.participantId)}
																								className="h-4 w-4 rounded border-outline-variant/40 text-primary accent-primary"
																							/>
																							<span className="text-body-sm text-on-surface">{companion.participantName}</span>
																							<span className="rounded-full bg-surface-container-low px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
																								Acompanhante
																							</span>
																						</label>
																					)
																				))}
																			</div>
																		)}
																	</div>
																);
															})}
														</div>
													</div>
												)}
											</div>
										)}
									</div>

									{/* Footer with Preview and Action */}
									<div className="border-t border-outline-variant/10 p-4">
										{selectedCount > 0 ? (
											<div className="space-y-3">
												<div className="rounded-lg bg-surface-container-low p-3">
													<p className="text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">
														Prévia da Atribuição
													</p>
													<div className="mt-2 space-y-1">
														{selectedParticipants.slice(0, 5).map(p => (
															<p key={p.participantId} className="text-body-xs text-on-surface">
																• {p.participantName}
																<span className="ml-1 text-on-surface-variant">
																	({p.participantSource === 'special'
																			? CATEGORY_LABELS[p.specialCategory || 'other']
																			: p.participantType === 'titular' ? 'Titular' : 'Acompanhante'})
																</span>
															</p>
														))}
														{selectedCount > 5 && (
															<p className="text-body-xs text-on-surface-variant">
																...e mais {selectedCount - 5} participante(s)
															</p>
														)}
													</div>
													<div className="mt-2 flex items-center gap-4 text-body-xs">
														<span className="font-medium text-on-surface">
															Lugares necessários: <strong>{selectedCount}</strong>
														</span>
														<span className={`font-medium ${exceedsCapacity ? 'text-error' : 'text-green-600'}`}>
															Disponíveis na mesa: <strong>{availableSeats}</strong>
														</span>
													</div>
												</div>

												{exceedsCapacity && (
													<div className="flex items-start gap-2 rounded-lg bg-error-container/20 p-3 text-body-xs text-error">
														<AlertCircle size={16} className="shrink-0 mt-0.5" />
														Capacidade insuficiente. Reduza a seleção ou escolha outra mesa.
													</div>
												)}

												<div className="flex gap-3">
													<button
														onClick={() => setSelectedParticipantIds(new Set())}
														className="flex-1 rounded-lg border border-outline-variant/30 bg-surface py-3 text-label-sm font-medium text-on-surface-variant hover:bg-surface-container-low"
													>
														Limpar Seleção
													</button>
													<button
														onClick={handleAssignGroup}
														disabled={loading || exceedsCapacity || selectedCount === 0}
														className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 text-label-sm font-bold uppercase tracking-wider text-white disabled:opacity-50"
													>
														{loading && <Loader2 size={16} className="animate-spin" />}
														Adicionar {selectedCount} {selectedCount === 1 ? 'participante' : 'participantes'}
													</button>
												</div>
											</div>
										) : (
											<div className="text-center text-body-sm text-on-surface-variant">
												Selecione pelo menos um participante para continuar.
											</div>
										)}
									</div>
								</div>
							</ModalOverlay>
						)}

			{/* Transfer Modal */}
			{transferModalOpen && (
				<ModalOverlay onClose={() => { setTransferModalOpen(false); setTransferParticipantId(null); }}>
					<div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-surface-container-lowest shadow-2xl">
						<div className="border-b border-outline-variant/10 p-4">
							<h2 className="text-headline-sm font-bold text-primary">Transferir Participante</h2>
							<p className="text-body-xs text-on-surface-variant">
								Selecione a mesa destino para <strong>{transferParticipantName}</strong>.
							</p>
						</div>

						<div className="flex-1 overflow-y-auto p-2">
							<div className="space-y-1">
								{tables
									.filter(t => t.id !== tables.find(tbl =>
										tbl.assignments.some(a => a.participantId === transferParticipantId),
									)?.id)
									.map(table => (
										<button
											key={table.id}
											onClick={() => handleTransfer(table.id)}
											disabled={loading || table.availableSeats <= 0}
											className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-body-sm hover:bg-surface-container-low disabled:opacity-50"
										>
											<div>
												<span className="font-medium text-on-surface">{table.name}</span>
												<span className="ml-2 text-body-xs text-on-surface-variant">
													{table.occupiedSeats}/{table.capacity}
												</span>
											</div>
											<ArrowRightLeft size={16} className="text-primary" />
										</button>
									))}
							</div>
						</div>
					</div>
				</ModalOverlay>
			)}

			{/* Special Participant Create/Edit Modal */}
			{specialModalMode && (
				<SpecialParticipantModal
					mode={specialModalMode}
					formData={specialFormData}
					onFormChange={setSpecialFormData}
					onSubmit={specialModalMode === 'create' ? handleCreateSpecial : handleUpdateSpecial}
					onClose={() => {
						setSpecialModalMode(null);
						setEditingSpecialId(null);
						setSpecialFormData({ fullName: '', category: 'groom', notes: '', active: true });
					}}
					isLoading={loading}
				/>
			)}

			{/* Delete Confirmation Modal */}
			{deleteConfirmOpen && deletingParticipant && (
				<ModalOverlay onClose={() => { setDeleteConfirmOpen(false); setDeletingParticipant(null); }}>
					<div className="w-full max-w-md overflow-hidden rounded-2xl bg-surface-container-lowest shadow-2xl">
						{/* Header */}
						<div className="flex items-center gap-3 border-b border-error/20 bg-error-container/10 px-5 py-4">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error/10 text-error">
								<Trash2 size={20} />
							</div>
							<div>
								<h2 className="text-title-md font-bold text-on-surface">
									Excluir Participante Permanentemente
								</h2>
								<p className="text-body-xs text-error">Esta ação não pode ser desfeita.</p>
							</div>
						</div>

						{/* Body */}
						<div className="space-y-4 p-5">
							<div className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-4">
								<div className="flex items-center gap-3 mb-2">
									{(() => { const Icon = CATEGORY_ICONS[deletingParticipant.category]; return <Icon size={18} className="text-amber-600" />; })()}
									<span className="text-body-md font-semibold text-on-surface">
										{deletingParticipant.fullName}
									</span>
								</div>
								<p className="text-body-xs text-on-surface-variant">
									Categoria: <strong>{CATEGORY_LABELS[deletingParticipant.category]}</strong>
								</p>
							</div>

							{deletingParticipant.hasAssignment ? (
								<div className="flex items-start gap-3 rounded-lg border border-error/30 bg-error-container/10 p-4">
									<AlertCircle size={18} className="shrink-0 mt-0.5 text-error" />
									<div>
										<p className="text-body-sm font-semibold text-error">
											Este participante está atribuído à <strong>{deletingParticipant.tableName || 'uma mesa'}</strong>.
										</p>
										<p className="mt-1 text-body-xs text-on-surface-variant">
											A atribuição será removida e a vaga será liberada automaticamente.
										</p>
									</div>
								</div>
							) : (
								<div className="flex items-start gap-3 rounded-lg border border-outline-variant/20 bg-surface-container-low p-4">
									<Users size={18} className="shrink-0 mt-0.5 text-on-surface-variant" />
									<p className="text-body-sm text-on-surface-variant">
										Este participante não possui mesa atribuída.
									</p>
								</div>
							)}

							<p className="text-body-xs text-on-surface-variant leading-relaxed">
								O cadastro e todas as vinculações deste participante serão <strong>removidos permanentemente</strong> do sistema. Os contadores de distribuição serão atualizados automaticamente.
							</p>
						</div>

						{/* Footer */}
						<div className="flex items-center justify-end gap-3 border-t border-outline-variant/10 bg-surface-container-low px-5 py-4">
							<button
								onClick={() => { setDeleteConfirmOpen(false); setDeletingParticipant(null); }}
								disabled={loading}
								className="rounded-lg px-4 py-2.5 text-label-sm font-bold uppercase tracking-wider text-on-surface-variant hover:bg-surface disabled:opacity-50"
							>
								Cancelar
							</button>
							<button
								onClick={confirmDeleteSpecial}
								disabled={loading}
								className="flex items-center gap-2 rounded-lg bg-error px-5 py-2.5 text-label-sm font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-50"
							>
								{loading && <Loader2 size={16} className="animate-spin" />}
								Excluir Permanentemente
							</button>
						</div>
					</div>
				</ModalOverlay>
			)}
		</div>
	);
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatCard({ label, value, icon: Icon, color }: {
	label: string;
	value: number;
	icon: React.ElementType;
	color?: string;
}) {
	return (
		<div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4 shadow-sm">
			<div className="flex items-center gap-2">
				<Icon size={20} className={color || 'text-on-surface-variant'} />
				<span className="text-label-sm font-medium uppercase tracking-wider text-on-surface-variant">{label}</span>
			</div>
			<p className={`mt-1 text-display-sm font-bold ${color || 'text-on-surface'}`}>{value}</p>
		</div>
	);
}

function TableCard({ table, onEdit, onDelete, onAssign, onUnassign, onTransfer, allTables, isLoading }: {
	table: TableWithOccupancy;
	onEdit: () => void;
	onDelete: () => void;
	onAssign: () => void;
	onUnassign: (participantId: string, participantName: string) => void;
	onTransfer: (participantId: string, participantName: string) => void;
	allTables: TableWithOccupancy[];
	isLoading: boolean;
}) {
	const isFull = table.occupiedSeats >= table.capacity;
	const occupancyPercent = table.capacity > 0 ? (table.occupiedSeats / table.capacity) * 100 : 0;

	return (
		<div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm">
			{/* Card Header */}
			<div className="flex items-start justify-between border-b border-outline-variant/10 p-4">
				<div>
					<h3 className="text-title-md font-bold text-on-surface">{table.name}</h3>
					<p className="text-body-xs text-on-surface-variant">
						{table.occupiedSeats} / {table.capacity} lugares
					</p>
				</div>
				<div className="flex gap-1">
					<button
						onClick={onEdit}
						className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
						title="Editar mesa"
					>
						<Pencil size={16} />
					</button>
					<button
						onClick={onDelete}
						className="rounded-lg p-1.5 text-on-surface-variant hover:bg-error-container/20 hover:text-error"
						title="Excluir mesa"
					>
						<Trash2 size={16} />
					</button>
				</div>
			</div>

			{/* Occupancy Bar */}
			<div className="px-4 pt-3">
				<div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-low">
					<div
						className={`h-full rounded-full transition-all ${
							isFull ? 'bg-error' : occupancyPercent > 75 ? 'bg-tertiary-fixed-dim' : 'bg-green-500'
						}`}
						style={{ width: `${Math.min(100, occupancyPercent)}%` }}
					/>
				</div>
				<div className="mt-1 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
					<span>{isFull ? 'Completa' : `${table.availableSeats} vagas`}</span>
					<span>{Math.round(occupancyPercent)}%</span>
				</div>
			</div>

			{/* Assignments List */}
			<div className="max-h-48 overflow-y-auto px-4 py-2">
				{table.assignments.length === 0 ? (
					<p className="py-2 text-center text-body-xs text-on-surface-variant/60">
						Nenhum participante atribuído.
					</p>
				) : (
					<div className="space-y-1">
						{table.assignments.map(assignment => (
							<div
								key={assignment.id}
								className="group flex items-center justify-between rounded-lg px-2 py-1.5 text-body-xs hover:bg-surface-container-low"
							>
								<div className="flex items-center gap-2 overflow-hidden">
									<span className="truncate font-medium text-on-surface">
										{assignment.participantName}
									</span>
									<span className="shrink-0 rounded-full bg-surface-container-low px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-on-surface-variant">
										{assignment.participantType === 'titular' ? 'C' : 'A'}
									</span>
								</div>
								<div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
									<button
										onClick={() => onTransfer(assignment.participantId, assignment.participantName)}
										disabled={isLoading || allTables.length <= 1}
										className="rounded p-1 text-on-surface-variant hover:bg-surface hover:text-primary disabled:opacity-30"
										title="Transferir"
									>
										<ArrowRightLeft size={12} />
									</button>
									<button
										onClick={() => onUnassign(assignment.participantId, assignment.participantName)}
										disabled={isLoading}
										className="rounded p-1 text-on-surface-variant hover:bg-error-container/20 hover:text-error disabled:opacity-30"
										title="Remover"
									>
										<X size={12} />
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Add Button */}
			<div className="border-t border-outline-variant/10 p-3">
				<button
					onClick={onAssign}
					disabled={isLoading || isFull}
					className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-outline-variant/30 py-2 text-label-sm font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
				>
					{isLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
					{isFull ? 'Mesa Cheia' : 'Adicionar Participante'}
				</button>
			</div>
		</div>
	);
}

// ============================================================================
// MODAL DE CADASTRO/EDIÇÃO DE PARTICIPANTES ESPECIAIS
// ============================================================================

function SpecialParticipantModal({
	mode,
	formData,
	onFormChange,
	onSubmit,
	onClose,
	isLoading,
}: {
	mode: 'create' | 'edit';
	formData: SpecialFormData;
	onFormChange: (data: SpecialFormData) => void;
	onSubmit: () => void;
	onClose: () => void;
	isLoading: boolean;
}) {
	return (
		<ModalOverlay onClose={onClose}>
			<div className="w-full overflow-hidden rounded-t-2xl bg-surface-container-lowest shadow-2xl sm:rounded-2xl">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-outline-variant/10 bg-surface-container-low px-5 py-4">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
							<Crown size={20} />
						</div>
						<div>
							<h2 className="text-title-md font-bold text-on-surface">
								{mode === 'create' ? 'Cadastrar Participante Especial' : 'Editar Participante Especial'}
							</h2>
							<p className="text-body-xs text-on-surface-variant">
								Noivos, filhos e familiares na distribuição de mesas.
							</p>
						</div>
					</div>
					<button
						onClick={onClose}
						disabled={isLoading}
						className="rounded-lg p-2 text-on-surface-variant hover:bg-surface disabled:opacity-50"
					>
						<X size={20} />
					</button>
				</div>

				{/* Form */}
				<div className="space-y-4 p-5">
					{/* Nome */}
					<div>
						<label className="mb-1 block text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">
							Nome Completo *
						</label>
						<input
							type="text"
							value={formData.fullName}
							onChange={e => onFormChange({ ...formData, fullName: e.target.value })}
							placeholder="Ex: Amanda Benite Costa"
							maxLength={200}
							disabled={isLoading}
							className="w-full rounded-lg border border-outline-variant/30 bg-surface px-3 py-2.5 text-body-md text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
							autoFocus
						/>
					</div>

					{/* Categoria */}
					<div>
						<label className="mb-1 block text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">
							Categoria *
						</label>
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
							{(Object.entries(CATEGORY_LABELS) as [SpecialParticipantCategory, string][]).map(([key, label]) => {
								const Icon = CATEGORY_ICONS[key];
								const isSelected = formData.category === key;
								return (
									<button
										key={key}
										type="button"
										onClick={() => onFormChange({ ...formData, category: key })}
										disabled={isLoading}
										className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-body-sm font-medium transition-colors disabled:opacity-50 ${
											isSelected
												? 'border-amber-400 bg-amber-50 text-amber-800'
												: 'border-outline-variant/30 bg-surface text-on-surface-variant hover:border-amber-300 hover:bg-amber-50/50'
										}`}
									>
										<Icon size={16} className={isSelected ? 'text-amber-600' : 'text-on-surface-variant/50'} />
										{label}
									</button>
								);
							})}
						</div>
					</div>

					{/* Observações */}
					<div>
						<label className="mb-1 block text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">
							Observações <span className="font-normal normal-case">(opcional)</span>
						</label>
						<textarea
							value={formData.notes}
							onChange={e => onFormChange({ ...formData, notes: e.target.value })}
							placeholder="Ex: Mesa dos noivos, criança de colo..."
							maxLength={500}
							rows={2}
							disabled={isLoading}
							className="w-full resize-none rounded-lg border border-outline-variant/30 bg-surface px-3 py-2.5 text-body-md text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
						/>
					</div>

					{/* Status Ativo/Inativo (apenas em modo edição) */}
					{mode === 'edit' && (
						<div className="flex items-center gap-3 rounded-lg border border-outline-variant/20 bg-surface-container-low p-3">
							<button
								type="button"
								onClick={() => onFormChange({ ...formData, active: !formData.active })}
								disabled={isLoading}
								className={`flex h-8 w-14 shrink-0 items-center rounded-full px-1 transition-colors disabled:opacity-50 ${
									formData.active ? 'bg-green-500' : 'bg-outline-variant/40'
								}`}
							>
								<div
									className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
										formData.active ? 'translate-x-6' : 'translate-x-0'
									}`}
								/>
							</button>
							<div>
								<p className="text-body-sm font-semibold text-on-surface">
									{formData.active ? 'Ativo' : 'Inativo'}
								</p>
								<p className="text-body-xs text-on-surface-variant">
									{formData.active
										? 'Participante aparece na lista de distribuição de mesas.'
										: 'Participante não aparece na distribuição, mas mantém atribuições existentes.'}
								</p>
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-3 border-t border-outline-variant/10 bg-surface-container-low px-5 py-4">
					<button
						onClick={onClose}
						disabled={isLoading}
						className="rounded-lg px-4 py-2.5 text-label-sm font-bold uppercase tracking-wider text-on-surface-variant hover:bg-surface disabled:opacity-50"
					>
						Cancelar
					</button>
					<button
						onClick={onSubmit}
						disabled={isLoading || !formData.fullName.trim()}
						className="flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-label-sm font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-50"
					>
						{isLoading && <Loader2 size={16} className="animate-spin" />}
						{mode === 'create' ? 'Cadastrar' : 'Salvar Alterações'}
					</button>
				</div>
			</div>
		</ModalOverlay>
	);
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
	return (
		<div
			className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
			onClick={onClose}
		>
			<div
				onClick={e => e.stopPropagation()}
				className="mx-auto w-full max-w-2xl sm:mx-auto"
			>
				{children}
			</div>
		</div>
	);
}