'use client';

import { useState, useEffect } from 'react';
import { PlayCircle, StopCircle, RotateCcw, Loader2, AlertCircle, CheckCircle, Clock, ShieldAlert } from 'lucide-react';
import {
	getReceptionControlAction,
	openReceptionAction,
	closeReceptionAction,
	reopenReceptionAction,
	type ReceptionControlState,
	type ReceptionStatus,
} from '@/app/actions/reception-control.action';

/**
 * Painel de Controle da Recepção — Client Component (Lote 3 §10)
 *
 * Permite ao administrador:
 * - Abrir a recepção (libera check-ins reais, bloqueia treinamento)
 * - Encerrar a recepção (bloqueia novos check-ins)
 * - Reabrir a recepção (requer justificativa)
 *
 * Exibe estado atual, histórico de transições e indicadores visuais.
 */
export function ReceptionControlPanel() {
	const [state, setState] = useState<ReceptionControlState | null>(null);
	const [loading, setLoading] = useState(true);
	const [actionLoading, setActionLoading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [showReopenForm, setShowReopenForm] = useState(false);
	const [reopenReason, setReopenReason] = useState('');

	useEffect(() => {
 loadState();
	}, []);

	async function loadState() {
 setLoading(true);
 setError('');
 try {
 const result = await getReceptionControlAction();
 if (result.success && result.data) {
 setState(result.data);
 } else {
 setError(result.error || 'Erro ao carregar estado da recepção.');
 }
 } catch {
 setError('Erro de conexão.');
 } finally {
 setLoading(false);
 }
	}

	async function handleOpen() {
 setActionLoading(true);
 setError('');
 setSuccess('');

 const result = await openReceptionAction();
 if (result.success) {
 setSuccess(result.message || 'Recepção aberta.');
 await loadState();
 } else {
 setError(result.error || 'Erro ao abrir recepção.');
 }
 setActionLoading(false);
	}

	async function handleClose() {
 setActionLoading(true);
 setError('');
 setSuccess('');

 const result = await closeReceptionAction();
 if (result.success) {
 setSuccess(result.message || 'Recepção encerrada.');
 await loadState();
 } else {
 setError(result.error || 'Erro ao encerrar recepção.');
 }
 setActionLoading(false);
	}

	async function handleReopen() {
 if (!reopenReason || reopenReason.trim().length < 5) {
 setError('Justificativa deve ter pelo menos 5 caracteres.');
 return;
 }

 setActionLoading(true);
 setError('');
 setSuccess('');

 const result = await reopenReceptionAction({ reason: reopenReason.trim() });
 if (result.success) {
 setSuccess(result.message || 'Recepção reaberta.');
 setShowReopenForm(false);
 setReopenReason('');
 await loadState();
 } else {
 setError(result.error || 'Erro ao reabrir recepção.');
 }
 setActionLoading(false);
	}

	function getStatusConfig(status: ReceptionStatus) {
 switch (status) {
 case 'open':
 return {
 label: 'RECEPÇÃO ABERTA',
 description: 'Check-ins reais estão liberados. Treinamento bloqueado.',
 color: 'bg-green-50 border-green-200 text-green-800',
 icon: PlayCircle,
 iconColor: 'text-green-600',
 };
 case 'closed':
 return {
 label: 'RECEPÇÃO ENCERRADA',
 description: 'Novos check-ins bloqueados. Histórico disponível.',
 color: 'bg-red-50 border-red-200 text-red-800',
 icon: StopCircle,
 iconColor: 'text-red-600',
 };
 default: // waiting
 return {
 label: 'AGUARDANDO ABERTURA',
 description: 'Validadores podem logar. Treinamento disponível.',
 color: 'bg-orange-50 border-orange-200 text-orange-800',
 icon: Clock,
 iconColor: 'text-orange-600',
 };
 }
	}

	if (loading) {
 return (
 <div className="flex items-center justify-center rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-8 shadow-sm">
 <Loader2 size={24} className="animate-spin text-on-surface-variant/40" />
 <span className="ml-3 text-body-sm text-on-surface-variant/60">Carregando estado da recepção...</span>
 </div>
 );
	}

	const statusConfig = state ? getStatusConfig(state.status) : getStatusConfig('waiting');
	const StatusIcon = statusConfig.icon;

	return (
 <div className="space-y-4">
 {/* Estado atual */}
 <div className={`rounded-xl border p-6 shadow-sm ${statusConfig.color}`}>
 <div className="flex items-start gap-4">
 <StatusIcon size={32} className={`shrink-0 ${statusConfig.iconColor}`} />
 <div className="flex-1">
 <h2 className="text-title-lg font-bold">{statusConfig.label}</h2>
 <p className="mt-1 text-body-sm opacity-80">{statusConfig.description}</p>

 {state?.openedAt && (
 <p className="mt-2 text-[10px] opacity-60">
 Aberta em: {new Date(state.openedAt).toLocaleString('pt-BR')}
 {state.openedBy && ` por ${state.openedBy}`}
 </p>
 )}
 {state?.closedAt && state.status !== 'open' && (
 <p className="mt-1 text-[10px] opacity-60">
 Encerrada em: {new Date(state.closedAt).toLocaleString('pt-BR')}
 {state.closedBy && ` por ${state.closedBy}`}
 </p>
 )}
 {state?.reopenedAt && (
 <p className="mt-1 text-[10px] opacity-60">
 Reaberta em: {new Date(state.reopenedAt).toLocaleString('pt-BR')}
 {state.reopenedBy && ` por ${state.reopenedBy}`}
 {state.reopenReason && ` — "${state.reopenReason}"`}
 </p>
 )}
 </div>
 </div>
 </div>

 {/* Mensagens de feedback */}
 {error && (
 <div className="flex items-start gap-2 rounded-lg bg-error-container/20 p-3 text-body-sm text-error">
 <AlertCircle size={16} className="mt-0.5 shrink-0" />
 <span>{error}</span>
 </div>
 )}
 {success && (
 <div className="flex items-start gap-2 rounded-lg bg-green-50 p-3 text-body-sm text-green-700">
 <CheckCircle size={16} className="mt-0.5 shrink-0" />
 <span>{success}</span>
 </div>
 )}

 {/* Ações disponíveis */}
 <div className="flex flex-wrap gap-3">
 {!state || state.status === 'waiting' ? (
 <button
 onClick={handleOpen}
 disabled={actionLoading}
 className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-3 text-label-md font-bold uppercase tracking-widest text-white shadow-md transition-all hover:bg-green-700 disabled:opacity-50"
 >
 {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={18} />}
 Abrir Recepção
 </button>
 ) : state.status === 'open' ? (
 <button
 onClick={handleClose}
 disabled={actionLoading}
 className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-label-md font-bold uppercase tracking-widest text-white shadow-md transition-all hover:bg-red-700 disabled:opacity-50"
 >
 {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <StopCircle size={18} />}
 Encerrar Recepção
 </button>
 ) : (
 // closed
 <>
 {!showReopenForm ? (
 <button
 onClick={() => setShowReopenForm(true)}
 disabled={actionLoading}
 className="flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-3 text-label-md font-bold uppercase tracking-widest text-white shadow-md transition-all hover:bg-orange-700 disabled:opacity-50"
 >
 {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={18} />}
 Reabrir Recepção
 </button>
 ) : (
 <div className="w-full rounded-xl border border-orange-200 bg-orange-50 p-4">
 <div className="mb-3 flex items-center gap-2">
 <ShieldAlert size={18} className="text-orange-700" />
 <h3 className="text-title-sm font-bold text-orange-800">Confirmar Reabertura</h3>
 </div>
 <textarea
 value={reopenReason}
 onChange={(e) => setReopenReason(e.target.value)}
 placeholder="Justificativa para reabrir a recepção (obrigatório, mínimo 5 caracteres)..."
 rows={2}
 className="mb-3 w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-body-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
 />
 <div className="flex gap-2">
 <button
 onClick={handleReopen}
 disabled={actionLoading || reopenReason.trim().length < 5}
 className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-label-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-orange-700 disabled:opacity-50"
 >
 {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
 Confirmar Reabertura
 </button>
 <button
 onClick={() => { setShowReopenForm(false); setReopenReason(''); setError(''); }}
 className="rounded-lg border border-orange-200 bg-white px-4 py-2 text-label-sm font-medium text-orange-700 transition-colors hover:bg-orange-50"
 >
 Cancelar
 </button>
 </div>
 </div>
 )}
 </>
 )}
 </div>

 {/* Histórico de transições */}
 {state && state.history.length > 0 && (
 <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4 shadow-sm">
 <h3 className="mb-3 text-label-sm font-semibold uppercase tracking-widest text-on-surface-variant">
 Histórico de Transições
 </h3>
 <div className="space-y-2">
 {state.history.map((entry, i) => (
 <div key={i} className="flex items-center gap-3 text-body-xs text-on-surface-variant">
 <span className="shrink-0 font-mono text-[10px] text-on-surface-variant/50">
 {new Date(entry.at).toLocaleString('pt-BR')}
 </span>
 <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
 entry.action === 'opened' ? 'bg-green-100 text-green-700' :
 entry.action === 'closed' ? 'bg-red-100 text-red-700' :
 'bg-orange-100 text-orange-700'
 }`}>
 {entry.action === 'opened' ? 'Aberta' : entry.action === 'closed' ? 'Encerrada' : 'Reaberta'}
 </span>
 <span>por {entry.by}</span>
 {entry.reason && <span className="italic opacity-60">— &quot;{entry.reason}&quot;</span>}
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
	);
}