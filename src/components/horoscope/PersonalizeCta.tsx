"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useSyncExternalStore } from "react";
import {
  getProfileServerSnapshot,
  getProfileSnapshot,
  hydrationStore,
  subscribeProfile,
} from "@/lib/profile";
import { establishReportSession } from "@/lib/reportSession.client";
import { localePath, type Locale } from "@/i18n/locale";

export function PersonalizeCta() {
  const router = useRouter();
  const locale = useLocale() as Locale;
  const t = useTranslations("horoscopeReading");
  const [working, setWorking] = useState(false);
  const [failed, setFailed] = useState(false);
  const hydrated = useSyncExternalStore(
    hydrationStore.subscribe,
    hydrationStore.getSnapshot,
    hydrationStore.getServerSnapshot,
  );
  const profile = useSyncExternalStore(
    subscribeProfile,
    getProfileSnapshot,
    getProfileServerSnapshot,
  );

  if (!hydrated) return null;

  async function openPersonalizedReport(): Promise<void> {
    if (!profile || working) return;
    setWorking(true);
    setFailed(false);
    const ready = await establishReportSession({ kind: "birth", profile });
    if (!ready) {
      setWorking(false);
      setFailed(true);
      return;
    }
    router.push("/r/current/today");
  }

  return (
    <div className="border border-ink-700 bg-ink-850/60 p-5">
      <p className="text-sm text-hobun">{t("personalizeTitle")}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-hobun-faint">{t("personalizeBody")}</p>
      {profile ? (
        <button
          type="button"
          disabled={working}
          onClick={() => void openPersonalizedReport()}
          className="mt-4 inline-flex min-h-11 items-center border border-hobun px-4 text-xs text-hobun transition-colors hover:bg-hobun hover:text-ink-900 disabled:opacity-50"
        >
          {working ? t("submitting") : t("personalizeCta")}
        </button>
      ) : (
        <Link
        href={localePath("/", locale)}
          className="mt-4 inline-flex min-h-11 items-center border border-hobun px-4 text-xs text-hobun transition-colors hover:bg-hobun hover:text-ink-900"
        >
          {t("personalizeStart")}
        </Link>
      )}
      {failed ? <p role="alert" className="mt-3 text-xs text-hwa">{t("profileSessionError")}</p> : null}
    </div>
  );
}
