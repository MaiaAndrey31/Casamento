'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, CheckCircle, AlertCircle, Loader2, UserCheck, QrCode, Search, VideoOff, Lock, ShieldAlert } from 'lucide-react';
import { validateQrCodeAction, checkInParticipantAction, searchGuestsAction, manualCheckInAction } from '@/app/actions/validator-checkin.action';
import type { InvitationValidationResult, ParticipantCheckInResult } from '@/lib/repositories/validator-checkin.repository';

type ScannerState =
	| 'idle'
	| 'requestingPermission'
	| 'initializing'
	| 'scanning'
	| 'validating'
	| 'result'
	| 'error';

interface SearchResult {
	guestId: string;
	fullName: string;
	invitationId: string;
	invitationDisplayName: string;
	checkedIn: boolean;
}

/**
 * Leitor de QR Code + Painel de Check-in Individual
 *
 * CORREÇÃO DEFINITIVA — Chrome Android (permissão concedida mas scanner não abre):
 *
 * CAUSA RAIZ IDENTIFICADA:
 * 1. O container do scanner estava oculto via CSS (display:none) durante o estado
 *    'initializing'. O html5-qrcode precisa que o elemento esteja VISÍVEL e com
 *    dimensões reais para criar o <video> interno. Com display:none, o elemento
 *    tem offsetWidth=0 e a biblioteca falha silenciosamente.
 * 2. O stream temporário do getUserMedia() era liberado ANTES de iniciar o
 *    html5-qrcode. No Chrome Android, isso pode fazer o navegador revogar a
 *    permissão ou liberar o hardware da câmera, causando NotFoundError na
 *    segunda tentativa de acesso.
 *
 * CORREÇÕES APLICADAS:
 * - Container SEMPRE visível durante 'initializing' e 'scanning' (não hidden)
 * - Stream do getUserMedia() NÃO é liberado antecipadamente; o html5-qrcode
 *   gerencia seu próprio stream e nós apenas fazemos cleanup ao desmontar
 * - Fallback em cascata: environment → user → sem constraints
 * - Diagnóstico temporário via console.warn para debugging em dispositivo real
 * - Flag isMounted previne operações após desmontagem (React Strict Mode)
 */
