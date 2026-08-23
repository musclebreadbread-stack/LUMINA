"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Gender } from "@engine/shared/birth";
import { DEFAULT_PROFILE, PLACES, type StoredProfile } from "@/lib/profile";
import { encodeProfile } from "@/lib/share";
import type { Locale } from "@/i18n/locale";

type PersonKey = "a" | "b";

const fieldClass =
  "w-full border border-ink-700 bg-ink-850 px-3 py-2.5 font-mono text-sm text-hobun " +
  "transition-colors hover:border-ink-600 focus:border-hobun focus:outline-none";
const labelClass = "mb-2 block text-[13px] tracking-wide text-hobun-faint";

function dateValue(profile: StoredProfile): string {
  return `${String(profile.year).padStart(4, "0")}-${String(profile.month).padStart(2, "0")}-${String(profile.day).padStart(2, "0")}`;
}

function timeValue(profile: StoredProfile): string {
  if (profile.hour === null || profile.minute === null) return "";
  return `${String(profile.hour).padStart(2, "0")}:${String(profile.minute).padStart(2, "0")}`;
}

function isValidDate(profile: StoredProfile): boolean {
  if (!Number.isInteger(profile.year) || profile.year < 1900 || profile.year > 2100) return false;
  if (!Number.isInteger(profile.month) || profile.month < 1 || profile.month > 12) return false;
  const days = new Date(Date.UTC(profile.year, profile.month, 0)).getUTCDate();
  return Number.isInteger(profile.day) && profile.day >= 1 && profile.day <= days;
}

function isValidTime(profile: StoredProfile): boolean {
  if (profile.hour === null && profile.minute === null) return true;
  return (
    profile.hour !== null &&
    profile.minute !== null &&
    Number.isInteger(profile.hour) &&
    profile.hour >= 0 &&
    profile.hour <= 23 &&
    Number.isInteger(profile.minute) &&
    profile.minute >= 0 &&
    profile.minute <= 59
  );
}

export function CompatibilityForm() {
  const router = useRouter();
  const locale = useLocale() as Locale;
  const t = useTranslations("compatibility");
  const [first, setFirst] = useState<StoredProfile>(DEFAULT_PROFILE);
  const [second, setSecond] = useState<StoredProfile>({ ...DEFAULT_PROFILE, day: 16 });
  const [error, setError] = useState<string | null>(null);

  function update(which: PersonKey, patch: Partial<StoredProfile>): void {
    const setter = which === "a" ? setFirst : setSecond;
    setter((current) => Object.freeze({ ...current, ...patch }));
    setError(null);
  }

  function updateDate(which: PersonKey, value: string): void {
    const [year, month, day] = value.split("-").map(Number);
    if ([year, month, day].every((item) => Number.isInteger(item))) {
      update(which, { year, month, day });
    }
  }

  function updateTime(which: PersonKey, value: string): void {
    if (!value) {
      update(which, { hour: null, minute: null });
      return;
    }
    const [hour, minute] = value.split(":").map(Number);
    if (Number.isInteger(hour) && Number.isInteger(minute)) update(which, { hour, minute });
  }

  function submit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!isValidDate(first) || !isValidDate(second)) {
      setError(t("invalidDate"));
      return;
    }
    if (!isValidTime(first) || !isValidTime(second)) {
      setError(t("invalidTime"));
      return;
    }
    router.push(`/compatibility/${encodeProfile(first)}/${encodeProfile(second)}`);
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <div className="grid gap-5 lg:grid-cols-2">
        <ProfileFields
          profile={first}
          title={t("personA")}
          locale={locale}
          t={t}
          onDateChange={(value) => updateDate("a", value)}
          onTimeChange={(value) => updateTime("a", value)}
          onPatch={(patch) => update("a", patch)}
        />
        <ProfileFields
          profile={second}
          title={t("personB")}
          locale={locale}
          t={t}
          onDateChange={(value) => updateDate("b", value)}
          onTimeChange={(value) => updateTime("b", value)}
          onPatch={(patch) => update("b", patch)}
        />
      </div>

      <p className="border-l border-ink-600 pl-4 text-[13px] leading-relaxed text-hobun-faint">
        {t("inputNote")}
      </p>
      {error ? <p role="alert" className="border-l border-hwa pl-4 text-sm text-hobun">{error}</p> : null}
      <button type="submit" className="bg-hobun px-6 py-3 text-sm font-medium text-ink-900 transition-opacity hover:opacity-85">
        {t("submit")}
      </button>
    </form>
  );
}

interface ProfileFieldsProps {
  readonly profile: StoredProfile;
  readonly title: string;
  readonly locale: Locale;
  readonly t: ReturnType<typeof useTranslations<"compatibility">>;
  readonly onDateChange: (value: string) => void;
  readonly onTimeChange: (value: string) => void;
  readonly onPatch: (patch: Partial<StoredProfile>) => void;
}

function ProfileFields({ profile, title, locale, t, onDateChange, onTimeChange, onPatch }: ProfileFieldsProps) {
  return (
    <fieldset className="border border-ink-700 bg-ink-900/55 p-5 sm:p-6">
      <legend className="px-2 text-lg font-medium text-hobun">{title}</legend>
      <div className="mt-2 space-y-5">
        <label className="block">
          <span className={labelClass}>{t("date")}</span>
          <input
            type="date"
            min="1900-01-01"
            max="2100-12-31"
            value={dateValue(profile)}
            onChange={(event) => onDateChange(event.target.value)}
            className={fieldClass}
          />
        </label>

        <label className="block">
          <span className={labelClass}>{t("time")}</span>
          <input
            type="time"
            value={timeValue(profile)}
            disabled={profile.hour === null}
            onChange={(event) => onTimeChange(event.target.value)}
            className={`${fieldClass} disabled:opacity-40`}
          />
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-hobun-dim">
          <input
            type="checkbox"
            checked={profile.hour === null}
            onChange={(event) => onPatch(event.target.checked ? { hour: null, minute: null } : { hour: 12, minute: 0 })}
            className="accent-hobun"
          />
          {t("timeUnknown")}
        </label>

        <label className="block">
          <span className={labelClass}>{t("place")}</span>
          <select
            value={profile.placeLabel}
            onChange={(event) => {
              const place = PLACES.find((candidate) => candidate.label === event.target.value);
              if (place) onPatch({ placeLabel: place.label, lat: place.lat, lng: place.lng, timeZone: place.timeZone });
            }}
            className={fieldClass}
          >
            {PLACES.map((place) => (
              <option key={place.label} value={place.label}>{locale === "en" ? place.labelEn : place.label}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={labelClass}>{t("gender")}</span>
          <select
            value={profile.gender}
            onChange={(event) => onPatch({ gender: event.target.value as Gender })}
            className={fieldClass}
          >
            <option value="unspecified">{t("genderUnspecified")}</option>
            <option value="male">{t("genderMale")}</option>
            <option value="female">{t("genderFemale")}</option>
          </select>
        </label>

        <div>
          <span className={labelClass}>{t("dayBoundary")}</span>
          <div className="flex gap-px" role="group">
            {([
              ["zi23", t("dayBoundaryZi23")],
              ["midnight", t("dayBoundaryMidnight")],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={profile.dayBoundaryRule === value}
                onClick={() => onPatch({ dayBoundaryRule: value })}
                className={`inline-flex min-h-11 flex-1 items-center justify-center border px-2 text-xs transition-colors ${profile.dayBoundaryRule === value ? "border-hobun bg-hobun text-ink-900" : "border-ink-700 text-hobun-dim hover:border-ink-600"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </fieldset>
  );
}
