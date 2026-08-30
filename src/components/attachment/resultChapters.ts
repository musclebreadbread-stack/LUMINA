import type { Chapter } from "@/components/ui/ChapterNav";

/**
 * 애착 결과의 장 목록.
 *
 * 같은 결과를 서버(공유 링크 "?r=")와 브라우저 세션("?run=") 두 경로가 각각 그리므로,
 * 장 id 와 라벨을 한 곳에서만 정의한다 — 두 경로의 앵커가 어긋나면 한쪽 목차만 죽는다.
 */
export function attachmentResultChapters(
  t: (key: string) => string,
  nextLensLabel: string,
): readonly Chapter[] {
  return [
    { id: "section-quadrant", label: t("resultHeading") },
    { id: "section-axes", label: t("axisScoresTitle") },
    { id: "section-interpretation", label: t("interpretationTitle") },
    { id: "section-science", label: t("scienceTitle") },
    { id: "section-next-lens", label: nextLensLabel },
  ];
}
