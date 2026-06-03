"use client";

import { useRouter } from "next/navigation";
import { use, useState } from "react";

type Slug = "npc" | "item";

export default function GeneratePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: worldId } = use(params);
  const router = useRouter();

  const [slug, setSlug] = useState<Slug>("npc");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const input: Record<string, unknown> = {
      brief: form.get("brief"),
    };
    if (slug === "npc") {
      if (form.get("role")) input["role"] = form.get("role");
      if (form.get("faction")) input["faction"] = form.get("faction");
      if (form.get("location")) input["location"] = form.get("location");
      if (form.get("vibe")) input["vibe"] = form.get("vibe");
      input["includeStats"] = form.get("includeStats") === "on";
    } else {
      if (form.get("itemType")) input["itemType"] = form.get("itemType");
      if (form.get("rarity")) input["rarity"] = form.get("rarity");
      if (form.get("vibe")) input["vibe"] = form.get("vibe");
      input["cursed"] = form.get("cursed") === "on";
    }

    const payload = {
      generatorSlug: slug,
      worldId,
      input,
      note: form.get("note") || undefined,
    };

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? `Erro ${res.status}`);
      setSubmitting(false);
      return;
    }
    const data = await res.json();
    router.push(`/worlds/${worldId}/entities/${data.entity.id}`);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-3xl font-bold text-[var(--color-accent)]">Gerar</h1>

      <div className="mb-6 flex gap-2">
        {(["npc", "item"] as Slug[]).map((s) => (
          <button
            key={s}
            onClick={() => setSlug(s)}
            type="button"
            className={`rounded border px-3 py-1.5 text-sm ${
              slug === s
                ? "border-[var(--color-accent)] bg-[var(--color-bg-elev-2)] text-[var(--color-accent-strong)]"
                : "border-[var(--color-border)] text-[var(--color-fg-muted)]"
            }`}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Conceito-semente *">
          <textarea
            name="brief"
            required
            rows={3}
            className={inputClass}
            placeholder={
              slug === "npc"
                ? "mercador suspeito que vende mapas adulterados nas docas"
                : "espada que sussurra os últimos pensamentos dos que mata"
            }
          />
        </Field>

        {slug === "npc" ? (
          <>
            <Field label="Papel"><input name="role" className={inputClass} /></Field>
            <Field label="Facção"><input name="faction" className={inputClass} /></Field>
            <Field label="Localização"><input name="location" className={inputClass} /></Field>
            <Field label="Vibe"><input name="vibe" className={inputClass} placeholder="enigmático, paternal, perigoso" /></Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="includeStats" /> incluir bloco de stats
            </label>
          </>
        ) : (
          <>
            <Field label="Tipo"><input name="itemType" className={inputClass} placeholder="arma, relíquia, pergaminho" /></Field>
            <Field label="Raridade">
              <select name="rarity" className={inputClass} defaultValue="">
                <option value="">— qualquer —</option>
                <option value="comum">comum</option>
                <option value="incomum">incomum</option>
                <option value="raro">raro</option>
                <option value="muito_raro">muito raro</option>
                <option value="lendário">lendário</option>
                <option value="artefato">artefato</option>
              </select>
            </Field>
            <Field label="Vibe"><input name="vibe" className={inputClass} /></Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="cursed" /> deve ter maldição/custo
            </label>
          </>
        )}

        <Field label="Nota adicional"><textarea name="note" rows={2} className={inputClass} /></Field>

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-[var(--color-accent)] px-4 py-2 font-semibold text-black disabled:opacity-50"
        >
          {submitting ? "Forjando..." : `Gerar ${slug.toUpperCase()}`}
        </button>
      </form>
    </div>
  );
}

const inputClass =
  "block w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wider text-[var(--color-fg-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}
