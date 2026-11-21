/**
 * Script temporário para validar identidade e conceder acesso administrativo.
 * Lê .env.local manualmente (sem dependência dotenv) para compatibilidade.
 *
 * USO: node scripts/validate-admin-user.mjs
 * APAGAR após uso — este script NÃO deve ser commitado.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import admin from 'firebase-admin';

// Carregar .env.local manualmente (suporta JSON multilinha entre aspas)
function loadEnvFile(filePath) {
 try {
 const content = readFileSync(resolve(filePath), 'utf-8');
 // Parse simples: KEY=VALUE ou KEY="VALUE" (multilinha suportado via regex)
 const multilineRegex = /^([A-Z_][A-Z0-9_]*)=(["'])([\s\S]*?)\2/gm;
 let match;
 while ((match = multilineRegex.exec(content)) !== null) {
 if (!process.env[match[1]]) {
 process.env[match[1]] = match[3];
 }
 }
 // Linhas simples (sem aspas)
 const simpleRegex = /^([A-Z_][A-Z0-9_]*)=([^\s"'][^\n]*)$/gm;
 while ((match = simpleRegex.exec(content)) !== null) {
 if (!process.env[match[1]]) {
 process.env[match[1]] = match[2].trim();
 }
 }
 } catch {
 // .env.local pode não existir em alguns ambientes
 }
}

loadEnvFile('.env.local');

const TARGET_UID = 'MeBPRbtDYPU3gq1YSq96eyA7bCK2';
const TARGET_EMAIL = 'brunamartinelliacessorios@outlook.com';

async function main() {
 // 1. Inicializar Admin SDK
 let app;
 try {
 const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
 if (!serviceAccountJson) {
 console.error('ERRO: FIREBASE_SERVICE_ACCOUNT_JSON não encontrada no .env.local');
 process.exit(1);
 }
 const credential = admin.credential.cert(JSON.parse(serviceAccountJson));
 app = admin.initializeApp({ credential });
 console.log('✅ Projeto Firebase:', app.options.projectId);
 } catch (e) {
 console.error('ERRO ao inicializar Admin SDK:', e.message);
 process.exit(1);
 }

 // 2. Validar identidade no Firebase Auth
 console.log('\n--- Validação de Identidade ---');
 try {
 const user = await admin.auth().getUser(TARGET_UID);
 console.log('UID:', user.uid);
 console.log('Email:', user.email);
 console.log('Disabled:', user.disabled);
 console.log('Display Name:', user.displayName || '(none)');

 if (user.email !== TARGET_EMAIL) {
 console.error(`\n❌ BLOQUEADO: Email não corresponde!`);
 console.error(` Esperado: ${TARGET_EMAIL}`);
 console.error(` Encontrado: ${user.email}`);
 process.exit(1);
 }

 if (user.disabled) {
 console.error('\n❌ BLOQUEADO: Conta está desabilitada no Firebase Auth.');
 process.exit(1);
 }

 console.log('\n✅ Identidade confirmada com sucesso.');
 } catch (e) {
 console.error('\n❌ ERRO ao buscar usuário:', e.message);
 process.exit(1);
 }

 // 3. Verificar documento admins existente
 console.log('\n--- Documento admins/{uid} ---');
 const db = admin.firestore();
 const adminRef = db.collection('admins').doc(TARGET_UID);
 const existingDoc = await adminRef.get();

 if (existingDoc.exists) {
 const data = existingDoc.data();
 console.log('Documento EXISTE. Campos atuais:');
 console.log(JSON.stringify(data, null, 2));
 } else {
 console.log('Documento NÃO existe. Será criado.');
 }

 // 4. Criar/atualizar perfil administrativo (merge: true = idempotente)
 console.log('\n--- Concessão de Acesso ---');
 const profileData = {
 active: true,
 type: 'admin',
 role: 'owner',
 displayName: 'Bruna Martinelli',
 email: TARGET_EMAIL,
 };

 // Adicionar createdAt apenas se o documento não existir
 if (!existingDoc.exists) {
 profileData.createdAt = admin.firestore.FieldValue.serverTimestamp();
 }

 await adminRef.set(profileData, { merge: true });
 console.log('✅ Documento escrito com merge:true');

 // 5. Comprovar persistência — leitura pós-escrita
 console.log('\n--- Verificação Pós-Escrita ---');
 const verifyDoc = await adminRef.get();
 if (!verifyDoc.exists) {
 console.error('❌ FALHA: Documento não encontrado após escrita!');
 process.exit(1);
 }

 const verified = verifyDoc.data();
 console.log('Campos verificados:');
 console.log(JSON.stringify(verified, null, 2));

 const checks = [
 ['active === true', verified.active === true],
 ['type === "admin"', verified.type === 'admin'],
 ['role === "owner"', verified.role === 'owner'],
 ['email correto', verified.email === TARGET_EMAIL],
 ];

 let allPassed = true;
 for (const [label, passed] of checks) {
 console.log(`${passed ? '✅' : '❌'} ${label}`);
 if (!passed) allPassed = false;
 }

 if (allPassed) {
 console.log('\n🎉 CONCESSÃO CONCLUÍDA COM SUCESSO');
 console.log('Bruna Martinelli agora tem acesso administrativo completo (owner).');
 console.log('Para acessar: faça login em /admin/login com brunamartinelliacessorios@outlook.com');
 } else {
 console.error('\n❌ VERIFICAÇÃO FALHOU — revise os campos acima.');
 process.exit(1);
 }
}

main().catch(e => {
 console.error('Erro inesperado:', e);
 process.exit(1);
});