// Exporta uma Entity para Markdown. Layout simples mas legível,
// pronto pra copiar pro notion/obsidian.

interface ExportableEntity {
  type: string;
  name: string;
  summary: string | null;
  tags: string[];
  data: unknown;
  createdAt: Date | string;
}

function renderField(key: string, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    if (value.length === 0) return "";
    if (typeof value[0] === "object") {
      const items = value
        .map((item) => {
          const obj = item as Record<string, unknown>;
          const title = (obj["title"] as string) ?? (obj["label"] as string) ?? "";
          const detail = (obj["detail"] as string) ?? (obj["value"] as string) ?? "";
          return title ? `- **${title}** — ${detail}` : `- ${JSON.stringify(item)}`;
        })
        .join("\n");
      return `### ${key}\n${items}`;
    }
    return `### ${key}\n${value.map((v) => `- ${String(v)}`).join("\n")}`;
  }
  if (typeof value === "object") {
    return `### ${key}\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
  }
  return `### ${key}\n${String(value)}`;
}

export function entityToMarkdown(entity: ExportableEntity): string {
  const lines: string[] = [];
  lines.push(`# ${entity.name}`);
  lines.push(`*${entity.type}*`);
  if (entity.summary) lines.push(`\n> ${entity.summary}`);
  if (entity.tags.length > 0) {
    lines.push(`\n**Tags:** ${entity.tags.map((t) => `\`${t}\``).join(" ")}`);
  }
  lines.push("");
  const data = entity.data as Record<string, unknown>;
  for (const [key, value] of Object.entries(data)) {
    if (key === "name") continue;
    const rendered = renderField(key, value);
    if (rendered) lines.push(rendered, "");
  }
  const createdStr =
    typeof entity.createdAt === "string"
      ? entity.createdAt
      : entity.createdAt.toISOString();
  lines.push(`\n---\n*Gerado em ${createdStr}*`);
  return lines.join("\n");
}
