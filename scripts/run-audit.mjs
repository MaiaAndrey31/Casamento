/**
 * Script auxiliar para executar auditoria com credenciais do arquivo JSON local.
 * Carrega GOOGLE_APPLICATION_CREDENTIALS do .env.local e executa
 * migrate-companion-ids em modo dry-run.
 *
 * USO: node scripts/run-audit.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ENV_LOCAL = resolve(ROOT, '.env.local');

// Ler caminho das credenciais do .env.local
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
console.log(`📄 Lendo credenciais de: ${resolvedCredPath}`);

let serviceAccountJson;
try {
	serviceAccountJson = readFileSync(resolvedCredPath, 'utf-8');
} catch (e) {
	console.error(`❌ Erro ao ler arquivo de credenciais: ${e.message}`);
	process.exit(1);
}

// Validar JSON
try {
	const parsed = JSON.parse(serviceAccountJson);
	console.log(`✅ Projeto Firebase: ${parsed.project_id || '(desconhecido)'}`);
} catch (e) {
	console.error('❌ Arquivo de credenciais não é JSON válido:', e.message);
	process.exit(1);
}

// Ler EVENT_ID do .env.local
let eventId = null;
try {
	const envContent = readFileSync(ENV_LOCAL, 'utf-8');
	const match = envContent.match(/^NEXT_PUBLIC_EVENT_ID=(.+)$/m);
	if (match) {
		eventId = match[1].trim().replace(/^["']|["']$/g, '');
	}
} catch {
	// Ignorar
}

if (!eventId || eventId === '[SENSITIVE]' || eventId === '') {
	// Fallback: usar valor padrão do projeto
	eventId = 'casamento-andrey-amanda';
	console.log(`⚠️ NEXT_PUBLIC_EVENT_ID não encontrado, usando padrão: ${eventId}`);
} else {
	console.log(`✅ Evento: ${eventId}`);
}

// Definir variáveis de ambiente para o script filho
const childEnv = { ...process.env };
childEnv.FIREBASE_SERVICE_ACCOUNT_JSON = serviceAccountJson;
childEnv.NEXT_PUBLIC_EVENT_ID = eventId;

console.log('\n🔍 Executando auditoria (dry-run)...\n');

const result = spawnSync('node', [resolve(ROOT, 'scripts/migrate-companion-ids.mjs')], {
	stdio: 'inherit',
	env: childEnv,
	cwd: ROOT,
});

process.exit(result.status || 0);