// Gerador de NPC — saída estruturada, validada por Zod.
// Foco em ganchos jogáveis e tensão entre motivações públicas e secretas.

import { z } from "zod";
import { EntityType } from "@prisma/client";
import type { GeneratorDef, PromptParts, BuildPromptCtx } from "./types";
import { renderRagBlock, renderWorldBlock } from "./prompt-utils";

export const NpcInputSchema = z.object({
  brief: z
    .string()
    .min(3, "Descreva ao menos uma palavra-chave (ex: 'mercador suspeito')")
    .max(2000),
  role: z.string().optional(),
  faction: z.string().optional(),
  location: z.string().optional(),
  vibe: z.string().optional(),
  includeStats: z.boolean().default(false),
});
export type NpcInput = z.infer<typeof NpcInputSchema>;

const HookSchema = z.object({
  title: z.string().describe("Frase curta resumindo o gancho de aventura."),
  detail: z.string().describe("Como o gancho se desdobra; 1-3 frases."),
});

export const NpcOutputSchema = z.object({
  name: z.string().describe("Nome completo do NPC, no idioma do mundo."),
  concept: z
    .string()
    .describe("Frase de uma linha que sintetiza o NPC (arquétipo + twist)."),
  appearance: z
    .string()
    .describe("Aparência física e indumentária, 2-4 frases."),
  personality: z
    .string()
    .describe("Maneirismos, voz, postura, modo de falar. 2-4 frases."),
  publicMotivation: z
    .string()
    .describe("O que o NPC diz que quer; sua fachada pública."),
  secretMotivation: z
    .string()
    .describe("O que ele realmente quer, escondido até dos aliados."),
  fearOrFlaw: z
    .string()
    .describe("Medo, vício ou falha exploitable que pode quebrá-lo."),
  hooks: z
    .array(HookSchema)
    .min(2)
    .max(4)
    .describe("Ganchos de aventura que envolvem os jogadores."),
  voiceSample: z
    .string()
    .describe("1-2 frases típicas que ele diria, em primeira pessoa."),
  tags: z.array(z.string()).max(8).describe("Tags curtas (1-2 palavras)."),
  stats: z
    .object({
      level: z.number().int().min(0).max(20).optional(),
      role: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional()
    .describe("Stats genéricas, só se solicitado."),
});
export type NpcOutput = z.infer<typeof NpcOutputSchema>;

function buildPrompt(ctx: BuildPromptCtx<NpcInput>): PromptParts {
  const { world, input, rag, note, current } = ctx;

  const system = [
    `Você é um loremaster experiente assistindo um Mestre de RPG.`,
    `Idioma de saída: ${world.language}. Não use outro idioma.`,
    `Sistema de jogo: ${world.system.name}.`,
    `Tom do mundo: ${world.tone ?? "fantasia clássica com toques sombrios"}.`,
    "",
    `Princípios de geração de NPC:`,
    `- Personagens devem ser jogáveis: cada um vira encontro, aliado ou obstáculo.`,
    `- Sempre haja tensão entre a motivação pública e a secreta.`,
    `- Concretude > generalidade. Detalhes sensoriais > adjetivos.`,
    `- Não invente fatos do mundo que contradigam o contexto fornecido.`,
    `- Quando o contexto for raso, prefira gerar algo coerente em vez de pedir mais.`,
  ].join("\n");

  const parts: string[] = [];
  parts.push(renderWorldBlock(world));
  const ragBlock = renderRagBlock(rag);
  if (ragBlock) parts.push(ragBlock);

  parts.push("## Pedido do Mestre");
  parts.push(`Conceito-semente: ${input.brief}`);
  if (input.role) parts.push(`Papel/função sugerida: ${input.role}`);
  if (input.faction) parts.push(`Facção relacionada: ${input.faction}`);
  if (input.location) parts.push(`Localização atual: ${input.location}`);
  if (input.vibe) parts.push(`Tom/clima desejado: ${input.vibe}`);
  parts.push(
    `Incluir bloco de stats: ${input.includeStats ? "sim" : "não (deixe `stats` ausente)"}`,
  );

  if (current) {
    parts.push("");
    parts.push("## Regeneração parcial");
    parts.push(
      `Trave todos os campos do NPC atual abaixo, EXCETO: ${current.regenerateFields.join(", ")}.`,
    );
    parts.push("Reescreva apenas esses campos mantendo coerência com o resto.");
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
  parts.push(`Gere o NPC agora, retornando o JSON estruturado conforme o schema.`);

  return { system, user: parts.join("\n") };
}

export const npcGenerator: GeneratorDef<NpcInput, NpcOutput> = {
  slug: "npc",
  name: "NPC",
  description: "Gera um personagem não-jogador com ganchos de aventura.",
  entityType: EntityType.NPC,
  maxTokens: 2048,
  inputSchema: NpcInputSchema,
  outputSchema: NpcOutputSchema,
  buildPrompt,
  extractEntity(out) {
    return { name: out.name, summary: out.concept };
  },
};
