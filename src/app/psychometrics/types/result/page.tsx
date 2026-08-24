import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { CSSProperties } from "react";
import { MCCRAE_COSTA_1989, PITTENGER_1993, STEIN_SWAN_2019 } from "@engine/psychometrics/citations";
import { AdSlot } from "@/components/ads/AdSlot";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { ShareBar } from "@/components/report/ShareBar";
import { Disclaimer, Section } from "@/components/ui/Chrome";
import { EvidenceStatusBadge } from "@/components/ui/EvidenceStatusBadge";
import { MethodNote } from "@/components/ui/MethodNote";
import { MotionSafeImage } from "@/components/ui/MotionSafeImage";
import { ProgressiveBlock } from "@/components/ui/ProgressiveBlock";
import { ResultCover } from "@/components/ui/ResultCover";
import { SceneShell } from "@/components/ui/SceneShell";
import type { Locale } from "@/i18n/locale";
import { decodeResponses } from "@/lib/psychometricsCode";
import { buildJungianView, type JungianAxisView, type JungianView } from "@/lib/jungianModel";
import { assetPath } from "@/lib/assets";
import { analysisDefinition } from "@/lib/analysisCatalog";

interface Query {
  readonly r?: string;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Query>;
}): Promise<Metadata> {
  const t = await getTranslations("jungian");
  await searchParams;
  return {
    title: t("resultMetaTitle"),
    description: t("resultMetaDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function JungianResultPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const { r } = await searchParams;
  const responses = r ? decodeResponses(r) : null;
  const [t, tCommon, locale] = await Promise.all([
    getTranslations("jungian"),
    getTranslations("common"),
    getLocale(),
  ]);
  const resolvedLocale = locale as Locale;
  const evidence = analysisDefinition("jungian");

  if (!responses) {
    return (
      <SceneShell tone="psychometrics">
        <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
          <ReportHeader />
          <div className="py-24 text-center">
            <p className="text-sm text-hobun-dim">{t("brokenLink")}</p>
            <Link href="/psychometrics?to=types" className="mt-6 inline-block rounded-full bg-hobun px-6 py-3 text-sm font-semibold text-ink-900">
              {t("startTest")}
            </Link>
          </div>
        </main>
      </SceneShell>
    );
  }

  const view = buildJungianView(responses);
  const typeCode = view.typeCode ?? "????";
  const typeTitle = t("resultTitle", { code: typeCode });

  return (
    <SceneShell tone="psychometrics">
      <main className="mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
        <ReportHeader />

        <div className="py-8 sm:py-10">
          <ResultCover
            eyebrow={t("resultKicker")}
            title={typeTitle}
            summary={t("resultHero", { code: typeCode })}
            imageSrc={view.typeImageSrc ?? assetPath("psychometrics/types/axes", "ei-i")}
            imageAlt=""
            imageLabel={typeCode}
            tier="scientific"
            evidenceStatus={evidence.evidence.validationStatus}
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="jungian-type-code" aria-label={t("typeCodeLabel", { code: typeCode })}>
              {[...typeCode].map((letter, index) => (
                <span
                  key={`${letter}-${index}`}
                  className="jungian-type-glyph"
                  style={{ "--jungian-delay": `${index * 90}` } as CSSProperties}
                >
                  {letter}
                </span>
              ))}
            </span>
            <span className="text-sm text-hobun-dim">{t("certaintyLabel", { percent: Math.round(view.typeCertainty * 100) })}</span>
          </div>
          <p className="mt-4 border-l border-ink-600 pl-4 text-sm leading-relaxed text-hobun-faint">{t("trademarkNotice")}</p>
        </div>

        <Section index="01" title={t("axesTitle")} aside={t("axesAside")}>
          <div className="grid gap-5 lg:grid-cols-2">
            {view.axes.map((axis) => (
              <AxisResultCard
                key={axis.axis}
                axis={axis}
                locale={resolvedLocale}
                t={t}
                tCommon={tCommon}
              />
            ))}
          </div>
          <p className="mt-6 text-sm leading-relaxed text-hobun-faint">{t("boundaryNote")}</p>
        </Section>

        <Section index="02" title={t("typeSectionTitle")} aside={t("typeSectionAside")}>
          {view.typeExplanation ? (
            <div>
              {view.typeProfile ? (
                <TypeProfileCard
                  profile={view.typeProfile}
                  typeCode={typeCode}
                  locale={resolvedLocale}
                  imageSrc={view.typeImageSrc ?? assetPath("psychometrics/types/axes", "ei-i")}
                  imageAlt={t("typeImageAlt", { code: typeCode })}
                  imageNote={t("typeImageNote")}
                  nicknameLabel={t("typeNicknameLabel")}
                  keywordsLabel={t("typeKeywordsLabel")}
                />
              ) : null}
              <div className="mt-5">
                <ProgressiveBlock
                  block={view.typeExplanation}
                  locale={resolvedLocale}
                  detailLabel={tCommon("explanationDetails")}
                  methodLabel={tCommon("explanationMethod")}
                  evidenceLabel={tCommon("evidenceView")}
                  citationLabel={tCommon("citationLabel")}
                />
              </div>
            </div>
          ) : (
            <div className="border border-ink-700 bg-ink-950/70 p-5">
              <p className="text-base leading-relaxed text-hobun">{t("boundaryTypeSummary")}</p>
              <p className="mt-3 text-sm leading-relaxed text-hobun-dim">{t("boundaryTypeDetail")}</p>
            </div>
          )}
        </Section>

        <MethodNote
          locale={resolvedLocale}
          title={t("methodTitle")}
          method={{ ko: t("methodBody"), en: t("methodBody") }}
          citations={[MCCRAE_COSTA_1989, PITTENGER_1993, STEIN_SWAN_2019]}
        />

        <AdSlot slot="jungian-mid" label={tCommon("adLabel")} />

        <footer className="mt-10 space-y-8 border-t border-ink-700 pt-8">
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href={`/psychometrics/result?r=${r}`} className="inline-flex min-h-11 items-center border border-ink-600 px-4 text-hobun underline underline-offset-4 hover:border-hobun">
              {t("openBigFiveResult")}
            </Link>
            <Link href="/psychometrics?to=types" className="inline-flex min-h-11 items-center border border-ink-600 px-4 text-hobun underline underline-offset-4 hover:border-hobun">
              {t("retakeTest")}
            </Link>
          </div>
          <ShareBar
            title={`${typeTitle} · LUMINA`}
            restartHref="/psychometrics?to=types"
            restartLabel={t("retakeTest")}
          />
          <Disclaimer tier="scientific" />
        </footer>
      </main>
    </SceneShell>
  );
}

/** 유형별 별명·키워드 머리말 카드 — 16개 MBTI 유형 각각의 요약 얼굴이다. */
function TypeProfileCard({
  profile,
  typeCode,
  locale,
  imageSrc,
  imageAlt,
  imageNote,
  nicknameLabel,
  keywordsLabel,
}: {
  readonly profile: NonNullable<JungianView["typeProfile"]>;
  readonly typeCode: string;
  readonly locale: Locale;
  readonly imageSrc: string;
  readonly imageAlt: string;
  readonly imageNote: string;
  readonly nicknameLabel: string;
  readonly keywordsLabel: string;
}) {
  const nickname = locale === "en" ? profile.nickname.en : profile.nickname.ko;
  const keywords = profile.keywords.map((keyword) => (locale === "en" ? keyword.en : keyword.ko));

  return (
    <div className="overflow-hidden border border-ink-700 bg-ink-950/70">
      <div className="grid sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="group relative aspect-[3/2] min-h-[190px] overflow-hidden border-b border-ink-700 sm:aspect-auto sm:min-h-[250px] sm:border-b-0 sm:border-r">
          <MotionSafeImage
            src={imageSrc}
            alt={imageAlt}
            sizes="(min-width: 640px) 38vw, 92vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            fallbackLabel={typeCode}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/85 via-transparent to-transparent" aria-hidden />
          <span className="absolute bottom-4 left-4 border border-hobun/45 bg-ink-950/65 px-2.5 py-1 font-mono text-xs tracking-[0.2em] text-hobun">
            {typeCode}
          </span>
        </div>
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 aria-label={nicknameLabel} className="text-xl font-semibold text-hobun">{nickname}</h3>
            <span className="tabular font-mono text-sm tracking-[0.18em] text-hobun-faint">{typeCode}</span>
          </div>
          <ul className="mt-4 flex flex-wrap gap-2" aria-label={keywordsLabel}>
            {keywords.map((keyword) => (
              <li key={keyword} className="border border-ink-600 px-2.5 py-1 font-mono text-xs text-hobun-dim">
                {keyword}
              </li>
            ))}
          </ul>
          <p className="mt-5 border-l border-ink-600 pl-4 text-sm leading-relaxed text-hobun-faint">
            {imageNote}
          </p>
        </div>
      </div>
    </div>
  );
}

function AxisResultCard({
  axis,
  locale,
  t,
  tCommon,
}: {
  readonly axis: JungianAxisView;
  readonly locale: Locale;
  readonly t: (key: string, values?: Record<string, string | number>) => string;
  readonly tCommon: (key: string, values?: Record<string, string | number>) => string;
}) {
  const position = Math.max(0, Math.min(100, (axis.continuous + 100) / 2));
  const intervalStart = Math.max(0, Math.min(100, (axis.ci95[0] + 100) / 2));
  const intervalEnd = Math.max(0, Math.min(100, (axis.ci95[1] + 100) / 2));
  const intervalWidth = Math.max(1, intervalEnd - intervalStart);
  const negativeLabel = locale === "en" ? axis.negativeLabel.en : axis.negativeLabel.ko;
  const positiveLabel = locale === "en" ? axis.positiveLabel.en : axis.positiveLabel.ko;

  return (
    <article className={`jungian-axis-result ${axis.isBoundary ? "is-boundary" : ""}`} aria-labelledby={`axis-${axis.axis}-title`}>
      <div className="grid gap-5 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]">
        <div className="relative aspect-[3/2] overflow-hidden rounded-[1rem] border border-ink-700 bg-ink-950">
          <MotionSafeImage
            src={axis.imageSrc}
            alt=""
            sizes="(min-width: 640px) 220px, 88vw"
            className="object-cover"
            fallbackLabel={axis.axis}
          />
        </div>
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[12px] tracking-[0.18em] text-hobun-faint">{axis.axis}</p>
              <h3 id={`axis-${axis.axis}-title`} className="mt-2 text-xl font-semibold text-hobun">
                {t(`jungianAxes.${axis.axis}.label`)}
              </h3>
            </div>
            <span className="jungian-axis-letter" aria-label={t("axisLetterLabel", { axis: axis.axis, pole: axis.pole ?? "?" })}>
              {axis.pole ?? "?"}
            </span>
          </div>
          <div className="mt-6" aria-label={t("axisScaleLabel", { axis: axis.axis })}>
            <div className="relative h-2 rounded-full bg-ink-700">
              <span className="jungian-ci-band" style={{ left: `${intervalStart}%`, width: `${intervalWidth}%` }} aria-hidden />
              <span className="absolute inset-y-[-4px] left-1/2 w-px bg-ink-600" aria-hidden />
              <span className="jungian-axis-marker" style={{ left: `${position}%` }} aria-hidden />
            </div>
            <div className="mt-3 flex justify-between gap-3 text-[13px] text-hobun-faint">
              <span>{axis.negativePole} · {negativeLabel}</span>
              <span className="tabular font-mono">{axis.continuous.toFixed(0)}</span>
              <span className="text-right">{positiveLabel} · {axis.positivePole}</span>
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-xs text-hobun-faint sm:grid-cols-2">
            <span>{t("zScoreLabel", { z: axis.zScore.toFixed(2) })}</span>
            <span>{t("ci95AxisLabel", { low: axis.ci95[0].toFixed(0), high: axis.ci95[1].toFixed(0) })}</span>
            <span className="sm:col-span-2">{t("correlationBasisLabel", { r: axis.correlationBasis.toFixed(3) })}</span>
          </div>
        </div>
      </div>
      {axis.explanation ? (
        <div className="mt-5 border-l border-ink-600 pl-4">
          <ProgressiveBlock
            block={axis.explanation}
            locale={locale}
            detailLabel={tCommon("explanationDetails")}
            methodLabel={tCommon("explanationMethod")}
            evidenceLabel={tCommon("evidenceView")}
            citationLabel={tCommon("citationLabel")}
          />
        </div>
      ) : (
        <p className="mt-5 border-l border-hwa/60 pl-4 text-sm leading-relaxed text-hwa">{t("axisBoundaryNotice")}</p>
      )}
    </article>
  );
}

function ReportHeader() {
  const evidence = analysisDefinition("jungian");

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5">
      <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">LUMINA</Link>
      <div className="no-print flex items-center gap-3">
        <LocaleSwitcher />
        <EvidenceStatusBadge status={evidence.evidence.validationStatus} />
      </div>
    </header>
  );
}
