"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import {
  getProfileServerSnapshot,
  getProfileSnapshot,
  hydrationStore,
  subscribeProfile,
} from "@/lib/profile";
import { encodeProfile } from "@/lib/share";

export function PersonalizeCta() {
  const t = useTranslations("horoscopeReading");
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

  return (
    <div className="border border-ink-700 bg-ink-850/60 p-5">
      <p className="text-sm text-hobun">{t("personalizeTitle")}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-hobun-faint">{t("personalizeBody")}</p>
      <Link
        href={profile ? `/r/${encodeProfile(profile)}/today` : "/"}
        className="mt-4 inline-flex min-h-11 items-center border border-hobun px-4 text-xs text-hobun transition-colors hover:bg-hobun hover:text-ink-900"
      >
        {profile ? t("personalizeCta") : t("personalizeStart")}
      </Link>
    </div>
  );
}
