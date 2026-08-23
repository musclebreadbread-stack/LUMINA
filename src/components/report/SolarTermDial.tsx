import { getLocale, getTranslations } from "next-intl/server";
import { ELEMENT_STYLE } from "@/lib/elements";
import type { ReportView } from "@/lib/reportModel";
import type { Locale } from "@/i18n/locale";

/**
 * 절기 다이얼.
 *
 * 월주가 왜 그 글자인지 한 장으로 설명하는 그림이다. 태양이 황도를 15°씩 지날 때마다
 * 절기가 하나씩 들어서고, 그중 홀수 번째인 절(節)에서 월주가 바뀐다. 원 위의 눈금이
 * 곧 태양 황경이고, 표시된 점이 출생 순간의 태양 위치다.
 *
 * 입춘을 12시 방향에 두고 시계 방향으로 돈다.
 */

const CENTER = 160;
const R_TICK_OUT = 118;
const R_TICK_IN_MAJOR = 98;
const R_TICK_IN_MINOR = 108;
const R_LABEL = 137;
const R_MARKER = 88;

function polar(angleDeg: number, radius: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)];
}

interface Props {
  readonly dial: ReportView["dial"];
  readonly termEntry: ReportView["termEntry"];
  readonly monthPillar: {
    readonly stemHanja: string;
    readonly branchHanja: string;
    readonly stemElement: keyof typeof ELEMENT_STYLE;
    readonly branchElement: keyof typeof ELEMENT_STYLE;
  };
}

export async function SolarTermDial({ dial, termEntry, monthPillar }: Props) {
  const t = await getTranslations("saju");
  const locale = (await getLocale()) as Locale;
  const termName = locale === "en" ? termEntry.en : termEntry.ko;
  const daysSince = termEntry.daysSince.toFixed(1);

  const [markerX, markerY] = polar(dial.birthAngle, R_MARKER);
  // 눈금 강조는 월지 색을 따른다 — 월주를 정하는 것이 지지이기 때문이다.
  const accent = ELEMENT_STYLE[monthPillar.branchElement].cssVar;

  return (
    <figure className="m-0">
      <svg
        viewBox="0 0 320 320"
        className="h-auto w-full max-w-[340px]"
        role="img"
        aria-label={t("dialAriaLabel", { term: termName, days: daysSince })}
      >
        <defs>
          {/* 가운데가 살짝 꺼진 금속판 */}
          <radialGradient id="dial-plate" cx="50%" cy="38%" r="72%">
            <stop offset="0%" stopColor="var(--color-ink-800)" />
            <stop offset="62%" stopColor="var(--color-ink-900)" />
            <stop offset="100%" stopColor="var(--color-ink-950)" />
          </radialGradient>
          {/* 표시점이 머금은 빛 */}
          <radialGradient id="dial-marker-glow">
            <stop offset="0%" stopColor="var(--color-hobun)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--color-hobun)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 판 — 위에서 빛이 들고 아래로 그림자가 진다 */}
        <circle cx={CENTER} cy={CENTER} r={R_TICK_OUT} fill="url(#dial-plate)" />
        <circle
          cx={CENTER}
          cy={CENTER + 1.5}
          r={R_TICK_OUT}
          fill="none"
          stroke="rgba(0,0,0,0.85)"
          strokeWidth="2"
        />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={R_TICK_OUT}
          fill="none"
          stroke="var(--color-ink-600)"
          strokeWidth="1"
        />
        <circle
          cx={CENTER}
          cy={CENTER - 1}
          r={R_TICK_OUT - 0.5}
          fill="none"
          stroke="rgba(237,230,216,0.10)"
          strokeWidth="1"
        />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={R_TICK_IN_MAJOR}
          fill="none"
          stroke="var(--color-ink-700)"
          strokeWidth="1"
        />

        {/* 24절기 눈금 */}
        {dial.terms.map((term) => {
          const inner = term.isMajor ? R_TICK_IN_MAJOR : R_TICK_IN_MINOR;
          const [x1, y1] = polar(term.angle, inner);
          const [x2, y2] = polar(term.angle, R_TICK_OUT);
          return (
            <line
              key={term.ko}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={term.isCurrent ? accent : "var(--color-ink-600)"}
              strokeWidth={term.isCurrent ? 2 : 1}
            />
          );
        })}

        {/* 절(節) 이름 — 월주가 바뀌는 지점만 적는다 */}
        {dial.terms
          .filter((term) => term.isMajor)
          .map((term) => {
            const [x, y] = polar(term.angle, R_LABEL);
            return (
              <text
                key={`label-${term.ko}`}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fill={term.isCurrent ? accent : "var(--color-hobun-faint)"}
                fontWeight={term.isCurrent ? 600 : 400}
              >
                {locale === "en" ? term.en : term.ko}
              </text>
            );
          })}

        {/* 출생 위치 — 판 위에 세운 한 점 */}
        <line
          x1={CENTER}
          y1={CENTER}
          x2={markerX}
          y2={markerY}
          stroke="var(--color-hobun)"
          strokeWidth="1"
          strokeDasharray="2 3"
          opacity="0.45"
        />
        <circle cx={markerX} cy={markerY} r="22" fill="url(#dial-marker-glow)" />
        <circle
          cx={markerX}
          cy={markerY}
          r="10"
          fill="none"
          stroke="var(--color-hobun)"
          strokeWidth="1"
          className="motion-safe:animate-[pin-pulse_3.6s_ease-in-out_infinite]"
          style={{ transformOrigin: `${markerX}px ${markerY}px` }}
        />
        <circle cx={markerX} cy={markerY + 1.5} r="4.5" fill="rgba(0,0,0,0.8)" />
        <circle cx={markerX} cy={markerY} r="4.5" fill="var(--color-hobun)" />

        {/* 가운데 — 이 위치가 만들어 낸 월주 */}
        <text
          x={CENTER}
          y={CENTER - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          className="font-hanja"
          fontSize="34"
          fontWeight="900"
          style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.85))" }}
        >
          <tspan fill={ELEMENT_STYLE[monthPillar.stemElement].cssVar}>
            {monthPillar.stemHanja}
          </tspan>
          <tspan fill={ELEMENT_STYLE[monthPillar.branchElement].cssVar}>
            {monthPillar.branchHanja}
          </tspan>
        </text>
        <text
          x={CENTER}
          y={CENTER + 20}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="10"
          fill="var(--color-hobun-faint)"
        >
          {t("pillarMonthLabel")}
        </text>
      </svg>

      <figcaption className="mt-3 space-y-1 font-mono text-[13px] leading-relaxed text-hobun-faint">
        <div>
          <span className="text-hobun-dim">{t("dialTermCaption", { term: termName })}</span>{" "}
          {termEntry.instantLabel}
        </div>
        <div>{t("dialDaysSince", { days: daysSince })}</div>
      </figcaption>
    </figure>
  );
}
