/**
 * Diretório de Participantes — Fonte Única de Verdade do módulo de mesas.
 *
 * RESPONSABILIDADES
 * - Definir quem é elegível: titulares confirmados, acompanhantes com ID
 *   persistente e participantes especiais ativos.
 * - Definir disponibilidade pela existência de atribuição para o participantId.
 * - Fornecer diagnóstico explícito de atribuições órfãs/duplicadas.
 *
 * REGRAS
 * - Somente leitura: nenhuma escrita, nenhuma geração de UUID, nenhuma migração.
 * - Identidade é sempre o participantId; nomes nunca são usados como chave.
 * - Participantes especiais NÃO exigem invitationId.
 * - Atribuições legadas sem participantSource são tratadas como RSVP.
 * - Companions sem ID aparecem sinalizados (pendingReconciliation) apenas para
 *   diagnóstico excepcional; não entram na contagem de elegíveis.
 */

import type { AvailableParticipant, SpecialParticipantCategory } from '@/types';
import { isValidParticipantId } from '@/lib/checkin/participant-ids';

const ASSIGNMENTS = 'tableAssignments';
const RSVPS = 'rsvps';
const INVITATIONS = 'invitations';
const GUESTS = 'guests';
const SPECIALS = 'specialParticipants';

function normalizeSearch(value: string): string {
	return String(value || '')
		.toLocaleLowerCase('pt-BR')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.trim();
}

async function readCollection(eventId: string, name: string) {
	const { adminDb } = await import('@/lib/firebase/admin');
	const snap = await adminDb.collection('events').doc(eventId).collection(name).get();
	return snap.docs.map(doc => ({ id: doc.id, data: (doc.data() || {}) as Record<string, unknown> }));
}

/** Participantes elegíveis, independentemente de já estarem atribuídos. */
export async function listEligibleParticipants(
	eventId: string,
	searchTerm?: string,
): Promise<AvailableParticipant[]> {
	const [invitations, guests, rsvps, specials] = await Promise.all([
		readCollection(eventId, INVITATIONS),
		readCollection(eventId, GUESTS),
		readCollection(eventId, RSVPS),
		readCollection(eventId, SPECIALS),
	]);

	const activeInvitationIds = new Set(
		invitations.filter(i => i.data.invitationStatus === 'active').map(i => i.id),
	);
	const guestById = new Map(guests.map(g => [g.id, g.data]));
	const normalizedSearch = searchTerm ? normalizeSearch(searchTerm) : '';
	const eligible: AvailableParticipant[] = [];

	const push = (participant: AvailableParticipant) => {
		if (normalizedSearch && !normalizeSearch(participant.participantName).includes(normalizedSearch)) return;
		eligible.push(participant);
	};

	for (const rsvp of rsvps) {
		if (!activeInvitationIds.has(rsvp.id)) continue;
		if (rsvp.data.attendanceStatus !== 'confirmed') continue;

		const invitation = invitations.find(i => i.id === rsvp.id);
		const guestIds = Array.isArray(invitation?.data.guestIds) ? invitation!.data.guestIds as string[] : [];

		for (const guestId of guestIds) {
			const guest = guestById.get(guestId);
			if (!guest || guest.active === false) continue;
			push({
				participantId: guestId,
				participantName: String(guest.fullName || 'Convidado'),
				participantType: 'titular',
				invitationId: rsvp.id,
				rsvpStatus: 'confirmed',
				participantSource: 'rsvp',
			});
		}

		const companions = Array.isArray(rsvp.data.companions) ? rsvp.data.companions as Array<Record<string, unknown>> : [];
		for (const companion of companions) {
			const name = String(companion.name || 'Acompanhante');
			const id = typeof companion.participantId === 'string' ? companion.participantId : '';
			push({
				participantId: isValidParticipantId(id) ? id : '',
				participantName: name,
				participantType: 'companion',
				invitationId: rsvp.id,
				rsvpStatus: 'confirmed',
				participantSource: 'rsvp',
				pendingReconciliation: !isValidParticipantId(id),
			});
		}
	}

	// Leitura ordenada em memória: evita índice composto active+fullName,
	// que não existe em produção e fazia a query falhar silenciosamente.
	for (const special of specials) {
		if (special.data.active !== true) continue;
		push({
			participantId: special.id,
			participantName: String(special.data.fullName || ''),
			participantType: 'special',
			invitationId: '',
			rsvpStatus: 'special',
			participantSource: 'special',
			specialCategory: (special.data.category || 'other') as SpecialParticipantCategory,
		});
	}

	return eligible.sort((a, b) =>
		normalizeSearch(a.participantName).localeCompare(normalizeSearch(b.participantName)),
	);
}

