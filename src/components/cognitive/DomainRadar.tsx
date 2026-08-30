import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locale";
import type { DomainView } from "@/lib/cognitiveModel";

/**
 * 네 영역 정답률을 한 장의 도형으로 겹쳐 보는 레이더.
 *
 * 게임 UI의 능력치 그래프처럼 보이지 않게 하려고 색·그라데이션·광원을 전혀 쓰지 않는다.
 * 선은 currentColor 한 가지, 면은 아주 옅은 같은 색이며, 축은 네 개뿐이라 도형 자체가
 * "잘함/못함"의 서열이 아니라 형태의 차이로 읽힌다.
 *
 * 그림은 aria-hidden이다 — 같은 수치가 바로 옆 목록에 글자로 그대로 있고, 그 목록이
 * 이 시각화의 대체 텍스트다. 그림과 목록이 같은 말을 두 번 읽히게 하지 않는다.
 *
 * "use client"를 붙이지 않는다. 훅도 이벤트도 없으므로 서버에서 그대로 그린다.
 */

const CENTER = 100;
const RADIUS = 74;
const RINGS: readonly number[] = [0.25, 0.5, 0.75, 1];

/** 축 순서는 엔진의 DOMAINS 순서 그대로 위 → 오른쪽 → 아래 → 왼쪽. */
function axisPoint(index: number, ratio: number): { readonly x: number; readonly y: number } {
  const radians = ((-90 + index * 90) * Math.PI) / 180;
  return {
    x: CENTER + Math.cos(radians) * RADIUS * ratio,
    y: CENTER + Math.sin(radians) * RADIUS * ratio,
  };
}

function polygonPoints(ratios: readonly number[]): string {
  return ratios
    .map((ratio, index) => {
      const point = axisPoint(index, ratio);
      return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
    })
    .join(" ");
}

export async function DomainRadar({ domains }: { readonly domains: readonly DomainView[] }) {
  const [t, locale] = await Promise.all([getTranslations("cognitive"), getLocale()]);
  const resolvedLocale = locale as Locale;
  const ratios = domains.map((domain) => domain.accuracy0to100 / 100);

  return (
    <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)]">
      <svg
        aria-hidden
        viewBox="0 0 200 200"
        className="mx-auto h-auto w-full max-w-[200px] text-hobun-dim"
        fill="none"
      >
        {RINGS.map((ring) => (
          <polygon
            key={ring}
            points={polygonPoints([ring, ring, ring, ring])}
            stroke="currentColor"
            strokeWidth={0.6}
            opacity={ring === 1 ? 0.45 : 0.18}
          />
        ))}
        {domains.map((domain, index) => {
          const outer = axisPoint(index, 1);
          return (
            <line
              key={domain.key}
              x1={CENTER}
              y1={CENTER}
              x2={outer.x}
              y2={outer.y}
              stroke="currentColor"
              strokeWidth={0.6}
              opacity={0.22}
            />
          );
        })}
        <polygon
          points={polygonPoints(ratios)}
          fill="currentColor"
          fillOpacity={0.14}
          stroke="currentColor"
          strokeWidth={1.4}
        />
        {domains.map((domain, index) => {
          const vertex = axisPoint(index, domain.accuracy0to100 / 100);
          const marker = axisPoint(index, 1.16);
          return (
            <g key={domain.key}>
              <circle cx={vertex.x} cy={vertex.y} r={2.6} fill="currentColor" />
              <text
                x={marker.x}
                y={marker.y + 3}
                textAnchor="middle"
                fontSize={9}
                fontFamily="ui-monospace, monospace"
                fill="currentColor"
                opacity={0.7}
              >
                {index + 1}
              </text>
            </g>
          );
        })}
      </svg>

      <dl className="space-y-3">
        {domains.map((domain, index) => (
          <div key={domain.key} className="border-b border-ink-800 pb-3 last:border-b-0 last:pb-0">
            <dt className="flex items-baseline gap-2 text-sm font-medium text-hobun">
              <span className="tabular font-mono text-[12px] text-hobun-faint">{index + 1}</span>
              {resolvedLocale === "en" ? domain.en : domain.ko}
            </dt>
            <dd className="tabular mt-1 font-mono text-[13px] text-hobun-dim">
              {t("domainAccuracy", {
                correct: domain.correctCount,
                total: domain.itemCount,
                percent: Math.round(domain.accuracy0to100),
              })}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
