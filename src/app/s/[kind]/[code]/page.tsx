import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { JUNGIAN_AXES, jungianAxisConfig, type JungianAxis } from "@engine/psychometrics/jungian";
import { MCCRAE_COSTA_1989, PITTENGER_1993, STEIN_SWAN_2019 } from "@engine/psychometrics/citations";
import { FACTOR_META } from "@engine/psychometrics/meta";
import { FACTORS as BIGFIVE_FACTORS } from "@engine/psychometrics/items";
import { FACTORS as DARKTRIAD_FACTORS } from "@engine/darktriad/items";
import { FACTORS as EQ_FACTORS, TOTAL_ITEM_COUNT as EQ_TOTAL_ITEM_COUNT } from "@engine/eq/items";
import {
  DOMAINS as COGNITIVE_DOMAINS,
  ITEMS_PER_DOMAIN as COGNITIVE_ITEMS_PER_DOMAIN,
  ITEM_COUNT as COGNITIVE_ITEM_COUNT,
} from "@engine/cognitive/items";
import { totalNormScoreFor as eqTotalNormScoreFor } from "@engine/eq/norms";
import { classifyQuadrant } from "@engine/attachment/quadrants";
import type { AnalysisKey, ValidationStatus } from "@engine/shared/evidence";
import type { AmbientTone } from "@/components/ambient/AmbientLayer";
import { ShareLandingAnalytics } from "@/components/report/ShareLandingAnalytics";
import { ShareLandingCta } from "@/components/report/ShareLandingCta";
import { Disclaimer } from "@/components/ui/Chrome";
import { EvidenceStatusBadge } from "@/components/ui/EvidenceStatusBadge";
import { MethodNote } from "@/components/ui/MethodNote";
import { MotionSafeImage } from "@/components/ui/MotionSafeImage";
import { SceneShell } from "@/components/ui/SceneShell";
import { DEFAULT_LOCALE } from "@/i18n/locale";
import { analysisDefinition } from "@/lib/analysisCatalog";
import { AXIS_LABELS } from "@/lib/attachmentModel";
import { assetPath } from "@/lib/assets";
import {
  attachmentImagePath,
  COGNITIVE_OVERVIEW_IMAGE,
  darkTriadImagePath,
  EQ_OVERVIEW_IMAGE,
} from "@/lib/psychometricsAssets";
import {
  buildFallbackShareMeta,
  buildInvalidShareMeta,
  buildJungianShareMeta,
  SHARE_KIND_ANALYSIS_KEY,
  SHARE_KIND_HUB_TITLE_KEY,
  type ShareMetaText,
  type Translate,
} from "@/lib/shareMeta";
import {
  correctCountFromAccuracy,
  decodeShareCode,
  isShareKind,
  type AttachmentSummaryV1,
  type BigFiveSummaryV1,
  type CognitiveSummaryV1,
  type CognitiveSummaryV2,
  type DarkTriadSummaryV1,
  type EqSummaryV1,
  type JungianSummaryV1,
  type ShareKind,
  type ShareSummaryV1,
} from "@/lib/shareCode";

/** SceneShell 배경 톤은 kind별로 이미 존재하는 랜딩 페이지 톤을 그대로 따른다. */
const SHARE_KIND_SCENE_TONE: Readonly<Record<ShareKind, AmbientTone>> = Object.freeze({
  jungian: "psychometrics",
  bigfive: "psychometrics",
  darktriad: "darktriad",
  attachment: "attachment",
  eq: "eq",
  cognitive: "cognitive",
});

/**
 * 공유 요약 페이지 — 다른 사람이 만든 요약 하나만 읽기 전용으로 보여준다.
 * 코드는 경로 세그먼트에서 그 자리에서 다시 계산하므로 서버 저장소가 없다.
 * summary.locale은 이 코드를 만든 사람이 보던 언어이므로, 뷰어의 쿠키 로케일이
 * 아니라 항상 summary.locale로 번역기를 명시 지정한다.
 */

interface Params {
  readonly kind: string;
  readonly code: string;
}

async function resolveShareSummary({ kind, code }: Params): Promise<ShareSummaryV1 | null> {
  if (!isShareKind(kind)) return null;
  const summary = decodeShareCode(code, kind);
  // cognitive v2 predates the release gate and contains theoretical IQ/CI
  // fields. It remains decodable for migration tooling, but is never a
  // public result until a Korean adult norm is approved.
  if (summary?.kind === "cognitive" && summary.version === 2) return null;
  return summary;
}

