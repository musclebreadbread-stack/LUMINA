import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { requiresDisclaimer, type EvidenceTier } from "@engine/shared/tier";
import { Reveal } from "./Reveal";

/**
 * 화면 뼈대. 여기 있는 것들은 전부 무채색이다 —
 * 색은 오행에만 쓴다는 규율을 지키기 위한 장치다.
 *
 * TierBadge·Disclaimer는 서버 컴포넌트 트리에서만 쓰이므로(page.tsx들) next-intl의
 * 서버용 getTranslations 를 그대로 쓴다 — 클라이언트 번들에 메시지 카탈로그를
 * 추가로 실어 보낼 필요가 없다.
 */

export function Section({
  index,
  title,
  aside,
  id,
  children,
}: {
  /** 표의 항목 번호. 리포트가 실제로 순서 있는 문서라서 붙인다. */
  readonly index: string;
  readonly title: string;
  readonly aside?: ReactNode;
  readonly id?: string;
  readonly children: ReactNode;
}) {
  return (
    <Reveal>
      <section id={id} className="border-t border-ink-700 pt-6 pb-10 scroll-mt-24">
        <header className="mb-6 flex items-baseline justify-between gap-4">
          <h2 className="flex items-baseline gap-3">
            <span className="tabular font-mono text-[13px] text-hobun-faint">{index}</span>
            <span className="text-base font-medium tracking-tight text-hobun">{title}</span>
          </h2>
          {aside ? <div className="text-right text-[13px] text-hobun-faint">{aside}</div> : null}
        </header>
        {children}
      </section>
    </Reveal>
  );
}

/**
 * 3계층 신뢰도 뱃지.
 * 문화적 해석 계층에는 고지문이 반드시 따라붙는다.
 */
export async function TierBadge({
  tier,
  tone = "dark",
}: {
  readonly tier: "scientific" | "cultural" | "entertainment";
  readonly tone?: "dark" | "light";
}) {
  const t = await getTranslations("common");
  const key = tier === "scientific" ? "tierScientific" : tier === "cultural" ? "tierCultural" : "tierEntertainment";
  const toneClass = tone === "light" ? "border-ink-900/20 text-ink-800/75" : "border-ink-600 text-hobun-dim";

  return (
    <span className={`inline-flex items-center border px-2 py-1 font-mono text-[12px] tracking-wide ${toneClass}`}>
      {t(key)}
    </span>
  );
}

/**
 * 계층별 고지문.
 *
 * 계층 1(과학적 검증)은 "예측이 아니다"라는 계층 2·3용 문구를 붙이지 않는다 —
 * TIER_META 에서 이미 disclaimerKey 를 null 로 둔 이유와 같다. 대신 검사 도구로서의
 * 한계(임상 진단이 아니라는 점)를 알린다.
 */
export async function Disclaimer({
  tier = "cultural",
}: {
  readonly tier?: EvidenceTier;
}) {
  if (!requiresDisclaimer(tier)) return null;

  const t = await getTranslations("common");
  const key =
    tier === "scientific"
      ? "disclaimerScientific"
      : tier === "entertainment"
        ? "disclaimerEntertainment"
        : "disclaimerCultural";

  return (
    <p className="border-l border-ink-600 pl-4 text-xs leading-relaxed text-hobun-faint">
      {t(key)}
    </p>
  );
}

export function DataRow({
  label,
  value,
  note,
}: {
  readonly label: string;
  readonly value: ReactNode;
  readonly note?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink-800 py-2 last:border-b-0">
      <dt className="shrink-0 text-xs text-hobun-faint">{label}</dt>
      <dd className="tabular text-right font-mono text-xs text-hobun-dim">
        {value}
        {note ? <span className="ml-2 text-hobun-faint">{note}</span> : null}
      </dd>
    </div>
  );
}
