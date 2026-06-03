-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('NPC', 'ITEM', 'LOCATION', 'FACTION', 'CREATURE', 'QUEST', 'ENCOUNTER', 'LOOT_TABLE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('ACTIVE', 'PAUSED', 'FINISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BookSource" AS ENUM ('MD', 'TXT', 'PDF');

-- CreateTable
CREATE TABLE "System" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "entitySchemas" JSONB NOT NULL,
    "sheetTemplate" JSONB,
    "defaultModel" TEXT,
    "isBuiltin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "System_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "World" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tone" TEXT,
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "World_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "campaignId" TEXT,
    "type" "EntityType" NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "data" JSONB NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fieldEdits" JSONB,
    "embedding" vector(1024),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityLink" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "inverseLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntityLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "playerName" TEXT,
    "concept" TEXT,
    "sheet" JSONB NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "embedding" vector(1024),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ability" (
    "id" TEXT NOT NULL,
    "systemId" TEXT,
    "worldId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "data" JSONB NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "embedding" vector(1024),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "sourceType" "BookSource" NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "rawText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookChunk" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "ord" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "heading" TEXT,
    "embedding" vector(1024),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Idea" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "campaignId" TEXT,
    "text" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "promotedToEntityId" TEXT,
    "promotedToCharacterId" TEXT,
    "embedding" vector(1024),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Idea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Generator" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entityType" "EntityType" NOT NULL,
    "inputSchema" JSONB NOT NULL,
    "outputSchema" JSONB NOT NULL,
    "promptTemplate" TEXT NOT NULL,
    "defaults" JSONB,
    "isBuiltin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Generator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationLog" (
    "id" TEXT NOT NULL,
    "generatorSlug" TEXT,
    "entityId" TEXT,
    "characterId" TEXT,
    "abilityId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DOUBLE PRECISION,
    "inputJson" JSONB,
    "ragRefs" JSONB,
    "seed" TEXT,
    "durationMs" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelPricing" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputPer1M" DOUBLE PRECISION,
    "outputPer1M" DOUBLE PRECISION,
    "embedPer1M" DOUBLE PRECISION,
    "embedDimensions" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "ModelPricing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "System_slug_key" ON "System"("slug");

-- CreateIndex
CREATE INDEX "World_systemId_idx" ON "World"("systemId");

-- CreateIndex
CREATE INDEX "Campaign_worldId_idx" ON "Campaign"("worldId");

-- CreateIndex
CREATE INDEX "Entity_worldId_type_idx" ON "Entity"("worldId", "type");

-- CreateIndex
CREATE INDEX "Entity_worldId_name_idx" ON "Entity"("worldId", "name");

-- CreateIndex
CREATE INDEX "Entity_campaignId_idx" ON "Entity"("campaignId");

-- CreateIndex
CREATE INDEX "EntityLink_toId_idx" ON "EntityLink"("toId");

-- CreateIndex
CREATE UNIQUE INDEX "EntityLink_fromId_toId_relation_key" ON "EntityLink"("fromId", "toId", "relation");

-- CreateIndex
CREATE INDEX "Character_campaignId_idx" ON "Character"("campaignId");

-- CreateIndex
CREATE INDEX "Ability_systemId_idx" ON "Ability"("systemId");

-- CreateIndex
CREATE INDEX "Ability_worldId_idx" ON "Ability"("worldId");

-- CreateIndex
CREATE INDEX "Book_systemId_idx" ON "Book"("systemId");

-- CreateIndex
CREATE INDEX "BookChunk_bookId_ord_idx" ON "BookChunk"("bookId", "ord");

-- CreateIndex
CREATE INDEX "Idea_worldId_idx" ON "Idea"("worldId");

-- CreateIndex
CREATE INDEX "Idea_campaignId_idx" ON "Idea"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "Generator_slug_key" ON "Generator"("slug");

-- CreateIndex
CREATE INDEX "GenerationLog_createdAt_idx" ON "GenerationLog"("createdAt");

-- CreateIndex
CREATE INDEX "GenerationLog_entityId_idx" ON "GenerationLog"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "ModelPricing_provider_model_effectiveFrom_key" ON "ModelPricing"("provider", "model", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "World" ADD CONSTRAINT "World_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityLink" ADD CONSTRAINT "EntityLink_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityLink" ADD CONSTRAINT "EntityLink_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ability" ADD CONSTRAINT "Ability_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ability" ADD CONSTRAINT "Ability_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookChunk" ADD CONSTRAINT "BookChunk_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_promotedToEntityId_fkey" FOREIGN KEY ("promotedToEntityId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_promotedToCharacterId_fkey" FOREIGN KEY ("promotedToCharacterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ─────────────────────────────────────────────
-- Forja HUB — adições custom: índices vetoriais HNSW + constraints
-- ─────────────────────────────────────────────

-- HNSW (cosine distance) — usar `embedding <=> $1::vector(1024)` em queries kNN
CREATE INDEX "Entity_embedding_hnsw_idx"
  ON "Entity" USING hnsw ("embedding" vector_cosine_ops);

CREATE INDEX "Character_embedding_hnsw_idx"
  ON "Character" USING hnsw ("embedding" vector_cosine_ops);

CREATE INDEX "Ability_embedding_hnsw_idx"
  ON "Ability" USING hnsw ("embedding" vector_cosine_ops);

CREATE INDEX "BookChunk_embedding_hnsw_idx"
  ON "BookChunk" USING hnsw ("embedding" vector_cosine_ops);

CREATE INDEX "Idea_embedding_hnsw_idx"
  ON "Idea" USING hnsw ("embedding" vector_cosine_ops);

-- Ability: exatamente um de systemId/worldId deve estar setado (canônica XOR homebrew)
ALTER TABLE "Ability"
  ADD CONSTRAINT "Ability_scope_xor"
  CHECK (("systemId" IS NULL) <> ("worldId" IS NULL));

-- Idea: se promovida, deve ter exatamente um destino (entity ou character)
ALTER TABLE "Idea"
  ADD CONSTRAINT "Idea_promotion_xor"
  CHECK (
    NOT ("promotedToEntityId" IS NOT NULL AND "promotedToCharacterId" IS NOT NULL)
  );
