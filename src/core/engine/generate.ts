// Motor principal de geração.
// Fluxo: load → RAG → buildPrompt → LLM (com retry Zod) → persist Entity →
// embed + save vector → log custo. Tudo em uma transação curta no fim.

import { z } from "zod";
import { prisma } from "@/db/client";
import { getEmbedder, getLLM } from "@/core/llm";
import { estimateGenerationCost, estimateEmbedCost } from "@/lib/cost";
import { setEntityEmbedding } from "@/db/vector";
import { getGenerator } from "@/core/generators/registry";
import { retrieveContext } from "./rag";
import type {
  GeneratorDef,
  RagContext,
  WorldContext,
} from "@/core/generators/types";

const MAX_GENERATE_ATTEMPTS = 2;

export interface GenerateRequest {
  generatorSlug: string;
  worldId: string;
  input: unknown;
  campaignId?: string;
  note?: string;
  tags?: string[];
  /** Override de modelo Anthropic para essa chamada. */
  model?: string;
}

export interface GenerateResult {
  entity: {
    id: string;
    type: string;
    name: string;
    summary: string | null;
    data: unknown;
    tags: string[];
    createdAt: Date;
  };
  generation: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number | null;
    embedTokens: number;
    embedCostUsd: number | null;
    totalCostUsd: number | null;
    durationMs: number;
    ragRefs: {
      entityIds: string[];
      abilityIds: string[];
      chunkIds: string[];
    };
  };
}

async function loadWorld(worldId: string): Promise<WorldContext> {
  const w = await prisma.world.findUnique({
    where: { id: worldId },
    include: { system: true },
  });
  if (!w) throw new Error(`World não encontrado: ${worldId}`);
  return {
    id: w.id,
    name: w.name,
    description: w.description,
    tone: w.tone,
    language: w.language,
    system: { name: w.system.name, description: w.system.description },
  };
}

function summarizeForEmbedding(
  name: string,
  summary: string,
  data: unknown,
): string {
  const dataStr = typeof data === "string" ? data : JSON.stringify(data);
  return `${name}\n${summary}\n${dataStr}`.slice(0, 8000);
}

function collectRagIds(rag: RagContext): {
  entityIds: string[];
  abilityIds: string[];
  chunkIds: string[];
} {
  return {
    entityIds: rag.entities.map((s) => s.id),
    abilityIds: rag.abilities.map((s) => s.id),
    chunkIds: rag.bookChunks.map((s) => s.id),
  };
}

async function callLLMWithRetry<I, O>(
  gen: GeneratorDef<I, O>,
  input: I,
  world: WorldContext,
  rag: RagContext,
  note: string | undefined,
  model: string | undefined,
): Promise<{
  output: O;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  model: string;
  provider: string;
}> {
  const llm = getLLM();
  let lastError: unknown = null;
  let extraNote = note;

  for (let attempt = 1; attempt <= MAX_GENERATE_ATTEMPTS; attempt++) {
    const prompt = gen.buildPrompt({ input, world, rag, note: extraNote });
    try {
      const res = await llm.generateStructured({
        schema: gen.outputSchema,
        schemaName: gen.slug,
        systemPrompt: prompt.system,
        userPrompt: prompt.user,
        ...(model ? { model } : {}),
        ...(gen.maxTokens ? { maxTokens: gen.maxTokens } : {}),
      });
      return {
        output: res.data,
        inputTokens: res.usage.inputTokens,
        outputTokens: res.usage.outputTokens,
        durationMs: res.durationMs,
        model: res.model,
        provider: res.provider,
      };
    } catch (err) {
      lastError = err;
      if (attempt >= MAX_GENERATE_ATTEMPTS) break;
      const msg = err instanceof z.ZodError
        ? `Sua resposta anterior falhou na validação: ${JSON.stringify(err.issues).slice(0, 800)}`
        : `Sua resposta anterior falhou: ${(err as Error).message}`.slice(0, 800);
      extraNote = [note, msg, "Refaça respeitando o schema."].filter(Boolean).join("\n");
    }
  }
  throw new Error(
    `Geração falhou após ${MAX_GENERATE_ATTEMPTS} tentativas: ${(lastError as Error)?.message ?? lastError}`,
  );
}

