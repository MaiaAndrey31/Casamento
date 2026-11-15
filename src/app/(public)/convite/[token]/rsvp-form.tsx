'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle, XCircle, Plus, Trash2, Music, MessageSquareHeart, UtensilsCrossed } from 'lucide-react';
import { rsvpFormSchema } from '@/lib/validators/rsvp.schema';
import { submitRsvpAction } from '@/app/actions/submit-rsvp.action';
import { DigitalCard } from './digital-card';

interface RsvpFormProps {
	invitationId: string;
	eventId: string;
	displayName: string;
	maxCompanions: number;
	guests: Array<{ id: string; fullName: string; isPrimaryGuest: boolean }>;
}

// Tipo explícito para evitar conflito entre Zod .default() e useForm inference
type RSVPFormData = {
	invitationId: string;
	fullName: string;
	phone: string;
	attendanceStatus: 'confirmed' | 'declined';
	companions: Array<{ name: string; isMinor: boolean; age?: number }>;
	dietaryRestrictions: string[];
	songSuggestion: string;
	personalMessage: string;
};

/**
 * Formulário RSVP — Componente client-side conectado à Server Action.
 *
 * Permite confirmar presença, adicionar acompanhantes (dentro do limite),
 * informar restrições alimentares, sugerir música e deixar mensagem pessoal.
 * Após sucesso, exibe o cartão digital com QR Code.
 */
