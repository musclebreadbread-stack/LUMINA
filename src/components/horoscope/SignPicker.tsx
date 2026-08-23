"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";
import { CHINESE_SIGNS, ZODIAC_SIGNS } from "@engine/horoscope/constants";
import type { Locale } from "@/i18n/locale";
import { assetPath } from "@/lib/assets";
import { MotionSafeImage } from "@/components/ui/MotionSafeImage";
import {
  getProfileServerSnapshot,
  getProfileSnapshot,
  hydrationStore,
  subscribeProfile,
  toBirthInput,
  type StoredProfile,
} from "@/lib/profile";
import { encodeProfile } from "@/lib/share";

interface DerivedSignState {
  readonly profile: StoredProfile;
  readonly zodiac: string;
  readonly chinese: string;
}

const TABS = [
  { key: "zodiac" as const, labelKey: "tabZodiac" as const, signs: ZODIAC_SIGNS },
  { key: "chinese" as const, labelKey: "tabChinese" as const, signs: CHINESE_SIGNS },
];

export function SignPicker() {
  const [tab, setTab] = useState<"zodiac" | "chinese">("zodiac");
  const [selectedKey, setSelectedKey] = useState(ZODIAC_SIGNS[0]?.key ?? "aries");
  const t = useTranslations("horoscope");
  const tReading = useTranslations("horoscopeReading");
  const locale = useLocale() as Locale;
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
  const [derivedSigns, setDerivedSigns] = useState<DerivedSignState | null>(null);

  useEffect(() => {
    if (!hydrated || !profile) return;

    let cancelled = false;
    const input = toBirthInput(profile);

    void Promise.all([
      import("@engine/astro"),
      import("@engine/saju/lunar"),
      import("@engine/saju/pillars"),
      import("@engine/saju/solarTerms"),
      import("@engine/shared/time"),
    ])
      .then(([astro, lunar, pillars, solarTerms, time]) => {
        if (cancelled) return;

        const chart = astro.computeChart(input);
        const zodiac = ZODIAC_SIGNS.find((sign) => sign.en === chart.bigThree.sun.en);
        const solar =
          input.calendar === "lunar"
            ? lunar.lunarToSolar(input.date.year, input.date.month, input.date.day, input.isLeapMonth ?? false)
            : input.date;
        const resolved = time.resolveInstant(
          solar,
          input.time ?? { hour: 12, minute: 0 },
          profile.timeZone,
        );
        const year = pillars.yearPillar(solarTerms.sajuYearOf(resolved.instant));
        const chinese = CHINESE_SIGNS[year.branch];

        if (zodiac && chinese) {
          setDerivedSigns({ profile, zodiac: zodiac.key, chinese: chinese.key });
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [hydrated, profile]);

  const active = TABS.find((tb) => tb.key === tab)!;
  const selected = active.signs.find((sign) => sign.key === selectedKey) ?? active.signs[0]!;
  const selectedName = locale === "en" ? selected.en : selected.ko;
  const selectedImage = assetPath(
    selected.system === "zodiac" ? "horoscope/zodiac" : "saju/zodiac",
    selected.key,
  );
  const currentDerivedSigns = derivedSigns?.profile === profile ? derivedSigns : null;

  return (
    <div>
      <div className="flex gap-px" role="tablist">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            type="button"
            role="tab"
            aria-selected={tb.key === tab}
            onClick={() => {
              setTab(tb.key);
              setSelectedKey(tb.signs[0]?.key ?? "");
            }}
            className={`inline-flex min-h-11 items-center border px-4 text-xs transition-colors ${
              tb.key === tab
                ? "border-hobun bg-hobun text-ink-900"
                : "border-ink-700 text-hobun-dim hover:border-ink-600"
            }`}
          >
            {t(tb.labelKey)}
          </button>
        ))}
      </div>

      {hydrated && profile ? (
        <Link
          href={`/r/${encodeProfile(profile)}/today`}
          className="mt-4 block border border-hobun/50 px-4 py-3 text-center text-xs text-hobun transition-colors hover:bg-hobun hover:text-ink-900"
        >
          {tReading("personalizeCta")}
        </Link>
      ) : null}

      <div className="horoscope-preview mt-5 grid items-center gap-5 rounded-[1.25rem] border border-ink-700 bg-ink-950/75 p-4 sm:grid-cols-[110px_1fr] sm:p-5">
        <div className="relative mx-auto aspect-[2/3] w-24 overflow-hidden rounded-xl border border-ink-700 bg-ink-900 shadow-[0_18px_35px_-24px_rgba(0,0,0,0.95)]">
          <MotionSafeImage
            src={selectedImage}
            alt={selectedName}
            sizes="96px"
            className="object-cover"
            fallbackLabel={selectedName}
          />
        </div>
        <div>
          <p className="font-mono text-[12px] tracking-[0.16em] text-hobun-faint">{t("previewLabel")}</p>
          <p className="mt-2 flex items-center gap-2 text-xl font-medium text-hobun">
            <span aria-hidden>{selected.symbol}</span>
            {selectedName}
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-hobun-dim">
            {t("sectionPick")} · {t(selected.system === "zodiac" ? "tabZodiac" : "tabChinese")}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {active.signs.map((sign) => (
          <Link
            key={sign.key}
            href={`/horoscope/${sign.system}/${sign.key}`}
            aria-current={
              currentDerivedSigns?.[sign.system === "zodiac" ? "zodiac" : "chinese"] === sign.key
                ? "true"
                : undefined
            }
            className={`flex flex-col items-center gap-2 border bg-ink-850/60 px-3 py-5 text-center transition-colors hover:border-ink-600 ${
              currentDerivedSigns?.[sign.system === "zodiac" ? "zodiac" : "chinese"] === sign.key
                ? "border-hobun bg-hobun/10"
                : "border-ink-700"
            }`}
            onMouseEnter={() => setSelectedKey(sign.key)}
            onFocus={() => setSelectedKey(sign.key)}
            /* 터치·펜 입력에서는 mouseenter 가 없다 — 포인터가 닿는 순간에도
               미리보기가 그 별자리로 바뀌도록 한다. */
            onPointerDown={() => setSelectedKey(sign.key)}
          >
            {sign.system === "zodiac" ? (
              <span className="relative h-10 w-[27px] overflow-hidden border border-ink-700">
                <Image
                  src={assetPath("horoscope/zodiac", sign.key)}
                  alt=""
                  aria-hidden
                  fill
                  sizes="27px"
                  className="object-cover"
                />
              </span>
            ) : (
              <span className="text-xl text-hobun-dim">{sign.symbol}</span>
            )}
            <span className="text-sm text-hobun">{locale === "en" ? sign.en : sign.ko}</span>
            {currentDerivedSigns?.[sign.system === "zodiac" ? "zodiac" : "chinese"] === sign.key ? (
              <span className="font-mono text-[10px] tracking-wide text-hobun-faint">
                {t("recommendedSign")}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
