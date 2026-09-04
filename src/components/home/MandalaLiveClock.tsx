"use client";

import { useEffect, useState } from "react";

const KST_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** 서버가 만든 "yyyy-MM-dd HH:mm:ss"와 같은 형식으로 맞춘다 — 로케일/브라우저에 따라
 *  구분자가 달라지는 toLocaleString 대신 formatToParts로 직접 조립한다. */
function formatNowKst(): string {
  const parts = KST_FORMATTER.formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

/**
 * 만다라 중앙의 "지금 이 순간" 시각. 서버가 렌더링한 시각으로 시작해서, 수화 뒤에는
 * 1초마다 다시 계산해 분이 바뀔 때 실제로 갱신되게 한다. 사주팔자(시주·일주 등)는
 * 두 시간·하루 단위로만 바뀌므로 여기서 다시 계산하지 않고 페이지의 60초 ISR
 * 캐시에 맡긴다 — 시계 문자열만 살아있으면 된다.
 */
export function MandalaLiveClock({ initialClock }: { readonly initialClock: string }) {
  const [clock, setClock] = useState(initialClock);

  useEffect(() => {
    const tick = () => setClock((prev) => {
      const next = formatNowKst();
      return next === prev ? prev : next;
    });
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return <span className="mt-3 block font-mono text-[11px] text-hobun-dim">{clock} KST</span>;
}
