/**
 * Testes Automatizados — Check-In Token Crypto
 *
 * Cobre:
 * 16. Recuperação criptografada de token (encrypt/decrypt roundtrip)
 * - Chave válida → encrypt + decrypt retorna token original
 * - Dados corrompidos → erro explícito
 * - Formato inválido → erro explícito
 * - isCheckInEncryptionConfigured detecta chave ausente
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock do server-only para permitir import em ambiente de teste
vi.mock('server-only', () => ({}));

describe('checkin-token-crypto', () => {
	const ORIGINAL_KEY = process.env.INVITATION_ENCRYPTION_KEY;

	// Chave AES-256 válida (32 bytes hex)
	const VALID_KEY = 'a'.repeat(64);

	beforeEach(() => {
		process.env.INVITATION_ENCRYPTION_KEY = VALID_KEY;
		// Limpar cache do módulo para recarregar com nova env var
		vi.resetModules();
	});

	afterEach(() => {
		if (ORIGINAL_KEY !== undefined) {
			process.env.INVITATION_ENCRYPTION_KEY = ORIGINAL_KEY;
		} else {
			delete process.env.INVITATION_ENCRYPTION_KEY;
		}
		vi.resetModules();
	});

	it('deve criptografar e descriptografar um token (roundtrip)', async () => {
		const { encryptCheckInToken, decryptCheckInToken } = await import('./checkin-token-crypto');

		const token = 'checkin-token-abc123def456';
		const encrypted = await encryptCheckInToken(token);

		expect(encrypted).not.toBe(token);
		expect(encrypted.split(':')).toHaveLength(3); // formato iv:authTag:ciphertext

		const decrypted = await decryptCheckInToken(encrypted);
		expect(decrypted).toBe(token);
	});

	it('duas criptografias do mesmo token devem produzir resultados diferentes (IV único)', async () => {
		const { encryptCheckInToken } = await import('./checkin-token-crypto');

		const token = 'mesmo-token-duas-vezes';
		const enc1 = await encryptCheckInToken(token);
		const enc2 = await encryptCheckInToken(token);

		expect(enc1).not.toBe(enc2);
	});

	it('deve falhar com dados corrompidos', async () => {
		const { encryptCheckInToken, decryptCheckInToken } = await import('./checkin-token-crypto');

		const token = 'token-para-corrupcao';
		const encrypted = await encryptCheckInToken(token);

		// Corromper o ciphertext
		const parts = encrypted.split(':');
		parts[2] = 'Y29ycnVtcGlkbw=='; // base64 de "corrompido"
		const corrupted = parts.join(':');

		await expect(decryptCheckInToken(corrupted)).rejects.toThrow();
	});

	it('deve falhar com formato inválido', async () => {
		const { decryptCheckInToken } = await import('./checkin-token-crypto');

		await expect(decryptCheckInToken('nao-e-formato-valido')).rejects.toThrow(
			'formato esperado iv:authTag:ciphertext',
		);
		await expect(decryptCheckInToken('a:b')).rejects.toThrow();
		await expect(decryptCheckInToken('')).rejects.toThrow();
	});

	it('isCheckInEncryptionConfigured deve retornar true com chave válida', async () => {
		const { isCheckInEncryptionConfigured } = await import('./checkin-token-crypto');
		expect(await isCheckInEncryptionConfigured()).toBe(true);
	});

	it('isCheckInEncryptionConfigured deve retornar false sem chave', async () => {
		delete process.env.INVITATION_ENCRYPTION_KEY;
		vi.resetModules();

		const { isCheckInEncryptionConfigured } = await import('./checkin-token-crypto');
		expect(await isCheckInEncryptionConfigured()).toBe(false);
	});

	it('encrypt deve falhar sem chave configurada', async () => {
		delete process.env.INVITATION_ENCRYPTION_KEY;
		vi.resetModules();

		const { encryptCheckInToken } = await import('./checkin-token-crypto');
		await expect(encryptCheckInToken('token')).rejects.toThrow(
			'INVITATION_ENCRYPTION_KEY não configurada',
		);
	});

	it('deve lidar com tokens longos e caracteres especiais', async () => {
		const { encryptCheckInToken, decryptCheckInToken } = await import('./checkin-token-crypto');

		const token = 'token-com-caracteres-especiais-áéíóú-ñ-中文-🎉-' + 'x'.repeat(200);
		const encrypted = await encryptCheckInToken(token);
		const decrypted = await decryptCheckInToken(encrypted);

		expect(decrypted).toBe(token);
	});
});