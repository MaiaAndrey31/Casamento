/**
 * Check-In Token Crypto — Criptografia AES-256-GCM para tokens de check-in
 *
 * Reutiliza a arquitetura segura existente de invitation-vault.ts
 * para criptografar/descriptografar checkInTokenPlain, permitindo
 * migração gradual do armazenamento em texto puro para criptografado.
 *
 * SEGURANÇA:
 * - Mesma chave INVITATION_ENCRYPTION_KEY (AES-256-GCM)
 * - IV único por operação (12 bytes)
 * - Auth tag para integridade (16 bytes)
 * - Formato base64: iv:authTag:ciphertext
 * - Write-back idempotente: só criptografa se plain existir e encrypted não
 * - Nunca modifica o token original
 * - Nunca registra tokens ou chaves em logs
 */

import 'server-only';

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH_BITS = 256;
const IV_LENGTH_BYTES = 12;
const TAG_LENGTH_BYTES = 16;

/**
 * Obtém a CryptoKey a partir da variável de ambiente.
 * Lança erro se a chave não estiver configurada.
 */
async function getEncryptionKey(): Promise<CryptoKey> {
	const keyHex = process.env.INVITATION_ENCRYPTION_KEY;

	if (!keyHex) {
		throw new Error(
			'INVITATION_ENCRYPTION_KEY não configurada para criptografia de check-in token.',
		);
	}

	const keyBytes = hexToBytes(keyHex);

	if (keyBytes.length !== KEY_LENGTH_BITS / 8) {
		throw new Error(
			`INVITATION_ENCRYPTION_KEY deve ter ${KEY_LENGTH_BITS / 8} bytes. Atual: ${keyBytes.length}.`,
		);
	}

	const keyBuffer = new Uint8Array(keyBytes).buffer as ArrayBuffer;

	return crypto.subtle.importKey('raw', keyBuffer, { name: ALGORITHM }, false, [
		'encrypt',
		'decrypt',
	]);
}

/**
 * Criptografa um check-in token usando AES-256-GCM.
 * Retorna string base64 no formato: iv:authTag:ciphertext
 */
export async function encryptCheckInToken(token: string): Promise<string> {
	const key = await getEncryptionKey();
	const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
	const encoder = new TextEncoder();
	const plaintext = encoder.encode(token);

	const ivBuffer = iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer;

	const ciphertextBuffer = await crypto.subtle.encrypt(
		{ name: ALGORITHM, iv: ivBuffer, tagLength: TAG_LENGTH_BYTES * 8 },
		key,
		plaintext,
	);

	const combined = new Uint8Array(ciphertextBuffer);
	const ciphertext = combined.slice(0, combined.length - TAG_LENGTH_BYTES);
	const authTag = combined.slice(combined.length - TAG_LENGTH_BYTES);

	return `${bytesToBase64(iv)}:${bytesToBase64(authTag)}:${bytesToBase64(ciphertext)}`;
}

/**
 * Descriptografa um check-in token previamente criptografado.
 * Recebe string no formato: iv:authTag:ciphertext
 */
export async function decryptCheckInToken(encrypted: string): Promise<string> {
	const parts = encrypted.split(':');

	if (parts.length !== 3) {
		throw new Error('Dados criptografados inválidos: formato esperado iv:authTag:ciphertext');
	}

	const [ivB64, authTagB64, ciphertextB64] = parts;

	const iv = base64ToBytes(ivB64);
	const authTag = base64ToBytes(authTagB64);
	const ciphertext = base64ToBytes(ciphertextB64);

	if (iv.length !== IV_LENGTH_BYTES) {
		throw new Error(`IV inválido: esperado ${IV_LENGTH_BYTES} bytes, recebido ${iv.length}`);
	}

	if (authTag.length !== TAG_LENGTH_BYTES) {
		throw new Error(`Auth tag inválida: esperado ${TAG_LENGTH_BYTES} bytes, recebido ${authTag.length}`);
	}

	const combined = new Uint8Array(ciphertext.length + authTag.length);
	combined.set(ciphertext, 0);
	combined.set(authTag, ciphertext.length);

	const key = await getEncryptionKey();

	const ivBuffer = iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer;
	const combinedBuffer = combined.buffer.slice(combined.byteOffset, combined.byteOffset + combined.byteLength) as ArrayBuffer;

	let decryptedBuffer: ArrayBuffer;
	try {
		decryptedBuffer = await crypto.subtle.decrypt(
			{ name: ALGORITHM, iv: ivBuffer, tagLength: TAG_LENGTH_BYTES * 8 },
			key,
			combinedBuffer,
		);
	} catch {
		throw new Error('Falha ao descriptografar check-in token: dados corrompidos ou chave incorreta.');
	}

	const decoder = new TextDecoder();
	return decoder.decode(decryptedBuffer);
}

/**
 * Verifica se a chave de criptografia está configurada e é válida.
 */
export async function isCheckInEncryptionConfigured(): Promise<boolean> {
	try {
		await getEncryptionKey();
		return true;
	} catch {
		return false;
	}
}

// ============================================================================
// HELPERS
// ============================================================================

function hexToBytes(hex: string): Uint8Array {
	const cleanHex = hex.replace(/^0x/, '');
	if (cleanHex.length % 2 !== 0) {
		throw new Error('Chave hexadecimal deve ter comprimento par.');
	}
	const bytes = new Uint8Array(cleanHex.length / 2);
	for (let i = 0; i < cleanHex.length; i += 2) {
		bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
	}
	return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}