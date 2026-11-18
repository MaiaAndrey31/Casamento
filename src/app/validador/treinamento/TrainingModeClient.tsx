'use client';

import { useState, useCallback } from 'react';
import { Camera, QrCode, Users, CheckCircle, AlertCircle, RefreshCw, GraduationCap, ShieldCheck, X } from 'lucide-react';

// ============================================================================
// DADOS FICTÍCIOS — Isolamento total (nunca escritos no Firestore)
// ============================================================================

interface TrainingParticipant {
	participantId: string;
	name: string;
	type: 'titular' | 'companion';
	isMinor: boolean;
	checkedIn: boolean;
}

interface TrainingInvitation {
	token: string;
	displayName: string;
	participants: TrainingParticipant[];
	rsvpStatus: 'confirmed' | 'pending' | 'declined';
}

const TRAINING_INVITATIONS: TrainingInvitation[] = [
	{
 token: 'TRAINING_family_santos',
 displayName: 'Família Santos',
 rsvpStatus: 'confirmed',
 participants: [
 { participantId: 'TRAINING_guest_001', name: 'Ana Santos', type: 'titular', isMinor: false, checkedIn: false },
 { participantId: 'TRAINING_comp_001', name: 'Roberto Santos', type: 'companion', isMinor: false, checkedIn: false },
 { participantId: 'TRAINING_comp_002', name: 'Lucas Santos', type: 'companion', isMinor: true, checkedIn: false },
 ],
	},
	{
 token: 'TRAINING_individual_carlos',
 displayName: 'Carlos Oliveira',
 rsvpStatus: 'confirmed',
 participants: [
 { participantId: 'TRAINING_guest_002', name: 'Carlos Oliveira', type: 'titular', isMinor: false, checkedIn: false },
 ],
	},
	{
 token: 'TRAINING_names_equal',
 displayName: 'Família Pereira',
 rsvpStatus: 'confirmed',
 participants: [
 { participantId: 'TRAINING_guest_003', name: 'Fernanda Pereira', type: 'titular', isMinor: false, checkedIn: false },
 { participantId: 'TRAINING_comp_003a', name: 'Maria Silva', type: 'companion', isMinor: false, checkedIn: false },
 { participantId: 'TRAINING_comp_003b', name: 'Maria Silva', type: 'companion', isMinor: false, checkedIn: false },
 ],
	},
	{
 token: 'TRAINING_rsvp_pending',
 displayName: 'Marcos Pendente',
 rsvpStatus: 'pending',
 participants: [
 { participantId: 'TRAINING_guest_004', name: 'Marcos Pendente', type: 'titular', isMinor: false, checkedIn: false },
 ],
	},
	{
 token: 'TRAINING_rsvp_declined',
 displayName: 'Patrícia Recusada',
 rsvpStatus: 'declined',
 participants: [
 { participantId: 'TRAINING_guest_005', name: 'Patrícia Recusada', type: 'titular', isMinor: false, checkedIn: false },
 ],
	},
];

type TrainingState = 'idle' | 'scanning' | 'result';

/**
 * Componente Client — Modo de Treinamento Isolado (Lote 4 §11)
 *
 * ISOLAMENTO GARANTIDO PELA ARQUITETURA:
 * - Todos os dados são constantes definidas acima (nunca lidos do Firestore)
 * - Check-ins simulados existem apenas no estado React (useState)
 * - Nenhuma server action de escrita é chamada
 * - Tokens fictícios usam prefixo "TRAINING_" impossível de confundir com tokens reais
 * - QR Codes fictícios não são gerados nem lidos pela câmera real
 * - Ao resetar, todos os check-ins simulados são perdidos (comportamento esperado)
 */
