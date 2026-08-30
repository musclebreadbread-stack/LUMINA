import type { Locale } from "@/i18n/locale";
import {
  JUNGIAN_AXES,
  jungianAxisConfig,
  type JungianAxis,
  type JungianLensResult,
  type JungianPole,
} from "@engine/psychometrics/jungian";
import { FACTORS as BIGFIVE_FACTORS, type BigFiveFactor } from "@engine/psychometrics/items";
import type { FactorScore as BigFiveFactorScore } from "@engine/psychometrics/scoring";
import { FACTORS as DARKTRIAD_FACTORS, type DarkTriadFactor } from "@engine/darktriad/items";
import type { FactorScore as DarkTriadFactorScore } from "@engine/darktriad/scoring";
import { FACTORS as EQ_FACTORS, TOTAL_ITEM_COUNT as EQ_TOTAL_ITEM_COUNT, type EqFactor } from "@engine/eq/items";
import type { FactorScore as EqFactorScore } from "@engine/eq/scoring";
import {
  DOMAINS as COGNITIVE_DOMAINS,
  ITEMS_PER_DOMAIN as COGNITIVE_ITEMS_PER_DOMAIN,
  ITEM_COUNT as COGNITIVE_ITEM_COUNT,
  type CognitiveDomain,
} from "@engine/cognitive/items";
import type { CognitiveResult } from "@engine/cognitive/scoring";
import type { EstimatedScore, StandardizedDomain } from "@engine/cognitive-standardized/types";
import type { AttachmentQuadrant } from "@engine/attachment/quadrants";
import type { AttachmentView } from "./attachmentModel";

/**
 * 요약 공유 코드 — 원본 문항 응답이 아니라 파생된 요약(집계 점수)만 URL에 담는다.
 *
 * "?r="은 리커트 원응답을 그대로 노출하고, "?run="은 세션스토리지 실행 ID라서 최초
 * 응답자의 브라우저를 벗어나면 깨진다. 이 코덱은 역산 불가능한 요약값만 담아 두 문제를
 * 모두 피하고, 어떤 브라우저에서 열어도 같은 링크가 같은 결과를 재현하게 한다.
 *
 * Next.js의 opengraph-image.tsx는 params(경로 세그먼트)만 받고 searchParams는 받지 못한다 —
 * 그래서 이 코드는 쿼리 문자열이 아니라 경로 세그먼트로 그대로 써도 되도록, 퍼센트 인코딩이
 * 전혀 필요 없는 문자만으로 구성한다.
 */

/** URL 경로 세그먼트에 그대로 써도 인코딩이 필요 없는 64문자 집합. */
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
const ALPHABET_INDEX: ReadonlyMap<string, number> = new Map([...ALPHABET].map((ch, index) => [ch, index] as const));

export type ShareKind = "jungian" | "bigfive" | "darktriad" | "attachment" | "eq" | "cognitive";

const SHARE_KINDS: readonly ShareKind[] = ["jungian", "bigfive", "darktriad", "attachment", "eq", "cognitive"];

export function isShareKind(value: string): value is ShareKind {
  return (SHARE_KINDS as readonly string[]).includes(value);
}

const KIND_CHARS: Readonly<Record<ShareKind, string>> = Object.freeze({
  jungian: "j",
  bigfive: "b",
  darktriad: "d",
  attachment: "a",
  eq: "e",
  cognitive: "c",
});
const CHAR_TO_KIND: ReadonlyMap<string, ShareKind> = new Map(
  SHARE_KINDS.map((kind) => [KIND_CHARS[kind], kind] as const),
);

const LOCALE_CHARS: Readonly<Record<Locale, string>> = Object.freeze({ ko: "k", en: "e" });
const CHAR_TO_LOCALE: ReadonlyMap<string, Locale> = new Map(
  (Object.keys(LOCALE_CHARS) as readonly Locale[]).map((locale) => [LOCALE_CHARS[locale], locale] as const),
);

interface JungianAxisEntry {
  readonly axis: JungianAxis;
  readonly continuous: number;
  readonly isBoundary: boolean;
}

