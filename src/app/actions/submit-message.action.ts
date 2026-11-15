'use server';

/**
 * Server Action — Envio de Recados e Orações
 *
 * Valida entrada com Zod, aplica rate limiting e persiste no Firestore.
 * Retorna resposta padronizada sem expor dados internos.
 */

import { messageFormSchema } from '@/lib/validators/rsvp.schema';
import { createMessage, isRateLimited } from '@/lib/repositories/message.repository';
import type { ApiResponse } from '@/types';

export async function submitMessage(
	eventId: string,
	formData: { authorName: string; message: string; invitationId?: string },
): Promise<ApiResponse<{ id: string }>> {
	// 1. Validação Zod
	const validation = messageFormSchema.safeParse(formData);
	if (!validation.success) {
 return {
 success: false,
 error: validation.error.errors.map(e => e.message).join('; '),
 };
	}

	// 2. Rate limiting por nome (proteção básica contra spam)
	const rateLimited = await isRateLimited(eventId, validation.data.authorName, 3);
	if (rateLimited) {
 return {
 success: false,
 error: 'Limite de mensagens excedido. Tente novamente em alguns minutos.',
 };
	}

	// 3. Persistência
	const result = await createMessage(eventId, {
 authorName: validation.data.authorName.trim(),
 message: validation.data.message.trim(),
 invitationId: validation.data.invitationId,
	});

	if (!result.success || !result.id) {
 return {
 success: false,
 error: result.error ?? 'Falha ao enviar mensagem. Tente novamente.',
 };
	}

	return {
 success: true,
 data: { id: result.id },
 message: 'Mensagem enviada com sucesso! Os noivos agradecem pelo carinho.',
	};
}