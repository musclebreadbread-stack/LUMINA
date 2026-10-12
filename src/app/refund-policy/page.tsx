import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { LegalDocument, legalDocumentTitle } from "@/components/legal/LegalDocument";
import { LEGAL_DOCUMENTS } from "@/content/legal/documents";
import { isLocale, localePath } from "@/i18n/locale";

export const metadata: Metadata = {
  title: legalDocumentTitle(LEGAL_DOCUMENTS.refund),
  robots: { index: true, follow: true },
};

export default async function RefundPolicyPage() {
  const [value, t] = await Promise.all([getLocale(), getTranslations("policy")]);
  const locale = isLocale(value) ? value : "ko";
  const english = locale !== "ko";
  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
      <header className="flex items-center justify-between border-b border-ink-700 py-5">
        <Link href={localePath("/", locale)} className="font-mono text-xs tracking-[0.28em] text-hobun">LUMINA</Link>
        <Link href={localePath("/premium/saju-2027", locale)} className="text-xs text-hobun-faint underline underline-offset-4">
          {english ? "2027 report" : "2027 리포트"}
        </Link>
      </header>
      <LegalDocument source={LEGAL_DOCUMENTS.refund} notice={english ? t("koreanOriginalNotice") : undefined} />
    </main>
  );
}
