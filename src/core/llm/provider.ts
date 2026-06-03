// Forja HUB — Contratos da camada LLM (provider-agnostic).
// Separamos LLMProvider (geração) de EmbeddingProvider (embeddings): Anthropic
// não embedda e Voyage não gera. Forçar um único contrato bagunçaria os adapters.

import type { z } from "zod";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
}

export interface GenerateStructuredArgs<T> {
  schema: z.ZodType<T>;
  schemaName?: string; // nome do "tool"/output (usado pra debug/log)
  systemPrompt?: string;
  userPrompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface GenerateStructuredResult<T> {
  data: T;
  usage: TokenUsage;
  model: string;
  provider: string;
  durationMs: number;
}

export interface LLMProvider {
  readonly name: string;
  readonly defaultModel: string;
  generateStructured<T>(
    args: GenerateStructuredArgs<T>,
  ): Promise<GenerateStructuredResult<T>>;
}

export type EmbedInputType = "document" | "query";

export interface EmbedArgs {
  texts: string[];
  inputType: EmbedInputType;
  model?: string;
}

export interface EmbedResult {
  embeddings: number[][];
  totalTokens: number;
  model: string;
  provider: string;
}

export interface EmbeddingProvider {
  readonly name: string;
  readonly defaultModel: string;
  readonly dimensions: number;
  embed(args: EmbedArgs): Promise<EmbedResult>;
}
