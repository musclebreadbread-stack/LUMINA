"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import {
  getProfileServerSnapshot,
  getProfileSnapshot,
  hydrationStore,
  subscribeProfile,
} from "@/lib/profile";
import { encodeProfile } from "@/lib/share";

/**
 * 주소에 결과가 없을 때 이 브라우저에 저장된 값으로 되살린다.
 * 저장된 값이 없으면 입력 화면으로 안내한다.
 * redirectSuffix: saju 는 "/r/<encoded>", astro 는 "/r/<encoded>/astro" 로 갈라진다.
 */
export function RestoreFromStorage({
  redirectSuffix = "",
}: { readonly redirectSuffix?: string } = {}) {
  const t = useTranslations("saju");
  const router = useRouter();
  const hydrated = useSyncExternalStore(
    hydrationStore.subscribe,
    hydrationStore.getSnapshot,
    hydrationStore.getServerSnapshot,
  );
  const stored = useSyncExternalStore(
    subscribeProfile,
    getProfileSnapshot,
    getProfileServerSnapshot,
  );

  // 라우터는 외부 시스템이므로 효과에서 갱신하는 것이 맞다.
  useEffect(() => {
    if (stored) router.replace(`/r/${encodeProfile(stored)}${redirectSuffix}`);
  }, [stored, router, redirectSuffix]);

  const checking = !hydrated || stored !== null;

  return (
    <div className="py-24 text-center">
      {checking ? (
        <p className="font-mono text-xs text-hobun-faint">{t("loading")}</p>
      ) : (
        <>
          <p className="text-sm text-hobun-dim">{t("emptyBody")}</p>
          <Link
            href="/"
            className="mt-6 inline-block bg-hobun px-6 py-3 text-sm font-medium text-ink-900 transition-opacity hover:opacity-85"
          >
            {t("emptyCta")}
          </Link>
        </>
      )}
    </div>
  );
}
