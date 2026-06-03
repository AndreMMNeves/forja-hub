// Forja HUB — Contratos compartilhados de geradores.

import type { EntityType } from "@prisma/client";
import type { z } from "zod";

export interface WorldContext {
  id: string;
  name: string;
  description: string | null;
  tone: string | null;
  language: string;
  system: { name: string; description: string | null };
}

export interface RagSnippet {
  id: string;
  label: string;
  text: string;
  source: "entity" | "ability" | "book";
  sourceMeta?: Record<string, unknown>;
}

export interface RagContext {
  entities: RagSnippet[];
  abilities: RagSnippet[];
  bookChunks: RagSnippet[];
}

export interface BuildPromptCtx<I> {
  input: I;
  world: WorldContext;
  rag: RagContext;
  /** Texto extra do usuário ("rerole mais sombrio", regen note, etc.) */
  note?: string | undefined;
  /** Em regeneração parcial: o objeto atual e os campos a regerar. */
  current?:
    | {
        data: Record<string, unknown>;
        regenerateFields: string[];
      }
    | undefined;
}

export interface PromptParts {
  system: string;
  user: string;
}

export interface GeneratorDef<I, O> {
  slug: string;
  name: string;
  description: string;
  entityType: EntityType;
  defaultModel?: string;
  maxTokens?: number;
  inputSchema: z.ZodType<I>;
  outputSchema: z.ZodType<O>;
  buildPrompt(ctx: BuildPromptCtx<I>): PromptParts;
  /** Extrai campos para a Entity (name/summary). `data` é o output completo. */
  extractEntity(output: O): { name: string; summary: string };
}
