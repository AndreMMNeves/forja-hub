// GET    /api/entities/[id] — detalhe + backlinks
// PATCH  /api/entities/[id] — edição manual (marca fieldEdits)
// DELETE /api/entities/[id] — remove

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";

interface Params {
  params: Promise<{ id: string }>;
}

const PatchSchema = z.object({
  name: z.string().optional(),
  summary: z.string().optional(),
  tags: z.array(z.string()).optional(),
  /** Campos parciais do `data` (objeto). Chaves passadas marcam fieldEdits[key]='manual'. */
  dataPatch: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(_req: Request, { params }: Params): Promise<Response> {
  const { id } = await params;
  const entity = await prisma.entity.findUnique({
    where: { id },
    include: {
      world: { select: { id: true, name: true, systemId: true } },
      campaign: { select: { id: true, name: true } },
      links: { include: { to: { select: { id: true, name: true, type: true } } } },
      linkedBy: { include: { from: { select: { id: true, name: true, type: true } } } },
      ideas: { select: { id: true, text: true, createdAt: true } },
    },
  });
  if (!entity) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json({ entity });
}

export async function PATCH(request: Request, { params }: Params): Promise<Response> {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input inválido", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const current = await prisma.entity.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const update: {
    name?: string;
    summary?: string;
    tags?: string[];
    data?: object;
    fieldEdits?: object;
  } = {};
  if (parsed.data.name !== undefined) update.name = parsed.data.name;
  if (parsed.data.summary !== undefined) update.summary = parsed.data.summary;
  if (parsed.data.tags !== undefined) update.tags = parsed.data.tags;

  if (parsed.data.dataPatch) {
    const data = { ...(current.data as Record<string, unknown>), ...parsed.data.dataPatch };
    const edits = {
      ...((current.fieldEdits as Record<string, string>) ?? {}),
    };
    for (const key of Object.keys(parsed.data.dataPatch)) edits[key] = "manual";
    update.data = data;
    update.fieldEdits = edits;
  }

  const updated = await prisma.entity.update({ where: { id }, data: update });
  return NextResponse.json({ entity: updated });
}

export async function DELETE(_req: Request, { params }: Params): Promise<Response> {
  const { id } = await params;
  await prisma.entity.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
