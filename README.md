# Casamento Andrey & Amanda

Site e sistema administrativo do casamento de Andrey e Amanda, desenvolvido com Next.js 15, React, TypeScript e Firebase (Authentication + Firestore + Admin SDK).

## Requisitos

- Node.js 20+
- npm ou pnpm
- Conta no Firebase com projeto `casamento-2d790`

## Instalação

```bash
npm install
```

Configure as variáveis de ambiente copiando `.env.local.example` para `.env.local` e preenchendo com as credenciais do Firebase Admin SDK.

## Comandos

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run start        # Servidor de produção
npm test             # Testes automatizados (Vitest)
npx tsc --noEmit     # Verificação de tipos TypeScript
```

---

## Índices do Firestore

O projeto utiliza índices compostos do Firestore para consultas que combinam filtros (`where`) com ordenação (`orderBy`). Sem esses índices, as consultas retornam o erro `FAILED_PRECONDITION: The query requires an index`.

### Arquivo de configuração local

Os índices são declarados em [`firestore.indexes.json`](./firestore.indexes.json) na raiz do projeto. Este arquivo é a fonte de verdade local e deve ser mantido sincronizado com os índices criados no Firebase Console.

### Índices atuais

| # | Coleção | Campos | Justificativa |
|---|---------|--------|---------------|
| 1 | `invitations` | `tokenHash` ASC + `invitationStatus` ASC | Busca de convite por token hash com filtro de status ativo |
| 2 | `invitations` | `checkInTokenHash` ASC + `invitationStatus` ASC | Validação de QR Code por check-in token hash |
| 3 | `guests` | `invitationId` ASC + `active` ASC | Listagem de guests ativos por convite |
| 4 | `guests` | `active` ASC + `fullName` ASC | Busca manual de convidados por nome |
| 5 | `checkins` | `guestId` ASC + `invitationId` ASC | Detecção de check-ins legados por guest + convite |
| 6 | `messages` | `authorName` ASC + `createdAt` ASC | Listagem de recados ordenados por autor e data |
| 7 | `rsvps` | `attendanceStatus` ASC + `submittedAt` DESC | Listagem paginada de RSVPs confirmados |
| 8 | `checkins` | `invitationId` ASC + `checkedInAt` DESC | Últimas entradas e resumo da recepção |
| 9 | `admins` | `type` ASC + `displayName` ASC | Listagem de validadores ordenados por nome |

### Como criar índices manualmente pelo Firebase Console

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto `casamento-2d790`
3. No menu lateral, clique em **Firestore Database** → aba **Indexes**
4. Clique em **Add Index**
5. Preencha a coleção e os campos conforme a tabela acima
6. Clique em **Create**
7. Aguarde a criação (pode levar alguns minutos)

> **Nota:** O campo `__name__` (ASCENDING) é adicionado automaticamente pelo Firestore como último campo de todo índice composto. Não é necessário incluí-lo manualmente.

### Como publicar índices pela Firebase CLI

Para sincronizar todos os índices declarados em `firestore.indexes.json` com o projeto Firebase:

```bash
# 1. Instalar a Firebase CLI globalmente (se ainda não instalada)
npm install -g firebase-tools

# 2. Autenticar com sua conta Google
firebase login

# 3. Verificar os projetos disponíveis
firebase projects:list

# 4. Publicar apenas os índices do Firestore
npx firebase deploy --only firestore:indexes --project casamento-2d790
```

> ⚠️ **ATENÇÃO:** O comando acima é apenas para referência. Não execute sem autorização explícita do administrador do projeto.

### Como verificar se os índices estão ativos

1. **Via Firebase Console:** Firestore Database → aba **Indexes**. Cada índice exibe o status "Enabled" quando está pronto.
2. **Via Firebase CLI:**
   ```bash
   npx firebase firestore:indexes --project casamento-2d790
   ```
   Este comando lista todos os índices existentes no projeto remoto.

### Como resolver erros `FAILED_PRECONDITION`

Quando uma consulta Firestore retorna o erro:

```
FAILED_PRECONDITION: The query requires an index.
```

Isso significa que a combinação de `where()` + `orderBy()` utilizada não possui um índice composto correspondente.

**Passos para resolver:**

1. Identifique a coleção, os campos filtrados e o campo de ordenação na mensagem de erro ou nos logs do servidor.
2. Verifique se o índice já existe em `firestore.indexes.json`.
3. Se não existir, adicione-o ao arquivo seguindo o formato existente.
4. Crie o índice no Firebase Console manualmente OU publique via Firebase CLI.
5. Aguarde a criação completar (status "Enabled").
6. Teste a consulta novamente.

**Exemplo de erro comum:**

```
The query requires an index on collection 'admins' with fields:
  - type (ASCENDING)
  - displayName (ASCENDING)
```

Solução: adicionar ao `firestore.indexes.json`:

```json
{
  "collectionGroup": "admins",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "type", "order": "ASCENDING" },
    { "fieldPath": "displayName", "order": "ASCENDING" }
  ]
}
```

E criar o índice no Firebase Console ou publicar via CLI.

### Boas práticas

- Sempre declare novos índices em `firestore.indexes.json` antes de criar no Console, para manter o arquivo como fonte de verdade.
- Não adicione índices especulativos — cada índice consome armazenamento e aumenta o tempo de escrita.
- Consulte a [documentação oficial do Firestore sobre índices](https://firebase.google.com/docs/firestore/query-data/indexing) para detalhes avançados.
- Ao remover uma consulta do código, considere remover o índice correspondente após confirmar que nenhuma outra consulta o utiliza.