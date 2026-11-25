/**
 * Auditoria SOMENTE LEITURA de identidade de acompanhantes no Firestore.
 *
 * Uso: node scripts/audit-companion-identity.mjs [termoDeBusca]
 *
 * Este script NUNCA escreve, cria, atualiza ou exclui documentos.
 * Ele apenas imprime um relatório estruturado para investigação.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import admin from 'firebase-admin';

const ROOT = resolve(process.cwd());
const SEARCH_TERM = (process.argv[2] || 'adriano').toLocaleLowerCase('pt-BR');

function loadCredentials() {
	const env = readFileSync(resolve(ROOT, '.env.local'), 'utf-8');
	const credMatch = env.match(/^GOOGLE_APPLICATION_CREDENTIALS=(.+)$/m);
	const eventMatch = env.match(/^NEXT_PUBLIC_EVENT_ID=(.+)$/m);
	const eventId = (eventMatch?.[1] || '').trim().replace(/^["']|["']$/g, '') || 'casamento-andrey-amanda';

	if (!credMatch) throw new Error('GOOGLE_APPLICATION_CREDENTIALS ausente em .env.local');
	const credPath = resolve(ROOT, credMatch[1].trim().replace(/^["']|["']$/g, ''));
	return { serviceAccount: JSON.parse(readFileSync(credPath, 'utf-8')), eventId };
}

function normalize(value) {
	return String(value || '')
		.toLocaleLowerCase('pt-BR')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.trim();
}

function iso(value) {
	if (!value) return null;
	if (typeof value.toDate === 'function') return value.toDate().toISOString();
	if (value instanceof Date) return value.toISOString();
	return String(value);
}

const { serviceAccount, eventId } = loadCredentials();
const app = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const eventRef = db.collection('events').doc(eventId);

async function readAll(name) {
	const snap = await eventRef.collection(name).get();
	return snap.docs.map(doc => ({ id: doc.id, data: doc.data() || {} }));
}

const [rsvps, guests, invitations, assignments, checkins, specialParticipants] = await Promise.all([
	readAll('rsvps'),
	readAll('guests'),
	readAll('invitations'),
	readAll('tableAssignments'),
	readAll('checkins'),
	readAll('specialParticipants'),
]);

const guestById = new Map(guests.map(g => [g.id, g]));
const invitationById = new Map(invitations.map(i => [i.id, i]));

// 1. RSVPs cujos companions batem com o termo buscado
const matchingRsvps = rsvps
	.filter(r => (Array.isArray(r.data.companions) ? r.data.companions : [])
		.some(c => normalize(c?.name).includes(normalize(SEARCH_TERM))))
	.map(r => ({
		rsvpId: r.id,
		invitationId: r.data.invitationId || r.id,
		attendanceStatus: r.data.attendanceStatus,
		submittedAt: iso(r.data.submittedAt),
		updatedAt: iso(r.data.updatedAt),
		revision: r.data.revision,
		companions: (r.data.companions || []).map(c => ({
			name: c?.name,
			participantId: c?.participantId || null,
			isMinor: Boolean(c?.isMinor),
			age: c?.age ?? null,
		})),
	}));

// 2. Guests com o termo no nome
const matchingGuests = guests
	.filter(g => normalize(g.data.fullName).includes(normalize(SEARCH_TERM)))
	.map(g => ({
		guestId: g.id,
		fullName: g.data.fullName,
		active: g.data.active,
		invitationId: g.data.invitationId || null,
	}));

// 3. Atribuições com o termo no nome
const matchingAssignments = assignments
	.filter(a => normalize(a.data.participantName).includes(normalize(SEARCH_TERM)))
	.map(a => ({
		assignmentId: a.id,
		tableId: a.data.tableId,
		invitationId: a.data.invitationId,
		participantId: a.data.participantId,
		participantName: a.data.participantName,
		participantType: a.data.participantType,
		assignedAt: iso(a.data.assignedAt),
	}));

// 4. Check-ins com o termo no nome ou do mesmo convite
const matchingRsvpInvitationIds = new Set(matchingRsvps.map(r => r.invitationId));
const matchingCheckins = checkins
	.filter(c => normalize(c.data.participantName).includes(normalize(SEARCH_TERM))
		|| matchingRsvpInvitationIds.has(c.data.invitationId))
	.map(c => ({
		checkinId: c.id,
		invitationId: c.data.invitationId,
		guestId: c.data.guestId || null,
		participantId: c.data.participantId || null,
		participantName: c.data.participantName || null,
		checkedInAt: iso(c.data.checkedInAt),
	}));

// 5. TODOS os companions sem participantId (confirmados ou não)
const companionsWithoutId = rsvps.flatMap(r => {
	const list = Array.isArray(r.data.companions) ? r.data.companions : [];
	return list
		.filter(c => c && !c.participantId)
		.map(c => ({
			rsvpId: r.id,
			invitationId: r.data.invitationId || r.id,
			attendanceStatus: r.data.attendanceStatus,
			submittedAt: iso(r.data.submittedAt),
			name: c.name,
			index: list.indexOf(c),
			hasAssignment: assignments.some(a => a.data.participantType === 'companion'
				&& normalize(a.data.participantName) === normalize(c.name)
				&& (a.data.invitationId === (r.data.invitationId || r.id))),
		}));
});

// 6. Convites relacionados
const relatedInvitationIds = new Set([
	...matchingRsvps.map(r => r.invitationId),
	...matchingGuests.map(g => g.invitationId).filter(Boolean),
]);
const relatedInvitations = [...relatedInvitationIds].map(id => {
	const inv = invitationById.get(id);
	if (!inv) return { invitationId: id, exists: false };
	return {
		invitationId: id,
		exists: true,
		guestIds: inv.data.guestIds || [],
		maxCompanions: inv.data.maxCompanions ?? null,
		invitationStatus: inv.data.invitationStatus ?? null,
		createdAt: iso(inv.data.createdAt),
		guestNames: (inv.data.guestIds || []).map(gid => guestById.get(gid)?.data?.fullName || gid),
	};
});

// 7. Integridade global e disponibilidade (espelha listAvailableParticipants)
const isValidId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(value);
const confirmedRsvps = rsvps.filter(r => r.data.attendanceStatus === 'confirmed');
const activeInvitationIds = new Set(
	invitations.filter(i => i.data.invitationStatus === 'active').map(i => i.id),
);
const allCompanions = confirmedRsvps.flatMap(r =>
	(Array.isArray(r.data.companions) ? r.data.companions : []).map((c, index) => ({
		rsvpId: r.id,
		index,
		name: c?.name || 'Acompanhante',
		participantId: c?.participantId || null,
	})),
);
const companionsWithValidId = allCompanions.filter(c => isValidId(c.participantId));
const companionsWithInvalidId = allCompanions.filter(c => !isValidId(c.participantId));

const ownersById = new Map();
for (const companion of companionsWithValidId) {
	if (!ownersById.has(companion.participantId)) ownersById.set(companion.participantId, []);
	ownersById.get(companion.participantId).push(companion);
}
const identityConflicts = [...ownersById.entries()]
	.filter(([, owners]) => new Set(owners.map(o => o.rsvpId)).size > 1)
	.map(([participantId, owners]) => ({ participantId, owners }));

const assignmentsByParticipantId = new Map();
for (const assignment of assignments) {
	const id = assignment.data.participantId;
	if (!id) continue;
	if (!assignmentsByParticipantId.has(id)) assignmentsByParticipantId.set(id, []);
	assignmentsByParticipantId.get(id).push(assignment);
}
const duplicateAssignments = [...assignmentsByParticipantId.entries()]
	.filter(([, list]) => list.length > 1)
	.map(([participantId, list]) => ({
		participantId,
		assignments: list.map(a => ({
			assignmentId: a.id,
			tableId: a.data.tableId,
			participantName: a.data.participantName,
		})),
	}));

const knownParticipantIds = new Set([
	...guests.map(g => g.id),
	...companionsWithValidId.map(c => c.participantId),
	...specialParticipants.map(s => s.id),
]);
const orphanAssignments = assignments
	.filter(a => a.data.participantId && !knownParticipantIds.has(a.data.participantId))
	.map(a => ({
		assignmentId: a.id,
		tableId: a.data.tableId,
		participantId: a.data.participantId,
		participantName: a.data.participantName,
	}));

const assignedIds = new Set(assignments.map(a => a.data.participantId).filter(Boolean));
const available = [];
for (const rsvp of confirmedRsvps) {
	if (!activeInvitationIds.has(rsvp.id)) continue;
	const invitation = invitationById.get(rsvp.id);
	const guestIds = Array.isArray(invitation?.data?.guestIds) ? invitation.data.guestIds : [];

	for (const guestId of guestIds) {
		if (assignedIds.has(guestId)) continue;
		const guest = guestById.get(guestId);
		if (!guest || guest.data.active === false) continue;
		available.push({
			participantId: guestId,
			participantName: guest.data.fullName || 'Desconhecido',
			participantType: 'titular',
			invitationId: rsvp.id,
			pendingReconciliation: false,
		});
	}

	for (const companion of (Array.isArray(rsvp.data.companions) ? rsvp.data.companions : [])) {
		if (!companion?.participantId) {
			available.push({
				participantId: '',
				participantName: companion?.name || 'Acompanhante',
				participantType: 'companion',
				invitationId: rsvp.id,
				pendingReconciliation: true,
			});
			continue;
		}
		if (assignedIds.has(companion.participantId)) continue;
		available.push({
			participantId: companion.participantId,
			participantName: companion.name || 'Acompanhante',
			participantType: 'companion',
			invitationId: rsvp.id,
			pendingReconciliation: false,
		});
	}
}
for (const special of specialParticipants) {
	if (special.data.active !== true || assignedIds.has(special.id)) continue;
	available.push({
		participantId: special.id,
		participantName: special.data.fullName || '',
		participantType: 'special',
		invitationId: `__special_${special.id}`,
		pendingReconciliation: false,
	});
}

console.log(JSON.stringify({
	eventId,
	projeto: app.options.projectId,
	modo: 'SOMENTE LEITURA (nenhuma escrita executada)',
	termoBuscado: SEARCH_TERM,
	totais: {
		rsvps: rsvps.length,
		rsvpsConfirmados: confirmedRsvps.length,
		guests: guests.length,
		invitations: invitations.length,
		assignments: assignments.length,
		checkins: checkins.length,
		companions: allCompanions.length,
		companionsComIdValido: companionsWithValidId.length,
		companionsSemIdValido: companionsWithInvalidId.length,
		conflitosDeIdentidade: identityConflicts.length,
		atribuicoesDuplicadas: duplicateAssignments.length,
		atribuicoesOrfas: orphanAssignments.length,
		disponiveis: available.length,
		pendenciasNaListagem: available.filter(p => p.pendingReconciliation).length,
	},
	integridade: {
		identityConflicts,
		duplicateAssignments,
		orphanAssignments,
	},
	companionsSemIdValido: companionsWithInvalidId,
	disponiveis: available,
	matchingGuests,
	matchingRsvps,
	relatedInvitations,
	matchingAssignments,
	matchingCheckins,
	companionsWithoutId,
}, null, 2));

await app.delete();
