import { track as sendVercelEvent } from "@vercel/analytics";
import type { AnalysisKey } from "@engine/shared/evidence";
import { loadConsent } from "./consent";

/**
 * 공유류 버튼이 실제로 무엇을 트리거했는지 구분하는 값 — AdSlot의 data-npa처럼
 * 작지만 의미가 갈리는 신호다. "print"는 지금 어떤 이벤트도 이 값으로 보내지
 * 않지만(savePdf 버튼은 이번 과제 범위 밖), 닫힌 집합 자체는 미리 정의해 둔다.
 */
export type AnalyticsShareMethod =
  | "web-share"
  | "clipboard"
  | "print"
  | "file-share"
  | "download"
  | "x"
  | "threads"
  | "facebook"
  | "kakao";

interface AnalyticsEventPropsMap {
  readonly test_start: { readonly analysis: AnalysisKey };
  readonly test_complete: { readonly analysis: AnalysisKey };
  readonly share_open: { readonly analysis: AnalysisKey; readonly method: AnalyticsShareMethod };
  readonly share_image_saved: { readonly analysis: AnalysisKey; readonly method: AnalyticsShareMethod };
  readonly share_landing_view: { readonly analysis: AnalysisKey };
  readonly share_landing_cta: { readonly analysis: AnalysisKey };
  readonly related_test_click: { readonly analysis: AnalysisKey };
}

export type AnalyticsEventName = keyof AnalyticsEventPropsMap;

/** evidence.ts의 리터럴 유니온을 런타임에서도 검증하려면 그 값 목록이 따로 필요하다. */
const ANALYSIS_KEYS: ReadonlySet<string> = new Set<AnalysisKey>([
  "saju",
  "astro",
  "tarot",
  "numerology",
  "psychometrics",
  "jungian",
  "darktriad",
  "attachment",
  "eq",
  "cognitive",
  "horoscope",
  "compatibility",
]);

const SHARE_METHODS: ReadonlySet<string> = new Set<AnalyticsShareMethod>([
  "web-share",
  "clipboard",
  "print",
  "file-share",
  "download",
  "x",
  "threads",
  "facebook",
  "kakao",
]);

const EVENTS_WITH_METHOD: ReadonlySet<AnalyticsEventName> = new Set(["share_open", "share_image_saved"]);

const MAX_PROP_LENGTH = 24;

function isShortString(value: unknown, allowed: ReadonlySet<string>): value is string {
  return typeof value === "string" && value.length <= MAX_PROP_LENGTH && allowed.has(value);
}

/**
 * 컴파일 타임 타입은 우회될 수 있으므로(예: JSON에서 온 값을 캐스팅) 여기서 다시
 * 막는다 — 점수·코드·자유 텍스트가 실려도 여기서 걸러진다.
 */
function isValidProps(name: AnalyticsEventName, props: Record<string, unknown>): boolean {
  const expectedKeys = EVENTS_WITH_METHOD.has(name) ? 2 : 1;
  if (Object.keys(props).length !== expectedKeys) return false;
  if (!isShortString(props.analysis, ANALYSIS_KEYS)) return false;
  if (EVENTS_WITH_METHOD.has(name) && !isShortString(props.method, SHARE_METHODS)) return false;
  return true;
}

/**
 * 동의 전에는 광고 요청 자체를 안 하는 AdSlot과 같은 원칙 — 동의 선택이 없으면
 * (accepted도 rejected도 아니면) 신호 자체를 만들지 않는다.
 */
export function track<E extends AnalyticsEventName>(event: E, props: AnalyticsEventPropsMap[E]): void {
  if (loadConsent() === null) return;
  if (!isValidProps(event, props)) return;
  sendVercelEvent(event, props);
}
