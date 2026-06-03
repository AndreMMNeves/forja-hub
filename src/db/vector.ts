// Helpers de pgvector via $queryRaw / $executeRaw (Prisma não suporta
// nativamente o tipo Unsupported("vector")).
// Distância: cosine (operador `<=>` do pgvector).
// Embeddings normalizados (Voyage) => cosine == 1 - inner_product.

import { Prisma } from "@prisma/client";
import { prisma } from "./client";

/** Serializa um array de floats no formato textual aceito pelo pgvector. */
export function toPgVectorLiteral(vec: number[]): string {
  return "[" + vec.map((n) => Number.isFinite(n) ? n.toString() : "0").join(",") + "]";
}

const VECTOR_DIM = 1024;

interface KnnEntityRow {
  id: string;
  name: string;
  summary: string | null;
  type: string;
  distance: number;
}

interface KnnBookChunkRow {
  id: string;
  bookId: string;
  bookTitle: string;
  ord: number;
  heading: string | null;
  text: string;
  distance: number;
}

interface KnnAbilityRow {
  id: string;
  name: string;
  category: string | null;
  data: unknown;
  distance: number;
}

/** Top-K entidades por similaridade dentro de um World. */
export async function knnEntities(
  worldId: string,
  embedding: number[],
  limit: number,
  excludeId?: string,
): Promise<KnnEntityRow[]> {
  if (embedding.length !== VECTOR_DIM) {
    throw new Error(`Embedding com dim ${embedding.length}, esperado ${VECTOR_DIM}`);
  }
  const vec = toPgVectorLiteral(embedding);
  const exclude = excludeId ?? "";
  return prisma.$queryRaw<KnnEntityRow[]>(Prisma.sql`
    SELECT id, name, summary, type::text AS type,
           (embedding <=> ${vec}::vector) AS distance
    FROM "Entity"
    WHERE "worldId" = ${worldId}
      AND embedding IS NOT NULL
      AND id <> ${exclude}
    ORDER BY embedding <=> ${vec}::vector
    LIMIT ${limit}
  `);
}

/** Top-K chunks de livros do System ao qual o World pertence. */
export async function knnBookChunksForWorld(
  worldId: string,
  embedding: number[],
  limit: number,
): Promise<KnnBookChunkRow[]> {
  const vec = toPgVectorLiteral(embedding);
  return prisma.$queryRaw<KnnBookChunkRow[]>(Prisma.sql`
    SELECT bc.id, bc."bookId", b.title AS "bookTitle", bc.ord, bc.heading, bc.text,
           (bc.embedding <=> ${vec}::vector) AS distance
    FROM "BookChunk" bc
    JOIN "Book" b ON b.id = bc."bookId"
    JOIN "World" w ON w."systemId" = b."systemId"
    WHERE w.id = ${worldId}
      AND bc.embedding IS NOT NULL
    ORDER BY bc.embedding <=> ${vec}::vector
    LIMIT ${limit}
  `);
}

/** Top-K habilidades (canônicas do System + homebrew do World). */
export async function knnAbilitiesForWorld(
  worldId: string,
  embedding: number[],
  limit: number,
): Promise<KnnAbilityRow[]> {
  const vec = toPgVectorLiteral(embedding);
  return prisma.$queryRaw<KnnAbilityRow[]>(Prisma.sql`
    SELECT a.id, a.name, a.category, a.data,
           (a.embedding <=> ${vec}::vector) AS distance
    FROM "Ability" a
    JOIN "World" w ON w.id = ${worldId}
    WHERE (a."worldId" = w.id OR a."systemId" = w."systemId")
      AND a.embedding IS NOT NULL
    ORDER BY a.embedding <=> ${vec}::vector
    LIMIT ${limit}
  `);
}

/** Atualiza o embedding de uma Entity. */
export async function setEntityEmbedding(
  entityId: string,
  embedding: number[],
): Promise<void> {
  const vec = toPgVectorLiteral(embedding);
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "Entity" SET embedding = ${vec}::vector WHERE id = ${entityId}
  `);
}

/** Atualiza o embedding de um BookChunk. */
export async function setBookChunkEmbedding(
  chunkId: string,
  embedding: number[],
): Promise<void> {
  const vec = toPgVectorLiteral(embedding);
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "BookChunk" SET embedding = ${vec}::vector WHERE id = ${chunkId}
  `);
}

/** Atualiza o embedding de uma Ability. */
export async function setAbilityEmbedding(
  abilityId: string,
  embedding: number[],
): Promise<void> {
  const vec = toPgVectorLiteral(embedding);
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "Ability" SET embedding = ${vec}::vector WHERE id = ${abilityId}
  `);
}

/** Atualiza o embedding de uma Idea. */
export async function setIdeaEmbedding(
  ideaId: string,
  embedding: number[],
): Promise<void> {
  const vec = toPgVectorLiteral(embedding);
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "Idea" SET embedding = ${vec}::vector WHERE id = ${ideaId}
  `);
}

export type {
  KnnEntityRow,
  KnnBookChunkRow,
  KnnAbilityRow,
};
