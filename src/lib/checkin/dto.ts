/**
 * DTOs de Check-in — Contratos Serializáveis para o Painel do Validador
 *
 * Todos os tipos aqui são seguros para atravessar a fronteira
 * Server Component → Client Component. Nenhum documento bruto
 * do Firestore deve ser passado diretamente.
 */

import { serializeFirestoreDoc } from '@/lib/server/firestore-serializer';
import type { CheckInParticipant } from '@/types';

// ============================================================================
// CHECK-IN PARTICIPANT DTO
// ============================================================================

export interface CheckInParticipantDTO {
	participantId: string;
	name: string;
	type: 'titular' | 'companion';
	isMinor: boolean;
	age?: number;
	checkedIn: boolean;
	checkedInAt: string | null;
	checkedInBy: string | null;
}

/**
 * Converte um CheckInParticipant para DTO serializável.
 */
export function toCheckInParticipantDTO(p: CheckInParticipant): CheckInParticipantDTO {
	return {
		participantId: p.participantId,
		name: p.name,
		type: p.type,
		isMinor: Boolean(p.isMinor),
		age: p.age,
		checkedIn: Boolean(p.checkedIn),
		checkedInAt: p.checkedInAt || null,
		checkedInBy: p.checkedInBy || null,
	};
}

// ============================================================================
// INVITATION CHECK-IN SUMMARY DTO
// ============================================================================

export interface InvitationCheckInSummaryDTO {
	invitationId: string;
	displayName: string;
	category: string;
	maxCompanions: number;
	rsvpStatus: string;
	participants: CheckInParticipantDTO[];
	totalConfirmed: number;
	totalCheckedIn: number;
	totalPending: number;
	lastCheckInAt: string | null;
}

/**
 * Constrói o resumo de check-in de um convite a partir de dados já processados.
 * Não acessa o Firestore diretamente — recebe dados serializados.
 */
export function toInvitationCheckInSummaryDTO(data: {
	invitationId: string;
	displayName: string;
	category: string;
	maxCompanions: number;
	rsvpStatus: string;
	participants: CheckInParticipant[];
}): InvitationCheckInSummaryDTO {
	const participants = data.participants.map(toCheckInParticipantDTO);
	const checkedIn = participants.filter(p => p.checkedIn);

	return {
		invitationId: data.invitationId,
		displayName: data.displayName,
		category: data.category,
		maxCompanions: data.maxCompanions,
		rsvpStatus: data.rsvpStatus,
		participants,
		totalConfirmed: participants.length,
		totalCheckedIn: checkedIn.length,
		totalPending: participants.length - checkedIn.length,
		lastCheckInAt: checkedIn.length > 0
			? checkedIn.reduce((latest, p) =>
				(p.checkedInAt && (!latest || p.checkedInAt > latest)) ? p.checkedInAt : latest,
				null as string | null)
			: null,
	};
}

// ============================================================================
// VALIDATOR DTO
// ============================================================================

export interface ValidatorDTO {
	uid: string;
	email: string;
	displayName: string;
	role: string;
	type: string;
	active: boolean;
	createdAt: string | null;
	lastLoginAt: string | null;
}

/**
 * Converte documento bruto do Firestore para ValidatorDTO serializável.
 * REMOVE campos sensíveis (tokens, hashes).
 */
export function toValidatorDTO(docId: string, data: Record<string, unknown>): ValidatorDTO {
	const s = serializeFirestoreDoc<Record<string, unknown>>(docId, data);
	return {
		uid: docId,
		email: String(s.email || ''),
		displayName: String(s.displayName || ''),
		role: String(s.role || 'checkin_operator'),
		type: String(s.type || 'validator'),
		active: Boolean(s.active),
		createdAt: (s.createdAt as string) || null,
		lastLoginAt: (s.lastLoginAt as string) || null,
	};
}

// ============================================================================
// RECEPTION SUMMARY DTO
// ============================================================================

export interface ReceptionSummaryDTO {
	totalInvitations: number;
	totalConfirmedGuests: number;
	totalCheckedIn: number;
	totalPending: number;
	partiallyUsedInvitations: number;
	fullyUsedInvitations: number;
	lastEntries: Array<{
		guestName: string;
		invitationDisplayName: string;
		checkedInAt: string;
	}>;
}