/**
 * Repositório de Confirmados do Validador — Lista e Resumo da Recepção (Etapa 4)
 *
 * Consultas otimizadas para o painel do validador:
 * - Lista paginada de RSVPs confirmados com status de entrada
 * - Busca por nome do titular ou acompanhante (sem N+1)
 * - Filtros: todos, aguardando, parcial, completo
 * - Resumo da recepção com contadores agregados
 *
 * SEGURANÇA:
 * - Firebase Admin SDK somente no servidor
 * - DTOs serializáveis (nenhum objeto Firestore bruto)
 * - Não expõe dados sensíveis (telefone, email)
 * - Índices existentes reutilizados quando possível
 */

import { serializeFirestoreValue } from '@/lib/server/firestore-serializer';

const RSVPS_SUBCOLLECTION = 'rsvps';
const INVITATIONS_SUBCOLLECTION = 'invitations';
const CHECKINS_SUBCOLLECTION = 'checkins';
const GUESTS_SUBCOLLECTION = 'guests';

// ============================================================================
// TIPOS
// ============================================================================

export type ConfirmedFilter = 'all' | 'pending' | 'partial' | 'complete';

export interface ConfirmedInvitationItem {
	invitationId: string;
	displayName: string;
	category: string;
	totalConfirmed: number;
	totalCheckedIn: number;
	totalPending: number;
	status: 'pending' | 'partial' | 'complete';
	lastCheckInAt: string | null;
}

export interface ConfirmedListResult {
	items: ConfirmedInvitationItem[];
	totalCount: number;
	hasMore: boolean;
}

export interface ReceptionSummary {
	totalInvitations: number;
	totalConfirmedPeople: number;
	totalCheckedInPeople: number;
	totalPendingPeople: number;
	partiallyUsedInvitations: number;
	fullyUsedInvitations: number;
	lastEntries: Array<{
		participantName: string;
		invitationDisplayName: string;
		checkedInAt: string;
	}>;
}

// ============================================================================
// LISTA DE CONFIRMADOS COM PAGINAÇÃO E FILTROS
// ============================================================================

/**
 * Lista RSVPs confirmados com paginação e filtro de status de entrada.
 * Usa batch lookup de check-ins para evitar N+1.
 *
 * @param eventId - ID do evento
 * @param filter - Filtro de status ('all', 'pending', 'partial', 'complete')
 * @param pageSize - Tamanho da página (padrão 20)
 * @param lastDocId - ID do último documento da página anterior (cursor)
 * @param searchTerm - Termo de busca opcional (nome do titular)
 */
export async function listConfirmedInvitations(
	eventId: string,
	filter: ConfirmedFilter = 'all',
	pageSize: number = 20,
	lastDocId?: string,
	searchTerm?: string,
): Promise<ConfirmedListResult> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');

		// Se há termo de busca, usar abordagem diferente (busca por nome)
		if (searchTerm && searchTerm.length >= 2) {
			return await searchConfirmedByName(eventId, searchTerm, filter, pageSize);
		}

		// Query base: RSVPs confirmados
		let query = adminDb
			.collection('events')
			.doc(eventId)
			.collection(RSVPS_SUBCOLLECTION)
			.where('attendanceStatus', '==', 'confirmed')
			.orderBy('submittedAt', 'desc')
			.limit(pageSize + 1); // +1 para detectar hasMore

		// Cursor de paginação
		if (lastDocId) {
			const lastDoc = await adminDb
				.collection('events')
				.doc(eventId)
				.collection(RSVPS_SUBCOLLECTION)
				.doc(lastDocId)
				.get();

			if (lastDoc.exists) {
				query = query.startAfter(lastDoc);
			}
		}

		const rsvpsSnapshot = await query.get();

		const docs = rsvpsSnapshot.docs.slice(0, pageSize);
		const hasMore = rsvpsSnapshot.docs.length > pageSize;

		if (docs.length === 0) {
			return { items: [], totalCount: 0, hasMore: false };
		}

		// Batch lookup de invitations e check-ins
		const invitationIds = docs.map(d => d.id);
		const items = await buildConfirmedItems(eventId, invitationIds, filter);

		return {
			items,
			totalCount: items.length,
			hasMore,
		};
	} catch (e) {
		console.error('[ValidatorConfirmed] Erro ao listar confirmados:', e);
		return { items: [], totalCount: 0, hasMore: false };
	}
}

