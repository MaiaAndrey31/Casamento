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

---

## Organização de Mesas

O módulo de **Organização de Mesas** permite que os administradores criem mesas com capacidades configuráveis e distribuam individualmente todos os convidados confirmados (titulares e acompanhantes) entre as mesas do evento.

Acesso: `/admin/mesas` no painel administrativo (disponível em desktop e mobile).

### Como funciona

1. **Criar mesas:** defina nome/identificação e capacidade (número de lugares). Ex: "Mesa 01 — 8 lugares", "Família — 12 lugares".
2. **Distribuir convidados:** pesquise participantes confirmados pelo nome e atribua a qualquer mesa com vagas disponíveis. Cada participante (titular ou acompanhante) é organizado individualmente.
3. **Gerenciar ocupação:** visualize barras de progresso, transfira participantes entre mesas e remova atribuições. A capacidade é validada no servidor via transações Firestore.
4. **Dashboard:** indicadores em tempo real de total de mesas, lugares totais, ocupados, disponíveis e convidados ainda sem mesa.

### Regras de capacidade e distribuição

- Cada mesa respeita sua capacidade configurada. Operações que ultrapassariam o limite são bloqueadas no servidor.
- Um participante não pode ser atribuído a duas mesas simultaneamente (unicidade garantida por transação).
- Não é possível reduzir a capacidade de uma mesa abaixo da ocupação atual — remova participantes primeiro.
- Não é possível excluir mesas que possuem participantes atribuídos — remova-os primeiro.
- Convidados inativos (`active: false`) não podem receber novas atribuições.
- A organização **não altera** RSVP, check-in ou convites. É um módulo independente.

### Integração com convidados e acompanhantes

- O módulo consulta RSVPs confirmados para listar participantes disponíveis (guests + companions com `participantId` persistente).
- Acompanhantes extras aprovados via fluxo de check-in aparecem automaticamente na lista de disponíveis.
- Quando um convidado é desativado, sua atribuição permanece como histórico mas ele deixa de aparecer como disponível para novas atribuições.
- Reativar um convidado não restaura automaticamente uma atribuição antiga — ele deve ser reatribuído manualmente.

### Coleções Firestore

| Coleção | Descrição |
|---------|-----------|
| `events/{eventId}/tables/{tableId}` | Mesas: `name`, `capacity`, `createdAt`, `updatedAt`, `createdBy` |
| `events/{eventId}/tableAssignments/{assignmentId}` | Atribuições: `tableId`, `invitationId`, `participantId`, `participantName`, `participantType`, `assignedAt`, `assignedBy` |

Regras de segurança: leitura e escrita restritas a administradores autenticados (`isAdmin()`).

### Auditoria

Todas as operações registram logs na coleção `auditLogs`:
- `table.created` / `table.updated` / `table.deleted`
- `table.assignment.created` / `table.assignment.removed` / `table.assignment.transferred`

Cada log contém `actorId`, `timestamp`, `targetId` e metadados relevantes.

### Índices Firestore necessários

Atualmente **nenhum índice composto novo é necessário**. As consultas do módulo usam:
- `tables.orderBy('name')` — índice simples automático
- `tableAssignments.where('tableId', '==', ...)` — índice simples automático
- `tableAssignments.where('participantId', '==', ...)` — índice simples automático
- `tableAssignments.count()` — suportado sem índice composto

Se futuramente forem adicionadas consultas combinando `where` + `orderBy` em `tableAssignments`, novos índices deverão ser declarados em `firestore.indexes.json`.

### Limitações conhecidas

- A busca de participantes disponíveis carrega todos os RSVPs confirmados em memória. Para eventos com milhares de confirmações, considerar paginação futura.
- Drag-and-drop não foi implementado; toda a interação é via botões e seletores (funcional em mobile).
- Não há exportação/impressão da lista de mesas. Pode ser adicionado futuramente.