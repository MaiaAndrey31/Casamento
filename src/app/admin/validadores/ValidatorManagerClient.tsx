'use client';

import { useState } from 'react';
import { createValidatorAction, toggleValidatorAction } from '@/app/actions/create-validator.action';
import { Plus, UserX, UserCheck, Loader2, AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';

interface ValidatorListItem {
	uid: string;
	email: string;
	displayName: string;
	phone: string | null;
	role: string;
	type: string;
	active: boolean;
	createdAt: string | null;
	lastLoginAt: string | null;
	createdBy: string | null;
}

interface ValidatorManagerClientProps {
	validators: ValidatorListItem[];
}

/**
 * Componente Client — Gerenciamento de Validadores
 *
 * Formulário de cadastro + botões de ativar/desativar.
 * Server Actions garantem autorização no servidor.
 */
export function ValidatorManagerClient({ validators }: ValidatorManagerClientProps) {
	const [showForm, setShowForm] = useState(false);
	const [formData, setFormData] = useState({
		displayName: '',
		email: '',
		phone: '',
		password: '',
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [togglingUid, setTogglingUid] = useState<string | null>(null);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError('');
		setSuccess('');
		setLoading(true);

		const result = await createValidatorAction(formData);

		if (result.success) {
			setSuccess(result.message || 'Validador criado com sucesso.');
			setFormData({ displayName: '', email: '', phone: '', password: '' });
			setShowForm(false);
		} else {
			setError(result.error || 'Erro ao criar validador.');
		}

		setLoading(false);
	}

	async function handleToggle(uid: string, currentActive: boolean) {
		setTogglingUid(uid);
		setError('');
		setSuccess('');

		const result = await toggleValidatorAction(uid, !currentActive);

		if (result.success) {
			setSuccess(result.message || 'Status atualizado.');
		} else {
			setError(result.error || 'Erro ao alterar status.');
		}

		setTogglingUid(null);
	}

	return (
		<div className="space-y-6">
			{/* Mensagens de feedback */}
			{error && (
				<div className="flex items-start gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700">
					<AlertCircle size={16} className="mt-0.5 shrink-0" />
					<span>{error}</span>
				</div>
			)}
			{success && (
				<div className="flex items-start gap-2 rounded-lg bg-green-50 p-4 text-sm text-green-700">
					<CheckCircle size={16} className="mt-0.5 shrink-0" />
					<span>{success}</span>
				</div>
			)}

			{/* Botão para abrir formulário */}
			{!showForm && (
				<button
					onClick={() => setShowForm(true)}
					className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-outline-variant/30 bg-surface-container-low px-6 py-4 text-body-md font-semibold text-primary transition-all hover:border-tertiary-fixed-dim hover:bg-surface-container"
				>
					<Plus size={20} />
					Cadastrar Novo Validador
				</button>
			)}

			{/* Formulário de cadastro */}
			{showForm && (
				<form onSubmit={handleSubmit} className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-sm">
					<div className="mb-4 flex items-center justify-between">
						<h3 className="text-title-md text-primary">Novo Validador</h3>
						<button
							type="button"
							onClick={() => { setShowForm(false); setError(''); }}
							className="text-body-sm text-on-surface-variant hover:text-primary"
						>
							Cancelar
						</button>
					</div>

					<div className="space-y-4">
						<div>
							<label htmlFor="val-name" className="mb-1.5 block text-label-sm uppercase tracking-widest text-on-surface-variant">
								Nome Completo *
							</label>
							<input
								id="val-name"
								type="text"
								required
								minLength={3}
								maxLength={200}
								value={formData.displayName}
								onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
								placeholder="Nome do validador"
								className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim"
							/>
						</div>

						<div>
							<label htmlFor="val-email" className="mb-1.5 block text-label-sm uppercase tracking-widest text-on-surface-variant">
								Email de Login *
							</label>
							<input
								id="val-email"
								type="email"
								required
								value={formData.email}
								onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
								placeholder="validador@email.com"
								className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim"
							/>
						</div>

						<div>
							<label htmlFor="val-phone" className="mb-1.5 block text-label-sm uppercase tracking-widest text-on-surface-variant">
								Telefone (opcional)
							</label>
							<input
								id="val-phone"
								type="tel"
								maxLength={20}
								value={formData.phone}
								onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
								placeholder="(00) 00000-0000"
								className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim"
							/>
						</div>

						<div>
							<label htmlFor="val-password" className="mb-1.5 block text-label-sm uppercase tracking-widest text-on-surface-variant">
								Senha Inicial *
							</label>
							<input
								id="val-password"
								type="password"
								required
								minLength={8}
								maxLength={128}
								value={formData.password}
								onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
								placeholder="Mínimo 8 caracteres"
								className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim"
							/>
							<p className="mt-1 text-[10px] text-on-surface-variant/60">
								Compartilhe esta senha de forma segura com o validador. Ela não será armazenada em texto puro.
							</p>
						</div>
					</div>

					<div className="mt-6 flex gap-3">
						<button
							type="submit"
							disabled={loading}
							className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-label-md uppercase tracking-widest text-white shadow-md transition-all hover:bg-primary/90 disabled:opacity-60"
						>
							{loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
							{loading ? 'Criando...' : 'Criar Validador'}
						</button>
					</div>
				</form>
			)}

			{/* Ações por validador na lista */}
			{validators.length > 0 && (
				<div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm">
					<div className="border-b border-outline-variant/10 px-6 py-4">
						<h3 className="text-title-sm text-primary">Ações Rápidas</h3>
					</div>
					<div className="divide-y divide-outline-variant/10">
						{validators.map((v) => (
							<div key={v.uid} className="flex items-center justify-between px-6 py-3">
								<div className="min-w-0 flex-1">
									<p className="truncate text-body-md text-primary">{v.displayName}</p>
									<p className="truncate text-body-xs text-on-surface-variant">{v.email}</p>
								</div>
								<button
									onClick={() => handleToggle(v.uid, v.active)}
									disabled={togglingUid === v.uid}
									className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-label-sm uppercase tracking-wider transition-colors ${
										v.active
											? 'bg-red-50 text-red-700 hover:bg-red-100'
											: 'bg-green-50 text-green-700 hover:bg-green-100'
									} disabled:opacity-50`}
								>
									{togglingUid === v.uid ? (
										<Loader2 size={14} className="animate-spin" />
									) : v.active ? (
										<>
											<UserX size={14} /> Desativar
										</>
									) : (
										<>
											<UserCheck size={14} /> Ativar
										</>
									)}
								</button>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Aviso de segurança */}
			<div className="flex items-start gap-3 rounded-lg bg-[#fff8f3] p-4">
				<ShieldAlert size={20} className="shrink-0 text-[#a2854f]" />
				<div>
					<p className="text-body-sm font-semibold text-[#17291F]">Segurança</p>
					<p className="mt-1 text-body-xs text-[#17291F]/60">
						As senhas são definidas via Firebase Authentication e nunca armazenadas no banco de dados.
						Desativar um validador impede imediatamente novas operações, mesmo que ele tenha uma sessão aberta.
					</p>
				</div>
			</div>
		</div>
	);
}