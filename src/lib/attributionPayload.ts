import { scrubAnalyticsUrl } from "./analyticsScrub";

/**
 * 주문에 실어 보내는 유입 경로(Track D7)의 정제 규칙 — 클라이언트가 보내기 전과
 * 서버가 저장하기 전에 같은 함수를 거친다. 서버는 클라이언트가 이미 정제했다고
 * 믿지 않는다.
 *
 * 저장하는 값은 셋뿐이다: 사용자가 링크에 실어 온 짧은 UTM 꼬리표, 그리고 이미
 * 알려진 라우트 표로 동적 세그먼트를 지운 랜딩 경로. "/r/<data>"에는 생년월일시·장소가
 * 그대로 실려 있으므로(analyticsScrub.ts 참고) 원본 경로는 절대 그대로 저장하지 않는다.
 */

export interface AttributionPayload {
  readonly source: string | null;
  readonly medium: string | null;
  readonly campaign: string | null;
  readonly landingPath: string;
}

const TAG_PATTERN = /^[a-z0-9][a-z0-9._~+-]{0,63}$/u;
const SAFE_PATH_PATTERN = /^\/[A-Za-z0-9/_[\]-]{0,119}$/u;
const MAX_RAW_PATH_LENGTH = 512;

/** 알 수 없거나 정제 후에도 안전하지 않은 경로는 UTM 정보까지 버리지 않도록 이 값으로 접는다. */
export const UNKNOWN_LANDING_PATH = "/[other]";

export function sanitizeAttributionTag(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return TAG_PATTERN.test(normalized) ? normalized : null;
}

export function sanitizeLandingPath(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_RAW_PATH_LENGTH) {
    return UNKNOWN_LANDING_PATH;
  }
  const scrubbed = scrubAnalyticsUrl(value);
  if (scrubbed === null) return UNKNOWN_LANDING_PATH;
  return SAFE_PATH_PATTERN.test(scrubbed) ? scrubbed : UNKNOWN_LANDING_PATH;
}

export function sanitizeAttribution(input: unknown): AttributionPayload | null {
  if (typeof input !== "object" || input === null) return null;
  const record = input as Readonly<Record<string, unknown>>;
  return {
    source: sanitizeAttributionTag(record.source),
    medium: sanitizeAttributionTag(record.medium),
    campaign: sanitizeAttributionTag(record.campaign),
    landingPath: sanitizeLandingPath(record.landingPath),
  };
}
