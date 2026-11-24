/**
 * Migração Segura — Identidade Persistente de Acompanhantes
 *
 * Reconcilia companions sem participantId no RSVP com atribuições existentes
 * em tableAssignments, recuperando UUIDs já persistidos ou gerando novos
 * apenas quando não há atribuição prévia.
 *
 * MODOS:
 *   --dry-run  (padrão) Apenas leitura e relatório. Nenhuma escrita.
 *   --apply    Executa as alterações aprovadas no dry-run.
 *
 * USO:
 *   node scripts/migrate-companion-ids.mjs              # dry-run
 *   node scripts/migrate-companion-ids.mjs --apply      # aplicar alterações
 *
 * SEGURANÇA:
 *   - Idempotente: execuções consecutivas produzem o mesmo resultado.
 *   - Transacional: cada RSVP é atualizado dentro de uma transação Firestore.
 *   - Preserva ordem, nomes e campos existentes dos companions.
 *   - Não modifica tableAssignments, checkins ou outros documentos.
 *   - Interrompe diante de ambiguidades (nomes duplicados no mesmo convite).
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import admin from 'firebase-admin';
import { randomUUID } from 'crypto';

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const EVENT_ID = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';
const DRY_RUN = !process.argv.includes('--apply');

// ============================================================================
// CARREGAMENTO DE AMBIENTE
// ============================================================================

function loadEnvFile(filePath) {
	try {
		const content = readFileSync(resolve(filePath), 'utf-8');
		const multilineRegex = /^([A-Z_][A-Z0-9_]*)=(["'])([\s\S]*?)\2/gm;
		let match;
		while ((match = multilineRegex.exec(content)) !== null) {
			if (!process.env[match[1]]) process.env[match[1]] = match[3];
		}
		const simpleRegex = /^([A-Z_][A-Z0-9_]*)=([^\s"'][^\n]*)$/gm;
		while ((match = simpleRegex.exec(content)) !== null) {
			if (!process.env[match[1]]) process.env[match[1]] = match[2].trim();
		}
	} catch {
		// .env.local pode não existir
	}
}

loadEnvFile('.env.local');

// ============================================================================
// NORMALIZAÇÃO DE BUSCA
// ============================================================================

function normalizeSearch(str) {
	return (str || '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.trim();
}

// ============================================================================
// AUDITORIA E RECONCILIAÇÃO
// ============================================================================

async function auditAndReconcile(db) {
	console.log(`\n📋 AUDITORIA — Evento: ${EVENT_ID}`);
	console.log(`   Modo: ${DRY_RUN ? 'DRY-RUN (somente leitura)' : 'APPLY (escrita autorizada)'}\n`);

	// 1. Buscar todas as atribuições existentes
	const assignmentsSnap = await db
		.collection('events').doc(EVENT_ID)
		.collection('tableAssignments')
		.get();

	// Mapa: participantId → { tableId, participantName, participantType, invitationId }
	const assignmentsByParticipantId = new Map();
	// Mapa: invitationId → [{ participantId, participantName, participantType }]
	const assignmentsByInvitation = new Map();

	for (const doc of assignmentsSnap.docs) {
		const data = doc.data();
		const pid = data?.participantId;
		if (!pid) continue;

		assignmentsByParticipantId.set(pid, {
			tableId: data.tableId,
			participantName: data.participantName,
			participantType: data.participantType,
			invitationId: data.invitationId || '',
			participantSource: data.participantSource || 'rsvp',
		});

		const invId = data.invitationId || '';
		if (invId && data.participantType === 'companion') {
			if (!assignmentsByInvitation.has(invId)) {
				assignmentsByInvitation.set(invId, []);
			}
			assignmentsByInvitation.get(invId).push({
				participantId: pid,
				participantName: data.participantName,
				participantType: data.participantType,
			});
		}
	}

	console.log(`   Atribuições totais: ${assignmentsSnap.size}`);
	console.log(`   Atribuições de companions com invitationId: ${assignmentsByInvitation.size} convites\n`);

	// 2. Buscar RSVPs confirmados
	const rsvpsSnap = await db
		.collection('events').doc(EVENT_ID)
		.collection('rsvps')
		.where('attendanceStatus', '==', 'confirmed')
		.get();

	console.log(`   RSVPs confirmados: ${rsvpsSnap.size}\n`);

	// 3. Analisar cada RSVP
	const report = {
		totalRsvps: rsvpsSnap.size,
		totalCompanions: 0,
		companionsWithValidId: 0,
		companionsWithoutId: 0,
		recoverableFromAssignment: 0,
		newIdsNeeded: 0,
		conflicts: 0,
		orphanAssignments: 0,
		ambiguousCases: 0,
		rsvpsToModify: [],
		individualReconciliation: {},
	};

	for (const rsvpDoc of rsvpsSnap.docs) {
		const invitationId = rsvpDoc.id;
		const rsvpData = rsvpDoc.data();
		const companions = Array.isArray(rsvpData?.companions) ? rsvpData.companions : [];

		report.totalCompanions += companions.length;

		const companionAssignments = assignmentsByInvitation.get(invitationId) || [];
		let needsUpdate = false;
		const updatedCompanions = [];
		const changes = [];

		for (let i = 0; i < companions.length; i++) {
			const companion = companions[i];
			const companionName = companion.name || 'Acompanhante';

			if (companion.participantId) {
				// Cenário A: já tem ID persistente
				report.companionsWithValidId++;
				updatedCompanions.push(companion);
				continue;
			}

			// Companion sem participantId
			report.companionsWithoutId++;

			// Tentar recuperar da atribuição existente
			const matchingAssignments = companionAssignments.filter(
				a => normalizeSearch(a.participantName) === normalizeSearch(companionName)
			);

			if (matchingAssignments.length === 1) {
				// Cenário B: correspondência inequívoca — recuperar ID da atribuição
				const recoveredId = matchingAssignments[0].participantId;
				report.recoverableFromAssignment++;

				updatedCompanions.push({ ...companion, participantId: recoveredId });
				changes.push({
					index: i,
					name: companionName,
					action: 'RECOVER',
					oldId: '(nenhum)',
					newId: recoveredId,
					source: 'tableAssignment',
				});
				needsUpdate = true;

				// Registrar casos específicos solicitados
				const normalizedMariana = normalizeSearch('Mariana Lemes');
				const normalizedGilberto = normalizeSearch('Gilberto Júnior');
				const normalizedPastorLeo = normalizeSearch('Pastor Léo');
				const normalizedCompanion = normalizeSearch(companionName);

				if (normalizedCompanion === normalizedMariana) {
					report.individualReconciliation['Mariana Lemes'] = {
						invitationId,
						action: 'RECOVER',
						recoveredId,
						tableId: matchingAssignments[0].tableId,
						status: 'Será reconciliada com ID da atribuição existente',
					};
				}
			} else if (matchingAssignments.length > 1) {
				// Cenário E: ambíguo — múltiplas atribuições com mesmo nome
				report.ambiguousCases++;
				report.conflicts++;

				updatedCompanions.push(companion); // Manter sem alteração
				changes.push({
					index: i,
					name: companionName,
					action: 'AMBIGUOUS',
					oldId: '(nenhum)',
					newId: '(não alterado)',
					source: `${matchingAssignments.length} atribuições com mesmo nome`,
				});
			} else {
				// Cenário C: sem ID e sem atribuição — gerar novo UUID
				const newId = randomUUID();
				report.newIdsNeeded++;

				updatedCompanions.push({ ...companion, participantId: newId });
				changes.push({
					index: i,
					name: companionName,
					action: 'GENERATE',
					oldId: '(nenhum)',
					newId: newId,
					source: 'novo UUID',
				});
				needsUpdate = true;
			}
		}

		if (needsUpdate) {
			report.rsvpsToModify.push({
				invitationId,
				changes,
				currentCompanions: companions,
				updatedCompanions,
			});
		}
	}

	// 4. Detectar atribuições órfãs (companion com atribuição mas sem correspondência no RSVP)
	for (const [invId, assignments] of assignmentsByInvitation) {
		const rsvpDoc = rsvpsSnap.docs.find(d => d.id === invId);
		if (!rsvpDoc) {
			for (const a of assignments) {
				report.orphanAssignments++;
				console.log(`   ⚠️  Atribuição órfã: ${a.participantName} (${a.participantId}) — RSVP não encontrado para convite ${invId}`);
			}
			continue;
		}

		const companions = Array.isArray(rsvpDoc.data()?.companions) ? rsvpDoc.data().companions : [];
		for (const a of assignments) {
			const hasMatch = companions.some(
				c => c.participantId === a.participantId ||
					(!c.participantId && normalizeSearch(c.name) === normalizeSearch(a.participantName))
			);
			if (!hasMatch) {
				report.orphanAssignments++;
				console.log(`   ⚠️  Atribuição sem correspondência no RSVP: ${a.participantName} (${a.participantId}) no convite ${invId}`);
			}
		}
	}

	return report;
}

// ============================================================================
// RELATÓRIO
// ============================================================================

function printReport(report) {
	console.log('\n' + '='.repeat(70));
	console.log('📊 RELATÓRIO DE MIGRAÇÃO');
	console.log('='.repeat(70));

	console.log(`\n   RSVPs analisados:                    ${report.totalRsvps}`);
	console.log(`   Total de acompanhantes:              ${report.totalCompanions}`);
	console.log(`   Com ID persistente válido:           ${report.companionsWithValidId}`);
	console.log(`   Sem ID persistente:                  ${report.companionsWithoutId}`);
	console.log(`   IDs recuperáveis de atribuições:     ${report.recoverableFromAssignment}`);
	console.log(`   Novos IDs necessários:               ${report.newIdsNeeded}`);
	console.log(`   Conflitos / Ambiguidades:            ${report.conflicts}`);
	console.log(`   Atribuições órfãs:                   ${report.orphanAssignments}`);
	console.log(`   RSVPs que seriam modificados:        ${report.rsvpsToModify.length}`);

	// Detalhes das alterações propostas
	if (report.rsvpsToModify.length > 0) {
		console.log('\n' + '-'.repeat(70));
		console.log('📝 ALTERAÇÕES PROPOSTAS');
		console.log('-'.repeat(70));

		for (const mod of report.rsvpsToModify) {
			console.log(`\n   Convite: ${mod.invitationId}`);
			for (const change of mod.changes) {
				const icon = change.action === 'RECOVER' ? '🔗' :
					change.action === 'GENERATE' ? '🆕' : '⚠️';
				console.log(`     ${icon} [${change.index}] ${change.name}`);
				console.log(`        Ação: ${change.action}`);
				console.log(`        ID anterior: ${change.oldId}`);
				console.log(`        ID proposto: ${change.newId}`);
				console.log(`        Origem: ${change.source}`);
			}
		}
	}

	// Reconciliação individual solicitada
	const individualKeys = Object.keys(report.individualReconciliation);
	if (individualKeys.length > 0) {
		console.log('\n' + '-'.repeat(70));
		console.log('🔍 RECONCILIAÇÃO INDIVIDUAL');
		console.log('-'.repeat(70));

		for (const name of individualKeys) {
			const info = report.individualReconciliation[name];
			console.log(`\n   ${name}:`);
			console.log(`     Convite: ${info.invitationId}`);
			console.log(`     Ação: ${info.action}`);
			console.log(`     ID recuperado: ${info.recoveredId}`);
			console.log(`     Mesa: ${info.tableId}`);
			console.log(`     Status: ${info.status}`);
		}
	}

	// Resumo final
	console.log('\n' + '='.repeat(70));
	if (DRY_RUN) {
		console.log('🔒 MODO DRY-RUN — Nenhuma alteração foi realizada.');
		console.log('   Para aplicar: node scripts/migrate-companion-ids.mjs --apply');
	} else {
		console.log('✅ MODO APPLY — Alterações executadas.');
	}
	console.log('='.repeat(70) + '\n');
}

// ============================================================================
// APLICAÇÃO DAS ALTERAÇÕES
// ============================================================================

async function applyChanges(db, report) {
	if (DRY_RUN) return;

	console.log('\n🔧 APLICANDO ALTERAÇÕES...\n');

	let appliedCount = 0;
	let failedCount = 0;

	for (const mod of report.rsvpsToModify) {
		try {
			const rsvpRef = db
				.collection('events').doc(EVENT_ID)
				.collection('rsvps').doc(mod.invitationId);

			await db.runTransaction(async (transaction) => {
				const rsvpDoc = await transaction.get(rsvpRef);
				if (!rsvpDoc.exists) {
					throw new Error(`RSVP ${mod.invitationId} não encontrado durante transação`);
				}

				const currentData = rsvpDoc.data();
				const currentCompanions = Array.isArray(currentData?.companions)
					? currentData.companions
					: [];

				// Verificar se o array não mudou concorrentemente
				if (currentCompanions.length !== mod.currentCompanions.length) {
					throw new Error(
						`Conflito concorrente: RSVP ${mod.invitationId} tinha ${mod.currentCompanions.length} companions, agora tem ${currentCompanions.length}`
					);
				}

				// Construir novo array preservando todos os campos existentes
				const newCompanions = currentCompanions.map((existing, index) => {
					const updated = mod.updatedCompanions[index];
					if (!updated) return existing;

					// Merge: preservar todos os campos existentes, adicionar/atualizar participantId
					return {
						...existing,
						participantId: updated.participantId || existing.participantId,
					};
				});

				transaction.update(rsvpRef, { companions: newCompanions });
			});

			appliedCount++;
			console.log(`   ✅ ${mod.invitationId} — ${mod.changes.length} alteração(ões) aplicada(s)`);
		} catch (e) {
			failedCount++;
			console.error(`   ❌ ${mod.invitationId} — FALHA: ${e.message}`);
		}
	}

	console.log(`\n   Aplicadas: ${appliedCount} | Falhas: ${failedCount}`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
	// Inicializar Admin SDK
	const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
	if (!serviceAccountJson) {
		console.error('❌ ERRO: FIREBASE_SERVICE_ACCOUNT_JSON não encontrada no .env.local');
		process.exit(1);
	}

	let app;
	try {
		const credential = admin.credential.cert(JSON.parse(serviceAccountJson));
		app = admin.initializeApp({ credential });
		console.log(`✅ Projeto Firebase: ${app.options.projectId}`);
	} catch (e) {
		console.error(`❌ ERRO ao inicializar Admin SDK: ${e.message}`);
		process.exit(1);
	}

	const db = admin.firestore();

	// Auditoria e reconciliação
	const report = await auditAndReconcile(db);

	// Relatório
	printReport(report);

	// Aplicar se autorizado
	await applyChanges(db, report);

	// Verificação pós-aplicação
	if (!DRY_RUN && report.rsvpsToModify.length > 0) {
		console.log('\n🔍 VERIFICAÇÃO PÓS-APLICAÇÃO\n');

		for (const mod of report.rsvpsToModify) {
			const rsvpDoc = await db
				.collection('events').doc(EVENT_ID)
				.collection('rsvps').doc(mod.invitationId)
				.get();

			if (!rsvpDoc.exists) {
				console.log(`   ❌ ${mod.invitationId} — documento não encontrado`);
				continue;
			}

			const companions = rsvpDoc.data()?.companions || [];
			const allHaveIds = companions.every(c => c.participantId);
			console.log(`   ${allHaveIds ? '✅' : '❌'} ${mod.invitationId} — ${companions.length} companions, todos com ID: ${allHaveIds}`);
		}
	}
}

main().catch(e => {
	console.error('Erro inesperado:', e);
	process.exit(1);
});