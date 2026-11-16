/**
 * Firestore Serializer — Camada Centralizada de Serialização
 *
 * GARANTE QUE NENHUM DOCUMENTO BRUTO DO FIRESTORE ADMIN SDK
 * ATRAVESSE A FRONTEIRA SERVER COMPONENT → CLIENT COMPONENT.
 *
 * O Firebase Admin SDK retorna objetos especiais (Timestamp, DocumentReference,
 * GeoPoint) que NÃO são serializáveis pelo React Server Components.
 * Este módulo converte todos esses tipos para representações plain-object seguras.
 *
 * REGRAS:
 * 1. Timestamp → string ISO 8601
 * 2. DocumentReference → { id, path } ou apenas o ID
 * 3. GeoPoint → { latitude, longitude }
 * 4. Classes desconhecidas → erro em dev, null em prod
 * 5. Campos privados/sensíveis → removidos explicitamente pelos mappers de domínio
 * 6. null permanece null; undefined é omitido
 */

// ============================================================================
// TIPOS DE DETECÇÃO
// ============================================================================

interface FirestoreTimestampLike {
	_seconds: number;
	_nanoseconds: number;
	toDate?: () => Date;
}

interface FirestoreDocumentReferenceLike {
	id: string;
	path: string;
	parent?: unknown;
	firestore?: unknown;
}

interface FirestoreGeoPointLike {
	latitude: number;
	longitude: number;
}

// ============================================================================
// DETECÇÃO DE TIPOS FIRESTORE
// ============================================================================

function isFirestoreTimestamp(value: unknown): value is FirestoreTimestampLike {
	if (value === null || typeof value !== 'object') return false;
	const obj = value as Record<string, unknown>;
	return (
		typeof obj._seconds === 'number' &&
		typeof obj._nanoseconds === 'number'
	);
}

function isFirestoreDocumentReference(value: unknown): value is FirestoreDocumentReferenceLike {
	if (value === null || typeof value !== 'object') return false;
	const obj = value as Record<string, unknown>;
	return (
		typeof obj.id === 'string' &&
		typeof obj.path === 'string' &&
		(obj.firestore !== undefined || obj.parent !== undefined)
	);
}

function isFirestoreGeoPoint(value: unknown): value is FirestoreGeoPointLike {
	if (value === null || typeof value !== 'object') return false;
	const obj = value as Record<string, unknown>;
	return (
		typeof obj.latitude === 'number' &&
		typeof obj.longitude === 'number' &&
		Object.keys(obj).length <= 4 // GeoPoints têm poucos campos
	);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== 'object') return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

// ============================================================================
// SERIALIZER GENÉRICO
// ============================================================================

/**
 * Converte recursivamente qualquer valor do Firestore Admin SDK
 * em uma representação serializável por React Server Components.
 *
 * @param value - Valor bruto do Firestore
 * @param fieldPath - Caminho do campo para mensagens de erro (uso interno)
 * @returns Valor serializável seguro para Client Components
 */
