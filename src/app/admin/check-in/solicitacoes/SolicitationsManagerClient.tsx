'use client';

import { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Clock, Loader2, AlertCircle, UserPlus, Search } from 'lucide-react';
import { listExtraCompanionRequestsAction, decideExtraCompanionRequestAction } from '@/app/actions/extra-companion.action';
import type { ExtraCompanionRequest } from '@/app/actions/extra-companion.action';

type RequestFilter = 'all' | 'pending' | 'approved' | 'rejected';

/**
 * Componente Client — Gerenciamento de Solicitações de Acompanhantes Extras (Lote 3 §8)
 *
 * Exibe lista de solicitações com filtros, permite aprovar/recusar com justificativa.
 * Aprovação adiciona automaticamente o acompanhante ao convite via transação.
 */
export function SolicitationsManagerClient() {
	const [requests, setRequests] = useState<ExtraCompanionRequest[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [filter, setFilter] = useState<RequestFilter>('all');
	const [decidingId, setDecidingId] = useState<string | null>(null);
	const [decisionForm, setDecisionForm] = useState<{ decision: 'approved' | 'rejected'; reason: string }>({
 decision: 'approved',
 reason: '',
	});
	const [successMessage, setSuccessMessage] = useState('');

	useEffect(() => {
 loadRequests();
	}, [filter]);

	async function loadRequests() {
 setLoading(true);
 setError('');
 try {
 const result = await listExtraCompanionRequestsAction(filter);
 if (result.success && result.data) {
 setRequests(result.data);
 } else {
 setError(result.error || 'Erro ao carregar solicitações.');
 }
 } catch {
 setError('Erro de conexão.');
 } finally {
 setLoading(false);
 }
	}

	async function handleDecide(requestId: string) {
 if (!decisionForm.reason || decisionForm.reason.trim().length < 3) {
 setError('Justificativa deve ter pelo menos 3 caracteres.');
 return;
 }

 setDecidingId(requestId);
 setError('');
 setSuccessMessage('');

 const result = await decideExtraCompanionRequestAction({
 requestId,
 decision: decisionForm.decision,
 reason: decisionForm.reason.trim(),
 });

 if (result.success) {
 setSuccessMessage(result.message || 'Solicitação processada.');
 setDecidingId(null);
 setDecisionForm({ decision: 'approved', reason: '' });
 loadRequests();
 } else {
 setError(result.error || 'Erro ao processar solicitação.');
 }

 setDecidingId(null);
	}

	function getStatusIcon(status: string) {
 switch (status) {
 case 'approved': return <CheckCircle size={16} className="text-green-600" />;
 case 'rejected': return <XCircle size={16} className="text-red-600" />;
 default: return <Clock size={16} className="text-orange-500" />;
 }
	}

	function getStatusLabel(status: string) {
 switch (status) {
 case 'approved': return { text: 'Aprovado', color: 'bg-green-100 text-green-800' };
 case 'rejected': return { text: 'Recusado', color: 'bg-red-100 text-red-800' };
 default: return { text: 'Pendente', color: 'bg-orange-100 text-orange-800' };
 }
	}

	const pendingCount = requests.filter(r => r.status === 'pending').length;

	return (
 <div className="space-y-4">
 {/* Mensagens de feedback */}
 {error && (
 <div className="flex items-start gap-2 rounded-lg bg-error-container/20 p-3 text-body-sm text-error">
 <AlertCircle size={16} className="mt-0.5 shrink-0" />
 <span>{error}</span>
 </div>
 )}
 {successMessage && (
 <div className="flex items-start gap-2 rounded-lg bg-green-50 p-3 text-body-sm text-green-700">
 <CheckCircle size={16} className="mt-0.5 shrink-0" />
 <span>{successMessage}</span>
 </div>
 )}

 {/* Filtros */}
 <div className="flex flex-wrap gap-2">
 {(['all', 'pending', 'approved', 'rejected'] as RequestFilter[]).map((f) => (
 <button
 key={f}
 onClick={() => setFilter(f)}
 className={`rounded-full px-4 py-1.5 text-label-sm font-bold uppercase tracking-wider transition-colors ${
 filter === f
 ? 'bg-primary text-white'
 : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
 }`}
 >
 {f === 'all' ? `Todas (${requests.length})` :
 f === 'pending' ? `Pendentes (${pendingCount})` :
 f === 'approved' ? 'Aprovadas' : 'Recusadas'}
 </button>
 ))}
 </div>

 {/* Loading */}
 {loading && (
 <div className="flex flex-col items-center justify-center py-10">
 <Loader2 size={32} className="mb-3 animate-spin text-on-surface-variant/30" />
 <p className="text-body-sm text-on-surface-variant/50">Carregando solicitações...</p>
 </div>
 )}

 {/* Estado vazio */}
 {!loading && requests.length === 0 && (
 <div className="rounded-xl border-2 border-dashed border-outline-variant/20 bg-surface-container-low p-8 text-center">
 <FileText size={32} className="mx-auto mb-3 text-on-surface-variant/20" />
 <p className="text-body-md font-medium text-on-surface-variant/60">
 Nenhuma solicitação encontrada
 </p>
 <p className="mt-1 text-body-sm text-on-surface-variant/40">
 As solicitações de acompanhantes extras criadas pelos validadores aparecerão aqui.
 </p>
 </div>
 )}

 {/* Lista de solicitações */}
 {requests.map((request) => {
 const statusInfo = getStatusLabel(request.status);
 const isDeciding = decidingId === request.id;

 return (
 <div
 key={request.id}
 className={`rounded-xl border p-5 transition-all ${
 request.status === 'pending'
 ? 'border-orange-200 bg-orange-50/30'
 : 'border-outline-variant/20 bg-surface-container-lowest'
 }`}
 >
 <div className="flex items-start justify-between">
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-2">
 <UserPlus size={16} className="shrink-0 text-on-surface-variant" />
 <h3 className="truncate text-title-md font-bold text-on-surface">
 {request.companionName}
 </h3>
 <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusInfo.color}`}>
 {statusInfo.text}
 </span>
 </div>
 <p className="mt-1 text-body-sm text-on-surface-variant">
 Convite: <span className="font-medium">{request.invitationId}</span>
 {request.isMinor && (
 <span className="ml-2 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-700">
 Menor{request.age ? ` (${request.age} anos)` : ''}
 </span>
 )}
 </p>
 {request.note && (
 <p className="mt-1 text-body-xs italic text-on-surface-variant/60">
 &quot;{request.note}&quot;
 </p>
 )}
 <p className="mt-2 text-[10px] text-on-surface-variant/50">
 Solicitado por {request.requestedByName} em{' '}
 {request.requestedAt ? new Date(request.requestedAt).toLocaleString('pt-BR') : '—'}
 </p>
 {request.decidedBy && (
 <p className="text-[10px] text-on-surface-variant/50">
 Decidido por {request.decidedBy} em{' '}
 {request.decidedAt ? new Date(request.decidedAt).toLocaleString('pt-BR') : '—'}
 {request.decisionReason && ` — "${request.decisionReason}"`}
 </p>
 )}
 </div>
 </div>

 {/* Formulário de decisão (apenas para pendentes) */}
 {request.status === 'pending' && (
 <div className="mt-4 border-t border-orange-200/50 pt-4">
 {isDeciding ? (
 <div className="space-y-3">
 <div>
 <label className="mb-1 block text-label-sm uppercase tracking-widest text-on-surface-variant">
 Justificativa *
 </label>
 <textarea
 value={decisionForm.reason}
 onChange={(e) => setDecisionForm(prev => ({ ...prev, reason: e.target.value }))}
 placeholder="Motivo da aprovação ou recusa..."
 rows={2}
 className="w-full rounded-lg border border-outline-variant/30 bg-surface px-3 py-2 text-body-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim"
 />
 </div>
 <div className="flex gap-2">
 <button
 onClick={() => handleDecide(request.id)}
 disabled={!decisionForm.reason || decisionForm.reason.trim().length < 3}
 className={`flex-1 rounded-lg px-4 py-2 text-label-sm font-bold uppercase tracking-wider text-white transition-colors disabled:opacity-50 ${
 decisionForm.decision === 'approved'
 ? 'bg-green-600 hover:bg-green-700'
 : 'bg-red-600 hover:bg-red-700'
 }`}
 >
 {decisionForm.decision === 'approved' ? '✅ Aprovar' : '❌ Recusar'}
 </button>
 <button
 onClick={() => setDecisionForm(prev => ({
 ...prev,
 decision: prev.decision === 'approved' ? 'rejected' : 'approved',
 }))}
 className="rounded-lg border border-outline-variant/30 bg-surface px-4 py-2 text-label-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container"
 >
 Alternar
 </button>
 </div>
 </div>
 ) : (
 <button
 onClick={() => { setDecidingId(request.id); setDecisionForm({ decision: 'approved', reason: '' }); }}
 className="flex w-full items-center justify-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-label-sm font-bold uppercase tracking-wider text-orange-700 transition-colors hover:bg-orange-100"
 >
 <FileText size={14} /> Decidir Solicitação
 </button>
 )}
 </div>
 )}
 </div>
 );
 })}
 </div>
	);
}