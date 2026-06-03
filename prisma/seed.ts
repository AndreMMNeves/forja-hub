// Forja HUB — seed.
// 1) Pricing dos modelos default (Anthropic Sonnet 4.6 + Voyage 3 large)
// 2) System "Fantasia Genérica" (built-in)
// 3) Generators NPC e Item a partir do registry de código

import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { listGenerators } from "../src/core/generators/registry";

const prisma = new PrismaClient();

const PRICING_EFFECTIVE_FROM = new Date("2026-01-01T00:00:00Z");

async function seedPricing(): Promise<void> {
  // Preços em USD por 1M tokens. Atualize a tabela ModelPricing pra refletir mudanças
  // sem precisar redeployar.
  const rows: Array<{
    provider: string;
    model: string;
    inputPer1M: number | null;
    outputPer1M: number | null;
    embedPer1M: number | null;
    embedDimensions: number | null;
    notes: string | null;
  }> = [
    {
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      inputPer1M: 3.0,
      outputPer1M: 15.0,
      embedPer1M: null,
      embedDimensions: null,
      notes: "Default da Forja HUB.",
    },
    {
      provider: "voyage",
      model: "voyage-3-large",
      inputPer1M: null,
      outputPer1M: null,
      embedPer1M: 0.18,
      embedDimensions: 1024,
      notes: "Embeddings RAG (recomendado pela Anthropic).",
    },
  ];

  for (const row of rows) {
    await prisma.modelPricing.upsert({
      where: {
        provider_model_effectiveFrom: {
          provider: row.provider,
          model: row.model,
          effectiveFrom: PRICING_EFFECTIVE_FROM,
        },
      },
      create: { ...row, effectiveFrom: PRICING_EFFECTIVE_FROM },
      update: row,
    });
    console.log(`  ✓ pricing ${row.provider}/${row.model}`);
  }
}

async function seedSystem(): Promise<{ id: string }> {
  // Esquemas por EntityType são guias leves; cada generator tem seu próprio
  // outputSchema mais detalhado. Aqui guardamos apenas os campos esperados,
  // que servem como hints pra UI e validações futuras.
  const entitySchemas = {
    NPC: {
      fields: [
        "name",
        "concept",
        "appearance",
        "personality",
        "publicMotivation",
        "secretMotivation",
        "fearOrFlaw",
        "hooks",
        "voiceSample",
      ],
    },
    ITEM: {
      fields: [
        "name",
        "itemType",
        "rarity",
        "appearance",
        "description",
        "properties",
        "curse",
        "estimatedValue",
        "hooks",
      ],
    },
  };

  const system = await prisma.system.upsert({
    where: { slug: "fantasia-generica" },
    create: {
      slug: "fantasia-generica",
      name: "Fantasia Genérica",
      description:
        "Sistema-base agnóstico de regras. Útil pra worldbuilding e ganchos antes de adotar um sistema específico.",
      language: "pt-BR",
      entitySchemas,
      isBuiltin: true,
    },
    update: {
      name: "Fantasia Genérica",
      entitySchemas,
      isBuiltin: true,
    },
  });
  console.log(`  ✓ system ${system.slug}`);
  return { id: system.id };
}

async function seedGenerators(): Promise<void> {
  for (const gen of listGenerators()) {
    const inputJson = z.toJSONSchema(gen.inputSchema, { target: "draft-07" });
    const outputJson = z.toJSONSchema(gen.outputSchema, { target: "draft-07" });

    await prisma.generator.upsert({
      where: { slug: gen.slug },
      create: {
        slug: gen.slug,
        name: gen.name,
        description: gen.description,
        entityType: gen.entityType,
        inputSchema: inputJson as object,
        outputSchema: outputJson as object,
        promptTemplate:
          "code-driven — runtime usa o builder TS em src/core/generators/" +
          gen.slug +
          ".ts",
        isBuiltin: true,
      },
      update: {
        name: gen.name,
        description: gen.description,
        entityType: gen.entityType,
        inputSchema: inputJson as object,
        outputSchema: outputJson as object,
      },
    });
    console.log(`  ✓ generator ${gen.slug}`);
  }
}

async function main(): Promise<void> {
  console.log("• Forja HUB — seed");
  await seedPricing();
  await seedSystem();
  await seedGenerators();
  console.log("• done");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
