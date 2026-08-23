"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export default function ErrorPage() {
  const t = useTranslations("errors");

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center px-5 text-center sm:px-8">
      <p className="font-mono text-xs tracking-[0.28em] text-hobun">LUMINA</p>
      <h1 className="mt-6 text-2xl font-medium text-hobun">{t("errorTitle")}</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-hobun-dim">{t("errorBody")}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="bg-hobun px-5 py-2.5 text-sm font-medium text-ink-900"
        >
          {t("retry")}
        </button>
        <Link href="/" className="border border-ink-700 px-5 py-2.5 text-sm text-hobun">
          {t("home")}
        </Link>
      </div>
    </main>
  );
}
