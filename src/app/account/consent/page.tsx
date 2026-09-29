import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { ConsentForm } from "@/components/account/ConsentForm";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { isLocale, localePath, type Locale } from "@/i18n/locale";
import { sanitizeReturnTo } from "@/lib/returnTo";
import { isMemberAuthConfigured } from "@/server/auth";
import { getSignedInMember } from "@/server/auth/session";
import { hasRequiredMemberConsents } from "@/server/member/consents";

export const metadata: Metadata = {
  title: "LUMINA Account Consents",
  robots: { index: false, follow: false },
};

function routeForLocale(locale: Locale, path: string): string {
  return localePath(path, locale);
}

export default async function AccountConsentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [localeValue, query] = await Promise.all([getLocale(), searchParams]);
  const locale = isLocale(localeValue) ? localeValue : "ko";
  const rawReturnTo = query.returnTo;
  const returnTo = sanitizeReturnTo(Array.isArray(rawReturnTo) ? rawReturnTo[0] : rawReturnTo);
  if (!isMemberAuthConfigured()) redirect(routeForLocale(locale, "/account/sign-in"));

  const session = await getSignedInMember();
  if (!session) redirect(routeForLocale(locale, "/account/sign-in"));

  try {
    if (await hasRequiredMemberConsents(session.user.id)) redirect(returnTo ?? routeForLocale(locale, "/account"));
  } catch {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 pb-24 sm:px-8">
        <header className="flex items-center justify-between border-b border-ink-700 py-5">
          <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">LUMINA</Link>
          <LocaleSwitcher />
        </header>
        <p className="mt-10 text-sm text-hobun-dim">
          {locale !== "ko" ? "Member data is temporarily unavailable. Please try again." : "회원 정보를 일시적으로 확인할 수 없습니다. 잠시 후 다시 시도해 주세요."}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-24 sm:px-8">
      <header className="flex items-center justify-between border-b border-ink-700 py-5">
        <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">LUMINA</Link>
        <LocaleSwitcher />
      </header>
      <div className="py-10"><ConsentForm locale={locale} returnTo={returnTo} /></div>
    </main>
  );
}
