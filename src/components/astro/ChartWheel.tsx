import { getTranslations } from "next-intl/server";
import type { AstroView } from "@/lib/astroModel";

/**
 * 출생 차트 휠.
 *
 * 서양 차트의 관례대로 상승궁을 왼쪽(9시 방향)에 두고 황경이 반시계로 자란다.
 * 그래서 천저(IC)가 아래, 중천 쪽이 위로 온다.
 *
 * 색을 쓰지 않는다. 점성술의 4원소는 사주의 오행과 다른 체계라서, 오행 색을
 * 빌려 오면 두 체계가 대응한다는 잘못된 인상을 준다. 대신 선의 굵기와 점선으로
 * 위계를 만들고 원소·성질은 아래 표에 글자로 적는다.
 */

const CX = 200;
const CY = 200;
const R_OUTER = 192;
const R_SIGN_IN = 162;
const R_HOUSE = 150;
const R_PLANET = 128;
const R_TICK = 146;
const R_ASPECT = 104;

/** U+FE0E 로 텍스트 표현을 강제한다 — 없으면 컬러 이모지로 대체된다. */
const SIGN_SYMBOLS = ["♈︎", "♉︎", "♊︎", "♋︎", "♌︎", "♍︎", "♎︎", "♏︎", "♐︎", "♑︎", "♒︎", "♓︎"];

/** 각 상별 선 모양. 조화각은 실선, 긴장각은 점선으로 구분한다. */
const ASPECT_STYLE: Record<string, { dash?: string; width: number }> = {
  conjunction: { width: 1.4 },
  sextile: { width: 0.8 },
  trine: { width: 1 },
  square: { width: 1, dash: "4 3" },
  opposition: { width: 1.2, dash: "6 3" },
};

interface Props {
  readonly wheel: AstroView["wheel"];
}

