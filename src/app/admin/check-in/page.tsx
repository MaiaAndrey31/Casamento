'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, Search, CheckCircle, XCircle, AlertTriangle, UserCheck, QrCode } from 'lucide-react';
import { checkInByQrCode, searchGuestsForCheckIn, checkInManually } from '@/app/actions/checkin.action';

type CheckInStatus = 'idle' | 'scanning' | 'processing' | 'success' | 'error' | 'duplicate';

interface CheckInResult {
	guestName?: string;
	invitationDisplayName?: string;
	alreadyCheckedIn?: boolean;
	error?: string;
}

/**
 * Tela de Check-in — /admin/check-in
 *
 * Leitura automática de QR Code via câmera (html5-qrcode) + busca manual por nome.
 * Validação server-side via transação (previne duplicidade).
 * Responsivo para uso no celular no dia do evento.
 */
export default function AdminCheckInPage() {
	const [status, setStatus] = useState<CheckInStatus>('idle');
	const [result, setResult] = useState<CheckInResult>({});
	const [searchTerm, setSearchTerm] = useState('');
	const [searchResults, setSearchResults] = useState<Array<{ id: string; fullName: string; invitationDisplayName: string; checkedIn: boolean }>>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [cameraError, setCameraError] = useState('');
	const [scannerReady, setScannerReady] = useState(false);

	const scannerRef = useRef<HTMLDivElement>(null);
	const html5QrCodeRef = useRef<unknown>(null);

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

	// Limpar scanner ao desmontar
	useEffect(() => {
		return () => {
			stopScanner();
		};
	}, []);

	async function stopScanner() {
		try {
			if (html5QrCodeRef.current) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await (html5QrCodeRef.current as any).stop().catch(() => {});
				html5QrCodeRef.current = null;
			}
		} catch {
			// Ignorar erros de cleanup
		}
	}

	async function startCamera() {
		setStatus('scanning');
		setCameraError('');
		setResult({});

		try {
			const { Html5Qrcode } = await import('html5-qrcode');

			if (!scannerRef.current) {
				setCameraError('Elemento do scanner não encontrado.');
				setStatus('error');
				return;
			}

			const scanner = new Html5Qrcode('qr-scanner-container');
			html5QrCodeRef.current = scanner;

			await scanner.start(
				{ facingMode: 'environment' },
				{
					fps: 10,
					qrbox: { width: 250, height: 250 },
					aspectRatio: 1.0,
				},
				async (decodedText) => {
					// QR Code lido com sucesso — parar scanner e validar
					await stopScanner();
					setScannerReady(false);
					handleManualTokenSubmit(decodedText);
				},
				() => {
					// Callback de erro de scan (chamado a cada frame sem QR detectado)
					// Ignorar — é comportamento normal durante a busca
				},
			);

			setScannerReady(true);
		} catch (e) {
			setStatus('error');
			setCameraError(
				e instanceof Error && e.message.includes('Permission')
					? 'Permissão de câmera negada. Habilite nas configurações do navegador.'
					: 'Não foi possível acessar a câmera. Verifique se está em HTTPS ou localhost.',
			);
		}
	}

	async function handleManualTokenSubmit(token: string) {
		if (!token || token.length < 4) return;

		setStatus('processing');
		setResult({});

		const response = await checkInByQrCode(eventId, token);

		if (response.success && response.data?.success) {
			setStatus('success');
			setResult(response.data);
		} else if (response.data?.alreadyCheckedIn) {
			setStatus('duplicate');
			setResult(response.data);
		} else {
			setStatus('error');
			setResult({ error: response.error || response.data?.error || 'QR Code inválido.' });
		}
	}

	async function handleSearch(term: string) {
		if (term.length < 2) {
			setSearchResults([]);
			return;
		}

		setIsSearching(true);
		const response = await searchGuestsForCheckIn(eventId, term);
		if (response.success && response.data) {
			setSearchResults(response.data);
		}
		setIsSearching(false);
	}

	async function handleManualCheckIn(guestId: string, guestName: string) {
		setStatus('processing');
		setResult({});

		const response = await checkInManually(eventId, guestId);

		if (response.success && response.data?.success) {
			setStatus('success');
			setResult(response.data);
			setSearchResults(prev => prev.map(g => g.id === guestId ? { ...g, checkedIn: true } : g));
		} else if (response.data?.alreadyCheckedIn) {
			setStatus('duplicate');
			setResult(response.data);
		} else {
			setStatus('error');
			setResult({ error: response.error || 'Erro ao realizar check-in manual.' });
		}
	}

	function reset() {
		setStatus('idle');
		setResult({});
		setSearchTerm('');
		setSearchResults([]);
		setCameraError('');
		setScannerReady(false);
	}

	return (
		<div className="space-y-space-xl">
			{/* Header */}
			<div>
				<h1 className="text-headline-lg-mobile text-primary md:text-headline-lg">
					Check-in de Convidados
				</h1>
				<p className="mt-space-xs text-body-md text-on-surface-variant">
					Leia o QR Code ou busque pelo nome do convidado
				</p>
			</div>

			{/* Feedback visual do último check-in */}
			{status === 'success' && (
				<div className="animate-in fade-in slide-in-from-top-2 rounded-xl border-2 border-green-300 bg-green-50 p-space-lg text-center shadow-md duration-300">
					<UserCheck size={48} className="mx-auto mb-space-sm text-green-700" />
					<p className="text-headline-md text-green-800">Check-in Realizado!</p>
					<p className="mt-space-xs text-title-md text-green-700">{result.guestName}</p>
					{result.invitationDisplayName && (
						<p className="text-body-md text-green-600">{result.invitationDisplayName}</p>
					)}
					<button
						onClick={reset}
						className="mt-space-md inline-flex items-center gap-2 rounded-md bg-green-700 px-6 py-3 text-label-md uppercase tracking-widest text-white transition-colors hover:bg-green-800"
					>
						Próximo Convidado
					</button>
				</div>
			)}

			{status === 'duplicate' && (
				<div className="animate-in fade-in rounded-xl border-2 border-amber-300 bg-amber-50 p-space-lg text-center shadow-md duration-300">
					<AlertTriangle size={48} className="mx-auto mb-space-sm text-amber-700" />
					<p className="text-headline-sm text-amber-800">Já Realizou Check-in</p>
					<p className="mt-space-xs text-body-lg text-amber-700">{result.guestName}</p>
					{result.invitationDisplayName && (
						<p className="text-body-md text-amber-600">{result.invitationDisplayName}</p>
					)}
					<button
						onClick={reset}
						className="mt-space-md inline-flex items-center gap-2 rounded-md border border-amber-400 bg-white px-6 py-3 text-label-md uppercase tracking-widest text-amber-800 transition-colors hover:bg-amber-50"
					>
						Tentar Outro
					</button>
				</div>
			)}

			{status === 'error' && (
				<div className="animate-in fade-in rounded-xl border-2 border-error/30 bg-error-container/10 p-space-lg text-center shadow-md duration-300">
					<XCircle size={48} className="mx-auto mb-space-sm text-error" />
					<p className="text-headline-sm text-error">Erro no Check-in</p>
					<p className="mt-space-xs text-body-md text-error/80">{result.error}</p>
					<button
						onClick={reset}
						className="mt-space-md inline-flex items-center gap-2 rounded-md border border-error/30 bg-white px-6 py-3 text-label-md uppercase tracking-widest text-error transition-colors hover:bg-error-container/20"
					>
						Tentar Novamente
					</button>
				</div>
			)}

			{status === 'processing' && (
				<div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-space-xl text-center">
					<div className="mx-auto mb-space-md h-10 w-10 animate-spin rounded-full border-4 border-primary-container border-t-transparent" />
					<p className="text-body-lg text-on-surface-variant">Processando check-in...</p>
				</div>
			)}

			{/* Seção de câmera e token manual */}
			{(status === 'idle' || status === 'scanning') && (
				<div className="space-y-space-lg">
					{/* Scanner de QR Code */}
					<div className="overflow-hidden rounded-xl border border-outline-variant/20 bg-black shadow-md">
						{status === 'scanning' ? (
							<div id="qr-scanner-container" ref={scannerRef} className="w-full" />
						) : (
							<div className="flex aspect-video flex-col items-center justify-center bg-surface-container-high p-space-lg text-center">
								<QrCode size={64} className="mb-space-md text-on-surface-variant/30" />
								<p className="text-body-md text-on-surface-variant">
									Câmera pronta para leitura de QR Code
								</p>
							</div>
						)}
					</div>

					{cameraError && (
						<p className="text-center text-body-sm text-on-surface-variant">{cameraError}</p>
					)}

					<div className="flex gap-3">
						<button
							onClick={startCamera}
							disabled={status === 'scanning'}
							className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary-container px-6 py-4 text-label-md uppercase tracking-widest text-tertiary-fixed shadow-md transition-all hover:bg-secondary disabled:opacity-60"
						>
							<Camera size={18} />
							{status === 'scanning' ? 'Câmera Ativa' : 'Ativar Câmera'}
						</button>
					</div>

					{/* Token manual (fallback) */}
					<form
						onSubmit={(e) => {
							e.preventDefault();
							const formData = new FormData(e.currentTarget);
							handleManualTokenSubmit(formData.get('token') as string);
						}}
						className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-space-lg shadow-sm"
					>
						<label htmlFor="manualToken" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
							Token do QR Code (leitura manual)
						</label>
						<div className="flex gap-2">
							<input
								id="manualToken"
								name="token"
								type="text"
								required
								minLength={4}
								placeholder="Cole ou digite o token do QR Code"
								className="flex-1 rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
							/>
							<button
								type="submit"
								className="rounded-md bg-primary-container px-6 py-3 text-label-md uppercase tracking-widest text-tertiary-fixed shadow-md transition-all hover:bg-secondary"
							>
								Validar
							</button>
						</div>
					</form>
				</div>
			)}

			{/* Busca manual por nome */}
			<div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-space-lg shadow-sm">
				<div className="mb-space-md flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container/50">
						<Search size={20} className="text-primary-container" />
					</div>
					<h2 className="text-headline-sm text-primary">Busca Manual</h2>
				</div>

				<div className="relative">
					<input
						type="search"
						value={searchTerm}
						onChange={(e) => {
							setSearchTerm(e.target.value);
							handleSearch(e.target.value);
						}}
						placeholder="Digite o nome do convidado..."
						className="w-full rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-3 pl-10 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
					/>
					<Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
				</div>

				{isSearching && (
					<p className="mt-space-sm text-center text-body-sm text-on-surface-variant">Buscando...</p>
				)}

				{searchResults.length > 0 && (
					<div className="mt-space-md space-y-space-sm">
						{searchResults.map((guest) => (
							<div
								key={guest.id}
								className={`flex items-center justify-between rounded-lg border p-3 ${
									guest.checkedIn
										? 'border-green-200 bg-green-50/50'
										: 'border-outline-variant/20 bg-surface-container-low'
								}`}
							>
								<div className="min-w-0 flex-1">
									<p className="truncate text-title-md text-primary">{guest.fullName}</p>
									<p className="truncate text-body-sm text-on-surface-variant">{guest.invitationDisplayName}</p>
								</div>
								{guest.checkedIn ? (
									<span className="flex shrink-0 items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-green-800">
										<CheckCircle size={12} /> Entrada Registrada
									</span>
								) : (
									<button
										onClick={() => handleManualCheckIn(guest.id, guest.fullName)}
										className="shrink-0 rounded-md bg-primary-container px-4 py-2 text-label-sm uppercase tracking-widest text-tertiary-fixed transition-colors hover:bg-secondary"
									>
										Check-in
									</button>
								)}
							</div>
						))}
					</div>
				)}

				{searchTerm.length >= 2 && searchResults.length === 0 && !isSearching && (
					<p className="mt-space-md text-center text-body-sm text-on-surface-variant">
						Nenhum convidado encontrado para &quot;{searchTerm}&quot;
					</p>
				)}
			</div>
		</div>
	);
}