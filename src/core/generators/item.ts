// Gerador de Item — itens com propriedades concretas + ganchos.
// Propriedades como pares chave/valor curtos pra ficar legível em statblock.

import { z } from "zod";
import { EntityType } from "@prisma/client";
import type { GeneratorDef, PromptParts, BuildPromptCtx } from "./types";
import { renderRagBlock, renderWorldBlock } from "./prompt-utils";

export const ItemInputSchema = z.object({
  brief: z.string().min(3).max(2000),
  itemType: z.string().optional(),
  rarity: z
    .enum(["comum", "incomum", "raro", "muito_raro", "lendário", "artefato"])
    .optional(),
  vibe: z.string().optional(),
  cursed: z.boolean().default(false),
});
export type ItemInput = z.infer<typeof ItemInputSchema>;

const PropertySchema = z.object({
  label: z.string().describe("Nome curto da propriedade (ex: 'Dano', 'Encantamento')."),
  value: z.string().describe("Descrição compacta do efeito."),
});

const HookSchema = z.object({
  title: z.string(),
  detail: z.string(),
});

export const ItemOutputSchema = z.object({
  name: z.string().describe("Nome próprio do item."),
  itemType: z
    .string()
    .describe("Categoria (arma, armadura, pergaminho, relíquia…)"),
  rarity: z.enum([
    "comum",
    "incomum",
    "raro",
    "muito_raro",
    "lendário",
    "artefato",
  ]),
  appearance: z
    .string()
    .describe("Como o item parece, soa, cheira. 2-4 frases."),
  description: z
    .string()
    .describe("História/origem do item; o que se conta sobre ele."),
  properties: z
    .array(PropertySchema)
    .min(1)
    .max(8)
    .describe("Propriedades mecânicas e narrativas."),
  attunement: z
    .string()
    .optional()
    .describe("Requisitos de sintonia, se houver."),
  curse: z
    .string()
    .nullable()
    .describe("Maldição ou custo oculto; null se não houver."),
  estimatedValue: z
    .string()
    .describe("Valor estimado em uma moeda do mundo, em texto livre."),
  hooks: z
    .array(HookSchema)
    .min(1)
    .max(4)
    .describe("Por que esse item importa? Quem o quer? O que vem depois?"),
  tags: z.array(z.string()).max(8),
});
export type ItemOutput = z.infer<typeof ItemOutputSchema>;

function buildPrompt(ctx: BuildPromptCtx<ItemInput>): PromptParts {
  const { world, input, rag, note, current } = ctx;

  const system = [
    `Você é um loremaster experiente assistindo um Mestre de RPG.`,
    `Idioma de saída: ${world.language}.`,
    `Sistema de jogo: ${world.system.name}.`,
    `Tom do mundo: ${world.tone ?? "fantasia clássica com toques sombrios"}.`,
    "",
    `Princípios para gerar itens:`,
    `- Cada item conta uma história. Origem + dono + perda + reaparição.`,
    `- Propriedades concretas e curtas; nada de "+1 genérico" sem flavor.`,
    `- Maldições e custos são *desejáveis*: tornam o item interessante de carregar.`,
    `- Coerência com o mundo vem antes de novidade.`,
  ].join("\n");

  const parts: string[] = [];
  parts.push(renderWorldBlock(world));
  const ragBlock = renderRagBlock(rag);
  if (ragBlock) parts.push(ragBlock);

  parts.push("## Pedido do Mestre");
  parts.push(`Conceito-semente: ${input.brief}`);
  if (input.itemType) parts.push(`Tipo desejado: ${input.itemType}`);
  if (input.rarity) parts.push(`Raridade alvo: ${input.rarity}`);
  if (input.vibe) parts.push(`Tom/clima: ${input.vibe}`);
  if (input.cursed) parts.push(`Deve ter maldição/custo oculto: sim.`);

  if (current) {
    parts.push("");
    parts.push("## Regeneração parcial");
    parts.push(
      `Trave todos os campos abaixo, EXCETO: ${current.regenerateFields.join(", ")}.`,
    );
    parts.push("```json");
    parts.push(JSON.stringify(current.data, null, 2));
    parts.push("```");
  }

  if (note) {
    parts.push("");
    parts.push(`## Nota adicional do Mestre`);
    parts.push(note);
  }

  parts.push("");
  parts.push(`Gere o item agora, retornando o JSON estruturado conforme o schema.`);

  return { system, user: parts.join("\n") };
}

export const itemGenerator: GeneratorDef<ItemInput, ItemOutput> = {
  slug: "item",
  name: "Item",
  description: "Gera um item mágico ou mundano com história e propriedades.",
  entityType: EntityType.ITEM,
  maxTokens: 2048,
  inputSchema: ItemInputSchema,
  outputSchema: ItemOutputSchema,
  buildPrompt,
  extractEntity(out) {
    return {
      name: out.name,
      summary: `${out.itemType} ${out.rarity} — ${out.appearance.split(".")[0] ?? ""}`.trim(),
    };
  },
};
