import Link from "next/link";
import { DateTime } from "luxon";
import { getTranslations } from "next-intl/server";
import { FeatureHub } from "@/components/home/FeatureHub";
import { Mandala, type MomentSnapshot } from "@/components/home/Mandala";
import { SajuFormReveal } from "@/components/home/SajuFormReveal";
import { SajuRevealProvider } from "@/components/home/SajuRevealContext";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { Disclaimer, TierBadge } from "@/components/ui/Chrome";
import { SceneShell } from "@/components/ui/SceneShell";
import { buildMandalaModel } from "@/lib/mandalaModel";
import { computeSaju, branchAt, stemAt } from "@engine/saju";

/* 히어로의 여덟 글자는 지금 이 순간의 것이다. 시주는 두 시간마다 바뀌므로 1분 캐시로 충분하다. */
export const revalidate = 60;

function momentPillars() {
  const now = DateTime.now().setZone("Asia/Seoul");
  const result = computeSaju({
    date: { year: now.year, month: now.month, day: now.day },
    time: { hour: now.hour, minute: now.minute },
    place: { lat: 37.5665, lng: 126.978, timeZone: "Asia/Seoul", label: "서울" },
  });

  const columns = [
    { mark: "時", pillar: result.pillars.hour },
    { mark: "日", pillar: result.pillars.day },
    { mark: "月", pillar: result.pillars.month },
    { mark: "年", pillar: result.pillars.year },
  ];

  return {
    columns: columns.flatMap(({ mark, pillar }) =>
      pillar
        ? [
            {
              mark,
              stem: stemAt(pillar.stem),
              branch: branchAt(pillar.branch),
            },
          ]
        : [],
    ),
    clock: now.toFormat("yyyy-MM-dd HH:mm"),
    trueSolar: DateTime.fromISO(result.time.trueSolarISO, { setZone: true }).toFormat("HH:mm:ss"),
    correction: result.time.totalCorrectionMinutes,
    day: {
      stem: stemAt(result.pillars.day.stem),
      branch: branchAt(result.pillars.day.branch),
    },
  };
}

const REPORT_GROUPS = [
  { key: "saju", itemKeys: ["chart", "cycles"] },
  { key: "tarot", itemKeys: ["spread", "draw"] },
  { key: "numerology", itemKeys: ["lifePath", "destiny"] },
  { key: "psychometrics", itemKeys: ["factors", "percentile"] },
  { key: "jungian", itemKeys: ["axes", "typeSummary"] },
  { key: "horoscope", itemKeys: ["zodiac", "animal"] },
] as const;

const TRUST_GROUPS = [
  { key: "scientific", titleKey: "trustScientificTitle", bodyKey: "trustScientificBody" },
  { key: "cultural", titleKey: "trustCulturalTitle", bodyKey: "trustCulturalBody" },
  { key: "entertainment", titleKey: "trustEntertainmentTitle", bodyKey: "trustEntertainmentBody" },
] as const;

