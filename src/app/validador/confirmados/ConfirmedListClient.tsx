'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Users, UserCheck, Clock, ChevronDown, AlertCircle, Loader2, Filter } from 'lucide-react';
import { listConfirmedAction, getReceptionSummaryAction } from '@/app/actions/validator-confirmed.action';
import type { ConfirmedFilter, ConfirmedInvitationItem, ReceptionSummary } from '@/lib/repositories/validator-confirmed.repository';

/**
 * Componente Client — Lista de Confirmados + Resumo da Recepção (Etapa 4)
 *
 * Funcionalidades:
 * - Resumo agregado com contadores (pessoas vs convites)
 * - Lista paginada com cursor
 * - Busca por nome do titular
 * - Filtros: todos, aguardando, parcial, completo
 * - Atualização automática após check-in (via evento customizado)
 */
export function ConfirmedListClient() {
	const [summary, setSummary] = useState<ReceptionSummary | null>(null);
	const [items, setItems] = useState<ConfirmedInvitationItem[]>([]);
	const [filter, setFilter] = useState<ConfirmedFilter>('all');
	const [searchTerm, setSearchTerm] = useState('');
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(false);
	const [lastDocId, setLastDocId] = useState<string | undefined>(undefined);
	const [error, setError] = useState('');

	// Carregar resumo e primeira página
	useEffect(() => {
 loadInitialData();
	}, []);

	// Recarregar quando filtro muda
	useEffect(() => {
 if (!loading) {
 loadFilteredData();
 }
	}, [filter]);

	// Escutar evento de check-in realizado para atualizar dados imediatamente
	useEffect(() => {
 const handleCheckInUpdate = () => {
 loadInitialData();
 };

 window.addEventListener('validator-checkin-updated', handleCheckInUpdate);
 return () => window.removeEventListener('validator-checkin-updated', handleCheckInUpdate);
	}, []);

	// Etapa 5: Polling controlado a cada 15s para sincronização entre dispositivos
	// Pausa quando a aba não está visível; retoma ao retornar
	useEffect(() => {
 let intervalId: ReturnType<typeof setInterval> | null = null;
 let isPolling = false;

 function startPolling() {
 if (intervalId) return;
 intervalId = setInterval(async () => {
 if (isPolling) return;
 isPolling = true;
 try {
 const [summaryRes, listRes] = await Promise.all([
 getReceptionSummaryAction(),
 listConfirmedAction(filter, 20, undefined, searchTerm || undefined),
 ]);
 if (summaryRes.success && summaryRes.data) setSummary(summaryRes.data);
 if (listRes.success && listRes.data) {
 setItems(listRes.data.items);
 setHasMore(listRes.data.hasMore);
 }
 } catch {
 // Ignorar falhas de polling silenciosamente
 } finally {
 isPolling = false;
 }
 }, 15_000);
 }

 function stopPolling() {
 if (intervalId) {
 clearInterval(intervalId);
 intervalId = null;
 }
 }

 function handleVisibilityChange() {
 if (document.hidden) {
 stopPolling();
 } else {
 loadInitialData();
 startPolling();
 }
 }

 if (!document.hidden) {
 startPolling();
 }

 document.addEventListener('visibilitychange', handleVisibilityChange);

 return () => {
 stopPolling();
 document.removeEventListener('visibilitychange', handleVisibilityChange);
 };
	}, [filter, searchTerm]);

	async function loadInitialData() {
 setLoading(true);
 setError('');

 try {
 const [summaryRes, listRes] = await Promise.all([
 getReceptionSummaryAction(),
 listConfirmedAction(filter, 20, undefined, searchTerm || undefined),
 ]);

 if (summaryRes.success && summaryRes.data) {
 setSummary(summaryRes.data);
 }

 if (listRes.success && listRes.data) {
 setItems(listRes.data.items);
 setHasMore(listRes.data.hasMore);
 setLastDocId(listRes.data.items.length > 0 ? listRes.data.items[listRes.data.items.length - 1].invitationId : undefined);
 } else {
 setError(listRes.error || 'Erro ao carregar lista.');
 }
 } catch (e) {
 setError('Erro de conexão. Verifique sua internet.');
 } finally {
 setLoading(false);
 }
	}

	async function loadFilteredData() {
 setLoading(true);
 setError('');
 setLastDocId(undefined);

 try {
 const listRes = await listConfirmedAction(filter, 20, undefined, searchTerm || undefined);

 if (listRes.success && listRes.data) {
 setItems(listRes.data.items);
 setHasMore(listRes.data.hasMore);
 setLastDocId(listRes.data.items.length > 0 ? listRes.data.items[listRes.data.items.length - 1].invitationId : undefined);
 } else {
 setError(listRes.error || 'Erro ao filtrar.');
 }
 } catch {
 setError('Erro de conexão.');
 } finally {
 setLoading(false);
 }
	}

	async function loadMore() {
 if (!hasMore || loadingMore || !lastDocId) return;

 setLoadingMore(true);

 try {
 const listRes = await listConfirmedAction(filter, 20, lastDocId, searchTerm || undefined);

 if (listRes.success && listRes.data) {
 setItems(prev => [...prev, ...listRes.data!.items]);
 setHasMore(listRes.data.hasMore);
 setLastDocId(
 listRes.data.items.length > 0
 ? listRes.data.items[listRes.data.items.length - 1].invitationId
 : lastDocId,
 );
 }
 } catch {
 // Ignorar erro de carregamento adicional
 } finally {
 setLoadingMore(false);
 }
	}

	const handleSearch = useCallback((term: string) => {
 setSearchTerm(term);
 // Debounce simples via timeout
 setTimeout(() => {
 loadFilteredData();
 }, 300);
	}, [filter]);

	function getStatusColor(status: string) {
 switch (status) {
 case 'complete': return 'bg-blue-50 text-blue-700 border-blue-200';
 case 'partial': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
 default: return 'bg-[#faf8f5] text-[#17291F]/60 border-[#17291F]/10';
 }
	}

	function getStatusLabel(status: string) {
 switch (status) {
 case 'complete': return 'Todos entraram';
 case 'partial': return 'Entrada parcial';
 default: return 'Aguardando';
 }
	}

	return (
 <div className="space-y-6">
 {/* Resumo da Recepção */}
 {summary && (
 <div className="rounded-xl border border-[#17291F]/10 bg-white p-5 shadow-sm">
 <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#17291F]/70">
 Resumo da Recepção
 </h2>

 <div className="grid grid-cols-3 gap-3">
 <div className="rounded-lg bg-green-50 p-3 text-center">
 <p className="text-2xl font-bold text-green-700">{summary.totalCheckedInPeople}</p>
 <p className="text-[10px] uppercase tracking-wider text-green-600/70">Entraram</p>
 </div>
 <div className="rounded-lg bg-[#faf8f5] p-3 text-center">
 <p className="text-2xl font-bold text-[#17291F]">{summary.totalPendingPeople}</p>
 <p className="text-[10px] uppercase tracking-wider text-[#17291F]/50">Aguardando</p>
 </div>
 <div className="rounded-lg bg-blue-50 p-3 text-center">
 <p className="text-2xl font-bold text-blue-700">{summary.totalConfirmedPeople}</p>
 <p className="text-[10px] uppercase tracking-wider text-blue-600/70">Confirmados</p>
 </div>
 </div>

 <div className="mt-3 flex items-center justify-between rounded-lg bg-[#faf8f5] px-4 py-2">
 <div className="text-xs text-[#17291F]/50">
 <span className="font-semibold text-[#17291F]">{summary.partiallyUsedInvitations}</span> parcial(is) •{' '}
 <span className="font-semibold text-[#17291F]">{summary.fullyUsedInvitations}</span> completo(s)
 </div>
 <div className="text-xs text-[#17291F]/50">
 {summary.totalInvitations} convite(s)
 </div>
 </div>

 {/* Últimas entradas */}
 {summary.lastEntries.length > 0 && (
 <div className="mt-4 border-t border-[#17291F]/5 pt-3">
 <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#17291F]/40">
 Últimas Entradas
 </p>
 <div className="space-y-1.5">
 {summary.lastEntries.map((entry, i) => (
 <div key={i} className="flex items-center justify-between text-xs">
 <div className="min-w-0 flex-1 truncate">
 <span className="font-medium text-[#17291F]">{entry.participantName}</span>
 {entry.invitationDisplayName && (
 <span className="text-[#17291F]/40"> — {entry.invitationDisplayName}</span>
 )}
 </div>
 <span className="shrink-0 text-[#17291F]/30">
 {entry.checkedInAt ? new Date(entry.checkedInAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
 </span>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 )}

 {/* Barra de busca e filtros */}
 <div className="space-y-3">
 <div className="relative">
 <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#17291F]/30" />
 <input
 type="search"
 value={searchTerm}
 onChange={(e) => handleSearch(e.target.value)}
 placeholder="Buscar por nome..."
 className="w-full rounded-lg border border-[#17291F]/10 bg-white px-4 py-2.5 pl-9 text-sm text-[#17291F] placeholder:text-[#17291F]/30 focus:border-[#17291F]/30 focus:outline-none focus:ring-1 focus:ring-[#17291F]/20"
 />
 </div>

 <div className="flex gap-2 overflow-x-auto pb-1">
 {(['all', 'pending', 'partial', 'complete'] as ConfirmedFilter[]).map((f) => (
 <button
 key={f}
 onClick={() => setFilter(f)}
 className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
 filter === f
 ? 'bg-[#17291F] text-[#e4c286]'
 : 'bg-[#faf8f5] text-[#17291F]/50 hover:bg-[#17291F]/5'
 }`}
 >
 {f === 'all' ? 'Todos' : f === 'pending' ? 'Aguardando' : f === 'partial' ? 'Parcial' : 'Completo'}
 </button>
 ))}
 </div>
 </div>

 {/* Erro */}
 {error && (
 <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
 <AlertCircle size={16} className="mt-0.5 shrink-0" />
 <span>{error}</span>
 </div>
 )}

 {/* Loading inicial */}
 {loading && items.length === 0 && (
 <div className="flex flex-col items-center justify-center py-10">
 <Loader2 size={32} className="mb-3 animate-spin text-[#17291F]/30" />
 <p className="text-xs text-[#17291F]/40">Carregando confirmados...</p>
 </div>
 )}

 {/* Lista de itens */}
 {!loading && items.length === 0 && (
 <div className="rounded-xl border-2 border-dashed border-[#17291F]/10 bg-[#faf8f5] p-8 text-center">
 <Users size={32} className="mx-auto mb-3 text-[#17291F]/20" />
 <p className="text-sm font-medium text-[#17291F]/50">
 Nenhum convidado encontrado
 </p>
 <p className="mt-1 text-xs text-[#17291F]/30">
 {searchTerm ? `Nenhum resultado para "${searchTerm}"` : 'Não há RSVPs confirmados ainda.'}
 </p>
 </div>
 )}

 {items.length > 0 && (
 <div className="space-y-2">
 {items.map((item) => (
 <div
 key={item.invitationId}
 className={`rounded-xl border p-4 transition-colors ${getStatusColor(item.status)}`}
 >
 <div className="flex items-start justify-between">
 <div className="min-w-0 flex-1">
 <p className="truncate text-sm font-bold text-[#17291F]">{item.displayName}</p>
 {item.category && (
 <p className="text-[10px] uppercase tracking-wider text-[#17291F]/40">{item.category}</p>
 )}
 </div>
 <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
 item.status === 'complete' ? 'bg-blue-100 text-blue-700' :
 item.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
 'bg-[#17291F]/5 text-[#17291F]/50'
 }`}>
 {getStatusLabel(item.status)}
 </span>
 </div>

 <div className="mt-3 flex items-center gap-4 text-xs">
 <div className="flex items-center gap-1">
 <UserCheck size={12} className="text-green-600" />
 <span className="font-semibold text-[#17291F]">{item.totalCheckedIn}</span>
 <span className="text-[#17291F]/40">entraram</span>
 </div>
 <div className="flex items-center gap-1">
 <Clock size={12} className="text-[#17291F]/40" />
 <span className="font-semibold text-[#17291F]">{item.totalPending}</span>
 <span className="text-[#17291F]/40">aguardando</span>
 </div>
 <div className="ml-auto text-[#17291F]/30">
 {item.totalConfirmed} confirmado(s)
 </div>
 </div>
 </div>
 ))}
 </div>
 )}

 {/* Carregar mais */}
 {hasMore && (
 <button
 onClick={loadMore}
 disabled={loadingMore}
 className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#17291F]/10 bg-white px-4 py-3 text-xs font-medium text-[#17291F]/60 transition-colors hover:bg-[#faf8f5] disabled:opacity-50"
 >
 {loadingMore ? (
 <>
 <Loader2 size={14} className="animate-spin" />
 Carregando...
 </>
 ) : (
 <>
 <ChevronDown size={14} />
 Carregar mais
 </>
 )}
 </button>
 )}
 </div>
	);
}