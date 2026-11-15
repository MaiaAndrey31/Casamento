/**
 * Repositório de Estatísticas — Agregações do Dashboard Administrativo.
 *
 * Todas as operações são server-side via Admin SDK.
 * Retorna contagens reais do Firestore, sem dados fictícios.
 */

export interface DashboardStats {
	totalGuests: number;
	totalInvitations: number;
	confirmedRSVPs: number;
	declinedRSVPs: number;
	pendingRSVPs: number;
	totalConfirmedPeople: number;
	totalCompanions: number;
	pendingMessages: number;
	approvedMessages: number;
	totalCheckIns: number;
}

/**
 * Calcula todas as estatísticas do dashboard a partir do Firestore.
 */
export async function getDashboardStats(eventId: string): Promise<DashboardStats> {
	try {
		const { adminDb } = await import('@/lib/firebase/admin');

		const eventRef = adminDb.collection('events').doc(eventId);

		// Executar todas as contagens em paralelo
		const [
			guestsSnap,
			invitationsSnap,
			rsvpsSnap,
			messagesSnap,
			checkinsSnap,
		] = await Promise.all([
			eventRef.collection('guests').where('active', '==', true).count().get(),
			eventRef.collection('invitations').where('invitationStatus', '==', 'active').count().get(),
			eventRef.collection('rsvps').get(),
			eventRef.collection('messages').get(),
			eventRef.collection('checkins').count().get(),
		]);

		// Calcular RSVPs por status
		let confirmedRSVPs = 0;
		let declinedRSVPs = 0;
		let pendingRSVPs = 0;
		let totalConfirmedPeople = 0;
		let totalCompanions = 0;

		rsvpsSnap.docs.forEach((doc) => {
			const data = doc.data();
			if (data.attendanceStatus === 'confirmed') {
				confirmedRSVPs++;
				// Contar titular + acompanhantes confirmados
				totalConfirmedPeople += 1 + (data.companions?.length || 0);
				totalCompanions += data.companions?.length || 0;
			} else if (data.attendanceStatus === 'declined') {
				declinedRSVPs++;
			} else {
				pendingRSVPs++;
			}
		});

		// Calcular mensagens por status
		let pendingMessages = 0;
		let approvedMessages = 0;

		messagesSnap.docs.forEach((doc) => {
			const data = doc.data();
			if (data.moderationStatus === 'pending') {
				pendingMessages++;
			} else if (data.moderationStatus === 'approved') {
				approvedMessages++;
			}
		});

		// Convites sem RSVP = pendentes
		const invitationsWithRSVP = confirmedRSVPs + declinedRSVPs;
		const totalInvitations = invitationsSnap.data().count ?? 0;
		pendingRSVPs = Math.max(0, totalInvitations - invitationsWithRSVP);

		return {
			totalGuests: guestsSnap.data().count ?? 0,
			totalInvitations,
			confirmedRSVPs,
			declinedRSVPs,
			pendingRSVPs,
			totalConfirmedPeople,
			totalCompanions,
			pendingMessages,
			approvedMessages,
			totalCheckIns: checkinsSnap.data().count ?? 0,
		};
	} catch (e) {
		console.error('[StatsRepository] Falha ao calcular estatísticas:', e);
		// Retornar zeros em caso de erro, nunca dados fictícios
		return {
			totalGuests: 0,
			totalInvitations: 0,
			confirmedRSVPs: 0,
			declinedRSVPs: 0,
			pendingRSVPs: 0,
			totalConfirmedPeople: 0,
			totalCompanions: 0,
			pendingMessages: 0,
			approvedMessages: 0,
			totalCheckIns: 0,
		};
	}
}