// Estimativa de custo de geração / embedding via tabela ModelPricing.
// Cache em memória pela vida do processo. Preço null se não houver linha vigente.

import { prisma } from "@/db/client";

interface Pricing {
  inputPer1M: number | null;
  outputPer1M: number | null;
  embedPer1M: number | null;
}

const cache = new Map<string, Pricing | null>();
const key = (provider: string, model: string) => `${provider}:${model}`;

async function loadPricing(
  provider: string,
  model: string,
): Promise<Pricing | null> {
  const cached = cache.get(key(provider, model));
  if (cached !== undefined) return cached;
  const row = await prisma.modelPricing.findFirst({
    where: {
      provider,
      model,
      effectiveFrom: { lte: new Date() },
    },
    orderBy: { effectiveFrom: "desc" },
  });
  const value: Pricing | null = row
    ? {
        inputPer1M: row.inputPer1M,
        outputPer1M: row.outputPer1M,
        embedPer1M: row.embedPer1M,
      }
    : null;
  cache.set(key(provider, model), value);
  return value;
}

export async function estimateGenerationCost(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
): Promise<number | null> {
  const p = await loadPricing(provider, model);
  if (!p?.inputPer1M || !p?.outputPer1M) return null;
  return (inputTokens * p.inputPer1M) / 1_000_000
    + (outputTokens * p.outputPer1M) / 1_000_000;
}

export async function estimateEmbedCost(
  provider: string,
  model: string,
  totalTokens: number,
): Promise<number | null> {
  const p = await loadPricing(provider, model);
  if (!p?.embedPer1M) return null;
  return (totalTokens * p.embedPer1M) / 1_000_000;
}

export function clearPricingCache(): void {
  cache.clear();
}
