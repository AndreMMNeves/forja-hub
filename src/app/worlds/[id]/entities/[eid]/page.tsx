import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/db/client";
import { EntityActions } from "./EntityActions";

export const dynamic = "force-dynamic";

export default async function EntityDetailPage({
  params,
}: {
  params: Promise<{ id: string; eid: string }>;
}) {
  const { id: worldId, eid } = await params;
  const entity = await prisma.entity.findUnique({
    where: { id: eid },
    include: {
      world: { select: { id: true, name: true } },
      links: { include: { to: { select: { id: true, name: true, type: true } } } },
      linkedBy: { include: { from: { select: { id: true, name: true, type: true } } } },
    },
  });
  if (!entity || entity.worldId !== worldId) notFound();

  const data = entity.data as Record<string, unknown>;
  const fieldEdits = (entity.fieldEdits as Record<string, string> | null) ?? {};

  return (
    <div className="space-y-8">
      <header>
        <Link href={`/worlds/${worldId}`} className="text-xs text-[var(--color-fg-muted)]">
          ← {entity.world.name}
        </Link>
        <div className="mt-1 flex items-baseline gap-3">
          <h1 className="text-3xl font-bold text-[var(--color-accent)]">{entity.name}</h1>
          <span className="text-xs uppercase text-[var(--color-fg-muted)]">{entity.type}</span>
        </div>
        {entity.summary && (
          <p className="mt-2 text-[var(--color-fg-muted)]">{entity.summary}</p>
        )}
        {entity.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {entity.tags.map((t) => (
              <span key={t} className="rounded bg-[var(--color-bg-elev-2)] px-1.5 py-0.5 text-[10px]">
                {t}
              </span>
            ))}
          </div>
        )}
      </header>

      <EntityActions entityId={entity.id} fields={Object.keys(data)} />

      <section className="space-y-4">
        {Object.entries(data).map(([key, value]) => (
          <FieldBlock key={key} fieldKey={key} value={value} edit={fieldEdits[key]} />
        ))}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-[var(--color-fg-muted)]">
          Conexões
        </h2>
        {entity.links.length === 0 && entity.linkedBy.length === 0 ? (
          <p className="text-xs text-[var(--color-fg-muted)]">Nenhuma ligação ainda.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {entity.links.map((l) => (
              <li key={l.id}>
                →{" "}
                <Link href={`/worlds/${worldId}/entities/${l.to.id}`}>
                  {l.to.name}
                </Link>{" "}
                <span className="text-xs text-[var(--color-fg-muted)]">({l.relation})</span>
              </li>
            ))}
            {entity.linkedBy.map((l) => (
              <li key={l.id} className="text-[var(--color-fg-muted)]">
                ←{" "}
                <Link href={`/worlds/${worldId}/entities/${l.from.id}`}>{l.from.name}</Link>{" "}
                <span className="text-xs">({l.inverseLabel ?? l.relation})</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="text-xs text-[var(--color-fg-muted)]">
        <a href={`/api/entities/${entity.id}/export?format=md`} className="mr-3">
          Exportar Markdown
        </a>
        <a href={`/api/entities/${entity.id}/export?format=json`}>Exportar JSON</a>
      </footer>
    </div>
  );
}

function FieldBlock({
  fieldKey,
  value,
  edit,
}: {
  fieldKey: string;
  value: unknown;
  edit?: string;
}) {
  return (
    <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-[var(--color-accent-strong)]">{fieldKey}</h3>
        {edit && (
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-fg-muted)]">
            {edit === "manual" ? "✎ manual" : "↺ gerado"}
          </span>
        )}
      </div>
      <FieldValue value={value} />
    </div>
  );
}

function FieldValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <em className="text-[var(--color-fg-muted)]">(vazio)</em>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <em className="text-[var(--color-fg-muted)]">(vazio)</em>;
    if (typeof value[0] === "object" && value[0] !== null) {
      return (
        <ul className="space-y-2 text-sm">
          {value.map((v, i) => {
            const obj = v as Record<string, unknown>;
            const title = (obj["title"] as string) ?? (obj["label"] as string) ?? `#${i + 1}`;
            const detail = (obj["detail"] as string) ?? (obj["value"] as string) ?? JSON.stringify(v);
            return (
              <li key={i}>
                <span className="font-medium">{title}</span> — {detail}
              </li>
            );
          })}
        </ul>
      );
    }
    return <p className="text-sm">{value.map(String).join(", ")}</p>;
  }
  if (typeof value === "object") {
    return (
      <pre className="overflow-x-auto rounded bg-[var(--color-bg)] p-2 text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  return <p className="whitespace-pre-wrap text-sm">{String(value)}</p>;
}
