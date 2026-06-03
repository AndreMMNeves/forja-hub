// Regeneração de campos específicos de uma Entity existente.
// Trava o resto via "current" no prompt; só os campos pedidos são reescritos.
// Marca os campos regenerados como "generated" em Entity.fieldEdits.

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

const MAX_REGENERATE_ATTEMPTS = 2;

export interface RegenerateRequest {
  entityId: string;
  fields: string[]; // ex: ["personality", "hooks"]
  note?: string;
  model?: string;
  /** Se false, falha quando algum campo já foi marcado como "manual". Default: false. */
  overrideManualEdits?: boolean;
}

export interface RegenerateResult {
  entity: {
    id: string;
    name: string;
    summary: string | null;
    data: unknown;
    fieldEdits: unknown;
    updatedAt: Date;
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
    regenerated: string[];
  };
}

async function callLLMWithRetry<I, O>(
  gen: GeneratorDef<I, O>,
  input: I,
  world: WorldContext,
  rag: RagContext,
  current: { data: Record<string, unknown>; regenerateFields: string[] },
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

  for (let attempt = 1; attempt <= MAX_REGENERATE_ATTEMPTS; attempt++) {
    const prompt = gen.buildPrompt({ input, world, rag, current, note: extraNote });
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
      if (attempt >= MAX_REGENERATE_ATTEMPTS) break;
      const msg = err instanceof z.ZodError
        ? `Sua resposta anterior falhou na validação: ${JSON.stringify(err.issues).slice(0, 800)}`
        : `Sua resposta anterior falhou: ${(err as Error).message}`.slice(0, 800);
      extraNote = [note, msg, "Refaça respeitando o schema."].filter(Boolean).join("\n");
    }
  }
  throw new Error(
    `Regeneração falhou após ${MAX_REGENERATE_ATTEMPTS} tentativas: ${(lastError as Error)?.message ?? lastError}`,
  );
}

export async function regenerateFields(
  req: RegenerateRequest,
): Promise<RegenerateResult> {
  const startedAt = Date.now();

  const entity = await prisma.entity.findUnique({
    where: { id: req.entityId },
    include: { world: { include: { system: true } } },
  });
  if (!entity) throw new Error(`Entity não encontrada: ${req.entityId}`);

  const generators = (await import("@/core/generators/registry")).listGenerators();
  const gen = generators.find((g) => g.entityType === entity.type);
  if (!gen) {
    throw new Error(
      `Sem generator built-in para o tipo '${entity.type}' — regeneração indisponível.`,
    );
  }

  const currentData = entity.data as Record<string, unknown>;
  const currentEdits = (entity.fieldEdits as Record<string, "manual" | "generated">) ?? {};

  // Idempotência: bloqueia regen de campo marcado como manual.
  if (!req.overrideManualEdits) {
    const manualConflicts = req.fields.filter((f) => currentEdits[f] === "manual");
    if (manualConflicts.length > 0) {
      throw new Error(
        `Campos editados manualmente bloqueiam regeneração: ${manualConflicts.join(", ")}. ` +
          `Passe overrideManualEdits=true para forçar.`,
      );
    }
  }

  const world: WorldContext = {
    id: entity.world.id,
    name: entity.world.name,
    description: entity.world.description,
    tone: entity.world.tone,
    language: entity.world.language,
    system: {
      name: entity.world.system.name,
      description: entity.world.system.description,
    },
  };

  const queryText = [entity.name, entity.summary ?? "", req.note ?? ""]
    .filter(Boolean)
    .join("\n");
  const { rag, embedTokens, embedModel } = await retrieveContext({
    query: queryText,
    worldId: entity.worldId,
    excludeEntityId: entity.id,
  });

  // Para regeneração, reconstruímos um "input" mínimo do brief original.
  // No MVP: re-usamos o nome+summary como brief.
  const dummyInput = gen.inputSchema.parse({
    brief: `${entity.name} — ${entity.summary ?? ""}`,
  });

  const llmRes = await callLLMWithRetry(
    gen,
    dummyInput,
    world,
    rag,
    { data: currentData, regenerateFields: req.fields },
    req.note,
    req.model,
  );

  // Merge: pega só os campos pedidos; mantém o resto original.
  const newData: Record<string, unknown> = { ...currentData };
  const llmOutput = llmRes.output as Record<string, unknown>;
  const regenerated: string[] = [];
  for (const field of req.fields) {
    if (field in llmOutput) {
      newData[field] = llmOutput[field];
      regenerated.push(field);
    }
  }
  const newEdits: Record<string, "manual" | "generated"> = { ...currentEdits };
  for (const f of regenerated) newEdits[f] = "generated";

  const { name, summary } = gen.extractEntity(newData as never);

  const { updated, log } = await prisma.$transaction(async (tx) => {
    const updated = await tx.entity.update({
      where: { id: entity.id },
      data: { name, summary, data: newData as object, fieldEdits: newEdits as object },
    });
    const log = await tx.generationLog.create({
      data: {
        generatorSlug: gen.slug,
        entityId: entity.id,
        provider: llmRes.provider,
        model: llmRes.model,
        promptTokens: llmRes.inputTokens,
        completionTokens: llmRes.outputTokens,
        inputJson: { regenerateFields: req.fields, note: req.note ?? null } as object,
        ragRefs: {
          entityIds: rag.entities.map((s) => s.id),
          abilityIds: rag.abilities.map((s) => s.id),
          chunkIds: rag.bookChunks.map((s) => s.id),
        } as object,
        durationMs: Date.now() - startedAt,
      },
    });
    return { updated, log };
  });

  // Re-embed (conteúdo mudou).
  const embedder = getEmbedder();
  const docText = `${name}\n${summary}\n${JSON.stringify(newData)}`.slice(0, 8000);
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
      id: updated.id,
      name: updated.name,
      summary: updated.summary,
      data: updated.data,
      fieldEdits: updated.fieldEdits,
      updatedAt: updated.updatedAt,
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
      regenerated,
    },
  };
}
