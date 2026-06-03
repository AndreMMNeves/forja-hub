# Forja HUB

Worldbuilding studio com IA, RAG e edição estruturada. Você gera NPCs, itens, lugares (mais por vir), mantendo coerência com a lore do mundo via embeddings + biblioteca canônica.

> Estado atual: **MVP**. Gera NPC e Item, com RAG sobre entidades do mundo, biblioteca de livros (`.md`/`.txt`) e habilidades. Tudo editável, exportável e auditado.

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript strict
- Postgres + **pgvector** (Supabase)
- Prisma 6 ORM
- Zod 4 (validação) · TanStack Query · Zustand
- Tailwind 4
- **Anthropic** Claude Sonnet 4.6 (geração, via `messages.parse` + `zodOutputFormat`)
- **Voyage AI** `voyage-3-large` (embeddings, 1024d)

## Setup (10 minutos)

### 1. Supabase
1. Crie um projeto em [supabase.com](https://supabase.com). pgvector já vem habilitado.
2. Em **Connect → ORMs**, copie:
   - **Transaction pooler** (porta 6543) → `DATABASE_URL`
   - **Session pooler** (porta 5432) → `DIRECT_URL`

### 2. Chaves de API
- Anthropic: [console.anthropic.com](https://console.anthropic.com/settings/keys)
- Voyage AI: [dash.voyageai.com](https://dash.voyageai.com/api-keys)

### 3. Variáveis de ambiente
```bash
cp .env.example .env.local
# preencha DATABASE_URL, DIRECT_URL, ANTHROPIC_API_KEY, VOYAGE_API_KEY
```

### 4. Migrations e seed
```bash
pnpm install
pnpm db:migrate          # aplica a migration inicial (cria pgvector + tabelas + índices HNSW)
pnpm db:seed             # cria System 'Fantasia Genérica' + Generators + ModelPricing
```

### 5. Rode
```bash
pnpm dev
# http://localhost:3000
```

Fluxo: **/worlds/new** → cria mundo → clica em "+ Gerar" → escolhe NPC ou Item → preenche conceito-semente.

## Scripts úteis

| Comando | O que faz |
|---|---|
| `pnpm dev` | dev server (Turbopack) |
| `pnpm build` | build de produção |
| `pnpm typecheck` | tsc --noEmit |
| `pnpm test` | vitest run |
| `pnpm db:migrate` | aplica migrations pendentes |
| `pnpm db:migrate:dev` | cria migration nova a partir de mudança no schema |
| `pnpm db:seed` | (re)seed |
| `pnpm db:reset` | drop + recreate + reseed (cuidado!) |

## Arquitetura

Ver [`CLAUDE.md`](./CLAUDE.md) — documentação viva da arquitetura, decisões, convenções e roadmap.

Tl;dr:
- `src/core/` — motor puro (LLM, generators, RAG, engine) — **não** importa `next/*`.
- `src/app/` — App Router (UI + route handlers).
- `src/db/` — Prisma singleton + helpers raw SQL pra pgvector.
- `prisma/` — schema + migrations + seed.

## Backlog (fase 2+)

Tipos: LOCATION, FACTION, CREATURE, QUEST, ENCOUNTER · Books PDF · Geração em lote · Sessions/log de campanha · Habilidades canônicas · Grafo visual · Mais providers (Gemini, OpenAI-compatible) · Mais rulesets · Geração de imagem · Export VTT/PDF.
