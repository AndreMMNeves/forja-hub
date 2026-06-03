import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/db/client";

export const dynamic = "force-dynamic";

export default async function WorldPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
      ideas: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
  if (!world) notFound();

  // group entities by type
  const grouped = new Map<string, typeof world.entities>();
  for (const e of world.entities) {
    const arr = grouped.get(e.type) ?? [];
    arr.push(e);
    grouped.set(e.type, arr);
  }

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between">
        <div>
          <Link href="/worlds" className="text-xs text-[var(--color-fg-muted)]">← Mundos</Link>
          <h1 className="mt-1 text-3xl font-bold text-[var(--color-accent)]">{world.name}</h1>
          <p className="text-xs text-[var(--color-fg-muted)]">
            {world.system.name} · {world.tone ?? "sem tom"} · {world.language}
          </p>
          {world.description && (
            <p className="mt-3 max-w-2xl text-[var(--color-fg-muted)]">{world.description}</p>
          )}
        </div>
        <Link
          href={`/worlds/${world.id}/generate`}
          className="rounded bg-[var(--color-accent)] px-3 py-1.5 text-sm font-semibold text-black hover:bg-[var(--color-accent-strong)]"
        >
          + Gerar
        </Link>
      </header>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Codex ({world.entities.length})</h2>
        {world.entities.length === 0 ? (
          <p className="text-sm text-[var(--color-fg-muted)]">
            Nada aqui ainda. <Link href={`/worlds/${world.id}/generate`}>Gere a primeira entidade.</Link>
          </p>
        ) : (
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([type, items]) => (
              <div key={type}>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-[var(--color-fg-muted)]">
                  {type} ({items.length})
                </h3>
                <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {items.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/worlds/${world.id}/entities/${e.id}`}
                        className="block rounded border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 hover:border-[var(--color-accent)]"
                      >
                        <div className="font-semibold">{e.name}</div>
                        {e.summary && (
                          <div className="mt-0.5 line-clamp-2 text-xs text-[var(--color-fg-muted)]">
                            {e.summary}
                          </div>
                        )}
                        {e.tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {e.tags.map((t) => (
                              <span
                                key={t}
                                className="rounded bg-[var(--color-bg-elev-2)] px-1.5 py-0.5 text-[10px]"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
