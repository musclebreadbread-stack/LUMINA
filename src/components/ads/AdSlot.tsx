"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  getConsentServerSnapshot,
  getConsentSnapshot,
  subscribeConsent,
} from "@/lib/consent";
import { readAdSenseClient, readAdSenseSlotId } from "@/lib/adsense";

/**
 * 광고 한 자리.
 *
 * 게시자 ID(NEXT_PUBLIC_ADSENSE_CLIENT)와 광고 단위 ID(NEXT_PUBLIC_ADSENSE_SLOT_ID)가
 * 둘 다 유효하지 않으면 완전히 아무것도 렌더하지 않는다 —
 * DOM에 흔적이 없으니 레이아웃 이동(CLS)도 없다. 지금 이 코드베이스는 실제 AdSense
 * 계정이 없어 이 상태로 배포된다. 사용자가 실제 게시자 ID와 슬롯 ID를 환경변수로
 * 넣고 다시 빌드하면 코드 변경 없이 광고가 켜진다. `slot`은 배치 이름이고,
 * AdSense가 요구하는 숫자 광고 단위 ID는 환경변수 하나를 모든 배치가 공유한다.
 *
 * 켜졌을 때는 고정 높이 컨테이너를 먼저 그려 그 자리를 예약한다 — 광고 iframe이
 * 늦게 로드돼도 주변 레이아웃이 밀리지 않는다.
 *
 * 동의를 거부하면 비개인화 광고(data-npa="1")를 요청한다. 아직 선택하지 않았다면
 * 광고 자체를 요청하지 않는다.
 */
export function AdSlot({
  slot,
  height = 250,
  label,
}: {
  readonly slot: string;
  readonly height?: number;
  readonly label: string;
}) {
  const client = readAdSenseClient(process.env.NEXT_PUBLIC_ADSENSE_CLIENT);
  const adUnitId = readAdSenseSlotId(process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID);
  const consent = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getConsentServerSnapshot,
  );
  const pushed = useRef(false);

  useEffect(() => {
    if (!client || !adUnitId || consent === null || pushed.current) return;
    const win = window as typeof window & { adsbygoogle?: unknown[] };
    try {
      win.adsbygoogle = win.adsbygoogle ?? [];
      win.adsbygoogle.push({});
      pushed.current = true;
    } catch {
      /* AdSense 스크립트가 아직 로드되지 않았을 뿐이다 — 조용히 넘어간다. */
    }
  }, [client, adUnitId, consent]);

  if (!client || !adUnitId || consent === null) return null;

  return (
    <div
      aria-label={label}
      data-ad-placement={slot}
      className="no-print flex items-center justify-center overflow-hidden border border-ink-800"
      style={{ minHeight: height }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: "100%", height }}
        data-ad-client={client}
        data-ad-slot={adUnitId}
        data-ad-format="auto"
        data-full-width-responsive="true"
        data-npa={consent === "rejected" ? "1" : undefined}
      />
    </div>
  );
}
