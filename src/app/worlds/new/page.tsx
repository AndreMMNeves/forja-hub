"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewWorldPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name"),
      description: form.get("description") || undefined,
      tone: form.get("tone") || undefined,
      language: form.get("language") || "pt-BR",
      systemSlug: form.get("systemSlug") || "fantasia-generica",
    };
    const res = await fetch("/api/worlds", {
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
    router.push(`/worlds/${data.world.id}`);
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-3xl font-bold text-[var(--color-accent)]">Novo Mundo</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nome *">
          <input name="name" required maxLength={120} className={inputClass} placeholder="Aetheria, Cordilheira Velha…" />
        </Field>
        <Field label="Descrição curta">
          <textarea name="description" rows={3} maxLength={2000} className={inputClass} placeholder="O que esse mundo é, em 2-3 frases." />
        </Field>
        <Field label="Tom / clima">
          <input name="tone" maxLength={200} className={inputClass} placeholder="dark fantasy intimista, weird west, fantasia barroca…" />
        </Field>
        <Field label="Idioma">
          <input name="language" defaultValue="pt-BR" className={inputClass} />
        </Field>
        <Field label="Sistema (slug)">
          <input name="systemSlug" defaultValue="fantasia-generica" className={inputClass} />
        </Field>

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-[var(--color-accent)] px-4 py-2 font-semibold text-black disabled:opacity-50"
        >
          {submitting ? "Criando..." : "Criar mundo"}
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
