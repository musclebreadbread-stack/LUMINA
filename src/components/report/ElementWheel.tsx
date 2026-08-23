import { getLocale, getTranslations } from "next-intl/server";
import type { CSSProperties } from "react";
import { ELEMENT_STYLE } from "@/lib/elements";
import type { ReportView } from "@/lib/reportModel";
import type { FiveElement } from "@engine/saju";
import type { Locale } from "@/i18n/locale";

/**
 * 오행 상생·상극 고리.
 *
 * 바깥 오각형은 상생(相生) — 목생화·화생토·토생금·금생수·수생목으로 시계 방향으로 돈다.
 * 안쪽 별은 상극(相剋) — 목극토·토극수·수극화·화극금·금극목으로 하나씩 건너뛴다.
 * 마디의 크기는 그 사람의 가중 오행 값이고, 테두리가 도는 마디가 일간이다.
 * 고리를 따라 도는 점은 기(氣)의 순환이다. 위치가 아니라 방향만 말한다.
 *
 * 애니메이션은 전부 CSS 스크롤 타임라인이 맡는다. 자바스크립트로 초기 상태를 주면
 * 서버 렌더 결과와 어긋나고, 스크립트가 죽었을 때 도해가 사라진다.
 */

const CENTER = 110;
const RADIUS = 68;

/** 상생 순서대로 배치한다. 배열 순서가 곧 시계 방향 순서다. */
const ORDER: readonly FiveElement[] = ["wood", "fire", "earth", "metal", "water"];

function nodeAt(index: number): [number, number] {
  const angle = ((index * 72 - 90) * Math.PI) / 180;
  return [CENTER + RADIUS * Math.cos(angle), CENTER + RADIUS * Math.sin(angle)];
}

const POINTS = ORDER.map((_, i) => nodeAt(i));

/** 오각형 둘레 — 상생의 길이자 기가 도는 궤도 */
const RING_PATH =
  POINTS.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ") + " Z";

/** 상극 — 하나씩 건너뛴 다섯 줄이 별을 이룬다 */
const CONTROL_PAIRS = [0, 1, 2, 3, 4].map((i) => [i, (i + 2) % 5] as const);

/** 등장 구간을 조금씩 어긋내 순서를 만든다. */
function range(start: number, end: number): CSSProperties {
  return { "--r0": `${start}%`, "--r1": `${end}%` } as CSSProperties;
}

interface Props {
  readonly elements: ReportView["elements"];
  readonly dayElement: FiveElement;
}

export async function ElementWheel({ elements, dayElement }: Props) {
  const t = await getTranslations("saju");
  const locale = (await getLocale()) as Locale;
  const dominantStyle = ELEMENT_STYLE[elements.dominant];

  const byElement = new Map(elements.rows.map((r) => [r.element, r]));
  const max = Math.max(...elements.rows.map((r) => r.weighted), 0.001);

  return (
    <figure className="m-0">
      <svg
        viewBox="0 0 220 220"
        className="h-auto w-full max-w-[300px]"
        role="img"
        aria-label={t("wheelAriaLabel", {
          element: locale === "en" ? dominantStyle.en : dominantStyle.ko,
        })}
      >
        {/* 상극 — 안쪽 별. 상생보다 뒤로 물러나 있어야 읽힌다. */}
        {CONTROL_PAIRS.map(([from, to], i) => {
          const [x1, y1] = POINTS[from]!;
          const [x2, y2] = POINTS[to]!;
          return (
            <line
              key={`ctrl-${from}-${to}`}
              className="wheel-line"
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--color-ink-600)"
              strokeWidth="1"
              pathLength={1}
              strokeDasharray="1"
              style={range(18 + i * 4, 56 + i * 4)}
            />
          );
        })}

        {/* 상생 — 바깥 고리 */}
        <path
          className="wheel-line"
          d={RING_PATH}
          fill="none"
          stroke="var(--color-ink-700)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray="1"
          style={range(2, 48)}
        />

        {/* 기의 순환 — 고리를 따라 도는 점 */}
        <circle
          className="qi-orbit"
          r="3"
          fill="var(--color-hobun)"
          opacity="0.5"
          style={{
            offsetPath: `path("${RING_PATH}")`,
            offsetRotate: "0deg",
            animation: "qi-orbit 18s linear infinite",
          }}
        />

        {/* 다섯 마디 */}
        {ORDER.map((element, i) => {
          const row = byElement.get(element);
          const style = ELEMENT_STYLE[element];
          const [x, y] = POINTS[i]!;
          const weight = row ? row.weighted / max : 0;
          const r = 13 + weight * 9;
          const absent = !row || row.simple === 0;
          const isDay = element === dayElement;

          return (
            <g key={element} className="wheel-node" style={range(10 + i * 6, 50 + i * 6)}>
              {isDay && (
                <circle
                  cx={x}
                  cy={y}
                  r={r + 6}
                  fill="none"
                  stroke="var(--color-hobun)"
                  strokeWidth="1"
                  strokeDasharray="2 4"
                  opacity="0.55"
                />
              )}
              <circle
                cx={x}
                cy={y}
                r={r}
                fill={style.cssVar}
                fillOpacity={absent ? 0.05 : 0.2}
                stroke={style.cssVar}
                strokeOpacity={absent ? 0.45 : 1}
                strokeWidth={absent ? 1 : 1.5}
                strokeDasharray={absent ? "2 3" : undefined}
              />
              <text
                x={x}
                y={y + 0.5}
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-hanja"
                fontSize="15"
                fontWeight="900"
                fill={style.cssVar}
                fillOpacity={absent ? 0.5 : 1}
              >
                {style.hanja}
              </text>
              <text
                x={x}
                y={y + r + 16}
                textAnchor="middle"
                dominantBaseline="middle"
                fontFamily="var(--font-mono)"
                fontSize="9"
                fill="var(--color-hobun-faint)"
              >
                {row ? row.weighted.toFixed(1) : "0.0"}
              </text>
            </g>
          );
        })}
      </svg>

      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-hobun-faint">
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-px w-5 bg-ink-600" />
          {t("wheelLegendGenerating")}
        </span>
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-px w-5"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to right, var(--color-ink-600) 0 3px, transparent 3px 7px)",
            }}
          />
          {t("wheelLegendControlling")}
        </span>
        <span>{t("wheelLegendDayMaster")}</span>
      </figcaption>
    </figure>
  );
}
