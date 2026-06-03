@AGENTS.md

# Forja HUB — guia pro Claude (e humanos)

Documentação viva da arquitetura, decisões e convenções. Atualize quando algo importante mudar.

## Visão

HUB centralizado pra worldbuilding com IA: Mestre de RPG cria mundos, campanhas e ideias; gera entidades estruturadas (NPC, Item, …) com RAG sobre a própria lore e livros canônicos do sistema; edita à mão livremente; exporta.

Hierarquia: **System** (D&D 5e, Tormenta, custom…) → **World** (lore) → **Campaign** (jogo vivo).

## Princípios não-negociáveis

1. **TypeScript strict** sem `any` solto. `noUncheckedIndexedAccess` ligado.
2. **Output do LLM sempre validado por Zod** antes de persistir (via `messages.parse` + `zodOutputFormat`). Retry máx 2x.
3. **Sistema-agnóstico via `System`**: schemas, livros, habilidades e ficha vivem por System.
4. **Edição manual nunca é sobrescrita silenciosamente.** Campos editados ganham `fieldEdits[campo]='manual'`; regeneração só passa por cima com `overrideManualEdits=true`.
5. **Custo visível.** Cada chamada vira `GenerationLog` com tokens e USD. Preço de modelo vive na tabela `ModelPricing`, sem hardcode.
6. **Provider-agnostic** via `LLMProvider` / `EmbeddingProvider`. Trocar adapter ≠ refactor de motor.
7. **PT-BR** por padrão. Idioma é campo do `World`.
8. **`src/core/` não importa `next/*`**. Motor é puro, testável isoladamente.

## Topologia

```
src/
  core/                     # motor — puro
    llm/
      provider.ts           # interfaces LLMProvider, EmbeddingProvider
      anthropic.ts          # Claude Sonnet 4.6 via messages.parse
      voyage.ts             # voyage-3-large embeddings (1024d)
      index.ts              # getLLM(), getEmbedder() singletons
    generators/
      types.ts              # GeneratorDef<I,O>, RagContext, WorldContext
      npc.ts | item.ts      # cada gerador = Zod schemas + buildPrompt + extractEntity
      registry.ts           # lookup por slug
      prompt-utils.ts       # blocos reutilizáveis (World, RAG)
    engine/
      rag.ts                # retrieveContext: kNN em entities + abilities + book chunks
      generate.ts           # fluxo principal
      regenerate.ts         # regen por campo
  db/
    client.ts               # Prisma singleton
    vector.ts               # $queryRaw helpers de pgvector (Prisma não tira Unsupported)
  lib/
    cost.ts                 # estimateGenerationCost / estimateEmbedCost
    export/markdown.ts      # entityToMarkdown
  app/                      # Next 16 App Router
    layout.tsx              # HUB sidebar + tema dark
    page.tsx                # Dashboard
    worlds/...              # codex + gerar + detalhe + edit/regen
    api/                    # route handlers
prisma/
  schema.prisma             # System, World, Campaign, Entity, EntityLink,
                            # Character, Ability, Book, BookChunk, Idea,
                            # Generator, GenerationLog, ModelPricing
  migrations/               # inclui CREATE EXTENSION vector + índices HNSW custom
  seed.ts                   # pricing + System "Fantasia Genérica" + Generators
```

## Fluxo de geração

`POST /api/generate` → `generate()`:

1. `getGenerator(slug)` e `inputSchema.safeParse(input)`
2. `loadWorld(worldId)` (com System)
3. `retrieveContext({query, worldId})` — embedda query (Voyage `query`), kNN top-K em Entity, Ability, BookChunk
4. `gen.buildPrompt({input, world, rag, note})` → `{system, user}`
5. `llm.generateStructured({schema, …})` (Anthropic `messages.parse` valida Zod nativamente). Retry 2x com mensagem de erro injetada.
6. Transação: cria `Entity` + `GenerationLog`
7. Embedda summary+data (Voyage `document`) e grava via `$executeRaw` em `Entity.embedding`
8. Atualiza `GenerationLog.costUsd` (gen + embed)

## Regeneração por campo

`POST /api/entities/[id]/regenerate { fields, note?, overrideManualEdits? }`:

- Carrega entity, valida que nenhum dos `fields` está em `fieldEdits[*]='manual'` (a menos que `override`)
- Roda mesmo prompt builder, passando `current: { data, regenerateFields }`
- Faz **merge parcial**: só os `fields` são substituídos
- Marca `fieldEdits[campo]='generated'`
- Re-embedda

## Padrões de prompt

- `systemPrompt`: persona (loremaster), idioma travado, sistema/tom do mundo, princípios de geração.
- `userPrompt`: bloco `## Mundo`, `## Contexto recuperado (RAG)` (Entidades + Habilidades + Trechos), `## Pedido do Mestre`, opcional `## Regeneração parcial`, opcional `## Nota adicional`.
- Zod schemas usam `.describe()` em cada campo — vai pro JSON Schema → vai pro modelo.

## pgvector

- Dimensão: **1024** (voyage-3-large), travada via `vector(1024)` em Entity, Character, Ability, BookChunk, Idea.
- Operador: cosine (`<=>`). Embeddings Voyage são normalizados, então cosine ≈ inner product.
- Índices: HNSW por tabela (defaults `m=16, ef_construction=64`).
- Prisma trata como `Unsupported("vector(1024)")` — leitura/escrita por `$queryRaw` / `$executeRaw` em `src/db/vector.ts`.

## Adicionando um gerador novo

1. Criar `src/core/generators/<slug>.ts` com `inputSchema`, `outputSchema`, `buildPrompt`, `extractEntity`.
2. Registrar em `src/core/generators/registry.ts`.
3. `pnpm db:seed` re-popula a tabela `Generator` lendo do registry (idempotente).
4. UI atual só conhece NPC e Item — adicionar opção em `app/worlds/[id]/generate/page.tsx`.

## Adicionando um provider novo

1. Implementar `LLMProvider` ou `EmbeddingProvider` em `src/core/llm/<provider>.ts`.
2. Trocar a factory em `src/core/llm/index.ts` (idealmente via env `LLM_PROVIDER`).
3. Seed `ModelPricing` com o novo modelo.

## Decisões registradas

- **Prisma 6, não 7.** Prisma 7 tem bug com Node 20 + `@prisma/dev` (ESM/CJS). Voltar quando estável.
- **Tabela `Character` separada de `Entity`.** PCs têm ficha completa do System; NPCs não. Forçar tudo num só seria caro.
- **Tabela `Ability` com `systemId XOR worldId`.** Check constraint na migration.
- **Prompt como TS, não string em DB.** `Generator.promptTemplate` é só nota humana; runtime usa o builder TS do registry.
- **`messages.parse` + `zodOutputFormat`** em vez de tool use manual — SDK 0.100+ trata tudo.
- **Embedding fora da transação principal.** Falha de Voyage não invalida a Entity já persistida; só fica sem vetor (e sem aparecer em RAG até reprocessar).

## Roadmap (não construído ainda)

- LOCATION, FACTION, CREATURE, QUEST, ENCOUNTER, LOOT_TABLE
- Ingestão de Books PDF (atualmente só `.md`/`.txt`)
- Campaign Sessions + log + recap
- Habilidades canônicas + homebrew na UI
- Geração em lote ("popular cidade com 12 NPCs")
- Cmd+K busca global, Cmd+I quick capture
- Grafo visual de relações
- Providers Gemini / OpenAI / ModelArk
- Editor de Ruleset pela UI
- Geração de imagem
- Export VTT (Foundry/Roll20) e PDF
