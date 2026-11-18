'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Loader2, AlertCircle, History, UserCheck, QrCode, Undo2 } from 'lucide-react';

interface CheckInRecord {
	id: string;
	participantName: string;
	invitationDisplayName: string;
	checkedInBy: string;
	checkedInAt: string;
	source: 'qr_code' | 'manual';
	status: 'valid' | 'undone';
	undoneBy?: string;
	undoneAt?: string;
	undoReason?: string;
}

/**
 * Componente Client — Histórico e Auditoria de Check-ins
 *
 * Exibe todos os registros de entrada com busca, filtros e detalhes completos.
 * Inclui marcação visual para check-ins desfeitos/corrigidos.
 *
 * NOTA: Esta é a interface de consulta. A ação de desfazer check-in
 * será implementada no Lote 2 (operações).
 */
export function CheckInHistoryClient() {
	const [records, setRecords] = useState<CheckInRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [searchTerm, setSearchTerm] = useState('');
	const [filterSource, setFilterSource] = useState<'all' | 'qr_code' | 'manual'>('all');
	const [filterStatus, setFilterStatus] = useState<'all' | 'valid' | 'undone'>('all');

	useEffect(() => {
 loadHistory();
	}, []);

	async function loadHistory() {
 setLoading(true);
 setError('');

 try {
 // TODO: Implementar server action getCheckInHistoryAction no Lote 1
 // Por enquanto, exibir estado vazio com instruções
 setRecords([]);
 } catch {
 setError('Erro ao carregar histórico.');
 } finally {
 setLoading(false);
 }
	}

	const filteredRecords = records.filter((r) => {
 if (filterSource !== 'all' && r.source !== filterSource) return false;
 if (filterStatus !== 'all' && r.status !== filterStatus) return false;
 if (searchTerm.length >= 2) {
 const term = searchTerm.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
 const name = r.participantName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
 const invitation = r.invitationDisplayName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
 if (!name.includes(term) && !invitation.includes(term)) return false;
 }
 return true;
	});

	return (
 <div className="space-y-4">
 {/* Barra de busca e filtros */}
 <div className="space-y-3 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4 shadow-sm">
 <div className="relative">
 <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
 <input
 type="search"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 placeholder="Buscar por nome do participante ou convite..."
 className="w-full rounded-lg border border-outline-variant/30 bg-surface px-4 py-2.5 pl-9 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim"
 />
 </div>

 <div className="flex flex-wrap gap-2">
 <div className="flex items-center gap-1.5">
 <Filter size={14} className="text-on-surface-variant/50" />
 <span className="text-label-sm uppercase tracking-widest text-on-surface-variant">Origem:</span>
 {(['all', 'qr_code', 'manual'] as const).map((s) => (
 <button
 key={s}
 onClick={() => setFilterSource(s)}
 className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
 filterSource === s
 ? 'bg-primary text-white'
 : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
 }`}
 >
 {s === 'all' ? 'Todas' : s === 'qr_code' ? 'QR Code' : 'Manual'}
 </button>
 ))}
 </div>

 <div className="flex items-center gap-1.5">
 <span className="text-label-sm uppercase tracking-widest text-on-surface-variant">Status:</span>
 {(['all', 'valid', 'undone'] as const).map((s) => (
 <button
 key={s}
 onClick={() => setFilterStatus(s)}
 className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
 filterStatus === s
 ? 'bg-primary text-white'
 : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
 }`}
 >
 {s === 'all' ? 'Todos' : s === 'valid' ? 'Válidos' : 'Desfeitos'}
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* Erro */}
 {error && (
 <div className="flex items-start gap-2 rounded-lg bg-error-container/20 p-3 text-body-sm text-error">
 <AlertCircle size={16} className="mt-0.5 shrink-0" />
 <span>{error}</span>
 </div>
 )}

 {/* Loading */}
 {loading && (
 <div className="flex flex-col items-center justify-center py-10">
 <Loader2 size={32} className="mb-3 animate-spin text-on-surface-variant/30" />
 <p className="text-body-sm text-on-surface-variant/50">Carregando histórico...</p>
 </div>
 )}

 {/* Estado vazio */}
 {!loading && filteredRecords.length === 0 && (
 <div className="rounded-xl border-2 border-dashed border-outline-variant/20 bg-surface-container-low p-8 text-center">
 <History size={32} className="mx-auto mb-3 text-on-surface-variant/20" />
 <p className="text-body-md font-medium text-on-surface-variant/60">
 Nenhum registro encontrado
 </p>
 <p className="mt-1 text-body-sm text-on-surface-variant/40">
 {searchTerm
 ? `Nenhum resultado para "${searchTerm}"`
 : 'Os check-ins realizados aparecerão aqui em tempo real.'}
 </p>
 </div>
 )}

 {/* Tabela de registros */}
 {filteredRecords.length > 0 && (
 <div className="overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-body-sm">
 <thead className="border-b border-outline-variant/20 bg-surface-container-low">
 <tr>
 <th className="px-4 py-3 text-label-sm uppercase tracking-widest text-on-surface-variant">Participante</th>
 <th className="px-4 py-3 text-label-sm uppercase tracking-widest text-on-surface-variant">Convite</th>
 <th className="px-4 py-3 text-label-sm uppercase tracking-widest text-on-surface-variant">Validador</th>
 <th className="px-4 py-3 text-label-sm uppercase tracking-widest text-on-surface-variant">Data/Hora</th>
 <th className="px-4 py-3 text-label-sm uppercase tracking-widest text-on-surface-variant">Origem</th>
 <th className="px-4 py-3 text-label-sm uppercase tracking-widest text-on-surface-variant">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-outline-variant/10">
 {filteredRecords.map((record) => (
 <tr
 key={record.id}
 className={`transition-colors ${
 record.status === 'undone'
 ? 'bg-error-container/10 opacity-70'
 : 'hover:bg-surface-container-low'
 }`}
 >
 <td className="px-4 py-3">
 <div className="flex items-center gap-2">
 <UserCheck size={14} className={record.status === 'undone' ? 'text-error/50' : 'text-green-600'} />
 <span className={`font-medium ${record.status === 'undone' ? 'text-error line-through' : 'text-on-surface'}`}>
 {record.participantName}
 </span>
 </div>
 </td>
 <td className="px-4 py-3 text-on-surface-variant">{record.invitationDisplayName}</td>
 <td className="px-4 py-3 text-on-surface-variant">{record.checkedInBy}</td>
 <td className="px-4 py-3 whitespace-nowrap text-on-surface-variant">
 {new Date(record.checkedInAt).toLocaleString('pt-BR', {
 day: '2-digit',
 month: '2-digit',
 hour: '2-digit',
 minute: '2-digit',
 })}
 </td>
 <td className="px-4 py-3">
 <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
 {record.source === 'qr_code' ? <QrCode size={10} /> : <Search size={10} />}
 {record.source === 'qr_code' ? 'QR' : 'Manual'}
 </span>
 </td>
 <td className="px-4 py-3">
 {record.status === 'valid' ? (
 <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-800">
 <UserCheck size={10} /> Válido
 </span>
 ) : (
 <div>
 <span className="inline-flex items-center gap-1 rounded-full bg-error-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-error">
 <Undo2 size={10} /> Desfeito
 </span>
 {record.undoReason && (
 <p className="mt-1 text-[10px] text-error/70">{record.undoReason}</p>
 )}
 </div>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <div className="border-t border-outline-variant/10 px-4 py-2 text-right text-body-xs text-on-surface-variant/50">
 {filteredRecords.length} registro(s) exibido(s)
 </div>
 </div>
 )}
 </div>
	);
}