"use client";

import { useTranslations } from "next-intl";
import { useMemo, useSyncExternalStore } from "react";
import { ITEMS } from "@engine/cognitive/items";
import { encodeCognitiveResponses } from "@/lib/cognitiveCode";
import {
  getCognitiveDraftServerSnapshot,
  getCognitiveDraftSnapshot,
  subscribeCognitiveDraft,
} from "@/lib/cognitiveDraft";
import { formatElapsedMs } from "@/lib/cognitiveModel";

/**
 * 걸린 시간을 담담하게 한 줄로 되돌려 주는 자리.
 *
 * 시간은 링크에 실리지 않고(cognitiveCode.ts) 이 브라우저의 초안에만 남으므로 서버는 이 값을
 * 알 수 없다. 그래서 초안 저장소를 그대로 구독하는 작은 클라이언트 섬으로 따로 둔다 —
 * 서버 스냅샷은 빈 초안이라 첫 렌더에서는 아무것도 그리지 않는다.
 *
 * 지금 보고 있는 링크의 답과 초안의 답이 정확히 같을 때만 말한다 — 남이 공유한 링크를 열었을 때
 * 내 기록을 그 사람의 결과인 양 붙여 놓지 않기 위해서다. 기록이 없으면 아무 말도 하지 않는다.
 */
export function ElapsedNote({ code }: { readonly code: string }) {
  const t = useTranslations("cognitive");
  const draft = useSyncExternalStore(
    subscribeCognitiveDraft,
    getCognitiveDraftSnapshot,
    getCognitiveDraftServerSnapshot,
  );

  const elapsed = useMemo(() => {
    if (encodeCognitiveResponses(draft.responses) !== code) return null;
    const measured = ITEMS.filter((item) => draft.elapsedMsByItem[item.id] !== undefined);
    if (measured.length === 0) return null;
    const totalMs = measured.reduce((sum, item) => sum + (draft.elapsedMsByItem[item.id] ?? 0), 0);
    return formatElapsedMs(totalMs);
  }, [draft, code]);

  if (!elapsed) return null;

  return (
    <p className="tabular mt-5 font-mono text-[13px] text-hobun-faint">
      {t("elapsedResultNote", { minutes: elapsed.minutes, seconds: elapsed.seconds })}
    </p>
  );
}
