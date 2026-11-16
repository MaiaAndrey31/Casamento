# Fronteiras de Dados Firestore — Regras Obrigatórias

## REGRA FUNDAMENTAL

**NENHUM DOCUMENTO BRUTO DO FIRESTORE ADMIN SDK PODE SER PASSADO DIRETAMENTE PARA UM CLIENT COMPONENT.**

Objetos como `Firestore Timestamp`, `DocumentReference` e `GeoPoint` **não são serializáveis** pelo React Server Components. Passá-los causa erro 500 em produção com digest como `130892069` ou `3739659173`.

---

## Arquitetura Obrigatória

```
Firestore Document (bruto)
    ↓
Repository (lê do Firestore)
    ↓
Serializer / Mapper (converte para DTO)
    ↓
DTO Serializável (plain object)
    ↓
Server Component → Client Component ✅
```

### Caminho ERRADO (causa erro 500):
```
Firestore Document → Server Component → Client Component ❌
```

---

## Serializer Centralizado

**Localização:** `src/lib/server/firestore-serializer.ts`

### Funções disponíveis:

| Função | Uso |
|--------|-----|
| `serializeFirestoreValue(value, fieldPath)` | Converte recursivamente qualquer valor do Firestore |
| `serializeFirestoreDoc(docId, data)` | Serializa documento completo, adicionando `id` |
| `serializeFirestoreDocs(docs)` | Serializa lista de documentos |
| `assertSerializable(value, context)` | Verifica em dev se há tipos incompatíveis |

### O que é convertido:

| Tipo Firestore | Conversão |
|---------------|-----------|
| `Timestamp` (`_seconds`, `_nanoseconds`) | String ISO 8601 |
| `DocumentReference` | `{ id, path }` |
| `GeoPoint` | `{ latitude, longitude }` |
| `Date` nativo | String ISO 8601 |
| Arrays | Cada elemento recursivamente |
| Plain objects | Cada propriedade recursivamente |
| Classes desconhecidas | `null` (erro logado em dev) |

---

## DTOs de Domínio

**Localização:** `src/lib/server/dto.ts`

Cada domínio tem um DTO explícito que define **APENAS** os campos permitidos:

| DTO | Campos Privados Removidos |
|-----|--------------------------|
| `EventSettingsDTO` | Nenhum campo sensível |
| `GuestDTO` | Nenhum campo sensível |
| `InvitationPublicDTO` | `tokenHash`, `encryptedToken`, `checkInTokenHash`, `guestIds` |
| `RSVPDTO` | `confirmedGuestIds` internos |
| `MessageDTO` | `approvedBy` (UID admin) |

### Mappers disponíveis:

```typescript
import { toEventSettingsDTO, toGuestDTO, toInvitationPublicDTO, toRSVPDTO, toMessageDTO } from '@/lib/server/dto';

// Exemplo de uso em repositório:
const doc = await adminDb.collection('events').doc(eventId).get();
return toEventSettingsDTO(doc.id, doc.data());
```

---

## Como Adicionar Novas Funcionalidades

### 1. Criar o DTO

```typescript
// src/lib/server/dto.ts
export interface NewFeatureDTO {
  id: string;
  name: string;
  createdAt: string | null; // SEMPRE string, nunca Timestamp
}

export function toNewFeatureDTO(docId: string, data: Record<string, unknown>): NewFeatureDTO {
  const s = serializeFirestoreDoc<Record<string, unknown>>(docId, data);
  return {
    id: docId,
    name: String(s.name || ''),
    createdAt: (s.createdAt as string) || null,
  };
}
```

### 2. Usar no Repositório

```typescript
import { toNewFeatureDTO } from '@/lib/server/dto';

export async function getNewFeature(id: string) {
  const doc = await adminDb.collection('features').doc(id).get();
  if (!doc.exists) return null;
  
  // ✅ CORRETO: usar mapper
  return toNewFeatureDTO(doc.id, doc.data());
  
  // ❌ ERRADO: retornar dado bruto
  // return { id: doc.id, ...doc.data() };
}
```

### 3. Verificar em Desenvolvimento

```typescript
import { assertSerializable } from '@/lib/server/firestore-serializer';

// Antes de passar para Client Component:
assertSerializable(data, 'MyComponent props');
```

---

## Repositórios Auditados

| Repositório | Status | Serializer Aplicado |
|------------|--------|-------------------|
| `event.repository.ts` | ✅ Corrigido | `toEventSettingsDTO()` |
| `guest.repository.ts` | ✅ Já usava | `sanitizeFirestoreData()` (legacy) |
| `invitation.repository.ts` | ✅ Corrigido | `serializeFirestoreValue()` |
| `rsvp.repository.ts` | ✅ Corrigido | `serializeFirestoreValue()` |
| `message.repository.ts` | ✅ Corrigido | `serializeFirestoreValue()` |
| `stats.repository.ts` | ⚠️ Pendente | Retorna dados brutos |

---

## Checklist para Code Review

- [ ] Nenhum `doc.data()` é passado diretamente para Client Component
- [ ] Todos os repositórios usam serializer/mapper antes de retornar
- [ ] DTOs não expõem campos privados (tokens, hashes, UIDs)
- [ ] Timestamps são convertidos para string ISO 8601
- [ ] Testes do serializer cobrem novos tipos
- [ ] `assertSerializable` é usado em componentes críticos durante dev

---

## Referências

- Serializer: `src/lib/server/firestore-serializer.ts`
- DTOs: `src/lib/server/dto.ts`
- Erro original: Vercel logs 2026-11-16, digest `130892069`