export async function generate(req: GenerateRequest): Promise<GenerateResult> {
  const startedAt = Date.now();
  const gen = getGenerator(req.generatorSlug);

  const inputParsed = gen.inputSchema.safeParse(req.input);
  if (!inputParsed.success) {
    throw new Error(
      `Input inválido pro generator '${req.generatorSlug}': ${JSON.stringify(inputParsed.error.issues)}`,
    );
  }
  const input = inputParsed.data;

  const world = await loadWorld(req.worldId);

  const queryText = [
    (input as { brief?: string }).brief ?? "",
    req.note ?? "",
  ]
    .filter(Boolean)
    .join("\n");
  const { rag, embedTokens, embedModel } = await retrieveContext({
    query: queryText || gen.name,
    worldId: req.worldId,
  });

  const llmRes = await callLLMWithRetry(
    gen,
    input,
    world,
    rag,
    req.note,
    req.model,
  );

  const { name, summary } = gen.extractEntity(llmRes.output);
  const ragRefs = collectRagIds(rag);
  const tags = req.tags ?? [];

  // Persistência + log em transação curta.
  const { entity, log } = await prisma.$transaction(async (tx) => {
    const entity = await tx.entity.create({
      data: {
        worldId: req.worldId,
        ...(req.campaignId ? { campaignId: req.campaignId } : {}),
        type: gen.entityType,
        name,
        summary,
        data: llmRes.output as object,
        tags,
      },
    });
    const log = await tx.generationLog.create({
      data: {
        generatorSlug: req.generatorSlug,
        entityId: entity.id,
        provider: llmRes.provider,
        model: llmRes.model,
        promptTokens: llmRes.inputTokens,
        completionTokens: llmRes.outputTokens,
        inputJson: req.input as object,
        ragRefs: ragRefs as object,
        durationMs: Date.now() - startedAt,
      },
    });
    return { entity, log };
  });

  // Embedding + cost — fora da transação porque é o passo "side-effect" que
  // pode ser retentado/ignorado sem invalidar a entidade.
  const embedder = getEmbedder();
  const docText = summarizeForEmbedding(name, summary, llmRes.output);
  const embedRes = await embedder.embed({
    texts: [docText],
    inputType: "document",
  });
  const docVec = embedRes.embeddings[0];
  if (docVec) await setEntityEmbedding(entity.id, docVec);

  const totalEmbedTokens = embedTokens + embedRes.totalTokens;
  const [genCost, embedCost] = await Promise.all([
    estimateGenerationCost(
      llmRes.provider,
      llmRes.model,
      llmRes.inputTokens,
      llmRes.outputTokens,
    ),
    estimateEmbedCost(embedder.name, embedModel, totalEmbedTokens),
  ]);
  const totalCost =
    genCost !== null && embedCost !== null ? genCost + embedCost : null;

  await prisma.generationLog.update({
    where: { id: log.id },
    data: { costUsd: totalCost ?? genCost },
  });

  return {
    entity: {
      id: entity.id,
      type: entity.type,
      name: entity.name,
      summary: entity.summary,
      data: entity.data,
      tags: entity.tags,
      createdAt: entity.createdAt,
    },
    generation: {
      provider: llmRes.provider,
      model: llmRes.model,
      inputTokens: llmRes.inputTokens,
      outputTokens: llmRes.outputTokens,
      costUsd: genCost,
      embedTokens: totalEmbedTokens,
      embedCostUsd: embedCost,
      totalCostUsd: totalCost,
      durationMs: Date.now() - startedAt,
      ragRefs,
    },
  };
}
