// Helpers de construção de prompt: blocos reutilizáveis (World, RAG).

import type { RagContext, WorldContext } from "./types";

export function renderWorldBlock(world: WorldContext): string {
  const lines: string[] = [];
  lines.push("## Mundo");
  lines.push(`Nome: ${world.name}`);
  if (world.description) lines.push(`Descrição: ${world.description}`);
  if (world.tone) lines.push(`Tom: ${world.tone}`);
  lines.push(`Sistema: ${world.system.name}`);
  if (world.system.description) lines.push(`> ${world.system.description}`);
  return lines.join("\n");
}

export function renderRagBlock(rag: RagContext): string {
  const sections: string[] = [];

  if (rag.entities.length > 0) {
    sections.push("### Entidades relevantes do mundo");
    for (const s of rag.entities) sections.push(`- **${s.label}** — ${s.text}`);
  }
  if (rag.abilities.length > 0) {
    sections.push("### Habilidades relevantes");
    for (const s of rag.abilities) sections.push(`- **${s.label}** — ${s.text}`);
  }
  if (rag.bookChunks.length > 0) {
    sections.push("### Trechos da biblioteca canônica");
    for (const s of rag.bookChunks) {
      sections.push(`- **${s.label}**`);
      sections.push(`  > ${s.text.replace(/\n/g, "\n  > ")}`);
    }
  }

  if (sections.length === 0) return "";
  return ["## Contexto recuperado (RAG)", ...sections].join("\n");
}
