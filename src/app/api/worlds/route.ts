// GET /api/worlds — lista mundos (com sistema)
// POST /api/worlds — cria mundo (auto-vincula ao System 'fantasia-generica' se omitido)

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";

const CreateWorldSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  tone: z.string().max(200).optional(),
  language: z.string().default("pt-BR"),
  systemSlug: z.string().default("fantasia-generica"),
});

export async function GET(): Promise<Response> {
  const worlds = await prisma.world.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      system: { select: { slug: true, name: true } },
      _count: { select: { entities: true, campaigns: true, ideas: true } },
    },
  });
  return NextResponse.json({ worlds });
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  const parsed = CreateWorldSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input inválido", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const system = await prisma.system.findUnique({
    where: { slug: parsed.data.systemSlug },
  });
  if (!system) {
    return NextResponse.json(
      { error: `Sistema '${parsed.data.systemSlug}' não encontrado. Rode 'pnpm db:seed'.` },
      { status: 400 },
    );
  }
  const world = await prisma.world.create({
    data: {
      name: parsed.data.name,
      ...(parsed.data.description ? { description: parsed.data.description } : {}),
      ...(parsed.data.tone ? { tone: parsed.data.tone } : {}),
      language: parsed.data.language,
      systemId: system.id,
    },
  });
  return NextResponse.json({ world }, { status: 201 });
}
