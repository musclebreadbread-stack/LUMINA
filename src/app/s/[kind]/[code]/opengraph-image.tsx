import { ImageResponse } from "next/og";
import type { OgCard } from "@/lib/og/cards/frame";
import { renderOgFrame } from "@/lib/og/cards/frame";
import { buildAttachmentOgCard } from "@/lib/og/cards/attachment";
import { buildBigFiveOgCard } from "@/lib/og/cards/bigfive";
import { buildCognitiveEstimateOgCard, buildCognitiveOgCard } from "@/lib/og/cards/cognitive";
import { buildDarkTriadOgCard } from "@/lib/og/cards/darktriad";
import { buildEqOgCard } from "@/lib/og/cards/eq";
import { buildJungianOgCard } from "@/lib/og/cards/jungian";
import { loadOgFonts } from "@/lib/og/fonts";
import { HOBUN, INK } from "@/lib/og/theme";
import { decodeShareCode, isShareKind } from "@/lib/shareCode";

/**
 * 공유 요약 카드 — 1200×630. 경로 세그먼트(kind, code)만으로 그 자리에서
 * 다시 계산하므로 서버에 저장해 둔 것이 없다. searchParams를 못 읽는
 * opengraph-image 특성 때문에 shareCode.ts가 애초에 경로 세그먼트 전용으로
 * 설계됐다 — src/lib/shareCode.ts 상단 주석 참고.
 *
 * 코드가 깨졌거나 kind가 잘못돼도 절대 500을 내지 않는다 — 링크가 오래돼
 * 깨졌더라도 크롤러·사용자에게는 여전히 LUMINA 브랜드 카드를 보여준다.
 */

export const alt = "LUMINA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";
export const revalidate = 31536000;

function brokenLinkImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: INK,
          color: HOBUN,
          fontSize: 56,
          letterSpacing: 18,
        }}
      >
        LUMINA
      </div>
    ),
    size,
  );
}

async function composeCardImage(card: OgCard): Promise<ImageResponse> {
  const frame = renderOgFrame({
    statusLabel: card.statusLabel,
    footerText: card.footerText,
    centerContent: card.centerContent,
    centerSerifText: card.serifText,
    centerSansText: card.sansText,
  });
  const fonts = await loadOgFonts({ serifText: frame.serifText, sansText: frame.sansText });
  return new ImageResponse(frame.node, { ...size, fonts: fonts.length ? [...fonts] : undefined });
}

export default async function Image({
  params,
}: {
  params: Promise<{ kind: string; code: string }>;
}): Promise<ImageResponse> {
  const { kind, code } = await params;
  if (!isShareKind(kind)) return brokenLinkImage();

  const summary = decodeShareCode(code, kind);
  if (!summary) return brokenLinkImage();

  switch (summary.kind) {
    case "jungian":
      return composeCardImage(await buildJungianOgCard(summary));
    case "bigfive":
      return composeCardImage(await buildBigFiveOgCard(summary));
    case "darktriad":
      return composeCardImage(await buildDarkTriadOgCard(summary));
    case "attachment":
      return composeCardImage(await buildAttachmentOgCard(summary));
    case "eq":
      return composeCardImage(await buildEqOgCard(summary));
    case "cognitive":
      return composeCardImage(
        summary.version === 2 ? await buildCognitiveEstimateOgCard(summary) : await buildCognitiveOgCard(summary),
      );
    default:
      // ShareKind에 새 kind가 추가되면 여기서 컴파일 타임에 걸린다.
      return summary;
  }
}