async function buildPageMeta(summary: ShareSummaryV1): Promise<ShareMetaText> {
  const tShare = await getTranslations({ locale: summary.locale, namespace: "share" });
  const translate = tShare as unknown as Translate;

  if (summary.kind === "jungian") {
    return buildJungianShareMeta(summary.typeCode, translate);
  }

  const tHome = await getTranslations({ locale: summary.locale, namespace: "home" });
  const kindTitle = tHome(SHARE_KIND_HUB_TITLE_KEY[summary.kind]);
  return buildFallbackShareMeta(kindTitle, translate);
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { kind, code } = await params;
  const summary = await resolveShareSummary({ kind, code });

  if (!summary) {
    // 어느 로케일로 만들어졌는지 알 수 없는 깨진 링크라, 사이트 기본 로케일로만 안내한다.
    const tShare = await getTranslations({ locale: DEFAULT_LOCALE, namespace: "share" });
    const meta = buildInvalidShareMeta(tShare as unknown as Translate);
    return { title: meta.title, description: meta.description, robots: { index: false, follow: false } };
  }

  const meta = await buildPageMeta(summary);

  return {
    title: meta.title,
    description: meta.description,
    // 링크 하나마다 생기는 얇은 개인 요약 페이지라 색인은 하지 않지만, 본문의
    // CTA는 실제 분석 랜딩 페이지로 링크 지분을 넘겨야 하므로 follow는 허용한다.
    robots: { index: false, follow: true },
    openGraph: {
      title: meta.title,
      description: meta.description,
      images: [{ url: `/s/${kind}/${code}/opengraph-image`, width: 1200, height: 630, alt: "LUMINA" }],
    },
  };
}

export default async function SharePage({ params }: { readonly params: Promise<Params> }) {
  const summary = await resolveShareSummary(await params);
  if (!summary) notFound();

  return (
    <SceneShell tone={SHARE_KIND_SCENE_TONE[summary.kind]}>
      <ShareLandingAnalytics analysisKey={SHARE_KIND_ANALYSIS_KEY[summary.kind]} />
      <main className="mx-auto w-full max-w-4xl px-5 pb-24 sm:px-8">
        <header className="flex items-center justify-between border-b border-ink-700 py-5">
          <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">LUMINA</Link>
        </header>

        {summary.kind === "jungian" ? (
          <JungianShareBody summary={summary} />
        ) : summary.kind === "bigfive" ? (
          <BigFiveShareBody summary={summary} />
        ) : summary.kind === "darktriad" ? (
          <DarkTriadShareBody summary={summary} />
        ) : summary.kind === "attachment" ? (
          <AttachmentShareBody summary={summary} />
        ) : summary.kind === "eq" ? (
          <EqShareBody summary={summary} />
        ) : summary.kind === "cognitive" ? (
          summary.version === 2 ? <CognitiveEstimateShareBody summary={summary} /> : <CognitiveShareBody summary={summary} />
        ) : null}
      </main>
    </SceneShell>
  );
}

