// GET /api/worlds/[id] — mundo com entidades + custo recente

import { NextResponse } from "next/server";
import { prisma } from "@/db/client";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params): Promise<Response> {
  const { id } = await params;
  const world = await prisma.world.findUnique({
    where: { id },
    include: {
      system: true,
      entities: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          type: true,
          name: true,
          summary: true,
          tags: true,
          updatedAt: true,
        },
      },
      campaigns: { select: { id: true, name: true, status: true } },
      ideas: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, text: true, tags: true, createdAt: true },
      },
    },
  });
  if (!world) {
    return NextResponse.json({ error: "World não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ world });
}
