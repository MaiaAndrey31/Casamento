'use client';

import { useState, useCallback } from 'react';
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
} from 'lucide-react';
import type { TableWithOccupancy, TablesDashboardStats } from '@/types';
import {
	createTableAction,
	updateTableAction,
	deleteTableAction,
	assignParticipantAction,
	unassignParticipantAction,
	transferParticipantAction,
	listAvailableParticipantsAction,
	refreshTablesDataAction,
} from '@/app/actions/tables.action';

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

	// Assignment modal
	const [assignModalOpen, setAssignModalOpen] = useState(false);
	const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [availableParticipants, setAvailableParticipants] = useState<Array<{
		participantId: string;
		participantName: string;
		participantType: 'titular' | 'companion';
		invitationId: string;
	}>>([]);
	const [loadingParticipants, setLoadingParticipants] = useState(false);

	// Transfer modal
	const [transferModalOpen, setTransferModalOpen] = useState(false);
	const [transferParticipantId, setTransferParticipantId] = useState<string | null>(null);
	const [transferParticipantName, setTransferParticipantName] = useState('');

	// Delete confirmation
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

	// Search filter for tables
	const [tableSearch, setTableSearch] = useState('');

	const showFeedback = useCallback((type: 'success' | 'error', message: string) => {
		setFeedback({ type, message });
		setTimeout(() => setFeedback(null), 4000);
	}, []);

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
		setLoadingParticipants(true);

		try {
			const result = await listAvailableParticipantsAction({});
			if (result.success && result.data) {
				setAvailableParticipants(result.data);
			} else {
				showFeedback('error', result.error || 'Erro ao carregar participantes disponíveis.');
			}
		} catch {
			showFeedback('error', 'Erro ao carregar participantes disponíveis.');
		} finally {
			setLoadingParticipants(false);
		}
	};

	const handleAssign = async (participant: typeof availableParticipants[0]) => {
		if (!selectedTableId) return;

		setLoading(true);
		const result = await assignParticipantAction({
			tableId: selectedTableId,
			participantId: participant.participantId,
			participantName: participant.participantName,
			participantType: participant.participantType,
			invitationId: participant.invitationId,
		});
		setLoading(false);

		if (result.success) {
			showFeedback('success', `${participant.participantName} atribuído(a) com sucesso.`);
			// Remove from available list locally
			setAvailableParticipants(prev => prev.filter(p => p.participantId !== participant.participantId));
			await refreshData();
		} else {
			showFeedback('error', result.error || 'Erro ao atribuir participante.');
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
				<button
					onClick={openCreateModal}
					className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-label-sm font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90"
				>
					<Plus size={18} />
					Nova Mesa
				</button>
			</div>

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

			{/* Assign Participant Modal */}
			{assignModalOpen && (
				<ModalOverlay onClose={() => { setAssignModalOpen(false); setSelectedTableId(null); }}>
					<div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-surface-container-lowest shadow-2xl">
						<div className="border-b border-outline-variant/10 p-4">
							<h2 className="text-headline-sm font-bold text-primary">Atribuir Participante</h2>
							<p className="text-body-xs text-on-surface-variant">
								Selecione um participante disponível para adicionar à mesa.
							</p>
						</div>

						<div className="border-b border-outline-variant/10 p-3">
							<div className="relative">
								<Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
								<input
									type="text"
									placeholder="Buscar por nome..."
									value={searchTerm}
									onChange={e => setSearchTerm(e.target.value)}
									className="w-full rounded-lg border border-outline-variant/30 bg-surface py-2 pl-9 pr-3 text-body-sm text-on-surface focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim"
								/>
							</div>
						</div>

						<div className="flex-1 overflow-y-auto p-2">
							{loadingParticipants ? (
								<div className="flex items-center justify-center py-8">
									<Loader2 size={32} className="animate-spin text-on-surface-variant/30" />
								</div>
							) : availableParticipants.filter(p =>
								p.participantName.toLowerCase().includes(searchTerm.toLowerCase()),
							).length === 0 ? (
								<div className="py-8 text-center text-body-sm text-on-surface-variant">
									Nenhum participante disponível encontrado.
								</div>
							) : (
								<div className="space-y-1">
									{availableParticipants
										.filter(p => p.participantName.toLowerCase().includes(searchTerm.toLowerCase()))
										.map(participant => (
											<button
												key={participant.participantId}
												onClick={() => handleAssign(participant)}
												disabled={loading}
												className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-body-sm hover:bg-surface-container-low disabled:opacity-50"
											>
												<div>
													<span className="font-medium text-on-surface">{participant.participantName}</span>
													<span className="ml-2 rounded-full bg-surface-container-low px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
														{participant.participantType === 'titular' ? 'Convidado' : 'Acompanhante'}
													</span>
												</div>
												<Plus size={16} className="text-primary" />
											</button>
										))}
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

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
	return (
		<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
			<div onClick={e => e.stopPropagation()} className="w-full">
				{children}
			</div>
		</div>
	);
}