async function JungianShareBody({ summary }: { readonly summary: JungianSummaryV1 }) {
  const [t, tShare] = await Promise.all([
    getTranslations({ locale: summary.locale, namespace: "jungian" }),
    getTranslations({ locale: summary.locale, namespace: "share" }),
  ]);
  const evidence = analysisDefinition("jungian");
  const byAxis = new Map(summary.axes.map((entry) => [entry.axis, entry] as const));
  const kindTitle = t("kicker");
  // 유형 삽화는 기본 16유형만 있다 — "INFP-AV" 같은 v2 코드는 대시 앞부분만 확인한다.
  const jungianBaseCode = summary.typeCode.split("-")[0] ?? summary.typeCode;
  const jungianImageSrc = /^[A-Za-z]{4}$/.test(jungianBaseCode)
    ? assetPath("psychometrics/types", jungianBaseCode.toLowerCase())
    : assetPath("psychometrics/types/axes", "ei-i");

  return (
    <>
      <section className="py-10 sm:py-12">
        <p className="font-mono text-[13px] tracking-[0.16em] text-hobun-faint">{tShare("jungian.heroKicker")}</p>
        <h1 className="mt-4 max-w-[18ch] text-[clamp(2rem,5.5vw,3.4rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-hobun">
          {tShare("jungian.heroTitle", { code: summary.typeCode })}
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-hobun-dim">{tShare("jungian.heroBody")}</p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="jungian-type-code" aria-label={t("typeCodeLabel", { code: summary.typeCode })}>
            {[...summary.typeCode].map((letter, index) => (
              <span key={`${letter}-${index}`} className="jungian-type-glyph">{letter}</span>
            ))}
          </span>
          <EvidenceStatusBadge status={evidence.evidence.validationStatus} derivedOverride={t("evidenceStatusOverride")} />
        </div>
        <div className="assessment-result-art relative mt-8 aspect-[4/3] max-w-[280px] overflow-hidden rounded-[1.25rem] border border-ink-700 bg-ink-900/75">
          <MotionSafeImage
            src={jungianImageSrc}
            alt={tShare("jungian.heroTitle", { code: summary.typeCode })}
            sizes="(min-width: 640px) 280px, 70vw"
            priority
            className="object-cover"
            fallbackLabel={summary.typeCode}
          />
        </div>
      </section>

      <section className="border-t border-ink-700 pt-8">
        <h2 className="text-lg font-medium text-hobun">{tShare("jungian.axesTitle")}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {JUNGIAN_AXES.map((axis) => {
            const entry = byAxis.get(axis);
            return (
              <AxisRow
                key={axis}
                axis={axis}
                continuous={entry?.continuous ?? 0}
                isBoundary={entry?.isBoundary ?? true}
                label={t(`jungianAxes.${axis}.label`)}
              />
            );
          })}
        </div>
      </section>

      <SummaryOnlyNotice text={tShare("summaryOnlyNotice")} limitation={evidence.evidence.limitations[0] ?? ""} limitationLabel={tShare("limitationLabel")} />

      <MethodNote
        locale={summary.locale}
        title={t("methodTitle")}
        method={{ ko: t("methodBody"), en: t("methodBody") }}
        citations={[MCCRAE_COSTA_1989, PITTENGER_1993, STEIN_SWAN_2019]}
      />

      <ShareCallToAction
        ctaTitle={tShare("ctaTitle")}
        ctaBody={tShare("ctaBody")}
        ctaLabel={tShare("ctaButton", { title: kindTitle })}
        href={evidence.href}
        analysisKey={evidence.key}
      />

      <footer className="mt-10 border-t border-ink-700 pt-8">
        <Disclaimer tier={evidence.tier} />
      </footer>
    </>
  );
}

async function BigFiveShareBody({ summary }: { readonly summary: BigFiveSummaryV1 }) {
  const [tShare, tHome, tPsychometrics] = await Promise.all([
    getTranslations({ locale: summary.locale, namespace: "share" }),
    getTranslations({ locale: summary.locale, namespace: "home" }),
    getTranslations({ locale: summary.locale, namespace: "psychometrics" }),
  ]);
  const evidence = analysisDefinition(SHARE_KIND_ANALYSIS_KEY.bigfive);
  const kindTitle = tHome(SHARE_KIND_HUB_TITLE_KEY.bigfive);
  const byFactor = new Map(summary.factors.map((entry) => [entry.factor, entry.tScore] as const));
  const topFactor = BIGFIVE_FACTORS.reduce((top, factor) =>
    (byFactor.get(factor) ?? 50) > (byFactor.get(top) ?? 50) ? factor : top,
  );

  return (
    <>
      <ShareHero
        kicker={tShare("fallback.heroKicker")}
        title={tShare("fallback.heroTitle", { title: kindTitle })}
        body={tShare("fallback.heroBody", { title: kindTitle })}
        status={evidence.evidence.validationStatus}
        imageSrc={assetPath("psychometrics/factors", topFactor)}
        imageAlt={kindTitle}
      />

      <section className="border-t border-ink-700 pt-8">
        <h2 className="text-lg font-medium text-hobun">{tPsychometrics("sectionFactors")}</h2>
        <div className="mt-5 flex flex-col gap-4">
          {BIGFIVE_FACTORS.map((factor) => (
            <FactorScoreRow
              key={factor}
              label={summary.locale === "en" ? FACTOR_META[factor].en : FACTOR_META[factor].ko}
              tScore={byFactor.get(factor) ?? 50}
            />
          ))}
        </div>
      </section>

      <SummaryOnlyNotice text={tShare("summaryOnlyNotice")} limitation={evidence.evidence.limitations[0] ?? ""} limitationLabel={tShare("limitationLabel")} />

      <ShareCallToAction
        ctaTitle={tShare("ctaTitle")}
        ctaBody={tShare("ctaBody")}
        ctaLabel={tShare("ctaButton", { title: kindTitle })}
        href={evidence.href}
        analysisKey={evidence.key}
      />

      <footer className="mt-10 border-t border-ink-700 pt-8">
        <Disclaimer tier={evidence.tier} />
      </footer>
    </>
  );
}

