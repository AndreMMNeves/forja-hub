// Registro de geradores built-in (lookup por slug).
// Adicionar um gerador = importar aqui e registrar. Sem refactor de motor.

import { npcGenerator } from "./npc";
import { itemGenerator } from "./item";
import type { GeneratorDef } from "./types";

// Tipo apagado: o motor lida com Generator<unknown, unknown> e cada operação
// re-valida via Zod no momento certo.
type AnyGenerator = GeneratorDef<unknown, unknown>;

const registry = new Map<string, AnyGenerator>();

function register<I, O>(def: GeneratorDef<I, O>): void {
  registry.set(def.slug, def as unknown as AnyGenerator);
}

register(npcGenerator);
register(itemGenerator);

export function getGenerator(slug: string): AnyGenerator {
  const g = registry.get(slug);
  if (!g) throw new Error(`Gerador desconhecido: '${slug}'`);
  return g;
}

export function listGenerators(): AnyGenerator[] {
  return Array.from(registry.values());
}

export { npcGenerator, itemGenerator };
