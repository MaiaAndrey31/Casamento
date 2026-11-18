import { getValidatorSession } from '@/lib/auth/admin-session';
import { redirect } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { TrainingModeClient } from './TrainingModeClient';
import { isTrainingAvailableAction } from '@/app/actions/training-mode.action';

/**
 * Modo de Treinamento Isolado — /validador/treinamento (Lote 4 §11)
 *
 * Ambiente de treinamento para validadores antes da primeira abertura da recepção.
 * Utiliza EXCLUSIVAMENTE dados fictícios em memória/client-side.
 * NENHUMA escrita no Firestore real.
 *
 * ISOLAMENTO GARANTIDO PELA ARQUITETURA:
 * - Todos os dados são gerados localmente no componente client
 * - Nenhuma server action de escrita é chamada
 * - QR Codes fictícios usam prefixo "TRAINING_" impossível de confundir com tokens reais
 * - Check-ins simulados existem apenas no estado React (useState)
 * - Quando a recepção real é aberta, esta rota redireciona para /validador
 *
 * SEGURANÇA: verifica sessão de validador no servidor.
 */
export default async function ValidatorTrainingPage() {
	const session = await getValidatorSession();

	if (!session) {
 redirect('/validador/login?redirect=/validador/treinamento');
	}

	// Verificar se o treinamento está disponível (recepção ainda não foi aberta)
	const trainingCheck = await isTrainingAvailableAction();

	if (!trainingCheck.success || !trainingCheck.data?.available) {
 // Treinamento bloqueado — recepção já foi aberta pelo menos uma vez
 redirect('/validador');
	}

	return (
 <div className="space-y-6">
 {/* Header */}
 <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
 <div className="flex items-center gap-3">
 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
 <GraduationCap size={22} className="text-blue-700" />
 </div>
 <div>
 <h1 className="text-lg font-bold text-blue-900">Modo de Treinamento</h1>
 <p className="text-xs text-blue-700/70">
 Ambiente simulado • Nenhum dado real será alterado
 </p>
 </div>
 </div>
 </div>

 {/* Componente client com treinamento totalmente isolado */}
 <TrainingModeClient />
 </div>
	);
}