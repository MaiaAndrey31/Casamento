'use server';

/**
 * Server Action — Seed/Inicialização do Evento de Casamento
 *
 * Cria o documento do evento no Firestore com dados padrão se não existir.
 * Idempotente: não sobrescreve dados existentes.
 * Requer Admin SDK configurado.
 */

import { initializeEventIfNotExists } from '@/lib/repositories/event.repository';
import { WEDDING_CONFIG } from '@/config/wedding';
import type { WeddingEvent, StoryTimelineItem } from '@/types';
import type { ApiResponse } from '@/types';

export async function seedWeddingEvent(): Promise<ApiResponse<{ created: boolean; eventId: string }>> {
	// Verificar se Admin SDK está configurado
	if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
		return {
			success: false,
			error: 'Firebase Admin SDK não configurado. Adicione FIREBASE_SERVICE_ACCOUNT_JSON ao .env.local.',
		};
	}

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

	const defaults: Partial<WeddingEvent> = {
		coupleNames: WEDDING_CONFIG.coupleNames,
		eventDate: WEDDING_CONFIG.eventDate ?? '',
		timezone: WEDDING_CONFIG.timezone,
		ceremonyTime: WEDDING_CONFIG.ceremonyTime ?? '',
		receptionTime: WEDDING_CONFIG.receptionTime ?? '',
		venueName: WEDDING_CONFIG.venueName ?? '',
		venueAddress: WEDDING_CONFIG.venueAddress ?? '',
		mapsUrl: WEDDING_CONFIG.mapsUrl ?? '',
		wazeUrl: WEDDING_CONFIG.wazeUrl ?? '',
		dressCode: WEDDING_CONFIG.dressCode ?? '',
		rsvpDeadline: WEDDING_CONFIG.rsvpDeadline ?? '',
		rsvpEnabled: WEDDING_CONFIG.rsvpEnabled,
		checkInEnabled: false,
		status: 'draft',
		heroMessage: WEDDING_CONFIG.heroMessage,
		heroVerse: WEDDING_CONFIG.heroVerse,
		heroVerseReference: WEDDING_CONFIG.heroVerseReference,
		closingMessage: WEDDING_CONFIG.closingMessage,
		closingVerse: '',
		closingVerseReference: WEDDING_CONFIG.closingVerseReference,
		storyTitle: WEDDING_CONFIG.storyTitle,
		storySubtitle: WEDDING_CONFIG.storySubtitle,
		storyFullText: WEDDING_CONFIG.storyFullText,
		storyTimeline: WEDDING_CONFIG.storyTimeline.map((item, index) => ({
			year: item.year,
			label: item.label,
			title: item.title,
			description: item.description,
			imageStoragePath: undefined, // Imagens locais por enquanto
			order: index,
		})) as StoryTimelineItem[],
	};

	const result = await initializeEventIfNotExists(eventId, defaults);

	if (result.error) {
		return { success: false, error: result.error };
	}

	return {
		success: true,
		data: { created: result.created, eventId },
		message: result.created
			? 'Evento criado com sucesso no Firestore.'
			: 'Evento já existe no Firestore. Nenhum dado foi sobrescrito.',
	};
}