export async function ChartWheel({ wheel }: Props) {
  const t = await getTranslations("astro");

  // 시각 미상이면 상승궁이 없다. 그때는 양자리 0도를 왼쪽에 두고 하우스는 그리지 않는다.
  const origin = wheel.ascendant ?? 0;

  const point = (longitude: number, radius: number): [number, number] => {
    const a = ((longitude - origin) * Math.PI) / 180;
    return [CX - radius * Math.cos(a), CY + radius * Math.sin(a)];
  };

  // 글리프가 겹치지 않게 최소 간격을 벌린다. 실제 황경은 눈금으로 따로 표시한다.
  const spread = spreadLongitudes(wheel.planets.map((p) => p.longitude), 8);

  return (
    <figure className="m-0">
      <svg
        viewBox="0 0 400 400"
        className="h-auto w-full max-w-[420px]"
        role="img"
        aria-label={t("wheelAriaLabel")}
      >
        {/* 별자리 띠 */}
        <circle cx={CX} cy={CY} r={R_OUTER} fill="none" stroke="var(--color-ink-600)" strokeWidth="1" />
        <circle cx={CX} cy={CY} r={R_SIGN_IN} fill="none" stroke="var(--color-ink-700)" strokeWidth="1" />
        <circle cx={CX} cy={CY} r={R_HOUSE} fill="none" stroke="var(--color-ink-700)" strokeWidth="1" />
        <circle cx={CX} cy={CY} r={R_ASPECT} fill="none" stroke="var(--color-ink-800)" strokeWidth="1" />

        {/* 30도마다 별자리 경계 */}
        {Array.from({ length: 12 }, (_, i) => {
          const [x1, y1] = point(i * 30, R_SIGN_IN);
          const [x2, y2] = point(i * 30, R_OUTER);
          const [sx, sy] = point(i * 30 + 15, (R_SIGN_IN + R_OUTER) / 2);
          return (
            <g key={`sign-${i}`}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-ink-600)" strokeWidth="1" />
              <text
                x={sx}
                y={sy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="15"
                fill="var(--color-hobun-dim)"
              >
                {SIGN_SYMBOLS[i]}
              </text>
            </g>
          );
        })}

        {/* 하우스 경계 */}
        {wheel.houseCusps.map((cusp, i) => {
          const [x1, y1] = point(cusp, R_ASPECT);
          const [x2, y2] = point(cusp, R_HOUSE);
          const [nx, ny] = point(cusp + 15, (R_HOUSE + R_PLANET) / 2 - 6);
          const isAngular = i % 3 === 0;
          return (
            <g key={`house-${i}`}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isAngular ? "var(--color-hobun-faint)" : "var(--color-ink-700)"}
                strokeWidth={isAngular ? 1.2 : 0.8}
              />
              <text
                x={nx}
                y={ny}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="9"
                fontFamily="var(--font-mono)"
                fill="var(--color-hobun-faint)"
              >
                {i + 1}
              </text>
            </g>
          );
        })}

        {/* 상승궁·중천 축 */}
        {wheel.ascendant !== null && (
          <>
            <AxisLine label="ASC" longitude={wheel.ascendant} point={point} />
            <AxisLine label="DSC" longitude={wheel.ascendant + 180} point={point} muted />
          </>
        )}
        {wheel.midheaven !== null && (
          <>
            <AxisLine label="MC" longitude={wheel.midheaven} point={point} />
            <AxisLine label="IC" longitude={wheel.midheaven + 180} point={point} muted />
          </>
        )}

        {/* 각(aspect) — 안쪽 현 */}
        {wheel.aspectLines.map((a, i) => {
          const style = ASPECT_STYLE[a.kind] ?? { width: 0.8 };
          const [x1, y1] = point(a.from, R_ASPECT);
          const [x2, y2] = point(a.to, R_ASPECT);
          return (
            <line
              key={`aspect-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--color-hobun)"
              strokeOpacity={0.14 + a.strength * 0.4}
              strokeWidth={style.width}
              strokeDasharray={style.dash}
            />
          );
        })}

        {/* 천체 */}
        {wheel.planets.map((p, i) => {
          const shown = spread[i]!;
          const [tx1, ty1] = point(p.longitude, R_HOUSE);
          const [tx2, ty2] = point(shown, R_TICK - 6);
          const [px, py] = point(shown, R_PLANET);
          return (
            <g key={p.key}>
              {/* 실제 황경 위치를 가리키는 눈금 */}
              <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="var(--color-ink-600)" strokeWidth="0.8" />
              <text
                x={px}
                y={py}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={p.isLuminary ? 19 : 15}
                fill={p.isLuminary ? "var(--color-hobun)" : "var(--color-hobun-dim)"}
              >
                {p.symbol}
              </text>
              {p.retrograde && (
                <text
                  x={px + 11}
                  y={py + 8}
                  textAnchor="middle"
                  fontSize="8"
                  fontFamily="var(--font-mono)"
                  fill="var(--color-hobun-faint)"
                >
                  R
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[13px] text-hobun-faint">
        <span>{t("wheelCaption1")}</span>
        {wheel.houseCusps.length > 0 && (
          <span>
            {t("wheelCaptionHouse", {
              system: t(
                wheel.houseSystem === "whole"
                  ? "houseWhole"
                  : wheel.houseSystem === "equal"
                    ? "houseEqual"
                    : "housePlacidus",
              ),
            })}
          </span>
        )}
        <span>{t("wheelCaptionR")}</span>
      </figcaption>
    </figure>
  );
}

function AxisLine({
  label,
  longitude,
  point,
  muted,
}: {
  readonly label: string;
  readonly longitude: number;
  readonly point: (longitude: number, radius: number) => [number, number];
  readonly muted?: boolean;
}) {
  const [x1, y1] = point(longitude, R_ASPECT);
  const [x2, y2] = point(longitude, R_OUTER);
  const [lx, ly] = point(longitude, R_OUTER - 8);
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="var(--color-hobun)"
        strokeOpacity={muted ? 0.2 : 0.5}
        strokeWidth={muted ? 0.8 : 1.2}
      />
      {!muted && (
        <text
          x={lx}
          y={ly}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="9"
          fontFamily="var(--font-mono)"
          fill="var(--color-hobun-faint)"
        >
          {label}
        </text>
      )}
    </g>
  );
}

/**
 * 가까이 붙은 글리프를 최소 간격만큼 벌린다.
 * 표시 위치만 옮길 뿐이고, 실제 황경은 눈금선이 따로 가리킨다.
 */
function spreadLongitudes(longitudes: readonly number[], minGap: number): number[] {
  const order = longitudes
    .map((longitude, index) => ({ longitude, index }))
    .sort((a, b) => a.longitude - b.longitude);

  const shown = longitudes.slice();
  for (let pass = 0; pass < 4; pass += 1) {
    for (let i = 0; i < order.length; i += 1) {
      const cur = order[i]!;
      const next = order[(i + 1) % order.length]!;
      const gap = (((shown[next.index]! - shown[cur.index]!) % 360) + 360) % 360;
      if (gap < minGap) {
        const push = (minGap - gap) / 2;
        shown[cur.index] = shown[cur.index]! - push;
        shown[next.index] = shown[next.index]! + push;
      }
    }
  }
  return shown;
}
