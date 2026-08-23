"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * 서버는 UTC 오늘을 기본값으로 그린다. 하지만 자정은 보는 사람의 시간대 기준으로
 * 넘어가야 하므로, 이 컴포넌트가 마운트되자마자 방문자의 실제 로컬 날짜를 구해
 * 서버가 그린 날짜와 다르면 그 날짜로 조용히 바꿔 다시 부른다.
 *
 * 아무것도 그리지 않는다 — 자바스크립트가 늦거나 죽어도 화면에는 UTC 기준
 * "오늘"의 운세가 그대로 남는다. 틀린 화면이 아니라 약간 이를 수도 있는 화면일
 * 뿐이다.
 */
export function TodaySync({ serverDate }: { readonly serverDate: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const now = new Date();
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate(),
    ).padStart(2, "0")}`;

    if (localDate === serverDate) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("d", localDate);
    router.replace(`${pathname}?${params.toString()}`);
  }, [serverDate, router, pathname, searchParams]);

  return null;
}
