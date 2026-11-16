'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Save, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { updateGuestAction } from '@/app/actions/update-guest.action';

import { GUEST_CATEGORIES } from '@/lib/constants/guest-categories';

interface GuestData {
	id: string;
	fullName: string;
	phone: string;
	email?: string | null;
	category: string;
	group?: string | null;
	notes?: string | null;
	isPrimaryGuest?: boolean;
	invitationId?: string | null;
	maxCompanions?: number;
}

/**
 * Formulário client-side de edição de convidado.
 * Dados pré-carregados pelo server component pai.
 * Preserva todos os valores preenchidos em caso de erro.
 */
export function GuestEditForm({ guest }: { guest: GuestData }) {
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	// Valida se a categoria do convidado está na fonte única de verdade.
	// Se não estiver (categoria legada desconhecida), usa string vazia como fallback.
	const validCategoryValues = GUEST_CATEGORIES.map(c => c.value) as string[];
	const safeCategory = (guest.category && validCategoryValues.includes(guest.category as string))
		? guest.category
		: '';

	const [formData, setFormData] = useState({
		guestId: guest.id,
		fullName: guest.fullName || '',
		phone: guest.phone || '',
		email: guest.email || '',
		category: safeCategory,
		group: guest.group || '',
		notes: guest.notes || '',
		maxCompanions: guest.maxCompanions ?? 0,
	});

	const handleChange = (field: string, value: string | number) => {
		setFormData(prev => ({ ...prev, [field]: value }));
		if (error) setError(null);
		if (success) setSuccess(null);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		// Proteção contra submissão dupla: desabilita imediatamente antes do await
		if (isSubmitting) return;
		setIsSubmitting(true);
		setError(null);
		setSuccess(null);

		try {
			const result = await updateGuestAction(formData);

			if (!result.success) {
				setError(result.error || 'Erro desconhecido ao atualizar convidado.');
				return;
			}

			setSuccess(result.message || 'Convidado atualizado com sucesso!');

			setTimeout(() => {
				router.push('/admin/convidados');
			}, 1500);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.');
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-space-lg">
			{/* Mensagens de feedback */}
			{error && (
				<div className="flex items-start gap-3 rounded-lg border border-error/30 bg-error-container/10 p-4">
					<AlertCircle size={20} className="mt-0.5 shrink-0 text-error" />
					<div>
						<p className="text-body-md font-medium text-error">Erro ao salvar</p>
						<p className="mt-1 text-body-sm text-error/80">{error}</p>
					</div>
				</div>
			)}

			{success && (
				<div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
					<CheckCircle size={20} className="mt-0.5 shrink-0 text-green-700" />
					<p className="text-body-md font-medium text-green-800">{success}</p>
				</div>
			)}

			{/* Dados do convidado */}
			<div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-space-lg shadow-sm">
				<h2 className="mb-space-md text-headline-sm text-primary">Dados do Convidado</h2>

				<div className="grid gap-space-md md:grid-cols-2">
					{/* Nome completo */}
					<div className="md:col-span-2">
						<label htmlFor="fullName" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
							Nome Completo *
						</label>
						<input
							id="fullName"
							type="text"
							required
							value={formData.fullName}
							onChange={(e) => handleChange('fullName', e.target.value)}
							className="w-full rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
						/>
					</div>

					{/* Telefone */}
					<div>
						<label htmlFor="phone" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
							Telefone / WhatsApp *
						</label>
						<input
							id="phone"
							type="tel"
							required
							value={formData.phone}
							onChange={(e) => handleChange('phone', e.target.value)}
							className="w-full rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
						/>
					</div>

					{/* E-mail */}
					<div>
						<label htmlFor="email" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
							E-mail (opcional)
						</label>
						<input
							id="email"
							type="email"
							value={formData.email}
							onChange={(e) => handleChange('email', e.target.value)}
							placeholder="exemplo@email.com"
							className="w-full rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
						/>
					</div>

					{/* Categoria */}
					<div>
						<label htmlFor="category" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
							Categoria *
						</label>
						<select
							id="category"
							required
							value={formData.category}
							onChange={(e) => handleChange('category', e.target.value)}
							className="w-full rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-body-md text-on-surface focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
						>
							<option value="">Selecione uma categoria</option>
							{GUEST_CATEGORIES.map((cat) => (
								<option key={cat.value} value={cat.value}>
									{cat.label}
								</option>
							))}
						</select>
					</div>

					{/* Grupo / Família */}
					<div>
						<label htmlFor="group" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
							Grupo / Família (opcional)
						</label>
						<input
							id="group"
							type="text"
							value={formData.group}
							onChange={(e) => handleChange('group', e.target.value)}
							placeholder="Ex: Família Santos"
							className="w-full rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
						/>
					</div>

					{/* Acompanhantes */}
					<div>
						<label htmlFor="maxCompanions" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
							Acompanhantes Permitidos
						</label>
						<input
							id="maxCompanions"
							type="number"
							min={0}
							max={50}
							value={formData.maxCompanions}
							onChange={(e) => handleChange('maxCompanions', parseInt(e.target.value) || 0)}
							className="w-full rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-body-md text-on-surface focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
						/>
					</div>

					{/* Observações */}
					<div className="md:col-span-2">
						<label htmlFor="notes" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
							Observações Internas (opcional)
						</label>
						<textarea
							id="notes"
							rows={3}
							value={formData.notes}
							onChange={(e) => handleChange('notes', e.target.value)}
							placeholder="Restrições alimentares, necessidades especiais, etc."
							className="w-full resize-none rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
						/>
					</div>
				</div>
			</div>

			{/* Ações */}
			<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
				<Link
					href="/admin/convidados"
					className="inline-flex items-center justify-center gap-2 rounded-md border border-outline-variant/30 bg-surface-container-low px-6 py-3 text-label-md uppercase tracking-widest text-primary transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-tertiary-fixed-dim"
				>
					Cancelar
				</Link>
				<button
					type="submit"
					disabled={isSubmitting}
					className="inline-flex items-center justify-center gap-2 rounded-md bg-primary-container px-8 py-3 text-label-md uppercase tracking-widest text-tertiary-fixed shadow-md transition-all hover:bg-secondary hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-tertiary-fixed-dim focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{isSubmitting ? (
						<>
							<Loader2 size={16} className="animate-spin" />
							Salvando...
						</>
					) : (
						<>
							<Save size={16} />
							Salvar Alterações
						</>
					)}
				</button>
			</div>
		</form>
	);
}