export function RsvpForm({ invitationId, eventId, displayName, maxCompanions, guests }: RsvpFormProps) {
	const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
	const [errorMessage, setErrorMessage] = useState('');
	const [checkInToken, setCheckInToken] = useState('');

	const form = useForm<RSVPFormData>({
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 resolver: zodResolver(rsvpFormSchema) as any,
 defaultValues: {
 invitationId,
 fullName: guests.find(g => g.isPrimaryGuest)?.fullName || displayName,
 phone: '',
 attendanceStatus: undefined as unknown as 'confirmed' | 'declined',
 companions: [],
 dietaryRestrictions: [],
 songSuggestion: '',
 personalMessage: '',
 },
	});

	const { fields, append, remove } = useFieldArray({
 control: form.control,
 name: 'companions',
	});

	const canAddCompanion = fields.length < maxCompanions;
	const attendanceStatus = form.watch('attendanceStatus');

	async function onSubmit(data: RSVPFormData) {
 setSubmitStatus('loading');
 setErrorMessage('');

 const result = await submitRsvpAction(eventId, data);

 if (result.success) {
 setSubmitStatus('success');
 // Armazenar checkInToken retornado pelo servidor para gerar QR Code seguro
 if (result.data?.checkInToken) {
 setCheckInToken(result.data.checkInToken);
 }
 } else {
 setSubmitStatus('error');
 setErrorMessage(result.error || 'Falha ao enviar confirmação. Tente novamente.');
 }
	}

	// Se já confirmou, exibir cartão digital
	if (submitStatus === 'success') {
 return (
 <DigitalCard
 displayName={displayName}
 attendanceStatus={form.getValues('attendanceStatus')}
 confirmedGuests={[
 form.getValues('fullName'),
 ...form.getValues('companions').map(c => c.name),
 ]}
 checkInToken={checkInToken}
 />
 );
	}

	return (
 <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-space-md">
 {/* Status de presença */}
 <fieldset>
 <legend className="mb-space-sm text-label-md uppercase tracking-widest text-on-surface-variant">
 Você poderá comparecer?
 </legend>
 <div className="grid grid-cols-2 gap-3">
 <button
 type="button"
 onClick={() => form.setValue('attendanceStatus', 'confirmed', { shouldValidate: true })}
 className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-4 text-body-md font-medium transition-all ${
 attendanceStatus === 'confirmed'
 ? 'border-primary-container bg-primary-container text-tertiary-fixed shadow-md'
 : 'border-outline-variant/30 bg-surface-container-low text-on-surface hover:border-secondary hover:bg-secondary-container/30'
 }`}
 >
 <CheckCircle size={18} />
 Sim, estarei lá!
 </button>
 <button
 type="button"
 onClick={() => form.setValue('attendanceStatus', 'declined', { shouldValidate: true })}
 className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-4 text-body-md font-medium transition-all ${
 attendanceStatus === 'declined'
 ? 'border-error bg-error-container text-on-error-container shadow-md'
 : 'border-outline-variant/30 bg-surface-container-low text-on-surface hover:border-error/50 hover:bg-error-container/30'
 }`}
 >
 <XCircle size={18} />
 Não poderei ir
 </button>
 </div>
 {form.formState.errors.attendanceStatus && (
 <p className="mt-space-xs text-body-sm text-error">{form.formState.errors.attendanceStatus.message}</p>
 )}
 </fieldset>

 {/* Campos visíveis apenas se confirmado */}
 {attendanceStatus === 'confirmed' && (
 <>
 {/* Telefone */}
 <div>
 <label htmlFor="phone" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
 Telefone / WhatsApp
 </label>
 <input
 id="phone"
 type="tel"
 placeholder="(11) 98765-4321"
 {...form.register('phone')}
 className="w-full rounded-md border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
 />
 {form.formState.errors.phone && (
 <p className="mt-space-xs text-body-sm text-error">{form.formState.errors.phone.message}</p>
 )}
 </div>

 {/* Acompanhantes */}
 {maxCompanions > 0 && (
 <div>
 <label className="mb-space-sm block text-label-md uppercase tracking-widest text-on-surface-variant">
 Acompanhantes ({fields.length}/{maxCompanions})
 </label>
 <div className="space-y-space-sm">
 {fields.map((field, index) => (
 <div key={field.id} className="flex items-center gap-2">
 <input
 type="text"
 placeholder={`Nome do acompanhante ${index + 1}`}
 {...form.register(`companions.${index}.name`)}
 className="flex-1 rounded-md border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
 />
 <button
 type="button"
 onClick={() => remove(index)}
 className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-error/30 text-error transition-colors hover:bg-error-container/30"
 aria-label="Remover acompanhante"
 >
 <Trash2 size={16} />
 </button>
 </div>
 ))}
 </div>
 {canAddCompanion && (
 <button
 type="button"
 onClick={() => append({ name: '', isMinor: false })}
 className="mt-space-sm inline-flex items-center gap-2 text-label-md uppercase tracking-widest text-primary underline decoration-tertiary-fixed-dim underline-offset-4 transition-colors hover:text-secondary"
 >
 <Plus size={14} /> Adicionar acompanhante
 </button>
 )}
 </div>
 )}

 {/* Restrições alimentares */}
 <div>
 <label htmlFor="dietaryInput" className="mb-space-xs flex items-center gap-2 text-label-md uppercase tracking-widest text-on-surface-variant">
 <UtensilsCrossed size={14} />
 Restrições alimentares (opcional)
 </label>
 <input
 id="dietaryInput"
 type="text"
 placeholder="Ex: vegetariano, sem glúten, alergia a amendoim..."
 onChange={(e) => form.setValue('dietaryRestrictions', e.target.value ? [e.target.value] : [])}
 className="w-full rounded-md border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
 />
 </div>

 {/* Sugestão musical */}
 <div>
 <label htmlFor="songSuggestion" className="mb-space-xs flex items-center gap-2 text-label-md uppercase tracking-widest text-on-surface-variant">
 <Music size={14} />
 Sugestão de música (opcional)
 </label>
 <input
 id="songSuggestion"
 type="text"
 maxLength={300}
 placeholder="Qual música não pode faltar na festa?"
 {...form.register('songSuggestion')}
 className="w-full rounded-md border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
 />
 </div>

 {/* Mensagem pessoal */}
 <div>
 <label htmlFor="personalMessage" className="mb-space-xs flex items-center gap-2 text-label-md uppercase tracking-widest text-on-surface-variant">
 <MessageSquareHeart size={14} />
 Mensagem para os noivos (opcional)
 </label>
 <textarea
 id="personalMessage"
 rows={3}
 maxLength={1000}
 placeholder="Deixe uma mensagem de carinho para Andrey e Amanda..."
 {...form.register('personalMessage')}
 className="w-full resize-y rounded-md border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
 />
 </div>
 </>
 )}

 {/* Mensagem de erro */}
 {submitStatus === 'error' && (
 <div className="rounded-lg border border-error/30 bg-error-container/20 p-4 text-center">
 <p className="text-body-md text-error">{errorMessage}</p>
 </div>
 )}

 {/* Botão de envio */}
 <button
 type="submit"
 disabled={submitStatus === 'loading'}
 className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary-container px-8 py-4 text-label-md uppercase tracking-widest text-tertiary-fixed shadow-md transition-all hover:bg-secondary hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-tertiary-fixed-dim focus:ring-offset-2 focus:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
 >
 {submitStatus === 'loading' ? (
 <>Enviando...</>
 ) : (
 <>Confirmar presença</>
 )}
 </button>
 </form>
	);
}