/**
 * Backup seguro dos RSVPs que serão modificados pela migração.
 * Salva os documentos originais em scripts/backups/ antes da execução do --apply.
 *
 * USO: node scripts/backup-rsvps.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ENV_LOCAL = resolve(ROOT, '.env.local');
// Backups NUNCA devem entrar no versionamento Git.
const BACKUP_DIR = process.env.RSVP_BACKUP_DIR || resolve(tmpdir(), 'casamento-rsvp-backups');

// Ler credenciais do .env.local
let credPath = null;
try {
	const envContent = readFileSync(ENV_LOCAL, 'utf-8');
	const match = envContent.match(/^GOOGLE_APPLICATION_CREDENTIALS=(.+)$/m);
	if (match) {
		credPath = match[1].trim().replace(/^["']|["']$/g, '');
	}
} catch (e) {
	console.error(`❌ Erro ao ler .env.local: ${e.message}`);
	process.exit(1);
}

if (!credPath) {
	console.error('❌ GOOGLE_APPLICATION_CREDENTIALS não encontrado no .env.local');
	process.exit(1);
}

const resolvedCredPath = resolve(ROOT, credPath);
let serviceAccountJson;
try {
	serviceAccountJson = JSON.parse(readFileSync(resolvedCredPath, 'utf-8'));
} catch (e) {
	console.error(`❌ Erro ao ler credenciais: ${e.message}`);
	process.exit(1);
}

const EVENT_ID = 'casamento-andrey-amanda';

// RSVPs que podem ser modificados por reconciliações. O ID de Adriano
// (acompanhante de Dary) foi incluído após a auditoria de 25/11/2026.
const DEFAULT_RSVPS_TO_BACKUP = [
	'6kaniZq2lESRxv1GFhix',
	'NOacJaFi5E6zMAK26HXU',
	'YeeY86WkrJAPQS14KvOB',
	'aYwyeb3PWa2lvT9qieG6',
	'vBCAXTEdod0UMmeW9TAW',
	'dNDvHTJ3Gi9RfMTcXxEY',
];
const RSVPS_TO_BACKUP = (process.env.RSVP_IDS_TO_BACKUP || DEFAULT_RSVPS_TO_BACKUP.join(','))
	.split(',')
	.map(id => id.trim())
	.filter(Boolean);

async function main() {
	const credential = admin.credential.cert(serviceAccountJson);
	admin.initializeApp({ credential });
	const db = admin.firestore();

	mkdirSync(BACKUP_DIR, { recursive: true });

	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const backupFile = resolve(BACKUP_DIR, `rsvps-backup-${timestamp}.json`);

	const backups = {};

	for (const rsvpId of RSVPS_TO_BACKUP) {
		const doc = await db
			.collection('events').doc(EVENT_ID)
			.collection('rsvps').doc(rsvpId)
			.get();

		if (!doc.exists) {
			console.error(`❌ RSVP ${rsvpId} não encontrado!`);
			process.exit(1);
		}

		// Preserva o documento original por completo, incluindo revision e
		// metadados de localização, para permitir restauração exata.
		backups[rsvpId] = {
			id: doc.id,
			path: doc.ref.path,
			exists: doc.exists,
			revision: doc.data()?.revision ?? null,
			data: doc.data(),
		};
		console.log(`✅ Backup: ${rsvpId} (rev ${backups[rsvpId].revision}, ${doc.data()?.companions?.length || 0} companions)`);
	}

	writeFileSync(backupFile, JSON.stringify({
		eventId: EVENT_ID,
		projectId: 'casamento-2d790',
		backedUpAt: timestamp,
		documents: backups,
	}, null, 2), 'utf-8');
	console.log(`\n💾 Backup salvo em: ${backupFile}`);
	console.log(`📋 ${RSVPS_TO_BACKUP.length} documentos preservados.`);
}

main().catch(e => {
	console.error('Erro inesperado:', e);
	process.exit(1);
});