export interface AssignmentDiagnostics {
	assignedIds: Set<string>;
	assignmentsByParticipantId: Map<string, number>;
	duplicateCount: number;
	orphanCount: number;
}

/** Diagnóstico de atribuições — nunca remove ou corrige dados automaticamente. */
export async function getAssignmentDiagnostics(eventId: string): Promise<AssignmentDiagnostics> {
	const [assignments, eligible] = await Promise.all([
		readCollection(eventId, ASSIGNMENTS),
		listEligibleParticipants(eventId),
	]);

	const assignedIds = new Set<string>();
	const assignmentsByParticipantId = new Map<string, number>();
	let duplicateCount = 0;

	for (const assignment of assignments) {
		const id = typeof assignment.data.participantId === 'string' ? assignment.data.participantId : '';
		if (!id) continue;
		assignedIds.add(id);
		const count = (assignmentsByParticipantId.get(id) || 0) + 1;
		assignmentsByParticipantId.set(id, count);
		if (count === 2) duplicateCount++;
	}

	const eligibleIds = new Set(
		eligible.filter(p => !p.pendingReconciliation).map(p => p.participantId),
	);
	const orphanCount = [...assignmentsByParticipantId.keys()].filter(id => !eligibleIds.has(id)).length;

	return { assignedIds, assignmentsByParticipantId, duplicateCount, orphanCount };
}

/** Participantes efetivamente disponíveis (elegíveis sem atribuição válida). */
export async function listAvailableParticipants(
	eventId: string,
	searchTerm?: string,
): Promise<AvailableParticipant[]> {
	const [eligible, diagnostics] = await Promise.all([
		listEligibleParticipants(eventId, searchTerm),
		getAssignmentDiagnostics(eventId),
	]);

	return eligible.map(participant => ({
		...participant,
		alreadyAssigned: diagnostics.assignedIds.has(participant.participantId),
	})).filter(participant => !participant.alreadyAssigned);
}

/** Somente participantes especiais ativos e sem atribuição. */
export async function listAvailableSpecialParticipants(
	eventId: string,
	searchTerm?: string,
): Promise<AvailableParticipant[]> {
	const available = await listAvailableParticipants(eventId, searchTerm);
	return available.filter(p => p.participantSource === 'special');
}

/** Contagens consistentes com a disponibilidade exibida no modal. */
export async function getParticipantCounts(eventId: string) {
	const [eligible, diagnostics] = await Promise.all([
		listEligibleParticipants(eventId),
		getAssignmentDiagnostics(eventId),
	]);

	const countable = eligible.filter(p => !p.pendingReconciliation);
	const withTable = countable.filter(p => diagnostics.assignedIds.has(p.participantId)).length;
	const pendingIdentityCompanions = eligible.filter(p => p.pendingReconciliation).length;

	return {
		eligibleParticipants: countable.length,
		participantsWithTable: withTable,
		participantsWithoutTable: countable.length - withTable,
		orphanAssignments: diagnostics.orphanCount,
		duplicateAssignments: diagnostics.duplicateCount,
		pendingIdentityCompanions,
		assignedIds: diagnostics.assignedIds,
	};
}
