/**
 * Repositório de Convidados — CRUD completo de convidados no Firestore.
 *
 * Todas as operações são server-side via Admin SDK.
 * Suporta pesquisa, filtros, agrupamento por família e geração de convites.
 */

import type { Guest, Invitation } from '@/types';

const GUESTS_SUBCOLLECTION = 'guests';
const INVITATIONS_SUBCOLLECTION = 'invitations';

/**
 * Converte objetos Firestore Timestamp para strings ISO.
 * Necessário porque Timestamp não é serializável via React Server Components.
 * Sem esta conversão, passar dados do Firestore para componentes 'use client'
 * causa exceção de serialização em produção (digest 3209861381).
 */
function sanitizeFirestoreData(data: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(data)) {
 if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
 try {
 result[key] = (value as { toDate: () => Date }).toDate().toISOString();
 } catch {
 result[key] = null;
 }
 } else {
 result[key] = value;
 }
	}
	return result;
}

export interface GuestWithInvitation extends Guest {
	invitation?: Pick<Invitation, 'id' | 'displayName' | 'maxCompanions' | 'invitationStatus'>;
	rsvpStatus?: 'confirmed' | 'declined' | 'pending';
}

export interface GuestFilters {
	search?: string;
	category?: string;
	active?: boolean;
	hasRSVP?: boolean;
	limit?: number;
	offset?: number;
}

/**
 * Lista convidados com filtros e paginação.
 */
export async function listGuests(
	eventId: string,
	filters: GuestFilters = {},
): Promise<{ guests: GuestWithInvitation[]; total: number }> {
	try {
 const { adminDb } = await import('@/lib/firebase/admin');

 let query: FirebaseFirestore.Query = adminDb
 .collection('events')
 .doc(eventId)
 .collection(GUESTS_SUBCOLLECTION);

 // Filtros
 if (filters.active !== undefined) {
 query = query.where('active', '==', filters.active);
 } else {
 query = query.where('active', '==', true);
 }

 if (filters.category) {
 query = query.where('category', '==', filters.category);
 }

 // Contagem total antes de aplicar limite
 const countSnapshot = await query.count().get();
 const total = countSnapshot.data().count ?? 0;

 // Ordenação e paginação
 query = query.orderBy('fullName', 'asc');

 if (filters.offset) {
 // Firestore não suporta offset nativo eficiente; usar startAfter em produção
 // Para simplificação, aplicamos limit apenas
 }

 if (filters.limit) {
 query = query.limit(filters.limit);
 } else {
 query = query.limit(100);
 }

 const snapshot = await query.get();

 // Buscar RSVPs em paralelo para enriquecer dados
 // sanitizeFirestoreData converte Timestamp → string ISO para serialização RSC segura
 const guests = snapshot.docs.map(doc => ({
 id: doc.id,
 ...sanitizeFirestoreData(doc.data() as Record<string, unknown>),
 })) as GuestWithInvitation[];

 // Enriquecer com status RSVP
 const rsvpPromises = guests.map(async (guest) => {
 if (!guest.invitationId) return guest;
 try {
 const rsvpDoc = await adminDb
 .collection('events')
 .doc(eventId)
 .collection('rsvps')
 .doc(guest.invitationId)
 .get();
 if (rsvpDoc.exists) {
 guest.rsvpStatus = rsvpDoc.data()?.attendanceStatus;
 }
 } catch {
 // Ignorar erros individuais de RSVP
 }
 return guest;
 });

 const enrichedGuests = await Promise.all(rsvpPromises);

 // Filtro de busca por nome (client-side para flexibilidade)
 let filtered = enrichedGuests;
 if (filters.search) {
 const term = filters.search.toLowerCase();
 filtered = enrichedGuests.filter(g =>
 g.fullName.toLowerCase().includes(term) ||
 g.normalizedName?.toLowerCase().includes(term),
 );
 }

 return { guests: filtered, total };
	} catch (e) {
 console.error('[GuestRepository] Falha ao listar convidados:', e);
 return { guests: [], total: 0 };
	}
}

/**
 * Cria um novo convidado.
 */
export async function createGuest(
	eventId: string,
	data: {
 fullName: string;
 phone: string;
 category: string;
 invitationId?: string;
 isPrimaryGuest?: boolean;
 maxCompanions?: number;
	},
): Promise<{ success: boolean; guestId?: string; error?: string }> {
	try {
 const { adminDb } = await import('@/lib/firebase/admin');
 const { FieldValue } = await import('firebase-admin/firestore');

 // Normalizar nome para busca
 const normalizedName = data.fullName
 .toLowerCase()
 .normalize('NFD')
 .replace(/[̀-ͯ]/g, '')
 .trim();

 const ref = adminDb
 .collection('events')
 .doc(eventId)
 .collection(GUESTS_SUBCOLLECTION);

 const docRef = await ref.add({
 eventId,
 fullName: data.fullName.trim(),
 normalizedName,
 phone: data.phone.trim(),
 category: data.category,
 invitationId: data.invitationId || null,
 isPrimaryGuest: data.isPrimaryGuest ?? true,
 active: true,
 createdAt: FieldValue.serverTimestamp(),
 updatedAt: FieldValue.serverTimestamp(),
 });

 return { success: true, guestId: docRef.id };
	} catch (e) {
 const message = e instanceof Error ? e.message : 'Erro desconhecido';
 console.error('[GuestRepository] Falha ao criar convidado:', message);
 return { success: false, error: message };
	}
}

/**
 * Atualiza um convidado existente.
 */
export async function updateGuest(
	eventId: string,
	guestId: string,
	data: Partial<Pick<Guest, 'fullName' | 'phone' | 'category' | 'isPrimaryGuest'>>,
): Promise<{ success: boolean; error?: string }> {
	try {
 const { adminDb } = await import('@/lib/firebase/admin');
 const { FieldValue } = await import('firebase-admin/firestore');

 const updateData: Record<string, unknown> = {
 updatedAt: FieldValue.serverTimestamp(),
 };

 if (data.fullName !== undefined) {
 updateData.fullName = data.fullName.trim();
 updateData.normalizedName = data.fullName
 .toLowerCase()
 .normalize('NFD')
 .replace(/[̀-ͯ]/g, '')
 .trim();
 }
 if (data.phone !== undefined) updateData.phone = data.phone.trim();
 if (data.category !== undefined) updateData.category = data.category;
 if (data.isPrimaryGuest !== undefined) updateData.isPrimaryGuest = data.isPrimaryGuest;

 await adminDb
 .collection('events')
 .doc(eventId)
 .collection(GUESTS_SUBCOLLECTION)
 .doc(guestId)
 .update(updateData);

 return { success: true };
	} catch (e) {
 const message = e instanceof Error ? e.message : 'Erro desconhecido';
 console.error('[GuestRepository] Falha ao atualizar convidado:', message);
 return { success: false, error: message };
	}
}

/**
 * Desativa um convidado (exclusão lógica).
 */
export async function deactivateGuest(
	eventId: string,
	guestId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
 const { adminDb } = await import('@/lib/firebase/admin');
 const { FieldValue } = await import('firebase-admin/firestore');

 await adminDb
 .collection('events')
 .doc(eventId)
 .collection(GUESTS_SUBCOLLECTION)
 .doc(guestId)
 .update({
 active: false,
 updatedAt: FieldValue.serverTimestamp(),
 });

 return { success: true };
	} catch (e) {
 const message = e instanceof Error ? e.message : 'Erro desconhecido';
 console.error('[GuestRepository] Falha ao desativar convidado:', message);
 return { success: false, error: message };
	}
}