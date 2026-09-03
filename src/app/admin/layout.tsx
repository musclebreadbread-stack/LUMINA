import type { ReactNode } from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminLayout({ children }: { readonly children: ReactNode }) {
  return (
    <div className="admin-shell min-h-screen bg-ink-950 text-hobun" data-lumina-theme="lens-observatory">
      <header className="site-header border-b border-ink-700 bg-ink-950/95">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link href="/admin/analytics" className="font-mono text-xs tracking-[0.28em] text-hobun">
            LUMINA / OPS
          </Link>
          <span className="font-mono text-[11px] tracking-[0.16em] text-hobun-faint">PRIVATE CONSOLE</span>
        </div>
      </header>
      {children}
    </div>
  );
}
