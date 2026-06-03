import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Forja HUB",
  description: "Worldbuilding studio com IA, RAG e edição estruturada.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <div className="grid min-h-screen grid-cols-[240px_1fr]">
          <aside className="border-r border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4">
            <Link href="/" className="block text-xl font-bold tracking-wide text-[var(--color-accent)]">
              ⚒ Forja HUB
            </Link>
            <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
              worldbuilding · RAG · estruturado
            </p>

            <nav className="mt-6 space-y-1 text-sm">
              <SidebarLink href="/">Painel</SidebarLink>
              <SidebarLink href="/worlds">Mundos</SidebarLink>
              <SidebarLink href="/worlds/new">+ Novo Mundo</SidebarLink>
            </nav>

            <div className="mt-8 text-xs text-[var(--color-fg-muted)]">
              <div className="font-semibold uppercase tracking-wider">Em breve</div>
              <ul className="mt-2 space-y-1 opacity-60">
                <li>Ideias (Cmd+I)</li>
                <li>Busca global (Cmd+K)</li>
                <li>Biblioteca</li>
                <li>Habilidades</li>
                <li>Campanhas</li>
              </ul>
            </div>
          </aside>

          <main className="min-w-0 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}

function SidebarLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block rounded px-2 py-1.5 hover:bg-[var(--color-bg-elev-2)]"
    >
      {children}
    </Link>
  );
}
