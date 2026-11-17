/**
 * Firebase Admin SDK — Configuração para uso exclusivo no servidor
 *
 * IMPORTANTE: Nunca importe este módulo em Client Components.
 * Use apenas em Server Actions, Route Handlers e Middleware.
 */

import 'server-only';

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';

function getAdminConfig() {
  // Opção 1: Service Account JSON via variável de ambiente (recomendado para Vercel)
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    try {
      return {
        credential: cert(JSON.parse(serviceAccountJson)),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      };
    } catch (e) {
      console.error('[Firebase Admin] Falha ao parsear FIREBASE_SERVICE_ACCOUNT_JSON:', e);
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON contém JSON inválido');
    }
  }

  // Opção 2: Caminho para arquivo de credenciais (desenvolvimento local)
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (serviceAccountPath) {
    return {
      credential: cert(serviceAccountPath),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    };
  }

  // Opção 3: Application Default Credentials (ADC) — funciona com `gcloud auth application-default login`
  // Fallback para ambientes onde ADC está configurado automaticamente
  console.warn(
    '[Firebase Admin] Nenhuma credencial explícita encontrada. ' +
    'Tentando Application Default Credentials. ' +
    'Configure FIREBASE_SERVICE_ACCOUNT_JSON ou GOOGLE_APPLICATION_CREDENTIALS.'
  );

  return {
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  };
}

// Singleton pattern
let app: App;
let adminAuth: Auth;
let adminDb: Firestore;
let adminStorage: Storage;

if (!getApps().length) {
  app = initializeApp(getAdminConfig());
  adminAuth = getAuth(app);
  adminDb = getFirestore(app);
  adminStorage = getStorage(app);

  // Configurar timezone padrão para queries de data
  adminDb.settings({ ignoreUndefinedProperties: true });
} else {
  app = getApps()[0];
  adminAuth = getAuth(app);
  adminDb = getFirestore(app);
  adminStorage = getStorage(app);
}

export { app as adminApp, adminAuth, adminDb, adminStorage };

// ============================================================================
// HELPERS DE SEGURANÇA
// ============================================================================

/**
 * Verifica se um UID é administrador autorizado.
 * Consulta a coleção `admins/{uid}` no Firestore.
 */
export async function isAdmin(uid: string): Promise<boolean> {
  try {
    const doc = await adminDb.collection('admins').doc(uid).get();
    return doc.exists && doc.data()?.active === true;
  } catch {
    return false;
  }
}

/**
 * Obtém o perfil completo do admin/validador.
 * Retorna null se o documento não existir.
 *
 * COMPATIBILIDADE COM LEGADOS:
 * - Documentos sem `type` → tratados como `type: 'admin'`
 * - Documentos sem `role` mas com `active: true` → tratados como `role: 'owner'`
 *   (preserva acesso dos primeiros admins criados via seed antes do campo role existir)
 */
export async function getAdminProfile(
  uid: string,
): Promise<{ role: import('@/types').AdminRole; type: import('@/types').AccountType; active: boolean } | null> {
  try {
    const doc = await adminDb.collection('admins').doc(uid).get();
    if (!doc.exists) return null;

    const data = doc.data();
    const active = Boolean(data?.active);

    // Legado: sem role definido → owner (primeiros admins)
    const role = (data?.role as import('@/types').AdminRole) || 'owner';

    // Legado: sem type definido → admin
    const type = (data?.type as import('@/types').AccountType) || 'admin';

    return { role, type, active };
  } catch {
    return null;
  }
}

/**
 * Verifica token de ID do Firebase e retorna o UID se válido.
 * Lança erro se o token for inválido ou expirado.
 */
export async function verifyIdToken(idToken: string): Promise<string> {
  const decoded = await adminAuth.verifyIdToken(idToken);
  return decoded.uid;
}

/**
 * Gera hash SHA-256 para tokens de convite.
 * Nunca armazene tokens em claro no Firestore.
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token + process.env.TOKEN_SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Gera token criptograficamente seguro para convites.
 * Formato: 32 caracteres hexadecimais.
 */
export function generateSecureToken(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}