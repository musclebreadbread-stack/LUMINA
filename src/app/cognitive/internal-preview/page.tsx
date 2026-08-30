import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { StandardizedResult } from "@/components/cognitive/StandardizedResult";
import { resolveInternalPreviewPreset } from "@/lib/cognitiveInternalPreviewPresets";
import { hasValidInternalPreviewToken, isInternalPreviewEnabled } from "@/server/cognitive/internalPreview";
import type { Locale } from "@/i18n/locale";

interface InternalPreviewPageProps {
  readonly searchParams: Promise<{ token?: string; preset?: string }>;
}

/**
 * COGNITIVE_INTERNAL_PREVIEW_TOKEN이 설정된 배포에서만 존재한다. 그 외에는
 * 항상 404를 반환해 라우트 자체가 없는 것과 구별되지 않는다. 합성 프리셋만
 * StandardizedResult에 전달하므로 실제 참가자 데이터·규준 경로와 접점이 없다.
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "LUMINA / internal preview (simulated — not real)",
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function CognitiveInternalPreviewPage({ searchParams }: InternalPreviewPageProps) {
  const params = await searchParams;
  if (!isInternalPreviewEnabled() || !hasValidInternalPreviewToken(params.token)) notFound();

  const locale = (await getLocale()) as Locale;
  const korean = locale === "ko";
  const score = resolveInternalPreviewPreset(params.preset);
  const presetLink = (preset: string) => `?token=${encodeURIComponent(params.token ?? "")}&preset=${preset}`;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-16">
      <div role="alert" className="mb-8 border-4 border-hobun bg-ink-950 p-5">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-hobun">
          LUMINA / INTERNAL PREVIEW — SIMULATED, NOT REAL
        </p>
        <p className="mt-3 text-sm leading-relaxed text-hobun-dim">
          {korean
            ? "아래 IQ·백분위·신뢰구간은 승인된 규준이 아닌 디자인 검토용 합성 예시값입니다. 실사용자에게 노출되어서는 안 됩니다."
            : "The IQ, percentile, and confidence interval below are synthetic placeholder values for internal design review only — not an approved norm, never shown to real users."}
        </p>
      </div>

      <StandardizedResult
        score={score}
        locale={locale}
        imageAlt={korean ? "인지능력 결과 삽화" : "Cognitive result illustration"}
      />

      <nav aria-label="preset" className="mt-8 flex gap-4 font-mono text-xs text-hobun-faint">
        <Link href={presetLink("average")} className="underline">average</Link>
        <Link href={presetLink("high")} className="underline">high</Link>
        <Link href={presetLink("low")} className="underline">low</Link>
      </nav>
    </main>
  );
}
