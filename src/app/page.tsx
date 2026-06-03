// Dashboard do HUB — visão geral.

import Link from "next/link";
import { prisma } from "@/db/client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [worlds, recentEntities, recentLogs, totalCost] = await Promise.all([
    prisma.world.findMany({
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: {
        system: { select: { name: true } },
        _count: { select: { entities: true, campaigns: true } },
      },
    }),
    prisma.entity.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: { world: { select: { id: true, name: true } } },
    }),
    prisma.generationLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.generationLog.aggregate({
      _sum: { costUsd: true, promptTokens: true, completionTokens: true },
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
  ]);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-bold text-[var(--color-accent)]">Painel da Forja</h1>
        <p className="text-sm text-[var(--color-fg-muted)]">
          Mundos, entidades e custo. Cmd+K e Cmd+I chegam em breve.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat label="Mundos" value={worlds.length} />
        <Stat
          label="Tokens (7d)"
          value={(
            (totalCost._sum.promptTokens ?? 0) + (totalCost._sum.completionTokens ?? 0)
          ).toLocaleString("pt-BR")}
        />
        <Stat
          label="Custo (7d)"
          value={totalCost._sum.costUsd ? `$${totalCost._sum.costUsd.toFixed(4)}` : "—"}
        />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Mundos recentes</h2>
          <Link href="/worlds/new" className="text-sm">+ novo mundo</Link>
        </div>
        {worlds.length === 0 ? (
          <EmptyHint
            title="Você ainda não tem mundos."
            cta="Criar o primeiro mundo"
            href="/worlds/new"
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {worlds.map((w) => (
              <Link
                key={w.id}
                href={`/worlds/${w.id}`}
                className="block rounded border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4 hover:border-[var(--color-accent)]"
              >
                <div className="font-semibold">{w.name}</div>
                <div className="text-xs text-[var(--color-fg-muted)]">
                  {w.system.name} · {w._count.entities} entidades · {w._count.campaigns} campanhas
                </div>
                {w.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--color-fg-muted)]">
                    {w.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Entidades recentes</h2>
        {recentEntities.length === 0 ? (
          <p className="text-sm text-[var(--color-fg-muted)]">Nada gerado ainda.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] rounded border border-[var(--color-border)] bg-[var(--color-bg-elev)]">
            {recentEntities.map((e) => (
              <li key={e.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <div>
                  <Link href={`/worlds/${e.world.id}/entities/${e.id}`} className="font-medium">
                    {e.name}
                  </Link>
                  <span className="ml-2 text-xs uppercase text-[var(--color-fg-muted)]">{e.type}</span>
                </div>
                <span className="text-xs text-[var(--color-fg-muted)]">{e.world.name}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Gerações recentes</h2>
        {recentLogs.length === 0 ? (
          <p className="text-sm text-[var(--color-fg-muted)]">Sem chamadas ao modelo ainda.</p>
        ) : (
          <ul className="space-y-1 text-sm text-[var(--color-fg-muted)]">
            {recentLogs.map((l) => (
              <li key={l.id}>
                <span className="font-mono text-xs">{l.createdAt.toISOString().slice(0, 19)}</span>{" "}
                {l.generatorSlug ?? "—"} · {l.model} · {l.promptTokens + l.completionTokens} tokens
                {l.costUsd ? ` · $${l.costUsd.toFixed(5)}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4">
      <div className="text-xs uppercase tracking-wider text-[var(--color-fg-muted)]">{label}</div>
      <div className="mt-1 text-2xl font-bold text-[var(--color-accent-strong)]">{value}</div>
    </div>
  );
}

function EmptyHint({ title, cta, href }: { title: string; cta: string; href: string }) {
  return (
    <div className="rounded border border-dashed border-[var(--color-border)] p-8 text-center">
      <p className="text-[var(--color-fg-muted)]">{title}</p>
      <Link
        href={href}
        className="mt-3 inline-block rounded bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black hover:bg-[var(--color-accent-strong)]"
      >
        {cta}
      </Link>
    </div>
  );
}
