import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { isLocale, localePath, type Locale } from "@/i18n/locale";
import { BillingAccessError, hasOwnEntitlement, markOwnEntitlementViewed } from "@/server/billing/service";
import { isMemberAuthConfigured } from "@/server/auth";
import { getSignedInMember } from "@/server/auth/session";
import { MemberAccessError } from "@/server/member/dal";
import type { MemberProfile } from "@/server/member/profileSchema";
import { isAIReportingEnabled, isYearForecastExpertReviewApproved } from "@/server/ai/settings";
import { forecastFromProfile } from "@/server/premium/forecastFromProfile";
import { getOwnBoundProfile } from "@/server/premium/reportContext";
import { NarrativeChapters } from "@/components/premium/NarrativeChapters";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "2027 Saju Year Report | LUMINA",
  robots: { index: false, follow: false },
};

function reportRoute(locale: Locale, path: string): string {
  return localePath(path, locale);
}

function createForecast(profile: MemberProfile) {
  return forecastFromProfile(profile, {
    expertReviewStatus: isYearForecastExpertReviewApproved() ? "approved" : "pending",
  });
}

function profileRequiredError(error: unknown): boolean {
  return error instanceof MemberAccessError && error.reason === "authentication_required";
}

function billingUnavailableError(error: unknown): boolean {
  return error instanceof BillingAccessError;
}

export default async function Saju2027ReportPage() {
  const localeValue = await getLocale();
  const locale = isLocale(localeValue) ? localeValue : "ko";
  const basePath = reportRoute(locale, "/premium/saju-2027");
  if (!isMemberAuthConfigured()) redirect(reportRoute(locale, "/account/sign-in"));
  const session = await getSignedInMember();
  if (!session) redirect(reportRoute(locale, "/account/sign-in"));

  let profile: MemberProfile | null;
  try {
    profile = await getOwnBoundProfile("saju-2027");
  } catch (error) {
    if (profileRequiredError(error)) redirect(reportRoute(locale, "/account/sign-in"));
    redirect(reportRoute(locale, "/account"));
  }
  if (!profile) redirect(reportRoute(locale, "/account"));

  let entitled = false;
  try {
    entitled = await hasOwnEntitlement("saju-2027");
  } catch (error) {
    if (billingUnavailableError(error)) redirect(basePath);
    redirect(basePath);
  }
  if (!entitled) redirect(basePath);

  const viewed = await markOwnEntitlementViewed("saju-2027");
  if (!viewed) redirect(basePath);
  const forecast = createForecast(profile);
  const textLocale = locale !== "ko" ? "en" : "ko";

  return (
    <main className="mx-auto w-full max-w-4xl px-5 pb-24 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-700 py-5">
        <Link href={basePath} className="font-mono text-xs tracking-[0.28em] text-hobun">LUMINA</Link>
        <div className="flex items-center gap-4">
          <LocaleSwitcher />
          <Link className="text-xs text-hobun-faint underline underline-offset-4" href={reportRoute(locale, "/account")}>
            {locale !== "ko" ? "Account" : "계정"}
          </Link>
        </div>
      </header>
      <section className="py-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-hobun">2027 · SAJU YEAR REPORT</p>
        <h1 className="mt-4 text-3xl font-medium tracking-tight text-hobun sm:text-5xl">
          {locale !== "ko" ? "A year of reflection" : "한 해를 돌아보는 사주 리포트"}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-hobun-dim">
          {locale !== "ko"
            ? "This report describes calculated traditional categories and their limits. It does not predict specific events or replace professional advice."
            : "계산된 전통 분류와 그 한계를 설명합니다. 특정 사건을 예언하거나 전문적인 조언을 대신하지 않습니다."}
        </p>
      </section>
      <div className="space-y-4">
        {forecast.blocks.map((block) => (
          <article key={block.id} className="border border-ink-800 bg-ink-950/50 p-5 sm:p-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-hobun-faint">{block.kind}</p>
            <h2 className="mt-2 text-lg font-medium text-hobun">{block.summary[textLocale]}</h2>
            <p className="mt-4 text-sm leading-7 text-hobun-dim">{block.detail[textLocale]}</p>
            {block.method ? <p className="mt-4 border-l border-ink-700 pl-3 text-xs leading-6 text-hobun-faint">{block.method[textLocale]}</p> : null}
            <p className="mt-4 text-[10px] leading-5 text-hobun-faint">
              {locale !== "ko" ? "Evidence refs" : "계산 근거"}: {block.evidenceRefs.join(", ")}
            </p>
          </article>
        ))}
      </div>
      {isAIReportingEnabled() ? <NarrativeChapters locale={textLocale} /> : null}
      <p className="mt-7 text-xs leading-6 text-hobun-faint">
        {forecast.expertReviewStatus === "approved"
          ? (locale !== "ko" ? "Expert review status: approved." : "전문가 검수 상태: 승인됨.")
          : (locale !== "ko" ? "Expert review status: pending." : "전문가 검수 상태: 대기 중.")}
      </p>
    </main>
  );
}
