// POST /api/entities/[id]/regenerate — regenera campos específicos

import { NextResponse } from "next/server";
import { z } from "zod";
import { regenerateFields } from "@/core/engine/regenerate";

interface Params {
  params: Promise<{ id: string }>;
}

const Schema = z.object({
  fields: z.array(z.string()).min(1),
  note: z.string().optional(),
  model: z.string().optional(),
  overrideManualEdits: z.boolean().optional(),
});

export async function POST(request: Request, { params }: Params): Promise<Response> {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input inválido", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  try {
    const result = await regenerateFields({ entityId: id, ...parsed.data });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
