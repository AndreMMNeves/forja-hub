// POST /api/generate — invoca o motor de geração.

import { NextResponse } from "next/server";
import { z } from "zod";
import { generate } from "@/core/engine/generate";

const Schema = z.object({
  generatorSlug: z.string().min(1),
  worldId: z.string().min(1),
  input: z.unknown(),
  campaignId: z.string().optional(),
  note: z.string().optional(),
  tags: z.array(z.string()).optional(),
  model: z.string().optional(),
});

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input inválido", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  try {
    const result = await generate(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
