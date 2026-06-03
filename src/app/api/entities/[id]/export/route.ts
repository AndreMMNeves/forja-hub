// GET /api/entities/[id]/export?format=md|json

import { NextResponse } from "next/server";
import { prisma } from "@/db/client";
import { entityToMarkdown } from "@/lib/export/markdown";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: Params): Promise<Response> {
  const { id } = await params;
  const format = new URL(request.url).searchParams.get("format") ?? "md";

  const entity = await prisma.entity.findUnique({ where: { id } });
  if (!entity) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const filename = entity.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);

  if (format === "json") {
    return new NextResponse(JSON.stringify(entity, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.json"`,
      },
    });
  }

  const md = entityToMarkdown({
    type: entity.type,
    name: entity.name,
    summary: entity.summary,
    tags: entity.tags,
    data: entity.data,
    createdAt: entity.createdAt,
  });
  return new NextResponse(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.md"`,
    },
  });
}
