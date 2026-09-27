import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getPublicShare } from "@/server/member/dal";
import { intlLocale, isLocale, localePath, type Locale } from "@/i18n/locale";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "LUMINA shared result",
  robots: { index: false, follow: false },
};

function valueLabel(value: string, locale: Locale): string {
  if (locale !== "ko") return value;
  if (value === "low") return "낮음";
  if (value === "mid") return "중간";
  if (value === "high") return "높음";
  return value;
}

export default async function SharedResultPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const [{ id }, localeValue] = await Promise.all([params, getLocale()]);
  const locale = isLocale(localeValue) ? localeValue : "ko";
  const snapshot = await getPublicShare(id);
  if (!snapshot) notFound();

  const isEnglish = locale !== "ko";
  const completedAt = new Date(snapshot.completedAt);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
      <header className="flex items-center justify-between border-b border-ink-700 py-5">
      <Link href={localePath("/", locale)} className="font-mono text-xs tracking-[0.28em] text-hobun">LUMINA</Link>
        <p className="font-mono text-[10px] tracking-[0.18em] text-hobun-faint">SHARED REPORT</p>
      </header>
      <section className="py-12">
        <p className="font-mono text-xs tracking-[0.2em] text-hobun-faint">{snapshot.analysisKey}</p>
        <h1 className="mt-3 text-3xl font-medium text-hobun">
          {isEnglish ? "A LUMINA result shared with you" : "LUMINA 결과를 공유받았습니다"}
        </h1>
        <p className="mt-4 text-sm text-hobun-dim">
          {isEnglish ? "Completed" : "분석 완료"} · <time dateTime={completedAt.toISOString()}>
            {completedAt.toLocaleDateString(intlLocale(locale))}
          </time>
        </p>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-hobun-dim">
          {isEnglish
            ? "This link contains a report summary chosen by the account owner. Birth details and original answers are not included."
            : "계정 소유자가 선택해 공유한 리포트 요약입니다. 생년월일시와 원래 응답은 포함하지 않습니다."}
        </p>
        <div className="mt-10 space-y-4">
          {snapshot.signals.map((signal) => (
            <article key={signal.constructId} className="border border-ink-700 bg-ink-900/50 p-5 sm:p-6">
              <h2 className="text-sm font-medium text-hobun">{signal.constructId}</h2>
              <p className="mt-2 font-mono text-xs text-hobun-dim">
                {signal.value.kind === "band"
                  ? valueLabel(signal.value.band, locale)
                  : signal.value.code}
              </p>
              {signal.descriptorIds.length > 0 ? (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {signal.descriptorIds.map((descriptorId) => (
                    <li key={descriptorId} className="border border-ink-700 px-3 py-2 text-xs text-hobun-faint">{descriptorId}</li>
                  ))}
                </ul>
              ) : null}
              {signal.limitationIds.length > 0 ? (
                <p className="mt-4 text-xs leading-relaxed text-hobun-faint">
                  {isEnglish ? "Context: " : "참고: "}{signal.limitationIds.join(" · ")}
                </p>
              ) : null}
            </article>
          ))}
        </div>
        <p className="mt-8 text-xs leading-relaxed text-hobun-faint">
          {isEnglish
            ? "This material is for self-reflection and is not medical, legal, or financial advice."
            : "이 자료는 자기 탐구를 위한 참고 정보이며 의료·법률·금융 조언이 아닙니다."}
        </p>
      </section>
    </main>
  );
}