export default async function Home() {
  const moment = momentPillars();
  const mandala = buildMandalaModel(DateTime.now().setZone("Asia/Seoul").toJSDate());
  const [t, tNav] = await Promise.all([getTranslations("home"), getTranslations("nav")]);
  const moon = mandala.nodes.find((node) => node.planetKey === "moon");
  const mercury = mandala.nodes.find((node) => node.planetKey === "mercury");
  if (!moon || !mercury) throw new Error("Home mandala is missing required sky nodes");

  const moonPhase = t(`moonPhases.${mandala.sky.moonPhaseKey}`);
  const mercuryStatus = mercury.retrograde ? t("mandalaRetrograde") : t("mandalaDirect");
  const correctionSign = moment.correction >= 0 ? "+" : "−";
  const momentView = moment satisfies MomentSnapshot;

  return (
    <SceneShell tone="home">
      <main className="mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5">
        <span className="font-mono text-xs tracking-[0.28em] text-hobun">LUMINA</span>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <TierBadge tier="cultural" />
        </div>
      </header>

      {/* 플랫폼 히어로 — 고정된 기능 수가 아닌 내면 탐구의 방향을 먼저 전한다. */}
      <section className="pt-12 pb-14 sm:pt-16">
        <p className="font-mono text-sm tracking-[0.18em] text-hobun-faint">{t("platformEyebrow")}</p>
        <h1 className="mt-5 max-w-3xl text-[clamp(2.25rem,7vw,4.5rem)] leading-[1.04] font-medium tracking-[-0.045em] text-hobun">
          {t("platformTitle1")}
          <br />
          {t("platformTitle2")}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-hobun-dim">{t("platformBody")}</p>
      </section>

      <SajuRevealProvider>
        <Mandala model={mandala} moment={momentView} />

        {/* 현재 열려 있는 탐구 방법 중에서 시작점을 고른다. */}
        <div id="feature-hub" className="home-flow-section home-flow-hub border-t border-ink-700 pt-12">
          <FeatureHub />
        </div>

        {/* 지금 이 순간 — 만다라가 장식이 아니라는 근거 */}
        <section id="now" className="home-flow-section home-flow-now mt-16 border-t border-ink-700 pt-12" aria-labelledby="now-heading">
          <p className="font-mono text-sm tracking-[0.18em] text-hobun-faint">{t("nowEyebrow")}</p>
          <h2 id="now-heading" className="mt-3 text-[clamp(1.65rem,4vw,2.35rem)] leading-tight font-medium tracking-tight">
            {t("nowHeading")}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-hobun-dim">{t("nowBody")}</p>
          <dl className="now-record-grid mt-8">
            <div className="now-record-card">
              <dt>{t("nowDayLabel")}</dt>
              <dd>{t("nowDayValue", { stem: moment.day.stem.hanja, branch: moment.day.branch.hanja })}</dd>
              <dd className="now-record-meta">{t("momentLabel")}</dd>
            </div>
            <div className="now-record-card">
              <dt>{t("nowSolarLabel")}</dt>
              <dd>{t("nowSolarValue", { time: moment.trueSolar })}</dd>
              <dd className="now-record-meta">{t("trueSolarCaption", { time: moment.trueSolar, sign: correctionSign, minutes: Math.abs(moment.correction).toFixed(1) })}</dd>
            </div>
            <div className="now-record-card">
              <dt>{t("nowMoonLabel")}</dt>
              <dd>{t("nowMoonValue", { phase: moonPhase, percent: mandala.sky.moonIlluminationPercent })}</dd>
              <dd className="now-record-meta">{moon.sign.symbol} {moon.sign.ko}</dd>
            </div>
            <div className="now-record-card">
              <dt>{t("nowMercuryLabel")}</dt>
              <dd>{t("nowMercuryValue", { status: mercuryStatus })}</dd>
              <dd className="now-record-meta">{mercury.sign.symbol} {mercury.sign.ko} {Math.round(mercury.degreeInSign)}°</dd>
            </div>
          </dl>
          <p className="mt-5 border-l border-ink-600 pl-4 text-xs leading-relaxed text-hobun-faint">{t("nowEvidence")}</p>
        </section>

        {/* 3계층 — 신뢰도 규칙을 첫 화면에서 설명한다 */}
        <section id="trust" className="home-flow-section home-flow-trust mt-16 border-t border-ink-700 pt-12" aria-labelledby="trust-heading">
          <p className="font-mono text-sm tracking-[0.18em] text-hobun-faint">{t("trustEyebrow")}</p>
          <h2 id="trust-heading" className="mt-3 text-[clamp(1.65rem,4vw,2.35rem)] leading-tight font-medium tracking-tight">
            {t("trustHeading")}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-hobun-dim">{t("trustBody")}</p>
          <div className="trust-grid mt-8">
            {TRUST_GROUPS.map((group) => (
              <article key={group.key} className="trust-card">
                <TierBadge tier={group.key} tone="light" />
                <h3 className="mt-5 text-lg font-semibold text-ink-950">{t(group.titleKey)}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-700/80">{t(group.bodyKey)}</p>
              </article>
            ))}
          </div>
        </section>

        {/* 입력 — "사주" 카드를 고르기 전까지는 열리지 않는다 */}
        <section id="birth-form" className="home-flow-section home-flow-saju mt-16 scroll-mt-8 border-t border-ink-700 pt-12" aria-labelledby="saju-input-heading">
          <p className="font-mono text-sm tracking-[0.18em] text-hobun-faint">{t("hubSajuTitle")}</p>
          <h2 id="saju-input-heading" className="mt-3 max-w-2xl text-[clamp(1.8rem,5vw,3rem)] leading-[1.08] font-medium tracking-tight text-hobun">
            {t("heroTitle1")}
            <br />
            {t("heroTitle2")}
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-hobun-dim">{t("heroBody")}</p>
          <h2 className="mb-8 flex items-baseline gap-3">
            <span className="font-mono text-[13px] text-hobun-faint">01</span>
            <span className="text-lg font-medium tracking-tight">{t("sectionInput")}</span>
          </h2>
          <SajuFormReveal prompt={t("hubFormPrompt")} />
        </section>
      </SajuRevealProvider>

      {/* 탐구 방법별로 결과가 무엇을 보여 주는지 정리한다. */}
      <section id="report" className="home-flow-section home-flow-report mt-16 border-t border-ink-700 pt-12" aria-labelledby="report-heading">
        <p className="font-mono text-sm tracking-[0.18em] text-hobun-faint">{t("reportEyebrow")}</p>
        <h2 id="report-heading" className="mt-3 text-[clamp(1.65rem,4vw,2.35rem)] leading-tight font-medium tracking-tight">{t("reportHeading")}</h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-hobun-dim">{t("reportIntro")}</p>
        <div className="report-group-grid mt-8">
          {REPORT_GROUPS.map((group, index) => (
            <article key={group.key} className="report-group-card">
              <p className="font-mono text-xs tracking-[0.18em] text-ink-700/60">0{index + 1}</p>
              <h3 className="mt-3 text-xl font-semibold text-ink-950">{t(`reportGroups.${group.key}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700/75">{t(`reportGroups.${group.key}.desc`)}</p>
              <dl className="mt-5 space-y-4">
                {group.itemKeys.map((itemKey) => (
                  <div key={itemKey}>
                    <dt className="text-xs font-semibold text-ink-900">{t(`reportGroups.${group.key}.items.${itemKey}.term`)}</dt>
                    <dd className="mt-1 text-sm leading-relaxed text-ink-700/75">{t(`reportGroups.${group.key}.items.${itemKey}.desc`)}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </section>

      <footer className="mt-16 space-y-6 border-t border-ink-700 pt-8">
        <Disclaimer />
        <p className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[13px] text-hobun-faint">
          <Link href="/saju" className="underline underline-offset-4 hover:text-hobun-dim">
            {t("prevResult")}
          </Link>
          <Link href="/privacy" className="underline underline-offset-4 hover:text-hobun-dim">
            {tNav("privacy")}
          </Link>
          <Link href="/terms" className="underline underline-offset-4 hover:text-hobun-dim">
            {tNav("terms")}
          </Link>
          <Link href="/characters" className="underline underline-offset-4 hover:text-hobun-dim">
            {tNav("characters")}
          </Link>
        </p>
      </footer>
      </main>
    </SceneShell>
  );
}
