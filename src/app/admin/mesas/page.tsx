import { requireAdminSession } from '@/lib/auth/admin-session';
import { redirect } from 'next/navigation';
import { listTables, getTablesDashboardStats } from '@/lib/repositories/tables.repository';
import { TablesManagerClient } from './TablesManagerClient';

export default async function MesasPage() {
	let session;
	try {
		session = await requireAdminSession();
	} catch {
		redirect('/admin/login');
	}

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

	const [tables, stats] = await Promise.all([
		listTables(eventId),
		getTablesDashboardStats(eventId),
	]);

	return (
		<TablesManagerClient
			initialTables={tables}
			initialStats={stats}
			adminUid={session.uid}
		/>
	);
}