async function DarkTriadShareBody({ summary }: { readonly summary: DarkTriadSummaryV1 }) {
  const [tShare, tHome, tDarkTriad] = await Promise.all([
    getTranslations({ locale: summary.locale, namespace: "share" }),
    getTranslations({ locale: summary.locale, namespace: "home" }),
    getTranslations({ locale: summary.locale, namespace: "darktriad" }),
  ]);
  const evidence = analysisDefinition(SHARE_KIND_ANALYSIS_KEY.darktriad);
  const kindTitle = tHome(SHARE_KIND_HUB_TITLE_KEY.darktriad);
  const bySubscale = new Map(summary.subscales.map((entry) => [entry.subscale, entry.tScore] as const));
  const topSubscale = DARKTRIAD_FACTORS.reduce((top, subscale) =>
    (bySubscale.get(subscale) ?? 50) > (bySubscale.get(top) ?? 50) ? subscale : top,
  );

  return (
    <>
      <ShareHero
        kicker={tShare("fallback.heroKicker")}
        title={tShare("fallback.heroTitle", { title: kindTitle })}
        body={tShare("fallback.heroBody", { title: kindTitle })}
        status={evidence.evidence.validationStatus}
        imageSrc={darkTriadImagePath(topSubscale)}
        imageAlt={tDarkTriad(`factors.${topSubscale}.label`)}
      />

      <section className="border-t border-ink-700 pt-8">
        <h2 className="text-lg font-medium text-hobun">{tDarkTriad("sectionFactors")}</h2>
        <div className="mt-5 flex flex-col gap-4">
          {DARKTRIAD_FACTORS.map((subscale) => (
            <FactorScoreRow
              key={subscale}
              label={tDarkTriad(`factors.${subscale}.label`)}
              tScore={bySubscale.get(subscale) ?? 50}
            />
          ))}
        </div>
      </section>

      <SummaryOnlyNotice text={tShare("summaryOnlyNotice")} limitation={evidence.evidence.limitations[0] ?? ""} limitationLabel={tShare("limitationLabel")} />

      <ShareCallToAction
        ctaTitle={tShare("ctaTitle")}
        ctaBody={tShare("ctaBody")}
        ctaLabel={tShare("ctaButton", { title: kindTitle })}
        href={evidence.href}
        analysisKey={evidence.key}
      />

      <footer className="mt-10 border-t border-ink-700 pt-8">
        <Disclaimer tier={evidence.tier} />
      </footer>
    </>
  );
}

async function AttachmentShareBody({ summary }: { readonly summary: AttachmentSummaryV1 }) {
  const [tShare, tHome, tAttachment] = await Promise.all([
    getTranslations({ locale: summary.locale, namespace: "share" }),
    getTranslations({ locale: summary.locale, namespace: "home" }),
    getTranslations({ locale: summary.locale, namespace: "attachment" }),
  ]);
  const evidence = analysisDefinition(SHARE_KIND_ANALYSIS_KEY.attachment);
  const kindTitle = tHome(SHARE_KIND_HUB_TITLE_KEY.attachment);
  const classification = classifyQuadrant(
    { rawSum: 0, mean: summary.anxiety },
    { rawSum: 0, mean: summary.avoidance },
  );
  const quadrantLabel = summary.locale === "en" ? classification.labelEn : classification.labelKo;
  const quadrantDescription = summary.locale === "en" ? classification.descriptionEn : classification.descriptionKo;
  const anxietyLabel = summary.locale === "en" ? AXIS_LABELS.anxiety.en : AXIS_LABELS.anxiety.ko;
  const avoidanceLabel = summary.locale === "en" ? AXIS_LABELS.avoidance.en : AXIS_LABELS.avoidance.ko;

  return (
    <>
      <ShareHero
        kicker={tShare("fallback.heroKicker")}
        title={tShare("fallback.heroTitle", { title: kindTitle })}
        body={tShare("fallback.heroBody", { title: kindTitle })}
        status={evidence.evidence.validationStatus}
        imageSrc={attachmentImagePath(classification.quadrant)}
        imageAlt={quadrantLabel}
      />

      <section className="border-t border-ink-700 pt-8">
        <h2 className="text-lg font-medium text-hobun">{tAttachment("resultHeading")}</h2>
        <p className="mt-2 text-2xl font-semibold text-hobun">{quadrantLabel}</p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-hobun-dim">{quadrantDescription}</p>
        <div className="mt-5 flex flex-col gap-4">
          <LikertAxisRow label={anxietyLabel} mean={summary.anxiety} />
          <LikertAxisRow label={avoidanceLabel} mean={summary.avoidance} />
        </div>
      </section>

      <SummaryOnlyNotice text={tShare("summaryOnlyNotice")} limitation={evidence.evidence.limitations[0] ?? ""} limitationLabel={tShare("limitationLabel")} />

      <ShareCallToAction
        ctaTitle={tShare("ctaTitle")}
        ctaBody={tShare("ctaBody")}
        ctaLabel={tShare("ctaButton", { title: kindTitle })}
        href={evidence.href}
        analysisKey={evidence.key}
      />

      <footer className="mt-10 border-t border-ink-700 pt-8">
        <Disclaimer tier={evidence.tier} />
      </footer>
    </>
  );
}

