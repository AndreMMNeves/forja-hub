"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  entityId: string;
  fields: string[];
}

export function EntityActions({ entityId, fields }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(f: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  }

  async function regenerate() {
    if (selected.size === 0) return;
    setWorking(true);
    setError(null);
    const res = await fetch(`/api/entities/${entityId}/regenerate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fields: Array.from(selected), note: note || undefined }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? `Erro ${res.status}`);
      setWorking(false);
      return;
    }
    setWorking(false);
    setSelected(new Set());
    setNote("");
    router.refresh();
  }

  async function remove() {
    if (!confirm("Apagar esta entidade?")) return;
    setWorking(true);
    const res = await fetch(`/api/entities/${entityId}`, { method: "DELETE" });
    setWorking(false);
    if (res.ok) router.push("..");
  }

  return (
    <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4">
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-fg-muted)]">
        Regenerar campos
      </div>
      <div className="flex flex-wrap gap-1">
        {fields.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => toggle(f)}
            className={`rounded border px-2 py-0.5 text-xs ${
              selected.has(f)
                ? "border-[var(--color-accent)] bg-[var(--color-bg-elev-2)] text-[var(--color-accent-strong)]"
                : "border-[var(--color-border)] text-[var(--color-fg-muted)]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <input
        type="text"
        placeholder="nota opcional pro modelo (ex: 'mais sombrio')"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="mt-3 block w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm"
      />
      {error && <p className="mt-2 text-sm text-[var(--color-danger)]">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={working || selected.size === 0}
          onClick={regenerate}
          className="rounded bg-[var(--color-accent)] px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-40"
        >
          {working ? "Forjando..." : `Regenerar ${selected.size || ""}`}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={working}
          className="rounded border border-[var(--color-danger)] px-3 py-1.5 text-sm text-[var(--color-danger)] disabled:opacity-40"
        >
          Apagar
        </button>
      </div>
    </div>
  );
}