export interface JungianSummaryV1 {
  readonly kind: "jungian";
  /**
   * 1 = 레거시 4축(EI/SN/TF/JP)만 담은 14자 링크의 디코드 결과. 2 = 현재 인코딩, 6축
   * (+AT/VW) 18자. 새로 만드는 코드는 항상 2다 — 1은 과거 공유 링크를 열 때만 나타난다.
   */
  readonly version: 1 | 2;
  readonly locale: Locale;
  /** version 1이면 4개, version 2면 6개. "XXXX" 또는 "XXXX-YZ", 경계 축은 "?" — 항상 axes에서 재계산한다. */
  readonly axes: readonly JungianAxisEntry[];
  readonly typeCode: string;
}

export interface BigFiveSummaryV1 {
  readonly kind: "bigfive";
  readonly version: 1;
  readonly locale: Locale;
  readonly factors: readonly { readonly factor: BigFiveFactor; readonly tScore: number }[];
}

export interface DarkTriadSummaryV1 {
  readonly kind: "darktriad";
  readonly version: 1;
  readonly locale: Locale;
  readonly subscales: readonly { readonly subscale: DarkTriadFactor; readonly tScore: number }[];
}

export interface AttachmentSummaryV1 {
  readonly kind: "attachment";
  readonly version: 1;
  readonly locale: Locale;
  readonly anxiety: number;
  readonly avoidance: number;
  readonly quadrant: AttachmentQuadrant;
}

export interface EqSummaryV1 {
  readonly kind: "eq";
  readonly version: 1;
  readonly locale: Locale;
  readonly subscales: readonly { readonly subscale: EqFactor; readonly tScore: number }[];
  /**
   * SSEIT의 1차 지표인 33문항 총점 원점수(33~165).
   * 총점만이 출판 규준을 가지므로 T점수·백분위는 이 원점수에서 엔진으로 다시 계산한다 —
   * 파생값을 코드에 실으면 규준 표가 갱신됐을 때 옛 링크가 옛 수치에 얼어붙는다.
   */
  readonly totalRawSum: number;
}

interface CognitiveDomainEntry {
  readonly domain: CognitiveDomain;
  /** 0~100. 이 4문항 안에서의 정답 비율이며 규준 백분위가 아니다 — 25%p 단위로만 존재한다. */
  readonly accuracy0to100: number;
}

/**
 * 인지능력 탐색 공유 요약.
 *
 * 담는 것은 영역별 정답률 네 개와 전체 정답률 하나뿐이다. 백분위·z점수·T점수·IQ 환산치는
 * 코드에도, 카드에도, 요약 페이지에도 없다 — 이 문항에 답한 규준 표본이 존재하지 않으므로
 * 계산할 근거 자체가 없다(engine/cognitive/provenance.ts).
 *
 * 소요 시간은 일부러 넣지 않았다. 이유가 셋이다.
 * (1) 시간은 채점에 전혀 쓰이지 않는데 링크에 실리면 점수의 일부처럼 읽힌다.
 * (2) 공유 링크는 남이 보는 화면이라 "14분 걸렸다"는 "62% 맞혔다"와 성격이 다른 노출이다.
 * (3) 같은 답에서 항상 같은 링크·같은 카드가 나와야 한다 — 시간이 섞이면 같은 답이 매번
 *     다른 링크가 된다. 결과 페이지가 코드를 만들 때 elapsedMsByItem을 넘기지 않는 것도 같은 이유다.
 *
 * 원응답 패턴(정답 키의 흔적)은 어떤 형태로도 담지 않는다. "?r="은 16문항의 선택 색인을
 * 그대로 노출하지만 이 코드는 집계된 정답률만 담아 역산이 불가능하다.
 */
export interface CognitiveSummaryV1 {
  readonly kind: "cognitive";
  readonly version: 1;
  readonly locale: Locale;
  readonly domains: readonly CognitiveDomainEntry[];
  /** 전체 정답률 0~100. 16문항이라 6.25%p 단위로만 존재한다. */
  readonly accuracy0to100: number;
}

const STANDARDIZED_DOMAINS: readonly StandardizedDomain[] = ["gf", "gc", "gv", "gwm", "gs"];

interface StandardizedCognitiveDomainEntry {
  readonly domain: StandardizedDomain;
  /** 0~100. 이 영역 4문항 안에서의 정답 비율 — 25%p 단위로만 존재한다. */
  readonly accuracy0to100: number;
}