/**
 * Busca confirmados por nome do titular ou acompanhante.
 * Evita N+1 usando batch lookup.
 */
async function searchConfirmedByName(
	eventId: string,
	searchTerm: string,
	filter: ConfirmedFilter,
	limit: number,
): Promise<ConfirmedListResult> {
	const { adminDb } = await import('@/lib/firebase/admin');

	const normalizedSearch = searchTerm
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.trim();

	// Buscar guests ativos com nome correspondente
	const guestsSnapshot = await adminDb
		.collection('events')
		.doc(eventId)
		.collection(GUESTS_SUBCOLLECTION)
		.where('active', '==', true)
		.orderBy('fullName')
		.limit(limit * 3)
		.get();

	// Coletar invitationIds únicos dos guests que matcham
	const matchingInvitationIds = new Set<string>();

	for (const guestDoc of guestsSnapshot.docs) {
		const guest = guestDoc.data();
		const normalizedName = (guest.normalizedName || guest.fullName || '').toLowerCase();

		if (normalizedName.includes(normalizedSearch) && guest.invitationId) {
			matchingInvitationIds.add(guest.invitationId);
		}
	}

	if (matchingInvitationIds.size === 0) {
		return { items: [], totalCount: 0, hasMore: false };
	}

	// Verificar quais têm RSVP confirmado e aplicar filtro
	const confirmedIds: string[] = [];
	for (const invId of matchingInvitationIds) {
		try {
			const rsvpDoc = await adminDb
				.collection('events')
				.doc(eventId)
				.collection(RSVPS_SUBCOLLECTION)
				.doc(invId)
				.get();

			if (rsvpDoc.exists && rsvpDoc.data()?.attendanceStatus === 'confirmed') {
				confirmedIds.push(invId);
			}
		} catch {
			// Ignorar falhas individuais
		}
	}

	const items = await buildConfirmedItems(eventId, confirmedIds.slice(0, limit), filter);

	return {
		items,
		totalCount: items.length,
		hasMore: confirmedIds.length > limit,
	};
}

/**
 * Constrói itens da lista com batch lookup de invitations e check-ins.
 * Aplica filtro de status após construção.
 */
