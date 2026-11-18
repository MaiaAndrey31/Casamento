'use client';

import { useState } from 'react';
import { createValidatorAction, toggleValidatorAction } from '@/app/actions/create-validator.action';
import { resetValidatorPasswordAction } from '@/app/actions/reset-validator-password.action';
import { Plus, UserX, UserCheck, Loader2, AlertCircle, CheckCircle, ShieldAlert, KeyRound, MoreVertical, X } from 'lucide-react';

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
 * Componente Client — Gerenciamento de Validadores (Item 10 Definitivo)
 *
 * Formulário de cadastro com confirmação de senha + botões de ativar/desativar/redefinir senha.
 * Server Actions garantem autorização no servidor.
 *
 * SEGURANÇA:
 * - Senhas NUNCA enviadas ao cliente em respostas de consulta
 * - Senhas NUNCA armazenadas no Firestore
 * - Redefinição revoga sessões anteriores via Firebase Admin SDK
 * - Apenas owners podem cadastrar/redefinir/desativar
 */
export function ValidatorManagerClient({ validators }: ValidatorManagerClientProps) {
	const [showForm, setShowForm] = useState(false);
	const [formData, setFormData] = useState({
 displayName: '',
 email: '',
 phone: '',
 password: '',
 confirmPassword: '',
 });
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [togglingUid, setTogglingUid] = useState<string | null>(null);

	// Estado para modal de redefinição de senha
	const [resetModalUid, setResetModalUid] = useState<string | null>(null);
	const [resetFormData, setResetFormData] = useState({ newPassword: '', confirmPassword: '' });
	const [resetLoading, setResetLoading] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
 e.preventDefault();
 setError('');
 setSuccess('');

 // Validação client-side da confirmação de senha
 if (formData.password !== formData.confirmPassword) {
 setError('As senhas não coincidem.');
 return;
 }

 if (formData.password.length < 8) {
 setError('A senha deve ter pelo menos 8 caracteres.');
 return;
 }

 setLoading(true);

 const result = await createValidatorAction({
 displayName: formData.displayName,
 email: formData.email,
 phone: formData.phone,
 password: formData.password,
 });

 if (result.success) {
 setSuccess(result.message || 'Validador criado com sucesso.');
 setFormData({ displayName: '', email: '', phone: '', password: '', confirmPassword: '' });
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

	async function handleResetPassword() {
 if (!resetModalUid) return;

 setError('');
 setSuccess('');

 // Validação client-side
 if (resetFormData.newPassword !== resetFormData.confirmPassword) {
 setError('As senhas não coincidem.');
 return;
 }

 if (resetFormData.newPassword.length < 8) {
 setError('A nova senha deve ter pelo menos 8 caracteres.');
 return;
 }

 setResetLoading(true);

 const result = await resetValidatorPasswordAction({
 uid: resetModalUid,
 newPassword: resetFormData.newPassword,
 });

 if (result.success) {
 setSuccess(result.message || 'Senha redefinida com sucesso.');
 setResetModalUid(null);
 setResetFormData({ newPassword: '', confirmPassword: '' });
 } else {
 setError(result.error || 'Erro ao redefinir senha.');
 }

 setResetLoading(false);
	}

	function openResetModal(uid: string) {
 setResetModalUid(uid);
 setResetFormData({ newPassword: '', confirmPassword: '' });
 setError('');
 setSuccess('');
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

 {/* Formulário de cadastro com confirmação de senha */}
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
 </div>

 <div>
 <label htmlFor="val-confirm-password" className="mb-1.5 block text-label-sm uppercase tracking-widest text-on-surface-variant">
 Confirmar Senha *
 </label>
 <input
 id="val-confirm-password"
 type="password"
 required
 minLength={8}
 maxLength={128}
 value={formData.confirmPassword}
 onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
 placeholder="Repita a senha"
 className={`w-full rounded-lg border bg-surface-container-low px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 ${
 formData.confirmPassword && formData.password !== formData.confirmPassword
 ? 'border-red-300 focus:border-red-400 focus:ring-red-400'
 : 'border-outline-variant/30 focus:border-tertiary-fixed-dim focus:ring-tertiary-fixed-dim'
 }`}
 />
 {formData.confirmPassword && formData.password !== formData.confirmPassword && (
 <p className="mt-1 text-[10px] text-red-600">As senhas não coincidem.</p>
 )}
 <p className="mt-1 text-[10px] text-on-surface-variant/60">
 A senha será definida via Firebase Authentication e nunca armazenada no banco de dados.
 </p>
 </div>
 </div>

 <div className="mt-6 flex gap-3">
 <button
 type="submit"
 disabled={loading || (formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword)}
 className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-label-md uppercase tracking-widest text-white shadow-md transition-all hover:bg-primary/90 disabled:opacity-60"
 >
 {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
 {loading ? 'Criando...' : 'Criar Validador'}
 </button>
 </div>
 </form>
 )}

 {/* Modal de redefinição de senha */}
 {resetModalUid && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
 <div className="w-full max-w-md rounded-xl bg-surface-container-lowest p-6 shadow-2xl">
 <div className="mb-4 flex items-center justify-between">
 <div className="flex items-center gap-2">
 <KeyRound size={20} className="text-primary" />
 <h3 className="text-title-md text-primary">Redefinir Senha</h3>
 </div>
 <button
 onClick={() => { setResetModalUid(null); setError(''); }}
 className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
 >
 <X size={18} />
 </button>
 </div>

 <p className="mb-4 text-body-sm text-on-surface-variant">
 Defina uma nova senha para o validador. Todas as sessões anteriores serão invalidadas.
 </p>

 <div className="space-y-4">
 <div>
 <label htmlFor="reset-password" className="mb-1.5 block text-label-sm uppercase tracking-widest text-on-surface-variant">
 Nova Senha *
 </label>
 <input
 id="reset-password"
 type="password"
 required
 minLength={8}
 maxLength={128}
 value={resetFormData.newPassword}
 onChange={(e) => setResetFormData(prev => ({ ...prev, newPassword: e.target.value }))}
 placeholder="Mínimo 8 caracteres"
 className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim"
 />
 </div>

 <div>
 <label htmlFor="reset-confirm-password" className="mb-1.5 block text-label-sm uppercase tracking-widest text-on-surface-variant">
 Confirmar Nova Senha *
 </label>
 <input
 id="reset-confirm-password"
 type="password"
 required
 minLength={8}
 maxLength={128}
 value={resetFormData.confirmPassword}
 onChange={(e) => setResetFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
 placeholder="Repita a nova senha"
 className={`w-full rounded-lg border bg-surface-container-low px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 ${
 resetFormData.confirmPassword && resetFormData.newPassword !== resetFormData.confirmPassword
 ? 'border-red-300 focus:border-red-400 focus:ring-red-400'
 : 'border-outline-variant/30 focus:border-tertiary-fixed-dim focus:ring-tertiary-fixed-dim'
 }`}
 />
 {resetFormData.confirmPassword && resetFormData.newPassword !== resetFormData.confirmPassword && (
 <p className="mt-1 text-[10px] text-red-600">As senhas não coincidem.</p>
 )}
 </div>
 </div>

 <div className="mt-6 flex gap-3">
 <button
 onClick={handleResetPassword}
 disabled={resetLoading || (resetFormData.confirmPassword.length > 0 && resetFormData.newPassword !== resetFormData.confirmPassword)}
 className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-label-md uppercase tracking-widest text-white shadow-md transition-all hover:bg-primary/90 disabled:opacity-60"
 >
 {resetLoading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
 {resetLoading ? 'Redefinindo...' : 'Redefinir Senha'}
 </button>
 <button
 onClick={() => { setResetModalUid(null); setError(''); }}
 className="rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-label-md font-medium text-on-surface-variant transition-colors hover:bg-surface-container"
 >
 Cancelar
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Lista de validadores com ações */}
 {validators.length > 0 && (
 <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm">
 <div className="border-b border-outline-variant/10 px-6 py-4">
 <h3 className="text-title-sm text-primary">Validadores Cadastrados</h3>
 </div>
 <div className="divide-y divide-outline-variant/10">
 {validators.map((v) => (
 <div key={v.uid} className="px-6 py-4">
 <div className="flex items-center justify-between">
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-2">
 <p className="truncate text-body-md font-medium text-primary">{v.displayName}</p>
 {v.active ? (
 <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-green-800">
 <UserCheck size={10} /> Ativo
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-800">
 <UserX size={10} /> Inativo
 </span>
 )}
 </div>
 <p className="truncate text-body-xs text-on-surface-variant">{v.email}</p>
 {v.phone && (
 <p className="text-body-xs text-on-surface-variant/60">{v.phone}</p>
 )}
 {v.lastLoginAt && (
 <p className="mt-1 text-[10px] text-on-surface-variant/50">
 Último acesso: {new Date(v.lastLoginAt).toLocaleString('pt-BR')}
 </p>
 )}
 </div>

 <div className="flex shrink-0 items-center gap-2">
 <button
 onClick={() => openResetModal(v.uid)}
 title="Redefinir senha"
 className="rounded-lg p-2 text-on-surface-variant/60 transition-colors hover:bg-surface-container hover:text-primary"
 >
 <KeyRound size={16} />
 </button>
 <button
 onClick={() => handleToggle(v.uid, v.active)}
 disabled={togglingUid === v.uid}
 title={v.active ? 'Desativar' : 'Ativar'}
 className={`rounded-lg p-2 transition-colors disabled:opacity-50 ${
 v.active
 ? 'text-red-600/70 hover:bg-red-50 hover:text-red-700'
 : 'text-green-600/70 hover:bg-green-50 hover:text-green-700'
 }`}
 >
 {togglingUid === v.uid ? (
 <Loader2 size={16} className="animate-spin" />
 ) : v.active ? (
 <UserX size={16} />
 ) : (
 <UserCheck size={16} />
 )}
 </button>
 </div>
 </div>
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
 Redefinir a senha invalida todas as sessões anteriores do validador.
 Desativar um validador impede imediatamente novas operações, mesmo que ele tenha uma sessão aberta.
 </p>
 </div>
 </div>
 </div>
	);
}