/**
 * 표준화 인지평가(cognitive-standardized)의 θ~N(0,1) 이론 분포 기반 IQ 추정치 공유 요약.
 * 승인된 규준이 아니므로 `iq`는 항상 "추정치" 표시와 함께만 카드·랜딩에 노출해야 한다.
 * 백분위·밴드는 싣지 않는다 — 둘 다 iq에서 순수 공식(정규분포 근사)으로 그 자리에서
 * 다시 계산할 수 있어, 규준이 갱신돼도 옛 링크가 옛 수치에 얼어붙지 않는다.
 * theta 원값·소요 시간·문항별 응답은 CognitiveSummaryV1과 같은 이유로 담지 않는다.
 */
export interface CognitiveSummaryV2 {
  readonly kind: "cognitive";
  readonly version: 2;
  readonly locale: Locale;
  readonly domains: readonly StandardizedCognitiveDomainEntry[];
  readonly iq: number;
  readonly confidenceInterval95: readonly [number, number];
}

export type ShareSummaryV1 =
  | JungianSummaryV1
  | BigFiveSummaryV1
  | DarkTriadSummaryV1
  | AttachmentSummaryV1
  | EqSummaryV1
  | CognitiveSummaryV1
  | CognitiveSummaryV2;

/**
 * 정답률에서 정답 수를 되돌린다. 정답률은 정답 수/문항 수에서만 나오고 양자화 스텝이
 * 정확히 한 문항 몫(영역 25%p, 전체 6.25%p)이라 무손실로 되돌아온다 —
 * 카드·요약 페이지가 "몇 문항"을 다시 말할 수 있는 유일한 경로다.
 */
export function correctCountFromAccuracy(accuracy0to100: number, itemCount: number): number {
  return Math.round((accuracy0to100 / 100) * itemCount);
}