export function TrainingModeClient() {
	const [state, setState] = useState<TrainingState>('idle');
	const [invitations, setInvitations] = useState<TrainingInvitation[]>(TRAINING_INVITATIONS);
	const [currentInvitation, setCurrentInvitation] = useState<TrainingInvitation | null>(null);
	const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
	const [checkInResults, setCheckInResults] = useState<Map<string, boolean>>(new Map());
	const [warningMessage, setWarningMessage] = useState('');
	const [totalCheckIns, setTotalCheckIns] = useState(0);

	const handleScanSimulation = useCallback((token: string) => {
 setState('scanning');
 setWarningMessage('');
 setCheckInResults(new Map());

 // Simular delay de validação
 setTimeout(() => {
 const invitation = invitations.find(inv => inv.token === token);

 if (!invitation) {
 setState('idle');
 setWarningMessage('❌ QR Code fictício não reconhecido. Use um dos botões de simulação abaixo.');
 return;
 }

 setCurrentInvitation(invitation);

 // Aviso para RSVP não confirmado
 if (invitation.rsvpStatus === 'pending') {
 setWarningMessage('⚠️ PRESENÇA NÃO CONFIRMADA: Este convite não possui RSVP. No modo real, verifique se o participante está autorizado.');
 } else if (invitation.rsvpStatus === 'declined') {
 setWarningMessage('⚠️ PRESENÇA RECUSADA NO RSVP: Este convidado informou que não compareceria. No modo real, verifique se deseja registrar a entrada.');
 }

 // Pré-selecionar participantes pendentes
 const pending = new Set<string>();
 for (const p of invitation.participants) {
 if (!p.checkedIn) {
 pending.add(p.participantId);
 }
 }
 setSelectedParticipants(pending);
 setState('result');
 }, 600);
	}, [invitations]);

	const handleSimulatedCheckIn = useCallback(() => {
 if (!currentInvitation || selectedParticipants.size === 0) return;

 const results = new Map<string, boolean>();
 let newCheckIns = 0;

 const updatedParticipants = currentInvitation.participants.map(p => {
 if (selectedParticipants.has(p.participantId) && !p.checkedIn) {
 results.set(p.participantId, true);
 newCheckIns++;
 return { ...p, checkedIn: true };
 }
 return p;
 });

 setCheckInResults(results);
 setTotalCheckIns(prev => prev + newCheckIns);

 // Atualizar estado local das invitations
 setInvitations(prev => prev.map(inv =>
 inv.token === currentInvitation.token
 ? { ...inv, participants: updatedParticipants }
 : inv
 ));

 setCurrentInvitation({ ...currentInvitation, participants: updatedParticipants });

 // Limpar seleção dos que entraram
 setSelectedParticipants(prev => {
 const next = new Set(prev);
 for (const [id, success] of results) {
 if (success) next.delete(id);
 }
 return next;
 });
	}, [currentInvitation, selectedParticipants]);

	const toggleParticipant = (participantId: string) => {
 setSelectedParticipants(prev => {
 const next = new Set(prev);
 if (next.has(participantId)) {
 next.delete(participantId);
 } else {
 next.add(participantId);
 }
 return next;
 });
	};

	const resetTraining = () => {
 setInvitations(TRAINING_INVITATIONS);
 setCurrentInvitation(null);
 setSelectedParticipants(new Set());
 setCheckInResults(new Map());
 setWarningMessage('');
 setTotalCheckIns(0);
 setState('idle');
	};

	return (
 <div className="space-y-4">
 {/* Banner de isolamento */}
 <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
 <ShieldCheck size={20} className="shrink-0 text-blue-600" />
 <div>
 <p className="text-xs font-bold uppercase tracking-widest text-blue-800">Ambiente Isolado</p>
 <p className="mt-1 text-[11px] leading-relaxed text-blue-700/70">
 Nenhum dado real será alterado. Os check-ins simulados existem apenas nesta sessão
 e serão perdidos ao sair ou reiniciar o treinamento.
 </p>
 </div>
 </div>

 {/* Contador de treinamento */}
 <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-4 py-2">
 <span className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant/60">
 Check-ins Simulados
 </span>
 <span className="text-lg font-bold text-primary">{totalCheckIns}</span>
 </div>

 {/* Estado idle — botões de simulação */}
 {state === 'idle' && (
 <div className="space-y-4">
 <p className="text-body-sm font-medium text-on-surface-variant">
 Simule a leitura de QR Codes fictícios:
 </p>

 <div className="grid gap-2">
 {TRAINING_INVITATIONS.map((inv) => {
 const allCheckedIn = inv.participants.every(p => p.checkedIn);
 const someCheckedIn = inv.participants.some(p => p.checkedIn);

 return (
 <button
 key={inv.token}
 onClick={() => handleScanSimulation(inv.token)}
 className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all hover:shadow-md ${
 allCheckedIn
 ? 'border-green-200 bg-green-50 opacity-60'
 : 'border-outline-variant/20 bg-surface-container-lowest hover:border-primary/30'
 }`}
 >
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-2">
 <QrCode size={16} className="shrink-0 text-on-surface-variant" />
 <span className="truncate text-body-md font-bold text-on-surface">{inv.displayName}</span>
 </div>
 <p className="mt-0.5 text-[10px] text-on-surface-variant/50">
 {inv.participants.length} participante(s) •{' '}
 {inv.rsvpStatus === 'confirmed' ? 'RSVP Confirmado' :
 inv.rsvpStatus === 'pending' ? '⚠️ RSVP Pendente' : '⚠️ RSVP Recusado'}
 </p>
 </div>
 {allCheckedIn && (
 <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green-700">
 Completo
 </span>
 )}
 {someCheckedIn && !allCheckedIn && (
 <span className="shrink-0 rounded-full bg-yellow-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-700">
 Parcial
 </span>
 )}
 </button>
 );
 })}
 </div>

 {/* Botão de busca manual simulada */}
 <div className="rounded-xl border border-dashed border-outline-variant/30 bg-surface-container-low p-4 text-center">
 <Users size={20} className="mx-auto mb-2 text-on-surface-variant/30" />
 <p className="text-body-xs text-on-surface-variant/50">
 Busca manual simulada: clique em qualquer convite acima para simular
 a busca por nome e seleção individual de participantes.
 </p>
 </div>

 {/* Reset */}
 {totalCheckIns > 0 && (
 <button
 onClick={resetTraining}
 className="flex w-full items-center justify-center gap-2 rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-label-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container"
 >
 <RefreshCw size={14} /> Reiniciar Treinamento
 </button>
 )}
 </div>
 )}

 {/* Estado scanning */}
 {state === 'scanning' && (
 <div className="flex flex-col items-center justify-center rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-10 shadow-sm">
 <div className="mb-4 h-16 w-16 animate-pulse rounded-full bg-primary/10 flex items-center justify-center">
 <Camera size={28} className="text-primary/40" />
 </div>
 <p className="text-body-sm font-medium text-on-surface-variant/60">Validando QR Code fictício...</p>
 </div>
 )}

 {/* Aviso não-bloqueante */}
 {warningMessage && state === 'result' && (
 <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
 <AlertCircle size={20} className="shrink-0 text-orange-600" />
 <p className="text-xs font-medium leading-relaxed text-orange-800">{warningMessage}</p>
 </div>
 )}

 {/* Estado result — painel de seleção */}
 {state === 'result' && currentInvitation && (
 <div className="space-y-4">
 {/* Header do convite */}
 <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-sm">
 <div className="flex items-start justify-between">
 <div>
 <h2 className="text-title-md font-bold text-on-surface">{currentInvitation.displayName}</h2>
 <p className="mt-1 text-body-xs text-on-surface-variant/50">
 {currentInvitation.participants.length} participante(s) •{' '}
 {currentInvitation.participants.filter(p => p.checkedIn).length} entrou(aram) •{' '}
 {currentInvitation.participants.filter(p => !p.checkedIn).length} aguardando
 </p>
 </div>
 <button
 onClick={() => { setState('idle'); setCurrentInvitation(null); setWarningMessage(''); }}
 className="rounded-lg p-1.5 text-on-surface-variant/40 hover:bg-surface-container hover:text-on-surface"
 >
 <X size={18} />
 </button>
 </div>
 </div>

 {/* Lista de participantes */}
 <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm">
 <div className="border-b border-outline-variant/10 px-5 py-3">
 <h3 className="text-label-sm font-semibold uppercase tracking-widest text-on-surface-variant/70">
 Participantes
 </h3>
 </div>
 <div className="divide-y divide-outline-variant/5">
 {currentInvitation.participants.map((participant) => {
 const justCheckedIn = checkInResults.get(participant.participantId);
 const isDisabled = participant.checkedIn;
 const isSelected = selectedParticipants.has(participant.participantId);

 return (
 <label
 key={participant.participantId}
 className={`flex items-center gap-3 px-5 py-3 transition-colors ${
 isDisabled ? 'bg-green-50/50' : isSelected ? 'bg-primary/5' : 'hover:bg-surface-container-low'
 } ${isDisabled ? '' : 'cursor-pointer'}`}
 >
 {isDisabled ? (
 <CheckCircle size={20} className="shrink-0 text-green-600" />
 ) : (
 <input
 type="checkbox"
 checked={isSelected}
 onChange={() => toggleParticipant(participant.participantId)}
 className="h-5 w-5 shrink-0 rounded border-outline-variant/30 text-primary focus:ring-primary/30"
 />
 )}
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-2">
 <span className={`truncate text-body-sm font-medium ${isDisabled ? 'text-green-800' : 'text-on-surface'}`}>
 {participant.name}
 </span>
 {participant.type === 'companion' && (
 <span className="shrink-0 rounded bg-surface-container px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-on-surface-variant/50">
 Acompanhante
 </span>
 )}
 {participant.isMinor && (
 <span className="shrink-0 rounded bg-orange-100 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-orange-700">
 Menor
 </span>
 )}
 </div>
 {justCheckedIn && (
 <p className="text-xs font-medium text-green-600">✅ Entrada simulada registrada</p>
 )}
 {participant.checkedIn && !justCheckedIn && (
 <p className="text-xs text-green-600/70">Entrada já registrada</p>
 )}
 </div>
 </label>
 );
 })}
 </div>
 </div>

 {/* Botão confirmar entrada simulada */}
 {selectedParticipants.size > 0 && (
 <button
 onClick={handleSimulatedCheckIn}
 className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-label-md font-bold uppercase tracking-widest text-white shadow-lg transition-all hover:bg-primary/90 active:scale-[0.98]"
 >
 <GraduationCap size={18} />
 Simular Entrada ({selectedParticipants.size})
 </button>
 )}

 {/* Voltar */}
 <button
 onClick={() => { setState('idle'); setCurrentInvitation(null); setWarningMessage(''); }}
 className="flex w-full items-center justify-center gap-2 rounded-lg border border-outline-variant/20 bg-surface px-4 py-3 text-label-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container"
 >
 <QrCode size={14} /> Simular Outro QR Code
 </button>
 </div>
 )}
 </div>
	);
}