async function EqShareBody({ summary }: { readonly summary: EqSummaryV1 }) {
  const [tShare, tHome, tEq] = await Promise.all([
    getTranslations({ locale: summary.locale, namespace: "share" }),
    getTranslations({ locale: summary.locale, namespace: "home" }),
    getTranslations({ locale: summary.locale, namespace: "eq" }),
  ]);
  const evidence = analysisDefinition(SHARE_KIND_ANALYSIS_KEY.eq);
  const kindTitle = tHome(SHARE_KIND_HUB_TITLE_KEY.eq);
  const byFactor = new Map(summary.subscales.map((entry) => [entry.subscale, entry.tScore] as const));

  // 공유 코드에는 총점 원점수만 싣고 T점수·백분위는 여기서 엔진으로 다시 계산한다 —
  // 규준이 갱신되면 이미 배포된 링크도 옛 수치에 얼어붙지 않고 새 값으로 그려진다.
  const totalMax = EQ_TOTAL_ITEM_COUNT * 5;
  const totalNorm = eqTotalNormScoreFor(summary.totalRawSum);
  const totalPosition = ((summary.totalRawSum - EQ_TOTAL_ITEM_COUNT) / (totalMax - EQ_TOTAL_ITEM_COUNT)) * 100;

  return (
    <>
      <ShareHero
        kicker={tShare("fallback.heroKicker")}
        title={tShare("fallback.heroTitle", { title: kindTitle })}
        body={tShare("fallback.heroBody", { title: kindTitle })}
        status={evidence.evidence.validationStatus}
        imageSrc={EQ_OVERVIEW_IMAGE}
        imageAlt={tEq("resultImageAlt")}
      />

      <section className="border-t border-ink-700 pt-8">
        <h2 className="text-lg font-medium text-hobun">{tEq("sectionFactors")}</h2>

        <div className="mt-5 rounded-[1.25rem] border border-ink-700 bg-ink-950/70 p-5">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm font-medium text-hobun">{tEq("totalLabel")}</span>
            <span className="tabular font-mono text-[13px] text-hobun-faint">
              {tEq("rawSumLabel", { score: summary.totalRawSum, max: totalMax })}
            </span>
          </div>
          <div className="mt-4 grid gap-2 text-xs text-hobun-faint sm:grid-cols-2">
            {totalNorm ? (
              <>
                <span>{tEq("tScoreLabel", { score: totalNorm.tScore.toFixed(1) })}</span>
                <span>{tEq("percentileLabel", { n: totalNorm.percentile })}</span>
                <span>
                  {tEq("normSample", {
                    n: totalNorm.sampleSize.toLocaleString(summary.locale === "en" ? "en-US" : "ko-KR"),
                  })}
                </span>
              </>
            ) : (
              <span>{tEq("normUnavailable")}</span>
            )}
          </div>
          <div className="relative mt-4 h-2 rounded-full bg-ink-700">
            <span
              aria-hidden
              className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-hobun"
              style={{ left: `${Math.max(0, Math.min(100, totalPosition))}%` }}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          {EQ_FACTORS.map((subscale) => (
            <EqSubscaleRow
              key={subscale}
              label={tEq(`factors.${subscale}.label`)}
              tScore={byFactor.get(subscale) ?? 50}
            />
          ))}
        </div>
        <p className="mt-5 text-xs leading-relaxed text-hobun-faint">{tEq("scaleNote")}</p>
      </section>

      <SummaryOnlyNotice text={tShare("summaryOnlyNotice")} limitation={evidence.evidence.limitations[0] ?? ""} limitationLabel={tShare("limitationLabel")} />

      <ShareCallToAction
        ctaTitle={tShare("ctaTitle")}
        ctaBody={tShare("ctaBody")}
        ctaLabel={tShare("ctaButton", { title: kindTitle })}
        href={evidence.href}
        analysisKey={evidence.key}
      />

      <footer className="mt-10 border-t border-ink-700 pt-8">
        <Disclaimer tier={evidence.tier} />
      </footer>
    </>
  );
}