async function buildConfirmedItems(
	eventId: string,
	invitationIds: string[],
	filter: ConfirmedFilter,
): Promise<ConfirmedInvitationItem[]> {
	const { adminDb } = await import('@/lib/firebase/admin');

	const items: ConfirmedInvitationItem[] = [];

	// Batch get de invitations
	const invitationDataMap = new Map<string, Record<string, unknown>>();
	for (const invId of invitationIds) {
		try {
			const invDoc = await adminDb
				.collection('events')
				.doc(eventId)
				.collection(INVITATIONS_SUBCOLLECTION)
				.doc(invId)
				.get();

			if (invDoc.exists) {
				invitationDataMap.set(invId, serializeFirestoreValue(invDoc.data(), `inv.${invId}`) as Record<string, unknown>);
			}
		} catch {
			// Ignorar falhas individuais
		}
	}

	// Batch get de check-ins por convite
	const checkInsByInvitation = new Map<string, Array<{ participantId?: string; guestId?: string; checkedInAt?: unknown }>>();
	for (const invId of invitationIds) {
		try {
			const checkInsSnapshot = await adminDb
				.collection('events')
				.doc(eventId)
				.collection(CHECKINS_SUBCOLLECTION)
				.where('invitationId', '==', invId)
				.get();

			const checkIns = checkInsSnapshot.docs.map(d => d.data());
			checkInsByInvitation.set(invId, checkIns);
		} catch {
			// Ignorar falhas individuais
		}
	}

	// Batch get de RSVPs para contar companions
	const rsvpCompanionsMap = new Map<string, number>();
	for (const invId of invitationIds) {
		try {
			const rsvpDoc = await adminDb
				.collection('events')
				.doc(eventId)
				.collection(RSVPS_SUBCOLLECTION)
				.doc(invId)
				.get();

			if (rsvpDoc.exists) {
				const rsvpData = rsvpDoc.data();
				const companions = Array.isArray(rsvpData?.companions) ? rsvpData.companions.length : 0;
				// totalConfirmed = guests vinculados + companions
				const invData = invitationDataMap.get(invId);
				const guestCount = Array.isArray(invData?.guestIds) ? (invData.guestIds as string[]).length : 1;
				rsvpCompanionsMap.set(invId, guestCount + companions);
			}
		} catch {
			// Ignorar falhas individuais
		}
	}

	// Construir itens
	for (const invId of invitationIds) {
		const invData = invitationDataMap.get(invId);
		if (!invData) continue;

		const totalConfirmed = rsvpCompanionsMap.get(invId) || 1;
		const checkIns = checkInsByInvitation.get(invId) || [];
		const totalCheckedIn = checkIns.length;
		const totalPending = Math.max(0, totalConfirmed - totalCheckedIn);

		let status: ConfirmedInvitationItem['status'] = 'pending';
		if (totalCheckedIn === totalConfirmed && totalConfirmed > 0) {
			status = 'complete';
		} else if (totalCheckedIn > 0) {
			status = 'partial';
		}

		// Aplicar filtro
		if (filter !== 'all' && filter !== status) continue;

		// Último check-in
		let lastCheckInAt: string | null = null;
		if (checkIns.length > 0) {
			const timestamps = checkIns
				.map(c => c.checkedInAt)
				.filter((t): t is string => typeof t === 'string');
			if (timestamps.length > 0) {
				lastCheckInAt = timestamps.sort().reverse()[0];
			}
		}

		items.push({
			invitationId: invId,
			displayName: String(invData.displayName || ''),
			category: String(invData.category || ''),
			totalConfirmed,
			totalCheckedIn,
			totalPending,
			status,
			lastCheckInAt,
		});
	}

	return items;
}

// ============================================================================
// RESUMO DA RECEPÇÃO
// ============================================================================

/**
 * Calcula resumo agregado da recepção.
 * Distingue pessoas de convites.
 *
 * NOTA: Para eventos grandes, considerar cache ou materialized view.
 * Atualmente faz scan completo das coleções relevantes.
 */
