// RAG multi-fonte. Embedda a query e busca top-K em três fontes:
// (a) entidades do World, (b) habilidades visíveis ao World, (c) chunks de books
// do System do World. Tudo via pgvector (cosine).

import { getEmbedder } from "@/core/llm";
import {
  knnAbilitiesForWorld,
  knnBookChunksForWorld,
  knnEntities,
} from "@/db/vector";
import type { RagContext, RagSnippet } from "@/core/generators/types";

export interface RetrieveOptions {
  query: string;
  worldId: string;
  excludeEntityId?: string;
  topKEntities?: number;
  topKAbilities?: number;
  topKBookChunks?: number;
  maxSnippetChars?: number;
}

const DEFAULTS = {
  topKEntities: 6,
  topKAbilities: 3,
  topKBookChunks: 4,
  maxSnippetChars: 800,
};

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

export async function retrieveContext(
  opts: RetrieveOptions,
): Promise<{ rag: RagContext; embedTokens: number; embedModel: string }> {
  const topKEntities = opts.topKEntities ?? DEFAULTS.topKEntities;
  const topKAbilities = opts.topKAbilities ?? DEFAULTS.topKAbilities;
  const topKBookChunks = opts.topKBookChunks ?? DEFAULTS.topKBookChunks;
  const max = opts.maxSnippetChars ?? DEFAULTS.maxSnippetChars;

  const embedder = getEmbedder();
  const embed = await embedder.embed({
    texts: [opts.query],
    inputType: "query",
  });
  const queryVec = embed.embeddings[0];
  if (!queryVec) throw new Error("Embedder não devolveu vetor da query");

  const [ents, abis, chunks] = await Promise.all([
    knnEntities(opts.worldId, queryVec, topKEntities, opts.excludeEntityId),
    knnAbilitiesForWorld(opts.worldId, queryVec, topKAbilities),
    knnBookChunksForWorld(opts.worldId, queryVec, topKBookChunks),
  ]);

  const entities: RagSnippet[] = ents.map((e) => ({
    id: e.id,
    label: `${e.name} [${e.type}]`,
    text: clip(e.summary ?? "(sem resumo)", max),
    source: "entity",
    sourceMeta: { type: e.type, distance: e.distance },
  }));

  const abilities: RagSnippet[] = abis.map((a) => {
    const data = a.data as { description?: string } | null;
    const desc = data?.description ?? JSON.stringify(a.data).slice(0, max);
    return {
      id: a.id,
      label: `${a.name}${a.category ? ` (${a.category})` : ""}`,
      text: clip(desc, max),
      source: "ability",
      sourceMeta: { distance: a.distance },
    };
  });

  const bookChunks: RagSnippet[] = chunks.map((c) => ({
    id: c.id,
    label: `${c.bookTitle}${c.heading ? ` › ${c.heading}` : ""} (§${c.ord})`,
    text: clip(c.text, max),
    source: "book",
    sourceMeta: { bookId: c.bookId, distance: c.distance },
  }));

  return {
    rag: { entities, abilities, bookChunks },
    embedTokens: embed.totalTokens,
    embedModel: embed.model,
  };
}