/**
 * 인지능력 탐색 공유 요약.
 *
 * 여기에도 백분위·z점수·T점수·IQ 환산치·등수는 없다. 이 문항에 답한 규준 표본이 존재하지
 * 않아 계산할 근거가 없기 때문이며(engine/cognitive/provenance.ts), 공유 코드에도 애초에
 * 정답률 다섯 개밖에 실려 있지 않다. 문항별 응답(정답 키의 흔적)과 소요 시간은 코드에
 * 담기지 않으므로 이 페이지가 알 수 있는 것도 아니다.
 */
async function CognitiveShareBody({ summary }: { readonly summary: CognitiveSummaryV1 }) {
  const [tShare, tHome, tCognitive] = await Promise.all([
    getTranslations({ locale: summary.locale, namespace: "share" }),
    getTranslations({ locale: summary.locale, namespace: "home" }),
    getTranslations({ locale: summary.locale, namespace: "cognitive" }),
  ]);
  const evidence = analysisDefinition(SHARE_KIND_ANALYSIS_KEY.cognitive);
  const kindTitle = tHome(SHARE_KIND_HUB_TITLE_KEY.cognitive);
  const byDomain = new Map(summary.domains.map((entry) => [entry.domain, entry.accuracy0to100] as const));
  const correctCount = correctCountFromAccuracy(summary.accuracy0to100, COGNITIVE_ITEM_COUNT);

  return (
    <>
      <ShareHero
        kicker={tShare("fallback.heroKicker")}
        title={tShare("fallback.heroTitle", { title: kindTitle })}
        body={tShare("fallback.heroBody", { title: kindTitle })}
        status={evidence.evidence.validationStatus}
        imageSrc={COGNITIVE_OVERVIEW_IMAGE}
        imageAlt={tCognitive("resultImageAlt")}
      />

      <section className="border-t border-ink-700 pt-8">
        <h2 className="text-lg font-medium text-hobun">{tCognitive("sectionDomains")}</h2>

        <div className="mt-5 rounded-[1.25rem] border border-ink-700 bg-ink-950/70 p-5">
          <p className="tabular font-mono text-[15px] text-hobun">
            {tCognitive("overallAccuracy", {
              correct: correctCount,
              total: COGNITIVE_ITEM_COUNT,
              percent: Math.round(summary.accuracy0to100),
            })}
          </p>
          {/* 링크를 받은 사람이 가장 먼저 궁금해할 자리에 "그래서 몇 등인가"의 답이 없는 이유를 둔다. */}
          <p className="mt-3 text-xs leading-relaxed text-hobun-faint">{tCognitive("noScoreNotice")}</p>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          {COGNITIVE_DOMAINS.map((domain) => {
            const accuracy = byDomain.get(domain) ?? 0;
            return (
              <CognitiveDomainRow
                key={domain}
                label={tCognitive(`domains.${domain}.label`)}
                accuracy0to100={accuracy}
                countLabel={`${correctCountFromAccuracy(accuracy, COGNITIVE_ITEMS_PER_DOMAIN)} / ${COGNITIVE_ITEMS_PER_DOMAIN}`}
              />
            );
          })}
        </div>
        <p className="mt-5 text-xs leading-relaxed text-hobun-faint">{tCognitive("coarseResolutionNote")}</p>
      </section>

      <SummaryOnlyNotice text={tShare("summaryOnlyNotice")} limitation={evidence.evidence.limitations[0] ?? ""} limitationLabel={tShare("limitationLabel")} />

      <ShareCallToAction
        ctaTitle={tShare("ctaTitle")}
        ctaBody={tShare("ctaBody")}
        ctaLabel={tShare("ctaButton", { title: kindTitle })}
        href={evidence.href}
        analysisKey={evidence.key}
      />

      <footer className="mt-10 border-t border-ink-700 pt-8">
        <Disclaimer tier={evidence.tier} />
      </footer>
    </>
  );
}