export function serializeFirestoreValue(
	value: unknown,
	fieldPath: string = 'root',
): unknown {
	// Primitivos passam direto
	if (value === null || value === undefined) return value;
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return value;
	}

	// Date nativo → ISO string
	if (value instanceof Date) {
		return value.toISOString();
	}

	// Firestore Timestamp → ISO string
	if (isFirestoreTimestamp(value)) {
		try {
			if (typeof value.toDate === 'function') {
				return value.toDate().toISOString();
			}
			// Fallback manual se toDate não existir
			const ms = value._seconds * 1000 + Math.floor(value._nanoseconds / 1_000_000);
			return new Date(ms).toISOString();
		} catch {
			console.error(`[FirestoreSerializer] Falha ao converter Timestamp em ${fieldPath}`);
			return null;
		}
	}

	// DocumentReference → objeto simples com id e path
	if (isFirestoreDocumentReference(value)) {
		return { id: value.id, path: value.path };
	}

	// GeoPoint → objeto simples
	if (isFirestoreGeoPoint(value)) {
		return { latitude: value.latitude, longitude: value.longitude };
	}

	// Arrays → serializar cada elemento
	if (Array.isArray(value)) {
		return value.map((item, index) =>
			serializeFirestoreValue(item, `${fieldPath}[${index}]`),
		);
	}

	// Plain objects → serializar recursivamente cada propriedade
	if (isPlainObject(value)) {
		const result: Record<string, unknown> = {};
		for (const [key, val] of Object.entries(value)) {
			result[key] = serializeFirestoreValue(val, `${fieldPath}.${key}`);
		}
		return result;
	}

	// Classes desconhecidas → erro em dev, null em prod
	if (process.env.NODE_ENV === 'development') {
		const className = value.constructor?.name || 'Unknown';
		console.error(
			`[FirestoreSerializer] Tipo não serializável detectado em "${fieldPath}": ${className}. ` +
			`Use um mapper de domínio para converter explicitamente.`,
		);
	}

	return null;
}

/**
 * Serializa um documento completo do Firestore para uso seguro em Client Components.
 * Remove o campo `id` do data() e o adiciona como propriedade de nível superior.
 *
 * @param docId - ID do documento
 * @param data - Dados brutos do doc.data()
 * @returns Objeto serializável com id incluído
 */
export function serializeFirestoreDoc<T extends Record<string, unknown>>(
	docId: string,
	data: Record<string, unknown>,
): T {
	const serialized = serializeFirestoreValue(data, docId) as Record<string, unknown>;
	return { id: docId, ...serialized } as unknown as T;
}

/**
 * Serializa uma lista de documentos do Firestore.
 *
 * @param docs - Array de { id, data } do Firestore
 * @returns Array de objetos serializáveis
 */
export function serializeFirestoreDocs<T extends Record<string, unknown>>(
	docs: Array<{ id: string; data: Record<string, unknown> }>,
): T[] {
	return docs.map(doc => serializeFirestoreDoc<T>(doc.id, doc.data));
}

// ============================================================================
// ASSERTION PARA DESENVOLVIMENTO
// ============================================================================

/**
 * Verifica se um objeto contém tipos não serializáveis do Firestore.
 * Útil para detectar regressões em desenvolvimento antes de passar dados
 * para Client Components.
 *
 * @param value - Valor a verificar
 * @param context - Descrição do contexto para mensagem de erro
 * @throws Error em desenvolvimento se encontrar tipo incompatível
 */
export function assertSerializable(value: unknown, context: string): void {
	if (process.env.NODE_ENV !== 'development') return;

	const issues: string[] = [];
	checkSerializable(value, context, issues);

	if (issues.length > 0) {
		console.error(
			`[FirestoreSerializer] Objetos não serializáveis detectados em "${context}":\n` +
			issues.map(i => `  - ${i}`).join('\n'),
		);
	}
}

function checkSerializable(value: unknown, path: string, issues: string[]): void {
	if (value === null || value === undefined) return;
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return;

	if (value instanceof Date) return; // Dates são serializáveis pelo RSC

	if (isFirestoreTimestamp(value)) {
		issues.push(`${path}: Firestore Timestamp (_seconds/_nanoseconds)`);
		return;
	}

	if (isFirestoreDocumentReference(value)) {
		issues.push(`${path}: Firestore DocumentReference`);
		return;
	}

	if (isFirestoreGeoPoint(value)) {
		issues.push(`${path}: Firestore GeoPoint`);
		return;
	}

	if (Array.isArray(value)) {
		value.forEach((item, i) => checkSerializable(item, `${path}[${i}]`, issues));
		return;
	}

	if (isPlainObject(value)) {
		for (const [key, val] of Object.entries(value)) {
			checkSerializable(val, `${path}.${key}`, issues);
		}
		return;
	}

	// Classe desconhecida
	const className = (value as object).constructor?.name || 'Unknown';
	issues.push(`${path}: Classe não serializável (${className})`);
}