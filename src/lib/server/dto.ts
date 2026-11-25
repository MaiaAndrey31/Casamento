/**
 * DTOs (Data Transfer Objects) — Contratos Serializáveis
 *
 * Estes tipos definem EXATAMENTE quais campos podem atravessar a fronteira
 * Server Component → Client Component. NENHUM documento bruto do Firestore
 * deve ser passado diretamente; sempre use um mapper para converter.
 *
 * REGRAS:
 * 1. Todos os timestamps são strings ISO 8601
 * 2. Nenhum campo privado/sensível (tokenHash, encryptedToken, etc.)
 * 3. Campos opcionais usam `| null` explícito
 * 4. Cada DTO tem um mapper correspondente neste módulo
 */

import { serializeFirestoreDoc } from './firestore-serializer';

// ============================================================================
// EVENT SETTINGS DTO
// ============================================================================

export interface EventSettingsDTO {
	id: string;
	coupleNames: string;
	eventDate: string | null;
	timezone: string;
	ceremonyTime: string;
	receptionTime: string | null;
	venueName: string | null;
	venueAddress: string | null;
	mapsUrl: string | null;
	wazeUrl: string | null;
	dressCode: string | null;
	rsvpDeadline: string | null;
	rsvpEnabled: boolean;
	checkInEnabled: boolean;
	heroMessage: string | null;
	heroVerse: string | null;
	heroVerseReference: string | null;
	closingMessage: string | null;
	closingVerse: string | null;
	closingVerseReference: string | null;
	closingSignature: string | null;
	status: string;
	createdAt: string | null;
	updatedAt: string | null;
}

/**
 * Converte documento bruto do Firestore para EventSettingsDTO serializável.
 * Seleciona APENAS os campos permitidos e normaliza tipos.
 */
export function toEventSettingsDTO(docId: string, data: Record<string, unknown>): EventSettingsDTO {
	const s = serializeFirestoreDoc<Record<string, unknown>>(docId, data);
	return {
		id: docId,
		coupleNames: String(s.coupleNames || ''),
		eventDate: (s.eventDate as string) || null,
		timezone: String(s.timezone || 'America/Sao_Paulo'),
		ceremonyTime: String(s.ceremonyTime || ''),
		receptionTime: (s.receptionTime as string) || null,
		venueName: (s.venueName as string) || null,
		venueAddress: (s.venueAddress as string) || null,
		mapsUrl: (s.mapsUrl as string) || null,
		wazeUrl: (s.wazeUrl as string) || null,
		dressCode: (s.dressCode as string) || null,
		rsvpDeadline: (s.rsvpDeadline as string) || null,
		rsvpEnabled: Boolean(s.rsvpEnabled),
		checkInEnabled: Boolean(s.checkInEnabled),
		heroMessage: (s.heroMessage as string) || null,
		heroVerse: (s.heroVerse as string) || null,
		heroVerseReference: (s.heroVerseReference as string) || null,
		closingMessage: (s.closingMessage as string) || null,
		closingVerse: (s.closingVerse as string) || null,
		closingVerseReference: (s.closingVerseReference as string) || null,
		closingSignature: (s.closingSignature as string) || null,
		status: String(s.status || 'draft'),
		createdAt: (s.createdAt as string) || null,
		updatedAt: (s.updatedAt as string) || null,
	};
}

// ============================================================================
// GUEST DTO
// ============================================================================

export interface GuestDTO {
	id: string;
	eventId: string;
	fullName: string;
	normalizedName: string;
	phone: string;
	email: string | null;
	category: string;
	group: string | null;
	notes: string | null;
	isPrimaryGuest: boolean;
	maxCompanions: number;
	invitationId: string | null;
	active: boolean;
	createdAt: string | null;
	updatedAt: string | null;
}

/**
 * Converte documento bruto do Firestore para GuestDTO serializável.
 * NÃO expõe dados sensíveis.
 */
export function toGuestDTO(docId: string, data: Record<string, unknown>): GuestDTO {
	const s = serializeFirestoreDoc<Record<string, unknown>>(docId, data);
	return {
		id: docId,
		eventId: String(s.eventId || ''),
		fullName: String(s.fullName || ''),
		normalizedName: String(s.normalizedName || ''),
		phone: String(s.phone || ''),
		email: (s.email as string) || null,
		category: String(s.category || ''),
		group: (s.group as string) || null,
		notes: (s.notes as string) || null,
		isPrimaryGuest: Boolean(s.isPrimaryGuest),
		maxCompanions: Number(s.maxCompanions || 0),
		invitationId: (s.invitationId as string) || null,
		active: Boolean(s.active),
		createdAt: (s.createdAt as string) || null,
		updatedAt: (s.updatedAt as string) || null,
	};
}

// ============================================================================
// INVITATION PUBLIC DTO (sem tokens/hash)
// ============================================================================

export interface InvitationPublicDTO {
	id: string;
	displayName: string;
	maxCompanions: number;
	category: string;
	invitationStatus: string;
	createdAt: string | null;
}

/**
 * Converte documento bruto do Firestore para InvitationPublicDTO.
 * REMOVE campos sensíveis: tokenHash, encryptedToken, checkInTokenHash, guestIds.
 */
export function toInvitationPublicDTO(docId: string, data: Record<string, unknown>): InvitationPublicDTO {
	const s = serializeFirestoreDoc<Record<string, unknown>>(docId, data);
	return {
		id: docId,
		displayName: String(s.displayName || ''),
		maxCompanions: Number(s.maxCompanions || 0),
		category: String(s.category || ''),
		invitationStatus: String(s.invitationStatus || 'active'),
		createdAt: (s.createdAt as string) || null,
	};
}

// ============================================================================
// RSVP DTO
// ============================================================================

export interface RSVPDTO {
	id: string;
	eventId: string;
	invitationId: string;
	attendanceStatus: string;
	companions: Array<{ name: string; isMinor: boolean; age?: number; participantId?: string }>;
	dietaryRestrictions: string[];
	songSuggestion: string;
	personalMessage: string;
	submittedAt: string | null;
	updatedAt: string | null;
}

export function toRSVPDTO(docId: string, data: Record<string, unknown>): RSVPDTO {
	const s = serializeFirestoreDoc<Record<string, unknown>>(docId, data);
	return {
		id: docId,
		eventId: String(s.eventId || ''),
		invitationId: String(s.invitationId || ''),
		attendanceStatus: String(s.attendanceStatus || 'pending'),
		companions: Array.isArray(s.companions) ? s.companions as RSVPDTO['companions'] : [],
		dietaryRestrictions: Array.isArray(s.dietaryRestrictions) ? s.dietaryRestrictions as string[] : [],
		songSuggestion: String(s.songSuggestion || ''),
		personalMessage: String(s.personalMessage || ''),
		submittedAt: (s.submittedAt as string) || null,
		updatedAt: (s.updatedAt as string) || null,
	};
}

// ============================================================================
// MESSAGE DTO
// ============================================================================

export interface MessageDTO {
	id: string;
	eventId: string;
	authorName: string;
	message: string;
	moderationStatus: string;
	createdAt: string | null;
}

export function toMessageDTO(docId: string, data: Record<string, unknown>): MessageDTO {
	const s = serializeFirestoreDoc<Record<string, unknown>>(docId, data);
	return {
		id: docId,
		eventId: String(s.eventId || ''),
		authorName: String(s.authorName || ''),
		message: String(s.message || ''),
		moderationStatus: String(s.moderationStatus || 'pending'),
		createdAt: (s.createdAt as string) || null,
	};
}