/** 이전 cognitive v2 링크도 IQ·신뢰구간을 복원하지 않고 공개 경계를 유지한다. */
async function CognitiveEstimateShareBody({ summary }: { readonly summary: CognitiveSummaryV2 }) {
  const [tShare, tHome, tCognitive] = await Promise.all([
    getTranslations({ locale: summary.locale, namespace: "share" }),
    getTranslations({ locale: summary.locale, namespace: "home" }),
    getTranslations({ locale: summary.locale, namespace: "cognitive" }),
  ]);
  const evidence = analysisDefinition(SHARE_KIND_ANALYSIS_KEY.cognitive);
  const kindTitle = tHome(SHARE_KIND_HUB_TITLE_KEY.cognitive);

  return (
    <>
      <ShareHero
        kicker={tShare("fallback.heroKicker")}
        title={tShare("fallback.heroTitle", { title: kindTitle })}
        body={tShare("fallback.heroBody", { title: kindTitle })}
        status={evidence.evidence.validationStatus}
        imageSrc={COGNITIVE_OVERVIEW_IMAGE}
        imageAlt={tCognitive("resultImageAlt")}
      />

      <section className="border-t border-ink-700 pt-8">
        <h2 className="text-lg font-medium text-hobun">{tCognitive("notAnIqTitle")}</h2>

        <div className="mt-5 rounded-[1.25rem] border border-ink-700 bg-ink-950/70 p-5">
          <p className="text-sm leading-relaxed text-hobun-dim">{tCognitive("noScoreNotice")}</p>
          <p className="mt-3 text-xs leading-relaxed text-hobun-faint">{tCognitive("pilotNotice")}</p>
        </div>
      </section>

      <SummaryOnlyNotice text={tShare("summaryOnlyNotice")} limitation={evidence.evidence.limitations[0] ?? ""} limitationLabel={tShare("limitationLabel")} />

      <ShareCallToAction
        ctaTitle={tShare("ctaTitle")}
        ctaBody={tShare("ctaBody")}
        ctaLabel={tShare("ctaButton", { title: kindTitle })}
        href={evidence.href}
        analysisKey={evidence.key}
      />

      <footer className="mt-10 border-t border-ink-700 pt-8">
        <Disclaimer tier={evidence.tier} />
      </footer>
    </>
  );
}

/**
 * 영역별 정답률 한 줄 — 옆에 붙는 수는 T점수가 아니라 "4문항 중 몇 문항"이다.
 * 분모를 늘 함께 찍는다. 분모 없는 수는 곧바로 점수처럼 읽히기 때문이다.
 */
function CognitiveDomainRow({
  label,
  accuracy0to100,
  countLabel,
}: {
  readonly label: string;
  readonly accuracy0to100: number;
  readonly countLabel: string;
}) {
  const position = Math.max(0, Math.min(100, accuracy0to100));
  return (
    <div className="flex items-center gap-4">
      <span className="w-40 shrink-0 text-sm text-hobun">{label}</span>
      <div className="relative h-2 flex-1 rounded-full bg-ink-700">
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 rounded-full bg-hobun"
          style={{ width: `${position}%` }}
        />
      </div>
      <span className="tabular w-12 shrink-0 text-right font-mono text-[13px] text-hobun-faint">{countLabel}</span>
    </div>
  );
}

