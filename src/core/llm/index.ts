// Forja HUB — Factory singleton dos providers ativos.
// Lê env, instancia uma vez e reusa. Trocar provider = trocar import aqui.

import { AnthropicAdapter } from "./anthropic";
import { VoyageAdapter } from "./voyage";
import type { EmbeddingProvider, LLMProvider } from "./provider";

let llmSingleton: LLMProvider | null = null;
let embedSingleton: EmbeddingProvider | null = null;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente ausente: ${name}`);
  return v;
}

export function getLLM(): LLMProvider {
  if (!llmSingleton) {
    llmSingleton = new AnthropicAdapter({
      apiKey: requireEnv("ANTHROPIC_API_KEY"),
      ...(process.env["ANTHROPIC_MODEL"]
        ? { defaultModel: process.env["ANTHROPIC_MODEL"] }
        : {}),
    });
  }
  return llmSingleton;
}

export function getEmbedder(): EmbeddingProvider {
  if (!embedSingleton) {
    embedSingleton = new VoyageAdapter({
      apiKey: requireEnv("VOYAGE_API_KEY"),
      ...(process.env["VOYAGE_MODEL"]
        ? { defaultModel: process.env["VOYAGE_MODEL"] }
        : {}),
    });
  }
  return embedSingleton;
}

// Útil para testes: injeta um mock e zera o singleton.
export function __setLLM(provider: LLMProvider | null): void {
  llmSingleton = provider;
}
export function __setEmbedder(provider: EmbeddingProvider | null): void {
  embedSingleton = provider;
}

export type { LLMProvider, EmbeddingProvider } from "./provider";