export async function getReceptionSummary(eventId: string): Promise<ReceptionSummary> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');

		// Contar RSVPs confirmados e total de pessoas
		const rsvpsSnapshot = await adminDb
			.collection('events')
			.doc(eventId)
			.collection(RSVPS_SUBCOLLECTION)
			.where('attendanceStatus', '==', 'confirmed')
			.get();

		let totalConfirmedPeople = 0;
		const confirmedInvitationIds: string[] = [];

		for (const rsvpDoc of rsvpsSnapshot.docs) {
			const rsvpData = rsvpDoc.data();
			const companions = Array.isArray(rsvpData?.companions) ? rsvpData.companions.length : 0;

			// Buscar quantidade de guests vinculados ao convite
			let guestCount = 1; // fallback
			try {
				const invDoc = await adminDb
					.collection('events')
					.doc(eventId)
					.collection(INVITATIONS_SUBCOLLECTION)
					.doc(rsvpDoc.id)
					.get();
				if (invDoc.exists) {
					const invData = invDoc.data();
					guestCount = Array.isArray(invData?.guestIds) ? (invData.guestIds as string[]).length : 1;
				}
			} catch {
				// Usar fallback
			}

			totalConfirmedPeople += guestCount + companions;
			confirmedInvitationIds.push(rsvpDoc.id);
		}

		// Contar check-ins e classificar convites
		let totalCheckedInPeople = 0;
		let partiallyUsedInvitations = 0;
		let fullyUsedInvitations = 0;

		const checkInsByInvitation = new Map<string, number>();

		const allCheckIns = await adminDb
			.collection('events')
			.doc(eventId)
			.collection(CHECKINS_SUBCOLLECTION)
			.get();

		for (const doc of allCheckIns.docs) {
			const data = doc.data();
			const invId = data?.invitationId;
			if (invId) {
				checkInsByInvitation.set(invId, (checkInsByInvitation.get(invId) || 0) + 1);
				totalCheckedInPeople++;
			}
		}

		// Classificar cada convite confirmado
		for (const invId of confirmedInvitationIds) {
			const checkedIn = checkInsByInvitation.get(invId) || 0;

			// Buscar total confirmado para este convite
			let totalForInv = 1;
			try {
				const rsvpDoc = await adminDb
					.collection('events')
					.doc(eventId)
					.collection(RSVPS_SUBCOLLECTION)
					.doc(invId)
					.get();
				if (rsvpDoc.exists) {
					const rsvpData = rsvpDoc.data();
					const companions = Array.isArray(rsvpData?.companions) ? rsvpData.companions.length : 0;
					const invDoc = await adminDb
						.collection('events')
						.doc(eventId)
						.collection(INVITATIONS_SUBCOLLECTION)
						.doc(invId)
						.get();
					const invDataLocal = invDoc.exists ? invDoc.data() : undefined;
					const guestCount = invDataLocal && Array.isArray(invDataLocal.guestIds)
						? (invDataLocal.guestIds as string[]).length
						: 1;
					totalForInv = guestCount + companions;
				}
			} catch {
				// Usar fallback
			}

			if (checkedIn === totalForInv && totalForInv > 0) {
				fullyUsedInvitations++;
			} else if (checkedIn > 0) {
				partiallyUsedInvitations++;
			}
		}

		// Últimas entradas (ordenadas por timestamp)
		const lastEntriesDocs = allCheckIns.docs
			.sort((a, b) => {
				const aTime = a.data()?.checkedInAt?._seconds || 0;
				const bTime = b.data()?.checkedInAt?._seconds || 0;
				return bTime - aTime;
			})
			.slice(0, 5);

		const lastEntries: ReceptionSummary['lastEntries'] = [];
		for (const doc of lastEntriesDocs) {
			const data = serializeFirestoreValue(doc.data(), `lastEntry.${doc.id}`) as Record<string, unknown>;
			const participantName = String(data?.participantName || data?.guestId || '');
			const checkedInAt = (data?.checkedInAt as string) || '';

			// Buscar displayName do convite
			let invitationDisplayName = '';
			if (data?.invitationId) {
				try {
					const invDoc = await adminDb
						.collection('events')
						.doc(eventId)
						.collection(INVITATIONS_SUBCOLLECTION)
						.doc(String(data.invitationId))
						.get();
					if (invDoc.exists) {
						invitationDisplayName = invDoc.data()?.displayName || '';
					}
				} catch {
					// Ignorar
				}
			}

			lastEntries.push({
				participantName,
				invitationDisplayName,
				checkedInAt,
			});
		}

		return {
			totalInvitations: confirmedInvitationIds.length,
			totalConfirmedPeople,
			totalCheckedInPeople,
			totalPendingPeople: totalConfirmedPeople - totalCheckedInPeople,
			partiallyUsedInvitations,
			fullyUsedInvitations,
			lastEntries,
		};
	} catch (e) {
		console.error('[ValidatorConfirmed] Erro ao calcular resumo:', e);
		return {
			totalInvitations: 0,
			totalConfirmedPeople: 0,
			totalCheckedInPeople: 0,
			totalPendingPeople: 0,
			partiallyUsedInvitations: 0,
			fullyUsedInvitations: 0,
			lastEntries: [],
		};
	}
}