function ShareHero({
  kicker,
  title,
  body,
  status,
  imageSrc,
  imageAlt,
}: {
  readonly kicker: string;
  readonly title: string;
  readonly body: string;
  readonly status: ValidationStatus;
  readonly imageSrc?: string;
  readonly imageAlt?: string;
}) {
  return (
    <section className="py-10 sm:py-12">
      <div className="grid items-center gap-8 sm:grid-cols-[minmax(0,1fr)_minmax(180px,0.48fr)]">
        <div>
          <p className="font-mono text-[13px] tracking-[0.16em] text-hobun-faint">{kicker}</p>
          <h1 className="mt-4 max-w-[20ch] text-[clamp(1.9rem,5vw,3rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-hobun">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-hobun-dim">{body}</p>
          <div className="mt-6">
            <EvidenceStatusBadge status={status} />
          </div>
        </div>
        {imageSrc ? (
          <div className="assessment-result-art relative mx-auto aspect-[4/3] w-full max-w-[240px] overflow-hidden rounded-[1.25rem] border border-ink-700 bg-ink-900/75">
            <MotionSafeImage
              src={imageSrc}
              alt={imageAlt ?? title}
              sizes="(min-width: 640px) 240px, 58vw"
              priority
              className="object-cover"
              fallbackLabel={title}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function FactorScoreRow({ label, tScore }: { readonly label: string; readonly tScore: number }) {
  const position = Math.max(0, Math.min(100, tScore));
  return (
    <div className="flex items-center gap-4">
      <span className="w-40 shrink-0 text-sm text-hobun">{label}</span>
      <div className="relative h-2 flex-1 rounded-full bg-ink-700">
        <span aria-hidden className="absolute inset-y-[-3px] left-1/2 w-px bg-ink-600" />
        <span
          aria-hidden
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-hobun"
          style={{ left: `${position}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right font-mono text-[13px] text-hobun-faint">{Math.round(tScore)}</span>
    </div>
  );
}

/**
 * SSEIT 하위요인 막대 — FactorScoreRow와 달리 옆에 숫자를 찍지 않는다.
 * 하위요인은 출판 규준이 없어 T점수가 존재하지 않으므로, 규준이 있는 총점과
 * 같은 모양의 수를 나란히 붙이면 둘을 같은 근거로 읽게 만든다.
 */
function EqSubscaleRow({ label, tScore }: { readonly label: string; readonly tScore: number }) {
  const position = Math.max(0, Math.min(100, tScore));
  return (
    <div className="flex items-center gap-4">
      <span className="w-40 shrink-0 text-sm text-hobun">{label}</span>
      <div className="relative h-2 flex-1 rounded-full bg-ink-700">
        <span
          aria-hidden
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-hobun"
          style={{ left: `${position}%` }}
        />
      </div>
    </div>
  );
}

function LikertAxisRow({ label, mean }: { readonly label: string; readonly mean: number }) {
  const position = Math.max(0, Math.min(100, ((mean - 1) / 4) * 100));
  return (
    <div className="flex items-center gap-4">
      <span className="w-24 shrink-0 text-sm text-hobun">{label}</span>
      <div className="relative h-2 flex-1 rounded-full bg-ink-700">
        <span
          aria-hidden
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-hobun"
          style={{ left: `${position}%` }}
        />
      </div>
      <span className="w-14 shrink-0 text-right font-mono text-[13px] text-hobun-faint">{mean.toFixed(2)} / 5.00</span>
    </div>
  );
}

function AxisRow({
  axis,
  continuous,
  isBoundary,
  label,
}: {
  readonly axis: JungianAxis;
  readonly continuous: number;
  readonly isBoundary: boolean;
  readonly label: string;
}) {
  const config = jungianAxisConfig(axis);
  const position = Math.max(0, Math.min(100, (continuous + 100) / 2));
  const pole = isBoundary ? "?" : continuous < 0 ? config.negativePole : config.positivePole;

  return (
    <article className={`rounded-[1rem] border p-4 ${isBoundary ? "border-hwa/50" : "border-ink-700"} bg-ink-950/60`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[12px] tracking-[0.16em] text-hobun-faint">{axis}</p>
          <h3 className="mt-1 text-base font-medium text-hobun">{label}</h3>
        </div>
        <span className="jungian-axis-letter" aria-label={`${axis} ${pole}`}>{pole}</span>
      </div>
      <div className="relative mt-4 h-2 rounded-full bg-ink-700">
        <span className="absolute inset-y-[-3px] left-1/2 w-px bg-ink-600" aria-hidden />
        <span
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-hobun"
          style={{ left: `${position}%` }}
          aria-hidden
        />
      </div>
      <div className="mt-3 flex justify-between text-[13px] text-hobun-faint">
        <span>{config.negativePole}</span>
        <span className="tabular font-mono">{continuous.toFixed(0)}</span>
        <span>{config.positivePole}</span>
      </div>
    </article>
  );
}

function SummaryOnlyNotice({
  text,
  limitation,
  limitationLabel,
}: {
  readonly text: string;
  readonly limitation: string;
  readonly limitationLabel: string;
}) {
  return (
    <aside className="mt-8 rounded-[1.25rem] border border-ink-700 bg-ink-950/65 p-5">
      <p className="text-sm leading-relaxed text-hobun-dim">{text}</p>
      {limitation ? (
        <p className="mt-3 border-l border-ink-600 pl-4 text-xs leading-relaxed text-hobun-faint">
          <span className="font-mono uppercase tracking-[0.14em]">{limitationLabel}</span> — {limitation}
        </p>
      ) : null}
    </aside>
  );
}

function ShareCallToAction({
  ctaTitle,
  ctaBody,
  ctaLabel,
  href,
  analysisKey,
}: {
  readonly ctaTitle: string;
  readonly ctaBody: string;
  readonly ctaLabel: string;
  readonly href: string;
  readonly analysisKey: AnalysisKey;
}) {
  return (
    <section className="mt-10 border-t border-ink-700 pt-8">
      <div className="rounded-[1.5rem] border border-hobun/30 bg-ink-950/70 p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-hobun">{ctaTitle}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-hobun-dim">{ctaBody}</p>
        <ShareLandingCta href={href} label={ctaLabel} analysisKey={analysisKey} />
      </div>
    </section>
  );
}
