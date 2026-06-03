import Link from "next/link";
import { prisma } from "@/db/client";

export const dynamic = "force-dynamic";

export default async function WorldsListPage() {
  const worlds = await prisma.world.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      system: { select: { name: true } },
      _count: { select: { entities: true, campaigns: true, ideas: true } },
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[var(--color-accent)]">Mundos</h1>
        <Link
          href="/worlds/new"
          className="rounded bg-[var(--color-accent)] px-3 py-1.5 text-sm font-semibold text-black hover:bg-[var(--color-accent-strong)]"
        >
          + Novo Mundo
        </Link>
      </header>

      {worlds.length === 0 ? (
        <p className="text-[var(--color-fg-muted)]">Nenhum mundo ainda.</p>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] rounded border border-[var(--color-border)] bg-[var(--color-bg-elev)]">
          {worlds.map((w) => (
            <li key={w.id} className="px-4 py-3 hover:bg-[var(--color-bg-elev-2)]">
              <Link href={`/worlds/${w.id}`} className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{w.name}</div>
                  <div className="text-xs text-[var(--color-fg-muted)]">
                    {w.system.name} · {w.tone ?? "sem tom definido"}
                  </div>
                </div>
                <div className="text-xs text-[var(--color-fg-muted)]">
                  {w._count.entities} ent · {w._count.campaigns} camp · {w._count.ideas} ideias
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
