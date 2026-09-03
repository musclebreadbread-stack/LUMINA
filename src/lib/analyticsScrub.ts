/**
 * 분석 이벤트로 나가기 전 URL을 정제한다.
 *
 * "?r="에는 리커트 원응답이, "/r/<data>"에는 생년월일시·장소가, "/s/<kind>/<code>"에는
 * 파생 요약 코드가, "/tarot/<spread>/<seed>"와 "/compatibility/<left>/<right>"에는 셔플
 * 시드와 두 사람의 인코딩된 생년월일 데이터가 각각 경로에 실려 있다 — 쿼리 문자열은
 * 예외 없이 전부 버리고, 각 경로도 이미 알려진 라우트 표를 기준으로만 자리표시자로
 * 바꾼다(패턴 추측이 아니라 표 매칭이라 새 라우트가 생겨도 조용히 새는 대신 그대로
 * 남는다 — 그 경우 이 표를 갱신해야 한다).
 */

const LOCALE_SEGMENT = "en";

const R_CHILDREN: ReadonlySet<string> = new Set(["astro", "today", "all"]);
const SHARE_KINDS: ReadonlySet<string> = new Set([
  "jungian",
  "bigfive",
  "darktriad",
  "attachment",
  "eq",
  "cognitive",
]);
const TAROT_SPREADS: ReadonlySet<string> = new Set(["single", "three", "celtic-cross"]);

const DATA_PLACEHOLDER = "[data]";
const CODE_PLACEHOLDER = "[code]";
const KIND_PLACEHOLDER = "[kind]";
const SPREAD_PLACEHOLDER = "[spread]";
const SEED_PLACEHOLDER = "[seed]";
const LEFT_PLACEHOLDER = "[left]";
const RIGHT_PLACEHOLDER = "[right]";
const COGNITIVE_RUN_PLACEHOLDER = "[runId]";

type SegmentScrubber = (segments: readonly string[]) => readonly string[] | null;

/** "/r/<data>"와 그 자식("/astro","/today","/all") — 생년월일시·장소가 담긴 프로필 경로. */
function scrubProfileRoute(segments: readonly string[]): readonly string[] | null {
  if (segments[0] !== "r") return null;
  if (segments.length === 1) return segments;
  const child = segments[2];
  const tail = child !== undefined && R_CHILDREN.has(child) ? [child] : [];
  return ["r", DATA_PLACEHOLDER, ...tail];
}

/** "/s/<kind>/<code>" — kind는 4종 고정 열거값이라 안전하게 남기고, code만 지운다. */
function scrubShareRoute(segments: readonly string[]): readonly string[] | null {
  if (segments[0] !== "s") return null;
  if (segments.length === 1) return segments;
  const kind = segments[1] ?? "";
  const safeKind = SHARE_KINDS.has(kind) ? kind : KIND_PLACEHOLDER;
  if (segments.length === 2) return ["s", safeKind];
  return ["s", safeKind, CODE_PLACEHOLDER];
}

/** "/tarot/<spread>/<seed>" — spread는 3종 고정 열거값, seed는 카드 셔플 시드라 지운다. */
function scrubTarotRoute(segments: readonly string[]): readonly string[] | null {
  if (segments[0] !== "tarot") return null;
  if (segments.length === 1) return segments;
  const spread = segments[1] ?? "";
  const safeSpread = TAROT_SPREADS.has(spread) ? spread : SPREAD_PLACEHOLDER;
  if (segments.length === 2) return ["tarot", safeSpread];
  return ["tarot", safeSpread, SEED_PLACEHOLDER];
}

/** "/compatibility/<left>/<right>" — 두 사람 모두의 인코딩된 생년월일 데이터라 둘 다 지운다. */
function scrubCompatibilityRoute(segments: readonly string[]): readonly string[] | null {
  if (segments[0] !== "compatibility") return null;
  if (segments.length === 1) return segments;
  if (segments.length === 2) return ["compatibility", LEFT_PLACEHOLDER];
  return ["compatibility", LEFT_PLACEHOLDER, RIGHT_PLACEHOLDER];
}

/** `/cognitive/run/<runId>`와 `/cognitive/result/<runId>`의 서버 실행 ID를 제거한다. */
function scrubCognitiveRunRoute(segments: readonly string[]): readonly string[] | null {
  if (segments[0] !== "cognitive") return null;
  const branch = segments[1];
  if (branch !== "run" && branch !== "result") return null;
  return segments.length >= 3
    ? ["cognitive", branch, COGNITIVE_RUN_PLACEHOLDER]
    : ["cognitive", branch];
}

const ROUTE_SCRUBBERS: readonly SegmentScrubber[] = [
  scrubProfileRoute,
  scrubShareRoute,
  scrubTarotRoute,
  scrubCompatibilityRoute,
  scrubCognitiveRunRoute,
];

/**
 * 결과 페이지(psychometrics/result 등)는 동적 경로 세그먼트가 없다 — 민감한 값은
 * 전부 쿼리("?r=","?run=")에 있었고 그 쿼리는 이미 위에서 통째로 버려졌으므로,
 * 표에 없는 경로는 그대로 남겨도 안전하다.
 */
function scrubSegments(segments: readonly string[]): readonly string[] {
  for (const scrub of ROUTE_SCRUBBERS) {
    const scrubbed = scrub(segments);
    if (scrubbed !== null) return scrubbed;
  }
  return segments;
}

function splitLocale(segments: readonly string[]): { readonly locale: string | null; readonly rest: readonly string[] } {
  if (segments[0] === LOCALE_SEGMENT) {
    return { locale: LOCALE_SEGMENT, rest: segments.slice(1) };
  }
  return { locale: null, rest: segments };
}

function buildPath(locale: string | null, segments: readonly string[]): string {
  const tail = segments.length > 0 ? `/${segments.join("/")}` : "";
  return locale !== null ? `/${locale}${tail}` : tail || "/";
}

/**
 * 쿼리 문자열은 예외 없이 버리고, 알려진 라우트의 동적 세그먼트만 표에 따라
 * 자리표시자로 바꾼다. 파싱 자체가 실패하면(빈 문자열 등 극단적 입력) null을
 * 돌려줘 호출부가 이벤트 전체를 버리게 한다 — 실패는 항상 닫힌 쪽으로.
 */
export function scrubAnalyticsUrl(raw: string): string | null {
  if (typeof raw !== "string" || raw.length === 0) return null;
  let pathname: string;
  try {
    const hasScheme = raw.startsWith("http://") || raw.startsWith("https://");
    const parsed = hasScheme ? new URL(raw) : new URL(raw, "http://scrub.invalid");
    pathname = parsed.pathname;
  } catch {
    return null;
  }

  const segments = pathname.split("/").filter((segment) => segment.length > 0);
  const { locale, rest } = splitLocale(segments);
  const scrubbed = scrubSegments(rest);
  return buildPath(locale, scrubbed);
}
