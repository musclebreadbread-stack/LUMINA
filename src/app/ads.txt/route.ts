import { buildAdsTxt, readAdSenseClient } from "@/lib/adsense";

/**
 * ads.txt를 환경변수에서 만든다. 정적 public/ads.txt는 게시자 ID가 생길 때마다
 * 커밋을 요구했고, 주석만 있는 상태로 운영에 나가 있었다. NEXT_PUBLIC_* 값은 빌드에
 * 전달되면 인라인되므로, 값을 바꾼 뒤에는 다시 빌드해야 이 응답도 바뀐다.
 */
export function GET(): Response {
  return new Response(buildAdsTxt(readAdSenseClient(process.env.NEXT_PUBLIC_ADSENSE_CLIENT)), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
