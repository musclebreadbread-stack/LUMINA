import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { LegalDocument, legalDocumentTitle } from "@/components/legal/LegalDocument";
import { LEGAL_DOCUMENTS } from "@/content/legal/documents";

export const metadata: Metadata = { title: legalDocumentTitle(LEGAL_DOCUMENTS.terms) };

export default async function TermsPage() {
  const [t, tNav, locale] = await Promise.all([getTranslations("policy"), getTranslations("nav"), getLocale()]);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5 pr-16">
        <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">
          LUMINA
        </Link>
        <LocaleSwitcher />
      </header>

      <LegalDocument
        source={LEGAL_DOCUMENTS.terms}
        notice={locale === "ko" ? undefined : t("koreanOriginalNotice")}
      />

      <footer className="mt-16 border-t border-ink-700 pt-8">
        <Link href="/privacy" className="font-mono text-[13px] text-hobun-faint underline underline-offset-4">
          {tNav("privacyView")}
        </Link>
      </footer>
    </main>
  );
}