interface FieldSpec {
  readonly name: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

/**
 * (version, kind)별로 동결된 필드 표 — 순서를 바꾸면 이미 배포된 링크가 깨진다.
 * jungian은 v1(레거시 14자, 디코드 전용)과 v2(현재, 18자)가 공존한다 — FIELD_SPECS는 v1과
 * 나머지 모든 kind의 유일한 스펙이고, jungian v2는 JUNGIAN_FIELD_SPECS_V2에 별도로 둔다.
 */
const FIELD_SPECS: Readonly<Record<ShareKind, readonly FieldSpec[]>> = Object.freeze({
  jungian: Object.freeze([
    Object.freeze({ name: "ei", min: -100, max: 100, step: 0.1 }),
    Object.freeze({ name: "sn", min: -100, max: 100, step: 0.1 }),
    Object.freeze({ name: "tf", min: -100, max: 100, step: 0.1 }),
    Object.freeze({ name: "jp", min: -100, max: 100, step: 0.1 }),
    // bit0..bit3 = EI/SN/TF/JP의 isBoundary. 상위 비트는 예약(항상 0으로 인코딩).
    Object.freeze({ name: "flags", min: 0, max: 4095, step: 1 }),
  ]),
  bigfive: Object.freeze(BIGFIVE_FACTORS.map((factor) => Object.freeze({ name: factor, min: 0, max: 100, step: 0.1 }))),
  darktriad: Object.freeze(
    DARKTRIAD_FACTORS.map((factor) => Object.freeze({ name: factor, min: 0, max: 100, step: 0.1 })),
  ),
  attachment: Object.freeze([
    Object.freeze({ name: "anxiety", min: 1, max: 5, step: 0.01 }),
    Object.freeze({ name: "avoidance", min: 1, max: 5, step: 0.01 }),
    Object.freeze({ name: "quadrant", min: 0, max: 3, step: 1 }),
  ]),
  // 하위요인 4개 뒤에 총점 원점수가 마지막으로 온다. 하위요인은 출판 규준이 없어
  // 0~100 척도 위치에서 파생된 값이고, 총점만 원점수를 그대로 실어 정수로 무손실 복원된다.
  eq: Object.freeze([
    ...EQ_FACTORS.map((factor) => Object.freeze({ name: factor, min: 0, max: 100, step: 0.1 })),
    Object.freeze({
      name: "totalRawSum",
      min: EQ_TOTAL_ITEM_COUNT,
      max: EQ_TOTAL_ITEM_COUNT * 5,
      step: 1,
    }),
  ]),
  // 영역 4개 뒤에 전체 정답률이 마지막으로 온다. 스텝을 정확히 한 문항 몫으로 잡았기 때문에
  // (영역 100/4=25, 전체 100/16=6.25 — 둘 다 2의 거듭제곱 분수라 부동소수로도 정확하다)
  // 이 필드들은 엔진이 낼 수 없는 값을 애초에 표현하지 못하고, 왕복해도 오차가 0이다.
  // 소요 시간 필드는 없다 — 이유는 CognitiveSummaryV1 주석 참고.
  cognitive: Object.freeze([
    ...COGNITIVE_DOMAINS.map((domain) =>
      Object.freeze({ name: domain, min: 0, max: 100, step: 100 / COGNITIVE_ITEMS_PER_DOMAIN }),
    ),
    Object.freeze({ name: "overall", min: 0, max: 100, step: 100 / COGNITIVE_ITEM_COUNT }),
  ]),
});

/**
 * jungian v2 field spec — 64유형 확장(AT/VW 추가)의 현재 인코딩. EI/SN/TF/JP는 v1과 같은
 * 순서·스텝을 유지하고, AT/VW를 이어 붙인 뒤 flags를 마지막으로 옮겼다. flags는 이제
 * bit0..bit5 = EI/SN/TF/JP/AT/VW의 isBoundary(상위 6비트는 예약, 항상 0).
 */
const JUNGIAN_FIELD_SPECS_V2: readonly FieldSpec[] = Object.freeze([
  Object.freeze({ name: "ei", min: -100, max: 100, step: 0.1 }),
  Object.freeze({ name: "sn", min: -100, max: 100, step: 0.1 }),
  Object.freeze({ name: "tf", min: -100, max: 100, step: 0.1 }),
  Object.freeze({ name: "jp", min: -100, max: 100, step: 0.1 }),
  Object.freeze({ name: "at", min: -100, max: 100, step: 0.1 }),
  Object.freeze({ name: "vw", min: -100, max: 100, step: 0.1 }),
  Object.freeze({ name: "flags", min: 0, max: 4095, step: 1 }),
]);

/**
 * cognitive v2 field spec — 표준화 5영역(gf/gc/gv/gwm/gs) 정답률 뒤에 IQ, 95% 신뢰구간
 * 하한·상한을 정수로 그대로 싣는다. 하한·상한을 따로 실어서(iq±margin 역산 대신) 40/160
 * 클램프 경계에서도 왕복 오차가 생기지 않는다. 백분위·밴드는 iq에서 순수 공식으로
 * 재계산하므로 필드가 없다.
 */
const COGNITIVE_FIELD_SPECS_V2: readonly FieldSpec[] = Object.freeze([
  ...STANDARDIZED_DOMAINS.map((domain) => Object.freeze({ name: domain, min: 0, max: 100, step: 25 })),
  Object.freeze({ name: "iq", min: 40, max: 160, step: 1 }),
  Object.freeze({ name: "ciLower", min: 40, max: 160, step: 1 }),
  Object.freeze({ name: "ciUpper", min: 40, max: 160, step: 1 }),
]);

function fieldSpecsFor(kind: ShareKind, versionChar: string): readonly FieldSpec[] {
  if (kind === "jungian" && versionChar === "2") return JUNGIAN_FIELD_SPECS_V2;
  if (kind === "cognitive" && versionChar === "2") return COGNITIVE_FIELD_SPECS_V2;
  return FIELD_SPECS[kind];
}

function fieldSteps(spec: FieldSpec): number {
  return Math.round((spec.max - spec.min) / spec.step);
}

// 각 필드가 12비트(0..4095) 안에 들어가는지 모듈 로드 시점에 못 박아 둔다 —
// 나중에 step을 실수로 좁히면 배포 전에 여기서 바로 터진다.
for (const kind of SHARE_KINDS) {
  for (const spec of FIELD_SPECS[kind]) {
    if (fieldSteps(spec) > 4095) {
      throw new Error(`shareCode: field "${kind}.${spec.name}" needs more than 12 bits`);
    }
  }
}
for (const spec of JUNGIAN_FIELD_SPECS_V2) {
  if (fieldSteps(spec) > 4095) {
    throw new Error(`shareCode: field "jungian(v2).${spec.name}" needs more than 12 bits`);
  }
}
for (const spec of COGNITIVE_FIELD_SPECS_V2) {
  if (fieldSteps(spec) > 4095) {
    throw new Error(`shareCode: field "cognitive(v2).${spec.name}" needs more than 12 bits`);
  }
}

const ATTACHMENT_QUADRANTS: readonly AttachmentQuadrant[] = Object.freeze([
  "secure",
  "anxious",
  "avoidant",
  "fearful",
]);

function assertNever(value: never): never {
  throw new Error(`shareCode: unreachable branch for ${JSON.stringify(value)}`);
}

function quantize(value: number, spec: FieldSpec): number {
  const steps = fieldSteps(spec);
  const safeValue = Number.isFinite(value) ? value : spec.min;
  const clamped = Math.min(spec.max, Math.max(spec.min, safeValue));
  const index = Math.round((clamped - spec.min) / spec.step);
  return Math.min(steps, Math.max(0, index));
}

function dequantize(index: number, spec: FieldSpec): number {
  return spec.min + index * spec.step;
}

function encodeField(value: number, spec: FieldSpec): string {
  const index = quantize(value, spec);
  const high = ALPHABET[index >> 6]!;
  const low = ALPHABET[index & 63]!;
  return `${high}${low}`;
}

function checksumChar(body: string): string {
  let sum = 0;
  for (const ch of body) {
    sum += ALPHABET_INDEX.get(ch) ?? 0;
  }
  return ALPHABET[sum % 64]!;
}

/**
 * E/I·S/N·T/F·J/P 극 판정 — jungian.ts의 axisLetter와 반드시 같은 규칙이어야
 * 공유 카드가 본문 결과 페이지와 다른 4글자를 보여주는 일이 없다.
 * isBoundary가 아닌 축은 |continuous| >= 6.25(BOUNDARY_Z*CONTINUOUS_SCALE_PER_Z)이므로
 * 0.1 단위 양자화 오차(최대 0.05)로는 부호가 절대 뒤집히지 않는다.
 */
function jungianPoleFor(axis: JungianAxis, continuous: number, isBoundary: boolean): JungianPole | null {
  if (isBoundary) return null;
  const config = jungianAxisConfig(axis);
  return continuous < 0 ? config.negativePole : config.positivePole;
}

/** axes.length===4 → 레거시 "XXXX" (v1). axes.length===6 → 현재 "XXXX-YZ" (v2, jungian.ts와 같은 대시 위치). */
function jungianTypeCode(axes: readonly JungianAxisEntry[]): string {
  const letters = axes.map((axis) => jungianPoleFor(axis.axis, axis.continuous, axis.isBoundary) ?? "?");
  if (letters.length <= 4) return letters.join("");
  return `${letters.slice(0, 4).join("")}-${letters.slice(4).join("")}`;
}

function fieldValuesFor(summary: ShareSummaryV1): readonly number[] {
  switch (summary.kind) {
    case "jungian": {
      const byAxis = new Map(summary.axes.map((entry) => [entry.axis, entry] as const));
      const continuousByAxis = JUNGIAN_AXES.map((axis) => byAxis.get(axis)?.continuous ?? 0);
      let flags = 0;
      JUNGIAN_AXES.forEach((axis, index) => {
        if (byAxis.get(axis)?.isBoundary) flags |= 1 << index;
      });
      return [...continuousByAxis, flags];
    }
    case "bigfive": {
      const byFactor = new Map(summary.factors.map((entry) => [entry.factor, entry.tScore] as const));
      return BIGFIVE_FACTORS.map((factor) => byFactor.get(factor) ?? 0);
    }
    case "darktriad": {
      const byFactor = new Map(summary.subscales.map((entry) => [entry.subscale, entry.tScore] as const));
      return DARKTRIAD_FACTORS.map((factor) => byFactor.get(factor) ?? 0);
    }
    case "attachment": {
      const quadrantIndex = ATTACHMENT_QUADRANTS.indexOf(summary.quadrant);
      return [summary.anxiety, summary.avoidance, quadrantIndex];
    }
    case "eq": {
      const byFactor = new Map(summary.subscales.map((entry) => [entry.subscale, entry.tScore] as const));
      return [...EQ_FACTORS.map((factor) => byFactor.get(factor) ?? 50), summary.totalRawSum];
    }
    case "cognitive": {
      if (summary.version === 2) {
        const byDomain = new Map(summary.domains.map((entry) => [entry.domain, entry.accuracy0to100] as const));
        const [lower, upper] = summary.confidenceInterval95;
        return [...STANDARDIZED_DOMAINS.map((domain) => byDomain.get(domain) ?? 0), summary.iq, lower, upper];
      }
      const byDomain = new Map(summary.domains.map((entry) => [entry.domain, entry.accuracy0to100] as const));
      return [
        ...COGNITIVE_DOMAINS.map((domain) => byDomain.get(domain) ?? 0),
        summary.accuracy0to100,
      ];
    }
    default:
      return assertNever(summary);
  }
}

function buildSummaryFromValues(
  kind: ShareKind,
  locale: Locale,
  values: readonly number[],
  versionChar: string,
): ShareSummaryV1 {
  switch (kind) {
    case "jungian": {
      // v1(레거시 14자 링크): EI/SN/TF/JP 4축뿐. v2(현재): 6축 전부.
      const legacyAxes: readonly JungianAxis[] = ["EI", "SN", "TF", "JP"];
      const isLegacy = versionChar === "1";
      const axisOrder = isLegacy ? legacyAxes : JUNGIAN_AXES;
      const continuousByAxis = new Map(axisOrder.map((axis, index) => [axis, values[index]!] as const));
      const flags = Math.round(values[axisOrder.length]!);
      const axes: readonly JungianAxisEntry[] = axisOrder.map((axis, index) =>
        Object.freeze({
          axis,
          continuous: continuousByAxis.get(axis)!,
          isBoundary: ((flags >> index) & 1) === 1,
        }),
      );
      return Object.freeze({
        kind: "jungian" as const,
        version: (isLegacy ? 1 : 2) as 1 | 2,
        locale,
        axes: Object.freeze(axes),
        typeCode: jungianTypeCode(axes),
      });
    }
    case "bigfive": {
      const factors = BIGFIVE_FACTORS.map((factor, index) => Object.freeze({ factor, tScore: values[index]! }));
      return Object.freeze({ kind: "bigfive" as const, version: 1 as const, locale, factors: Object.freeze(factors) });
    }
    case "darktriad": {
      const subscales = DARKTRIAD_FACTORS.map((subscale, index) =>
        Object.freeze({ subscale, tScore: values[index]! }),
      );
      return Object.freeze({
        kind: "darktriad" as const,
        version: 1 as const,
        locale,
        subscales: Object.freeze(subscales),
      });
    }
    case "attachment": {
      const quadrant = ATTACHMENT_QUADRANTS[Math.round(values[2]!)]!;
      return Object.freeze({
        kind: "attachment" as const,
        version: 1 as const,
        locale,
        anxiety: values[0]!,
        avoidance: values[1]!,
        quadrant,
      });
    }
    case "eq": {
      const subscales = EQ_FACTORS.map((subscale, index) => Object.freeze({ subscale, tScore: values[index]! }));
      return Object.freeze({
        kind: "eq" as const,
        version: 1 as const,
        locale,
        subscales: Object.freeze(subscales),
        totalRawSum: Math.round(values[EQ_FACTORS.length]!),
      });
    }
    case "cognitive": {
      if (versionChar === "2") {
        const domains: readonly StandardizedCognitiveDomainEntry[] = STANDARDIZED_DOMAINS.map((domain, index) =>
          Object.freeze({ domain, accuracy0to100: values[index]! }),
        );
        const iq = Math.round(values[STANDARDIZED_DOMAINS.length]!);
        const lower = Math.round(values[STANDARDIZED_DOMAINS.length + 1]!);
        const upper = Math.round(values[STANDARDIZED_DOMAINS.length + 2]!);
        return Object.freeze({
          kind: "cognitive" as const,
          version: 2 as const,
          locale,
          domains: Object.freeze(domains),
          iq,
          confidenceInterval95: [lower, upper] as const,
        });
      }
      const domains = COGNITIVE_DOMAINS.map((domain, index) =>
        Object.freeze({ domain, accuracy0to100: values[index]! }),
      );
      return Object.freeze({
        kind: "cognitive" as const,
        version: 1 as const,
        locale,
        domains: Object.freeze(domains),
        accuracy0to100: values[COGNITIVE_DOMAINS.length]!,
      });
    }
    default:
      return assertNever(kind);
  }
}

export function encodeShareCode(summary: ShareSummaryV1): string {
  const versionChar = String(summary.version);
  const specs = fieldSpecsFor(summary.kind, versionChar);
  const rawValues = fieldValuesFor(summary);
  const payload = specs.map((spec, index) => encodeField(rawValues[index] ?? spec.min, spec)).join("");
  const body = `${versionChar}${KIND_CHARS[summary.kind]}${LOCALE_CHARS[summary.locale]}${payload}`;
  return `${body}${checksumChar(body)}`;
}

const KNOWN_VERSION_CHARS = new Set(["1", "2"]);

/** 손상·오타를 걸러내기 위한 단순 가산 체크섬일 뿐 암호학적 무결성 보장은 아니다. */
export function decodeShareCode(code: string, expectedKind?: ShareKind): ShareSummaryV1 | null {
  if (typeof code !== "string" || code.length < 4) return null;
  const versionChar = code[0]!;
  if (!KNOWN_VERSION_CHARS.has(versionChar)) return null;

  const kind = CHAR_TO_KIND.get(code[1]!);
  if (!kind) return null;
  // v2는 jungian(64유형 확장)과 cognitive(표준화 IQ 추정치)에만 존재한다 — 그 외 kind가
  // "2"로 시작하면 알 수 없는 코드다.
  if (versionChar === "2" && kind !== "jungian" && kind !== "cognitive") return null;
  if (expectedKind !== undefined && kind !== expectedKind) return null;

  const locale = CHAR_TO_LOCALE.get(code[2]!);
  if (!locale) return null;

  const specs = fieldSpecsFor(kind, versionChar);
  const expectedLength = 3 + specs.length * 2 + 1;
  if (code.length !== expectedLength) return null;

  for (const ch of code) {
    if (!ALPHABET_INDEX.has(ch)) return null;
  }

  const body = code.slice(0, -1);
  if (code[code.length - 1] !== checksumChar(body)) return null;

  const values: number[] = [];
  for (let i = 0; i < specs.length; i += 1) {
    const spec = specs[i]!;
    const high = ALPHABET_INDEX.get(code[3 + i * 2]!)!;
    const low = ALPHABET_INDEX.get(code[3 + i * 2 + 1]!)!;
    const index = (high << 6) | low;
    if (index > fieldSteps(spec)) return null;
    values.push(dequantize(index, spec));
  }

  return buildSummaryFromValues(kind, locale, values, versionChar);
}

export function jungianSummaryFromResult(result: JungianLensResult, locale: Locale): JungianSummaryV1 {
  const axes: readonly JungianAxisEntry[] = result.axes.map((axis) =>
    Object.freeze({ axis: axis.axis, continuous: axis.continuous, isBoundary: axis.isBoundary }),
  );
  return Object.freeze({
    kind: "jungian",
    version: 2,
    locale,
    axes: Object.freeze(axes),
    typeCode: jungianTypeCode(axes),
  });
}

// norm이 없으면(표본 부족) scalePosition0to100을 t점수 근사치로 쓴다 — jungian.ts의
// standardizedScore가 같은 상황에서 쓰는 것과 동일한 폴백이라 두 화면의 수치가 어긋나지 않는다.
function tScoreFallback(score: {
  readonly norm: { readonly tScore: number } | null;
  readonly scalePosition0to100: number;
}): number {
  return score.norm?.tScore ?? 50 + 0.4 * (score.scalePosition0to100 - 50);
}

export function bigFiveSummaryFromScores(scores: readonly BigFiveFactorScore[], locale: Locale): BigFiveSummaryV1 {
  const byFactor = new Map(scores.map((score) => [score.factor, score] as const));
  const factors = BIGFIVE_FACTORS.map((factor) => {
    const score = byFactor.get(factor);
    return Object.freeze({ factor, tScore: score ? tScoreFallback(score) : 50 });
  });
  return Object.freeze({ kind: "bigfive", version: 1, locale, factors: Object.freeze(factors) });
}

export function darkTriadSummaryFromScores(
  scores: readonly DarkTriadFactorScore[],
  locale: Locale,
): DarkTriadSummaryV1 {
  const byFactor = new Map(scores.map((score) => [score.factor, score] as const));
  const subscales = DARKTRIAD_FACTORS.map((subscale) => {
    const score = byFactor.get(subscale);
    return Object.freeze({ subscale, tScore: score ? tScoreFallback(score) : 50 });
  });
  return Object.freeze({ kind: "darktriad", version: 1, locale, subscales: Object.freeze(subscales) });
}

export function attachmentSummaryFromView(view: AttachmentView, locale: Locale): AttachmentSummaryV1 {
  return Object.freeze({
    kind: "attachment",
    version: 1,
    locale,
    anxiety: view.anxiety.mean,
    avoidance: view.avoidance.mean,
    quadrant: view.classification.quadrant,
  });
}

export function eqSummaryFromScores(scores: readonly EqFactorScore[], locale: Locale): EqSummaryV1 {
  const byFactor = new Map(scores.map((score) => [score.factor, score] as const));
  const subscales = EQ_FACTORS.map((subscale) => {
    const score = byFactor.get(subscale);
    return Object.freeze({ subscale, tScore: score ? tScoreFallback(score) : 50 });
  });
  // 네 하위요인의 문항 집합이 33문항 전체를 겹침 없이 분할하므로, 하위요인 원점수의 합은
  // computeTotalScore(...).rawSum과 정확히 같다 — 결과 페이지가 하위요인 점수만 넘겨도
  // SSEIT의 1차 지표인 총점을 잃지 않는 유일한 경로다(shareCode.test.ts에서 고정한다).
  const totalRawSum = EQ_FACTORS.reduce((sum, factor) => sum + (byFactor.get(factor)?.rawSum ?? 0), 0);
  return Object.freeze({
    kind: "eq",
    version: 1,
    locale,
    subscales: Object.freeze(subscales),
    totalRawSum,
  });
}

/**
 * CognitiveResult → 공유 요약. 전달하는 것은 정답률 다섯 개뿐이며,
 * result.itemResults(문항별 선택 색인 = 정답 키의 흔적)는 의도적으로 한 글자도 담지 않는다.
 * 공개 URL에 정답 키를 남기면 다음 사람의 검사를 망가뜨리고, 남의 오답 목록을 노출한다.
 * result.totalElapsedMs도 담지 않는다 — CognitiveSummaryV1 주석의 세 가지 이유 그대로다.
 */
export function cognitiveSummaryFromResult(result: CognitiveResult, locale: Locale): CognitiveSummaryV1 {
  const byDomain = new Map(result.domains.map((score) => [score.domain, score.accuracy0to100] as const));
  const domains: readonly CognitiveDomainEntry[] = COGNITIVE_DOMAINS.map((domain) =>
    Object.freeze({ domain, accuracy0to100: byDomain.get(domain) ?? 0 }),
  );
  return Object.freeze({
    kind: "cognitive",
    version: 1,
    locale,
    domains: Object.freeze(domains),
    accuracy0to100: result.accuracy0to100,
  });
}

/**
 * EstimatedScore(표준화 엔진의 θ~N(0,1) 이론 분포 기반 IQ 추정치) → 공유 요약. 도메인별
 * 정답률로 다시 환산해서 싣는다 — correctCount/itemCount 자체(어떤 문항을 맞혔는지의 흔적)는
 * 담지 않는다.
 */
export function cognitiveSummaryFromEstimate(score: EstimatedScore, locale: Locale): CognitiveSummaryV2 {
  const byDomain = new Map(
    score.domains.map((entry) => [entry.domain, entry.itemCount > 0 ? (entry.correctCount / entry.itemCount) * 100 : 0] as const),
  );
  const domains: readonly StandardizedCognitiveDomainEntry[] = STANDARDIZED_DOMAINS.map((domain) =>
    Object.freeze({ domain, accuracy0to100: byDomain.get(domain) ?? 0 }),
  );
  return Object.freeze({
    kind: "cognitive",
    version: 2,
    locale,
    domains: Object.freeze(domains),
    iq: score.fullScaleIq,
    confidenceInterval95: score.confidenceInterval95,
  });
}
