/**
 * Backup seguro dos RSVPs que serão modificados pela migração.
 * Salva os documentos originais em scripts/backups/ antes da execução do --apply.
 *
 * USO: node scripts/backup-rsvps.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ENV_LOCAL = resolve(ROOT, '.env.local');
const BACKUP_DIR = resolve(ROOT, 'scripts', 'backups');

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

// RSVPs que serão modificados pela migração
const RSVPS_TO_BACKUP = [
	'6kaniZq2lESRxv1GFhix',
	'NOacJaFi5E6zMAK26HXU',
	'YeeY86WkrJAPQS14KvOB',
	'aYwyeb3PWa2lvT9qieG6',
	'vBCAXTEdod0UMmeW9TAW',
];

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

		backups[rsvpId] = doc.data();
		console.log(`✅ Backup: ${rsvpId} (${doc.data()?.companions?.length || 0} companions)`);
	}

	writeFileSync(backupFile, JSON.stringify(backups, null, 2), 'utf-8');
	console.log(`\n💾 Backup salvo em: ${backupFile}`);
	console.log(`📋 ${RSVPS_TO_BACKUP.length} documentos preservados.`);
}

main().catch(e => {
	console.error('Erro inesperado:', e);
	process.exit(1);
});