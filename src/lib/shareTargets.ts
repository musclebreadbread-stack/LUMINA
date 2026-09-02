import type { AnalyticsShareMethod } from "./analytics";

/**
 * SNS 공유 대상과 공유 URL 조립.
 *
 * X·Threads·Facebook은 공개 웹 인텐트 URL이라 SDK도 API 키도 필요 없다 —
 * 새 창으로 열기만 하면 된다. 카카오만 JS SDK가 필요해서 별도로 취급한다.
 *
 * 순수 함수만 둔다(브라우저 API를 만지지 않음) — 유닛 테스트로 URL 조립을 고정할 수 있다.
 */

export type ShareTargetId = "x" | "threads" | "facebook" | "kakao";

/** 유입 출처를 구분하기 위한 UTM. 공유로 들어온 방문이 어디서 왔는지 분리해 본다. */
export interface ShareUtm {
  readonly source: string;
  readonly medium: string;
  readonly campaign: string;
}

export const DEFAULT_SHARE_CAMPAIGN = "result_share";

/**
 * 공유 링크에 UTM을 붙인다.
 *
 * canonical은 쿼리를 떼고 계산하므로(seoAlternates.ts) UTM이 붙어도 중복 URL로
 * 색인되지 않는다. 이미 utm_source가 있으면 덮어쓰지 않는다 — 재공유될 때
 * 최초 유입 출처를 지우지 않기 위해서다.
 */
export function withUtm(rawUrl: string, utm: ShareUtm): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  if (url.searchParams.has("utm_source")) return url.toString();

  url.searchParams.set("utm_source", utm.source);
  url.searchParams.set("utm_medium", utm.medium);
  url.searchParams.set("utm_campaign", utm.campaign);
  return url.toString();
}

export function shareUtmFor(
  target: ShareTargetId | "clipboard" | "web-share",
  campaign: string = DEFAULT_SHARE_CAMPAIGN,
): ShareUtm {
  return { source: target, medium: "social", campaign };
}

/**
 * 새 창에서 열 공유 URL. 카카오는 SDK로 처리하므로 여기서 null을 돌려준다.
 */
export function shareIntentUrl(target: ShareTargetId, url: string, text: string): string | null {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  switch (target) {
    case "x":
      return `https://x.com/intent/post?text=${encodedText}&url=${encodedUrl}`;
    case "threads":
      // Threads 인텐트는 별도 url 파라미터를 받지 않아 본문에 링크를 함께 싣는다.
      return `https://www.threads.net/intent/post?text=${encodeURIComponent(`${text} ${url}`)}`;
    case "facebook":
      // Facebook sharer는 본문 텍스트를 무시하고 링크의 OG 태그를 그대로 쓴다.
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    case "kakao":
      return null;
  }
}

/** analytics의 method 값과 대상 id가 1:1이라 그대로 쓴다 — 매핑 테이블을 따로 두지 않는다. */
export function shareMethodFor(target: ShareTargetId): AnalyticsShareMethod {
  return target;
}
