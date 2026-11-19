'use client';

import { Component, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
	children: ReactNode;
}

interface State {
	hasError: boolean;
	errorMessage: string;
}

/**
 * Error Boundary específico para o Scanner de QR Code.
 *
 * Impede que uma exceção no scanner derrube toda a aplicação.
 * Captura erros síncronos de renderização e exibe UI de recuperação.
 *
 * NOTA: Error Boundaries do React NÃO capturam erros assíncronos
 * (promises rejeitadas, setTimeout, event handlers). Esses devem
 * ser tratados com try/catch dentro do componente. Este boundary
 * é uma camada adicional de proteção para erros de renderização.
 */
export class ScannerErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
 super(props);
 this.state = { hasError: false, errorMessage: '' };
	}

	static getDerivedStateFromError(error: Error): State {
 console.error('[ScannerErrorBoundary] Erro capturado:', error);
 return {
 hasError: true,
 errorMessage: error?.message || 'Erro inesperado no scanner.',
 };
	}

	componentDidCatch(error: Error, info: React.ErrorInfo) {
 // Log estruturado para diagnóstico em produção
 console.error('[ScannerErrorBoundary] componentDidCatch:', {
 error: error?.message,
 stack: error?.stack?.substring(0, 500),
 componentStack: info?.componentStack?.substring(0, 500),
 timestamp: new Date().toISOString(),
 });
	}

	handleRetry = () => {
 this.setState({ hasError: false, errorMessage: '' });
	};

	render() {
 if (this.state.hasError) {
 return (
 <div className="space-y-4">
 <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
 <AlertCircle size={24} className="shrink-0 text-red-600" />
 <div>
 <p className="text-sm font-semibold text-red-800">
 O scanner encontrou um erro e foi reiniciado.
 </p>
 <p className="mt-1 text-xs text-red-700/70">
 Isso não afetou sua sessão nem os dados do evento.
 </p>
 </div>
 </div>
 <button
 onClick={this.handleRetry}
 className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#17291F] px-4 py-3 text-sm font-semibold uppercase tracking-widest text-[#e4c286] transition-colors hover:bg-[#0a1f12]"
 >
 <RefreshCw size={16} /> Tentar Novamente
 </button>
 </div>
 );
	}

 return this.props.children;
	}
}