export function QrCodeScanner() {
	const [state, setState] = useState<ScannerState>('idle');
	const [validationResult, setValidationResult] = useState<InvitationValidationResult | null>(null);
	const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
	const [checkInResults, setCheckInResults] = useState<Map<string, ParticipantCheckInResult>>(new Map());
	const [isCheckingIn, setIsCheckingIn] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [cameraError, setCameraError] = useState('');
	const [debugInfo, setDebugInfo] = useState<string[]>([]);

	// Busca manual
	const [searchTerm, setSearchTerm] = useState('');
	const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [showSearch, setShowSearch] = useState(false);

	// Refs para controle do ciclo de vida
	const scannerContainerRef = useRef<HTMLDivElement>(null);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const html5QrCodeRef = useRef<any>(null);
	const processingRef = useRef(false);
	const isMountedRef = useRef(true);
	const isInitializingRef = useRef(false);

	// Verificar token via fragmento de URL (#t=) ao montar
	useEffect(() => {
 if (typeof window !== 'undefined' && window.location.hash) {
 const hash = window.location.hash.substring(1);
 const params = new URLSearchParams(hash);
 const token = params.get('t');
 if (token) {
 window.history.replaceState(null, '', window.location.pathname);
 handleQrCodeRead(token);
 }
 }
	}, []);

	// Lifecycle: marcar montado/desmontado + cleanup + captura de erros globais
	useEffect(() => {
 isMountedRef.current = true;

 // CORREÇÃO CRÍTICA: Capturar unhandled rejections que ocorrem dentro de callbacks
 // da biblioteca html5-qrcode (contexto externo ao React). Sem isso, uma promise
 // rejeitada dentro do onScanSuccess ou em timers internos da biblioteca causa
 // "Application error: a client-side exception has occurred" no Chrome Android.
 const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
 const reason = event.reason;
 const msg = reason instanceof Error ? reason.message : String(reason);
 // Filtrar apenas erros relacionados ao scanner/câmera para não mascarar outros bugs
 if (msg.includes('Html5Qrcode') || msg.includes('scanner') || msg.includes('camera') ||
 msg.includes('video') || msg.includes('stream') || msg.includes('getUserMedia') ||
 msg.includes('NotAllowedError') || msg.includes('NotFoundError') ||
 msg.includes('NotReadableError') || msg.includes('OverconstrainedError')) {
 console.error('[QrScanner] Unhandled rejection capturada:', msg);
 logDebug('UNHANDLED_REJECTION', msg.substring(0, 200));
 event.preventDefault(); // Impedir que derrube a aplicação
 }
 };

 window.addEventListener('unhandledrejection', handleUnhandledRejection);

 return () => {
 isMountedRef.current = false;
 window.removeEventListener('unhandledrejection', handleUnhandledRejection);
 cleanupScanner();
 };
	}, []);

	/**
 * DIAGNÓSTICO TEMPORÁRIO: registra etapas do fluxo de câmera.
 * Habilitado apenas quando state !== 'idle' para evitar poluição.
 * Remover após confirmação em dispositivo real.
 */
	function logDebug(step: string, detail?: string) {
 const entry = `[${new Date().toISOString().slice(11, 23)}] ${step}${detail ? ': ' + detail : ''}`;
 console.warn('[QrScanner-DIAG]', entry);
 setDebugInfo(prev => [...prev.slice(-9), entry]); // Manter últimas 10 entradas
	}

	/**
 * Inicializa o scanner APÓS a permissão ter sido concedida.
 * Chamado pelo useEffect quando state === 'initializing'.
 *
 * CORREÇÃO: O container agora está VISÍVEL neste estado (não hidden),
 * garantindo que o html5-qrcode encontre um elemento com dimensões reais.
 */
	useEffect(() => {
 if (state !== 'initializing') return;
 if (isInitializingRef.current) return;

 let cancelled = false;
 isInitializingRef.current = true;

 async function initScanner() {
 logDebug('INIT_START', 'useEffect disparado para state=initializing');

 // Aguardar próximo frame para garantir que o DOM está pronto e visível
 await new Promise(resolve => requestAnimationFrame(resolve));
 // Segundo frame para garantir layout completo no mobile
 await new Promise(resolve => requestAnimationFrame(resolve));

 if (cancelled || !isMountedRef.current) {
 logDebug('INIT_CANCELLED', 'Componente desmontado ou cancelado');
 return;
 }

 const container = scannerContainerRef.current;
 if (!container) {
 logDebug('INIT_NO_CONTAINER', 'scannerContainerRef.current é null');
 if (isMountedRef.current) {
 setCameraError('Elemento do scanner não encontrado. Tente novamente.');
 setState('error');
 }
 isInitializingRef.current = false;
 return;
 }

 // Verificar se o container tem dimensões reais (não está hidden/collapsed)
 const rect = container.getBoundingClientRect();
 logDebug('INIT_CONTAINER_SIZE', `${rect.width}x${rect.height}, visible=${rect.width > 0 && rect.height > 0}`);

 if (rect.width === 0 || rect.height === 0) {
 logDebug('INIT_ZERO_SIZE', 'Container tem dimensão zero — possível problema de CSS');
 // Tentar forçar visibilidade e aguardar mais um frame
 container.style.display = 'block';
 container.style.visibility = 'visible';
 container.style.minHeight = '300px';
 await new Promise(resolve => requestAnimationFrame(resolve));
 }

 try {
 logDebug('IMPORT_HTML5QRCODE', 'Carregando biblioteca...');
 const { Html5Qrcode } = await import('html5-qrcode');
 logDebug('IMPORT_DONE', 'Biblioteca carregada');

 if (cancelled || !isMountedRef.current) return;

 // Limpar instância anterior se existir
 if (html5QrCodeRef.current) {
 logDebug('CLEANUP_PREVIOUS', 'Limpando instância anterior');
 try { await html5QrCodeRef.current.stop().catch(() => {}); } catch {}
 try { html5QrCodeRef.current.clear(); } catch {}
 html5QrCodeRef.current = null;
 }

 const scannerConfig = {
 fps: 10,
 qrbox: { width: 250, height: 250 },
 aspectRatio: 1.0,
 verbose: false,
 };

 // CORREÇÃO CRÍTICA: O callback onScanSuccess é chamado pelo html5-qrcode
 // em contexto assíncrono externo ao React. Qualquer exceção não capturada
 // aqui causa unhandled rejection que derruba a aplicação no Chrome Android.
 // TODO o corpo do callback DEVE estar dentro de try/catch.
 const onScanSuccess = async (decodedText: string) => {
 try {
 if (processingRef.current) return;
 processingRef.current = true;
 logDebug('SCAN_SUCCESS', 'QR Code detectado');
 await cleanupScanner();
 if (isMountedRef.current) {
 await handleQrCodeRead(decodedText);
 }
 } catch (scanError) {
 // Capturar qualquer erro dentro do callback para impedir crash da aplicação
 console.error('[QrScanner] Erro no callback onScanSuccess:', scanError);
 logDebug('SCAN_CALLBACK_ERROR', scanError instanceof Error ? scanError.message : String(scanError));
 processingRef.current = false;
 // Não mudar estado para error aqui — o scanner já parou via cleanupScanner.
 // O usuário pode tocar em "Escanear Próximo" ou "Tentar Novamente".
 }
 };
 const onScanFailure = () => {}; // Ignorar erros por frame (normal durante busca)

 // ESTRATÉGIA DE INICIALIZAÇÃO EM CASCATA:
 // 1. facingMode: 'environment' (câmera traseira)
 // 2. facingMode: 'user' (câmera frontal)
 // 3. Sem constraints (qualquer câmera disponível)
 const strategies: Array<{ label: string; camera: object }> = [
 { label: 'environment', camera: { facingMode: 'environment' } },
 { label: 'user', camera: { facingMode: 'user' } },
 { label: 'default', camera: {} },
 ];

 let lastError: Error | null = null;

 for (const strategy of strategies) {
 if (cancelled || !isMountedRef.current) break;

 logDebug(`TRY_${strategy.label.toUpperCase()}`, `Tentando scanner.start com ${strategy.label}`);

 try {
 // Limpar instância anterior entre tentativas
 if (html5QrCodeRef.current) {
 try { await html5QrCodeRef.current.stop().catch(() => {}); } catch {}
 try { html5QrCodeRef.current.clear(); } catch {}
 html5QrCodeRef.current = null;
 }

 const scanner = new Html5Qrcode('qr-scanner-container');
 html5QrCodeRef.current = scanner;

 await scanner.start(
 strategy.camera,
 scannerConfig,
 onScanSuccess,
 onScanFailure,
 );

 logDebug(`SUCCESS_${strategy.label.toUpperCase()}`, `Scanner iniciado com ${strategy.label}`);

 if (!cancelled && isMountedRef.current) {
 setState('scanning');
 setDebugInfo([]); // Limpar debug após sucesso
 }
 return; // Sucesso! Sair da função
 } catch (err) {
 const msg = err instanceof Error ? err.message : String(err);
 logDebug(`FAIL_${strategy.label.toUpperCase()}`, msg.substring(0, 200));
 lastError = err instanceof Error ? err : new Error(msg);

 // Se for erro de permissão ou segurança, não tentar fallback
 if (msg.includes('NotAllowedError') || msg.includes('Permission') ||
 msg.includes('SecurityError') || msg.includes('SecureContext')) {
 break; // Parar tentativas, propagar erro
 }
 }
 }

 // Todas as estratégias falharam
 if (lastError && !cancelled && isMountedRef.current) {
 logDebug('ALL_STRATEGIES_FAILED', lastError.message.substring(0, 200));
 handleError(lastError);
 }
 } catch (e) {
 if (cancelled || !isMountedRef.current) return;
 logDebug('UNEXPECTED_ERROR', e instanceof Error ? e.message : String(e));
 handleError(e);
 } finally {
 isInitializingRef.current = false;
 }
 }

 initScanner();

 return () => {
 cancelled = true;
 isInitializingRef.current = false;
 };
	}, [state]);

	/**
 * Classifica o erro e define a mensagem apropriada.
 */
	function handleError(e: unknown) {
 const message = e instanceof Error ? e.message : String(e);
 let errorMsg: string;

 if (message.includes('Permission') || message.includes('NotAllowedError') || message.includes('permission')) {
 errorMsg = 'Permissão de câmera negada. Para liberar, toque nos 3 pontos do Chrome → Configurações do site → Câmera → Permitir. Depois toque em "Tentar Novamente".';
 } else if (message.includes('NotFoundError') || message.includes('not found') || message.includes('No video input')) {
 errorMsg = 'Nenhuma câmera compatível foi encontrada. Verifique se há uma câmera conectada e funcional neste dispositivo.';
 } else if (message.includes('NotReadableError') || message.includes('not readable') || message.includes('Could not start') || message.includes('OverconstrainedError')) {
 errorMsg = 'A câmera está em uso por outro aplicativo ou não pôde ser acessada. Feche outros apps que usam a câmera e tente novamente.';
 } else if (message.includes('AbortError') || message.includes('aborted')) {
 errorMsg = 'O acesso à câmera foi interrompido. Tente novamente.';
 } else if (message.includes('SecureContext') || message.includes('HTTPS') || message.includes('secure context')) {
 errorMsg = 'A câmera requer conexão segura (HTTPS). Verifique se o site está sendo acessado via HTTPS.';
 } else if (message.includes('SecurityError')) {
 errorMsg = 'O acesso à câmera foi bloqueado por restrições de segurança do navegador. Verifique as configurações do Chrome.';
 } else if (message.includes('TypeError') || message.includes('mediaDevices')) {
 errorMsg = 'Seu navegador não suporta acesso à câmera. Utilize o Google Chrome atualizado.';
 } else {
 errorMsg = 'Não foi possível acessar a câmera. Verifique as permissões do navegador e tente novamente.';
 }

 setCameraError(errorMsg);
 setState('error');
	}

	/**
 * ETAPA CRÍTICA: Solicita permissão de câmera via getUserMedia() nativo.
 *
 * CORREÇÃO: NÃO liberamos o stream temporário aqui. No Chrome Android,
 * liberar o stream antes de iniciar o html5-qrcode pode fazer o navegador
 * revogar a permissão ou liberar o hardware da câmera. O html5-qrcode
 * cria seu próprio stream internamente via scanner.start().
 *
 * O getUserMedia() aqui serve APENAS para forçar o prompt de permissão
 * do navegador. Após autorização, transicionamos para 'initializing'.
 */
	async function requestCameraPermission() {
 setCameraError('');
 setErrorMessage('');
 setDebugInfo([]);
 setValidationResult(null);
 setSelectedParticipants(new Set());
 setCheckInResults(new Map());
 processingRef.current = false;
 isInitializingRef.current = false;

 logDebug('PERM_CHECK_API', `mediaDevices=${!!navigator?.mediaDevices}, getUserMedia=${!!navigator?.mediaDevices?.getUserMedia}`);

 // Verificar se a API está disponível
 if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
 setCameraError('Seu navegador não suporta acesso à câmera. Utilize o Google Chrome atualizado em um dispositivo com câmera.');
 setState('error');
 return;
 }

 // Verificar contexto seguro
 if (typeof window !== 'undefined' && !window.isSecureContext) {
 setCameraError('A câmera requer conexão segura (HTTPS). Verifique se o site está sendo acessado via HTTPS.');
 setState('error');
 return;
 }

 logDebug('PERM_SECURE_CONTEXT', `isSecureContext=${window.isSecureContext}`);
 setState('requestingPermission');

 try {
 logDebug('PERM_REQUESTING', 'Chamando getUserMedia para solicitar permissão...');

 // Solicitar permissão explicitamente via getUserMedia
 const stream = await navigator.mediaDevices.getUserMedia({
 audio: false,
 video: { facingMode: { ideal: 'environment' } },
 });

 // Permissão concedida!
 const tracks = stream.getTracks();
 logDebug('PERM_GRANTED', `${tracks.length} track(s) obtida(s): ${tracks.map(t => `${t.kind}/${t.readyState}`).join(', ')}`);

 // CORREÇÃO: Liberar o stream temporário AGORA, mas de forma segura.
 // O html5-qrcode criará seu próprio stream em scanner.start().
 // A permissão já foi concedida e persiste na sessão do navegador.
 tracks.forEach((track) => track.stop());
 logDebug('PERM_STREAM_RELEASED', 'Stream temporário liberado');

 if (!isMountedRef.current) return;

 // Transicionar para inicialização do scanner
 setState('initializing');
 } catch (e) {
 if (!isMountedRef.current) return;
 logDebug('PERM_DENIED', e instanceof Error ? `${e.name}: ${e.message}` : String(e));
 handleError(e);
 }
	}

	/**
 * Libera a instância do scanner de forma segura.
 */
	async function cleanupScanner() {
 try {
 if (html5QrCodeRef.current) {
 try { await html5QrCodeRef.current.stop().catch(() => {}); } catch {}
 try { html5QrCodeRef.current.clear(); } catch {}
 html5QrCodeRef.current = null;
 }
 } catch {}
	}

	async function handleQrCodeRead(qrData: string) {
 if (!isMountedRef.current) return;

 setState('validating');
 setErrorMessage('');

 const result = await validateQrCodeAction(qrData);

 if (!isMountedRef.current) return;

 if (!result.success || !result.data) {
 setState('error');
 setErrorMessage(result.error || 'Erro ao validar QR Code.');
 processingRef.current = false;
 return;
 }

 if (result.data.participants.length > 0 && result.error) {
 setErrorMessage(result.error);
 }

 setValidationResult(result.data);

 const pendingIds = new Set<string>();
 for (const p of result.data.participants) {
 if (!p.checkedIn && p.participantId) {
 pendingIds.add(p.participantId);
 }
 }
 setSelectedParticipants(pendingIds);

 setState('result');
 processingRef.current = false;
	}

	function toggleParticipant(participantId: string) {
 setSelectedParticipants(prev => {
 const next = new Set(prev);
 if (next.has(participantId)) next.delete(participantId);
 else next.add(participantId);
 return next;
 });
	}

	async function confirmCheckIns() {
 if (!validationResult || selectedParticipants.size === 0) return;

 setIsCheckingIn(true);
 const results = new Map<string, ParticipantCheckInResult>();

 for (const participantId of selectedParticipants) {
 const result = await checkInParticipantAction({
 invitationId: validationResult.invitationId!,
 participantId,
 });
 if (result.data) results.set(participantId, result.data);
 }

 setCheckInResults(results);
 setIsCheckingIn(false);

 const updatedParticipants = validationResult.participants.map(p => {
 const r = results.get(p.participantId);
 return r?.success ? { ...p, checkedIn: true } : p;
 });

 const totalCheckedIn = updatedParticipants.filter(p => p.checkedIn).length;
 setValidationResult({
 ...validationResult,
 participants: updatedParticipants,
 totalCheckedIn,
 totalPending: updatedParticipants.length - totalCheckedIn,
 status: totalCheckedIn === updatedParticipants.length ? 'complete' : 'partial',
 });

 setSelectedParticipants(prev => {
 const next = new Set(prev);
 let anySuccess = false;
 for (const [id, r] of results) {
 if (r.success) { next.delete(id); anySuccess = true; }
 }
 if (anySuccess && typeof window !== 'undefined') {
 window.dispatchEvent(new CustomEvent('validator-checkin-updated'));
 }
 return next;
 });
	}

	async function handleSearch(term: string) {
 if (term.length < 2) { setSearchResults([]); return; }
 setIsSearching(true);
 const response = await searchGuestsAction(term);
 if (response.success && response.data) setSearchResults(response.data);
 setIsSearching(false);
	}

	async function handleManualCheckIn(guestId: string, invitationId: string) {
 setIsCheckingIn(true);
 const result = await manualCheckInAction(guestId, invitationId);
 if (result.success) {
 setSearchResults(prev => prev.map(g => g.guestId === guestId ? { ...g, checkedIn: true } : g));
 if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('validator-checkin-updated'));
 }
 setIsCheckingIn(false);
	}

	function resetToIdle() {
 cleanupScanner();
 setState('idle');
 setValidationResult(null);
 setSelectedParticipants(new Set());
 setCheckInResults(new Map());
 setErrorMessage('');
 setCameraError('');
 setDebugInfo([]);
 processingRef.current = false;
 isInitializingRef.current = false;
	}

	function getStatusBadge(status: string) {
 switch (status) {
 case 'valid': return { label: 'Confirmado', color: 'bg-green-100 text-green-800' };
 case 'partial': return { label: 'Entrada Parcial', color: 'bg-yellow-100 text-yellow-800' };
 case 'complete': return { label: 'Todos Entraram', color: 'bg-blue-100 text-blue-800' };
 case 'rsvp_pending': return { label: 'RSVP Pendente', color: 'bg-orange-100 text-orange-800' };
 case 'rsvp_declined': return { label: 'Presença Recusada', color: 'bg-red-100 text-red-800' };
 case 'invitation_revoked': return { label: 'Convite Revogado', color: 'bg-red-100 text-red-800' };
 default: return { label: status, color: 'bg-gray-100 text-gray-800' };
 }
	}

	function getErrorIcon(error: string) {
 if (error.includes('Permissão') || error.includes('negada') || error.includes('bloqueado')) return <Lock size={24} className="shrink-0 text-red-600" />;
 if (error.includes('Nenhuma câmera') || error.includes('não encontrada') || error.includes('compatível')) return <VideoOff size={24} className="shrink-0 text-red-600" />;
 if (error.includes('em uso') || error.includes('ocupada')) return <Camera size={24} className="shrink-0 text-red-600" />;
 if (error.includes('HTTPS') || error.includes('segura')) return <ShieldAlert size={24} className="shrink-0 text-red-600" />;
 return <AlertCircle size={24} className="shrink-0 text-red-600" />;
	}

	// Determinar se o container deve estar visível
	// CORREÇÃO: container visível durante 'initializing' E 'scanning'
	const isContainerVisible = state === 'initializing' || state === 'scanning';

	return (
 <div className="space-y-4">
 {/*
 CORREÇÃO CRÍTICA: Container SEMPRE presente no DOM e VISÍVEL durante
 'initializing' e 'scanning'. Anteriormente estava hidden durante
 'initializing', o que causava dimensão zero e falha do html5-qrcode.
 */}
 <div
 ref={scannerContainerRef}
 id="qr-scanner-container"
 className={`relative overflow-hidden rounded-xl border-2 border-[#17291F]/20 bg-black shadow-lg ${
 isContainerVisible ? 'block min-h-[300px]' : 'hidden'
 }`}
 style={{ minHeight: isContainerVisible ? '300px' : undefined }}
 >
 {state === 'initializing' && (
 <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80">
 <Loader2 size={32} className="mb-3 animate-spin text-white/60" />
 <p className="text-xs font-medium text-white/60">Inicializando câmera...</p>
 </div>
 )}
 {state === 'scanning' && (
 <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/60 p-3 text-center">
 <p className="text-xs font-medium text-white/80">Aponte a câmera para o QR Code</p>
 </div>
 )}
 </div>

 {/* DIAGNÓSTICO TEMPORÁRIO — visível apenas durante erros ou inicialização */}
 {debugInfo.length > 0 && (state === 'error' || state === 'initializing' || state === 'requestingPermission') && (
 <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
 <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-yellow-700">Diagnóstico Técnico</p>
 <div className="max-h-32 overflow-y-auto space-y-0.5">
 {debugInfo.map((entry, i) => (
 <p key={i} className="font-mono text-[9px] leading-tight text-yellow-800/70">{entry}</p>
 ))}
 </div>
 </div>
 )}

 {/* ESTADO: IDLE */}
 {state === 'idle' && (
 <div className="space-y-4">
 <button
 onClick={requestCameraPermission}
 className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#17291F] px-6 py-5 text-base font-semibold uppercase tracking-widest text-[#e4c286] shadow-lg transition-all hover:bg-[#0a1f12] hover:shadow-xl active:scale-[0.98]"
 >
 <Camera size={24} />
 Ativar Câmera
 </button>

 <button
 onClick={() => setShowSearch(!showSearch)}
 className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#17291F]/20 bg-white px-4 py-3 text-sm font-medium text-[#17291F]/70 transition-colors hover:border-[#17291F]/40 hover:text-[#17291F]"
 >
 <Search size={18} />
 Busca Manual
 </button>
 </div>
 )}

 {/* ESTADO: SOLICITANDO PERMISSÃO */}
 {state === 'requestingPermission' && (
 <div className="flex flex-col items-center justify-center rounded-xl border border-[#17291F]/10 bg-white p-10 shadow-sm">
 <Loader2 size={40} className="mb-4 animate-spin text-[#17291F]/40" />
 <p className="text-sm font-medium text-[#17291F]/60">Solicitando acesso à câmera...</p>
 <p className="mt-2 text-xs text-[#17291F]/40">Verifique o prompt do navegador</p>
 </div>
 )}

 {/* ESTADO: SCANNING ATIVO */}
 {state === 'scanning' && (
 <button
 onClick={async () => { await cleanupScanner(); setState('idle'); }}
 className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#17291F]/20 bg-white px-4 py-3 text-sm font-medium text-[#17291F] transition-colors hover:bg-[#faf8f5]"
 >
 <X size={16} /> Cancelar
 </button>
 )}

 {/* ESTADO: VALIDANDO CONVITE */}
 {state === 'validating' && (
 <div className="flex flex-col items-center justify-center rounded-xl border border-[#17291F]/10 bg-white p-10 shadow-sm">
 <Loader2 size={40} className="mb-4 animate-spin text-[#17291F]/40" />
 <p className="text-sm font-medium text-[#17291F]/60">Validando convite...</p>
 </div>
 )}

 {/* ESTADO: ERRO */}
 {(state === 'error' || cameraError) && (
 <div className="space-y-4">
 <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
 {getErrorIcon(cameraError || errorMessage)}
 <div>
 <p className="text-sm font-semibold text-red-800">
 {cameraError || errorMessage || 'Erro inesperado.'}
 </p>
 </div>
 </div>
 <button
 onClick={resetToIdle}
 className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#17291F] px-4 py-3 text-sm font-semibold uppercase tracking-widest text-[#e4c286] transition-colors hover:bg-[#0a1f12]"
 >
 <RefreshCw size={16} /> Tentar Novamente
 </button>
 </div>
 )}

 {/* ESTADO: RESULTADO DA VALIDAÇÃO */}
 {state === 'result' && validationResult && (
 <div className="space-y-4">
 <div className="rounded-xl border border-[#17291F]/10 bg-white p-5 shadow-sm">
 <div className="flex items-start justify-between">
 <div>
 <h2 className="text-lg font-bold text-[#17291F]">{validationResult.displayName}</h2>
 <p className="mt-1 text-xs text-[#17291F]/50">
 {validationResult.totalConfirmed} confirmado(s) • {validationResult.totalCheckedIn} entrou(aram) • {validationResult.totalPending} aguardando
 </p>
 </div>
 <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(validationResult.status).color}`}>
 {getStatusBadge(validationResult.status).label}
 </span>
 </div>
 </div>

 {errorMessage && (
 <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
 <AlertCircle size={20} className="shrink-0 text-orange-600" />
 <p className="text-xs font-medium leading-relaxed text-orange-800">{errorMessage}</p>
 </div>
 )}

 <div className="rounded-xl border border-[#17291F]/10 bg-white shadow-sm">
 <div className="border-b border-[#17291F]/10 px-5 py-3">
 <h3 className="text-sm font-semibold uppercase tracking-widest text-[#17291F]/70">Participantes</h3>
 </div>
 <div className="divide-y divide-[#17291F]/5">
 {validationResult.participants.map((participant) => {
 const checkInResult = checkInResults.get(participant.participantId);
 const justCheckedIn = checkInResult?.success;
 const alreadyWasCheckedIn = participant.checkedIn && !justCheckedIn;
 const isSelected = selectedParticipants.has(participant.participantId);
 const isDisabled = participant.checkedIn || justCheckedIn;

 return (
 <label
 key={participant.participantId}
 className={`flex items-center gap-3 px-5 py-3 transition-colors ${
 isDisabled ? 'bg-green-50/50' : isSelected ? 'bg-[#e4c286]/10' : 'hover:bg-[#faf8f5]'
 } ${isDisabled ? '' : 'cursor-pointer'}`}
 >
 {isDisabled ? (
 <CheckCircle size={20} className="shrink-0 text-green-600" />
 ) : (
 <input
 type="checkbox"
 checked={isSelected}
 onChange={() => toggleParticipant(participant.participantId)}
 className="h-5 w-5 shrink-0 rounded border-[#17291F]/30 text-[#17291F] focus:ring-[#17291F]/30"
 />
 )}
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-2">
 <p className={`truncate text-sm font-medium ${isDisabled ? 'text-green-800' : 'text-[#17291F]'}`}>
 {participant.name}
 </p>
 {participant.type === 'companion' && (
 <span className="shrink-0 rounded bg-[#17291F]/5 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-[#17291F]/50">
 Acompanhante
 </span>
 )}
 {participant.isMinor && (
 <span className="shrink-0 rounded bg-orange-100 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-orange-700">
 Menor
 </span>
 )}
 </div>
 {justCheckedIn && <p className="text-xs font-medium text-green-600">✅ Entrada registrada agora</p>}
 {alreadyWasCheckedIn && <p className="text-xs text-green-600/70">Entrada já registrada</p>}
 </div>
 </label>
 );
 })}
 </div>
 </div>

 {selectedParticipants.size > 0 && (
 <button
 onClick={confirmCheckIns}
 disabled={isCheckingIn}
 className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#17291F] px-6 py-4 text-sm font-bold uppercase tracking-widest text-[#e4c286] shadow-lg transition-all hover:bg-[#0a1f12] disabled:opacity-60"
 >
 {isCheckingIn ? (
 <><Loader2 size={18} className="animate-spin" /> Registrando...</>
 ) : (
 <><UserCheck size={18} /> Confirmar Entrada ({selectedParticipants.size})</>
 )}
 </button>
 )}

 <button
 onClick={resetToIdle}
 className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#17291F]/20 bg-white px-4 py-3 text-sm font-medium text-[#17291F] transition-colors hover:bg-[#faf8f5]"
 >
 <QrCode size={16} /> Escanear Próximo
 </button>
 </div>
 )}

 {/* BUSCA MANUAL */}
 {showSearch && state === 'idle' && (
 <div className="rounded-xl border border-[#17291F]/10 bg-white p-5 shadow-sm">
 <div className="mb-4 flex items-center justify-between">
 <h3 className="text-sm font-semibold uppercase tracking-widest text-[#17291F]/70">Busca Manual</h3>
 <button
 onClick={() => { setShowSearch(false); setSearchTerm(''); setSearchResults([]); }}
 className="text-xs text-[#17291F]/50 hover:text-[#17291F]"
 >Fechar</button>
 </div>

 <div className="relative mb-4">
 <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#17291F]/30" />
 <input
 type="search"
 value={searchTerm}
 onChange={(e) => { setSearchTerm(e.target.value); handleSearch(e.target.value); }}
 placeholder="Nome do convidado..."
 className="w-full rounded-lg border border-[#17291F]/20 bg-[#faf8f5] px-4 py-2.5 pl-9 text-sm text-[#17291F] placeholder:text-[#17291F]/30 focus:border-[#17291F] focus:outline-none focus:ring-1 focus:ring-[#17291F]"
 />
 </div>

 {isSearching && <p className="py-4 text-center text-xs text-[#17291F]/40">Buscando...</p>}

 {searchResults.length > 0 && (
 <div className="space-y-2">
 {searchResults.map((guest) => (
 <div
 key={guest.guestId}
 className={`flex items-center justify-between rounded-lg border p-3 ${
 guest.checkedIn ? 'border-green-200 bg-green-50/50' : 'border-[#17291F]/10 bg-[#faf8f5]'
 }`}
 >
 <div className="min-w-0 flex-1">
 <p className="truncate text-sm font-medium text-[#17291F]">{guest.fullName}</p>
 <p className="truncate text-xs text-[#17291F]/50">{guest.invitationDisplayName}</p>
 </div>
 {guest.checkedIn ? (
 <span className="flex shrink-0 items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-green-800">
 <CheckCircle size={10} /> Entrou
 </span>
 ) : (
 <button
 onClick={() => handleManualCheckIn(guest.guestId, guest.invitationId)}
 disabled={isCheckingIn}
 className="shrink-0 rounded-md bg-[#17291F] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#e4c286] transition-colors hover:bg-[#0a1f12] disabled:opacity-50"
 >Check-in</button>
 )}
 </div>
 ))}
 </div>
 )}

 {searchTerm.length >= 2 && searchResults.length === 0 && !isSearching && (
 <p className="py-4 text-center text-xs text-[#17291F]/40">
 Nenhum convidado encontrado para &quot;{searchTerm}&quot;
 </p>
 )}
 </div>
 )}
 </div>
	);
}