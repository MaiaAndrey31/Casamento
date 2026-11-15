/**
 * Repositório de Eventos — Acesso ao documento do casamento no Firestore.
 *
 * Utiliza Firebase Admin SDK quando disponível (server-side).
 * Fallback para Client SDK em leitura pública quando Admin não está configurado.
 */

import type { WeddingEvent } from '@/types';

const EVENT_COLLECTION = 'events';

/**
 * Recupera o documento do evento ativo.
 * Retorna null se nenhum evento estiver configurado.
 */
export async function getActiveEvent(): Promise<WeddingEvent | null> {
	try {
		// Tentar Admin SDK primeiro (server-side)
		const { adminDb } = await import('@/lib/firebase/admin');
		const snapshot = await adminDb
			.collection(EVENT_COLLECTION)
			.where('status', '==', 'published')
			.limit(1)
			.get();

		if (snapshot.empty) return null;

		const doc = snapshot.docs[0];
		return { id: doc.id, ...doc.data() } as WeddingEvent;
	} catch {
		// Fallback para Client SDK (leitura pública)
		try {
			const { db } = await import('@/lib/firebase/client');
			const { query, collection, where, limit, getDocs } = await import('firebase/firestore');

			const q = query(
				collection(db, EVENT_COLLECTION),
				where('status', '==', 'published'),
				limit(1),
			);
			const snapshot = await getDocs(q);

			if (snapshot.empty) return null;

			const doc = snapshot.docs[0];
			return { id: doc.id, ...doc.data() } as WeddingEvent;
		} catch {
			console.warn('[EventRepository] Firebase não configurado ou indisponível.');
			return null;
		}
	}
}

/**
 * Recupera evento por ID específico.
 */
export async function getEventById(eventId: string): Promise<WeddingEvent | null> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');
		const doc = await adminDb.collection(EVENT_COLLECTION).doc(eventId).get();

		if (!doc.exists) return null;

		return { id: doc.id, ...doc.data() } as WeddingEvent;
	} catch {
		try {
			const { db } = await import('@/lib/firebase/client');
			const { doc, getDoc } = await import('firebase/firestore');

			const docRef = doc(db, EVENT_COLLECTION, eventId);
			const snapshot = await getDoc(docRef);

			if (!snapshot.exists()) return null;

			return { id: snapshot.id, ...snapshot.data() } as WeddingEvent;
		} catch {
			return null;
		}
	}
}

/**
 * Cria ou atualiza o documento do evento (admin only).
 * Operação idempotente: usa merge para não sobrescrever campos existentes.
 */
export async function upsertEvent(
	eventId: string,
	data: Partial<WeddingEvent>,
): Promise<{ success: boolean; error?: string }> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');

		await adminDb.collection(EVENT_COLLECTION).doc(eventId).set(
			{
				...data,
				updatedAt: FieldValue.serverTimestamp(),
			},
			{ merge: true },
		);

		return { success: true };
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';
		console.error('[EventRepository] Falha ao salvar evento:', message);
		return { success: false, error: message };
	}
}

/**
 * Inicializa o documento do evento com dados padrão se não existir.
 * Idempotente: não sobrescreve dados existentes.
 */
export async function initializeEventIfNotExists(
	eventId: string,
	defaults: Partial<WeddingEvent>,
): Promise<{ created: boolean; error?: string }> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');
		const { FieldValue } = await import('firebase-admin/firestore');

		const ref = adminDb.collection(EVENT_COLLECTION).doc(eventId);
		const existing = await ref.get();

		if (existing.exists) {
			return { created: false };
		}

		await ref.set({
			...defaults,
			status: 'draft',
			createdAt: FieldValue.serverTimestamp(),
			updatedAt: FieldValue.serverTimestamp(),
		});

		return { created: true };
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Erro desconhecido';
		console.error('[EventRepository] Falha ao inicializar evento:', message);
		return { created: false, error: message };
	}
}