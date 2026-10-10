/**
 * AdSense 설정값 검증. 값은 환경변수로만 들어오고(가짜 ID를 커밋하지 않는다),
 * 형식이 틀리면 광고·ads.txt·소유확인 메타를 전부 끈다 — 잘못된 게시자 ID로
 * 광고를 요청하거나 ads.txt에 남의 ID를 선언하는 일이 없게 한다.
 *
 * 호출하는 쪽은 `process.env.NEXT_PUBLIC_*`를 문자 그대로 읽어 넘겨야 한다.
 * Next.js는 그 표현식만 빌드 시점에 인라인한다.
 */

const CLIENT_PATTERN = /^ca-pub-\d{10,20}$/u;
const SLOT_PATTERN = /^\d{6,20}$/u;

export function readAdSenseClient(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && CLIENT_PATTERN.test(trimmed) ? trimmed : null;
}

export function readAdSenseSlotId(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && SLOT_PATTERN.test(trimmed) ? trimmed : null;
}

const ADS_TXT_HEADER = "# LUMINA ads.txt - https://iabtechlab.com/ads-txt/";

/**
 * Google 인증 판매자 한 줄. 게시자 ID가 없으면 주석만 남긴다 — 이 상태에서는
 * 어떤 판매자도 승인하지 않는다는 뜻이 된다.
 */
export function buildAdsTxt(client: string | null): string {
  if (client === null) {
    return `${ADS_TXT_HEADER}\n# AdSense publisher ID is not configured (NEXT_PUBLIC_ADSENSE_CLIENT).\n`;
  }
  const publisherId = client.replace(/^ca-/u, "");
  return `${ADS_TXT_HEADER}\ngoogle.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`;
}
