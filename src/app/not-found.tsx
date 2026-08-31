import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { InkField } from "@/components/ambient/InkField";

export default async function NotFound() {
  const t = await getTranslations("errors");

  return (
    <main className="lumina-fallback mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center px-5 text-center sm:px-8">
      <InkField />
      <p className="font-mono text-xs tracking-[0.28em] text-hobun">LUMINA</p>
      <h1 className="mt-6 text-2xl font-medium text-hobun">{t("notFoundTitle")}</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-hobun-dim">{t("notFoundBody")}</p>
      <Link href="/" className="theme-control mt-8 bg-hobun px-5 py-2.5 text-sm font-medium text-ink-900">
        {t("home")}
      </Link>
    </main>
  );
}
