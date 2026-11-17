import { getAdminSession } from '@/lib/auth/admin-session';
import { redirect } from 'next/navigation';
import { listValidators } from '@/lib/repositories/validator.repository';
import { ShieldCheck, Plus, UserX, UserCheck, AlertTriangle } from 'lucide-react';
import { ValidatorManagerClient } from './ValidatorManagerClient';

/**
 * Gerenciamento de Validadores — /admin/validadores
 *
 * Página exclusiva para noivos (role: owner) cadastrarem e gerenciarem
 * operadores de check-in. Validadores NÃO podem acessar esta rota.
 *
 * SEGURANÇA:
 * - Verifica sessão admin no servidor
 * - Rejeita validadores (type === 'validator')
 * - Apenas owners podem cadastrar/desativar
 */
export default async function AdminValidatorsPage() {
	const session = await getAdminSession();

	if (!session) {
		redirect('/admin/login');
	}

	// Apenas owners podem gerenciar validadores
	if (session.role !== 'owner') {
		redirect('/admin');
	}

	const validators = await listValidators();

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-headline-md text-primary">Validadores</h1>
					<p className="mt-1 text-body-sm text-on-surface-variant">
						Gerencie os operadores autorizados a realizar check-in no evento.
					</p>
				</div>
			</div>

			{/* Lista de validadores */}
			<div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm">
				<div className="border-b border-outline-variant/10 px-6 py-4">
					<div className="flex items-center gap-2">
						<ShieldCheck size={20} className="text-tertiary-fixed-dim" />
						<h2 className="text-title-md text-primary">
							Operadores Cadastrados ({validators.length})
						</h2>
					</div>
				</div>

				{validators.length === 0 ? (
					<div className="p-8 text-center">
						<ShieldCheck size={40} className="mx-auto mb-3 text-on-surface-variant/30" />
						<p className="text-body-md text-on-surface-variant">
							Nenhum validador cadastrado ainda.
						</p>
						<p className="mt-1 text-body-sm text-on-surface-variant/60">
							Use o formulário abaixo para adicionar o primeiro operador.
						</p>
					</div>
				) : (
					<div className="divide-y divide-outline-variant/10">
						{validators.map((validator) => (
							<div
								key={validator.uid}
								className="flex items-center justify-between px-6 py-4"
							>
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<p className="truncate text-title-sm text-primary">
											{validator.displayName}
										</p>
										{validator.active ? (
											<span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-green-800">
												<UserCheck size={10} /> Ativo
											</span>
										) : (
											<span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-800">
												<UserX size={10} /> Inativo
											</span>
										)}
									</div>
									<p className="truncate text-body-sm text-on-surface-variant">
										{validator.email}
									</p>
									{validator.phone && (
										<p className="text-body-xs text-on-surface-variant/60">
											{validator.phone}
										</p>
									)}
									{validator.lastLoginAt && (
										<p className="mt-1 text-[10px] text-on-surface-variant/50">
											Último acesso: {new Date(validator.lastLoginAt).toLocaleString('pt-BR')}
										</p>
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Formulário de cadastro (client component para interatividade) */}
			<ValidatorManagerClient validators={validators} />
		</div>
	);
}