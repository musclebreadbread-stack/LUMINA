"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useSyncExternalStore } from "react";
import { branchAt } from "@engine/saju";
import {
  DEFAULT_PROFILE,
  PLACES,
  clearProfile,
  getProfileServerSnapshot,
  getProfileSnapshot,
  saveProfile,
  subscribeProfile,
  type StoredProfile,
} from "@/lib/profile";
import { encodeProfile } from "@/lib/share";
import type { Locale } from "@/i18n/locale";

/**
 * 출생 정보 입력.
 *
 * 가입도 로그인도 없다. 값은 이 브라우저에만 남고, 분석은 URL에 담겨 전달된다.
 */

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const TIME_BLOCKS = Array.from({ length: 12 }, (_, index) => ({ index }));

const MONTH_NAMES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthLabel(m: number, locale: Locale): string {
  return locale === "en" ? MONTH_NAMES_EN[m - 1]! : `${m}월`;
}
function dayLabel(d: number, locale: Locale): string {
  return locale === "en" ? `${d}` : `${d}일`;
}
function hourLabel(h: number, locale: Locale): string {
  const padded = String(h).padStart(2, "0");
  return locale === "en" ? padded : `${padded}시`;
}
function minuteLabel(m: number, locale: Locale): string {
  const padded = String(m).padStart(2, "0");
  return locale === "en" ? padded : `${padded}분`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function branchIndexForHour(hour: number): number {
  return Math.floor(((hour + 1) % 24) / 2);
}

function branchStartHour(index: number): number {
  return index === 0 ? 23 : index * 2 - 1;
}

const fieldClass =
  "w-full border border-ink-700 bg-ink-850 px-3 py-2.5 font-mono text-sm text-hobun " +
  "transition-colors hover:border-ink-600 focus:border-hobun focus:outline-none";

const labelClass = "mb-2 block text-[13px] tracking-wide text-hobun-faint";

export function BirthForm() {
  const router = useRouter();
  const uid = useId();
  const t = useTranslations("birthForm");
  const locale = useLocale() as Locale;

  // 저장된 값은 React 바깥의 상태다. 구독해서 읽고, 편집 중에는 draft 가 우선한다.
  const stored = useSyncExternalStore(
    subscribeProfile,
    getProfileSnapshot,
    getProfileServerSnapshot,
  );
  const [draft, setDraft] = useState<StoredProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const profile = draft ?? stored ?? DEFAULT_PROFILE;
  const restored = stored !== null;

  const maxDay = useMemo(
    () => daysInMonth(profile.year, profile.month),
    [profile.year, profile.month],
  );
  const days = useMemo(() => Array.from({ length: maxDay }, (_, i) => i + 1), [maxDay]);

  function update(patch: Partial<StoredProfile>) {
    setError(null);
    const next = { ...profile, ...patch };
    const limit = daysInMonth(next.year, next.month);
    setDraft(next.day > limit ? { ...next, day: limit } : next);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (profile.year < 1900 || profile.year > 2100) {
      setError(t("yearRangeError"));
      return;
    }
    saveProfile(profile);
    router.push(`/r/${encodeProfile(profile)}`);
  }

  const timeUnknown = profile.hour === null;
  const selectedBranchIndex = branchIndexForHour(profile.hour ?? 12);

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {/* 태어난 날 */}
      <fieldset>
        <legend className={labelClass}>{t("dateLegend")}</legend>
        <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2">
          <label className="sr-only" htmlFor={`${uid}-year`}>
            {t("dateLegend")}
          </label>
          <input
            id={`${uid}-year`}
            type="number"
            inputMode="numeric"
            min={1900}
            max={2100}
            value={profile.year}
            onChange={(e) => update({ year: Number(e.target.value) })}
            className={fieldClass}
          />
          <label className="sr-only" htmlFor={`${uid}-month`}>
            {t("dateLegend")}
          </label>
          <select
            id={`${uid}-month`}
            value={profile.month}
            onChange={(e) => update({ month: Number(e.target.value) })}
            className={fieldClass}
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m, locale)}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor={`${uid}-day`}>
            {t("dateLegend")}
          </label>
          <select
            id={`${uid}-day`}
            value={profile.day}
            onChange={(e) => update({ day: Number(e.target.value) })}
            className={fieldClass}
          >
            {days.map((d) => (
              <option key={d} value={d}>
                {dayLabel(d, locale)}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Toggle
            options={[
              { value: "solar", label: t("solar") },
              { value: "lunar", label: t("lunar") },
            ]}
            value={profile.calendar}
            onChange={(v) => update({ calendar: v as "solar" | "lunar", isLeapMonth: false })}
          />
          {profile.calendar === "lunar" && (
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 border border-ink-700 px-3 text-xs text-hobun-dim">
              <input
                type="checkbox"
                checked={profile.isLeapMonth}
                onChange={(e) => update({ isLeapMonth: e.target.checked })}
                className="accent-hobun"
              />
              {t("leapMonth")}
            </label>
          )}
        </div>
      </fieldset>

      {/* 태어난 시각 */}
      <fieldset>
        <legend className={labelClass}>{t("timeLegend")}</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="sr-only" htmlFor={`${uid}-hour`}>
            {t("timeLegend")}
          </label>
          <select
            id={`${uid}-hour`}
            value={profile.hour ?? 12}
            disabled={timeUnknown}
            onChange={(e) => update({ hour: Number(e.target.value) })}
            className={`${fieldClass} disabled:opacity-35`}
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {hourLabel(h, locale)}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor={`${uid}-minute`}>
            {t("timeLegend")}
          </label>
          <select
            id={`${uid}-minute`}
            value={profile.minute ?? 0}
            disabled={timeUnknown}
            onChange={(e) => update({ minute: Number(e.target.value) })}
            className={`${fieldClass} disabled:opacity-35`}
          >
            {MINUTES.map((m) => (
              <option key={m} value={m}>
                {minuteLabel(m, locale)}
              </option>
            ))}
          </select>
        </div>
        <label className="mt-2 inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 border border-ink-700 px-3 text-xs text-hobun-dim">
          <input
            type="checkbox"
            checked={timeUnknown}
            onChange={(e) =>
              update(e.target.checked ? { hour: null, minute: null } : { hour: 12, minute: 0 })
            }
            className="accent-hobun"
          />
          {t("timeUnknown")}
        </label>
        <div
          className="time-dial mt-5 grid grid-cols-4 gap-2 sm:grid-cols-6"
          aria-label={t("timeLegend")}
        >
          {TIME_BLOCKS.map(({ index }) => {
            const branch = branchAt(index);
            const selected = !timeUnknown && selectedBranchIndex === index;
            const start = branchStartHour(index);
            return (
              <button
                key={branch.en}
                type="button"
                disabled={timeUnknown}
                aria-pressed={selected}
                onClick={() => update({ hour: start, minute: 0 })}
                className={`time-dial-node min-h-12 border px-2 py-2 text-center transition-[border-color,background,transform,opacity] duration-300 disabled:cursor-not-allowed disabled:opacity-35 ${
                  selected
                    ? "border-hobun bg-hobun/12 text-hobun"
                    : "border-ink-700 text-hobun-faint hover:-translate-y-0.5 hover:border-ink-600"
                }`}
              >
                <span className="block font-hanja text-base leading-none">{branch.hanja}</span>
                <span className="mt-1 block text-[12px]">
                  {locale === "en" ? branch.en : branch.ko}
                </span>
                <span className="mt-0.5 block font-mono text-[10px] text-hobun-faint">
                  {locale === "en" ? branch.zodiacEn : branch.zodiacKo}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-hobun-faint">
          {timeUnknown
            ? t("timeUnknownNote")
            : `${locale === "en" ? branchAt(selectedBranchIndex).zodiacEn : branchAt(selectedBranchIndex).zodiacKo} · ${hourLabel(profile.hour ?? 12, locale)}`}
        </p>
      </fieldset>

      {/* 일주 경계 방식 */}
      <fieldset>
        <legend className={labelClass}>{t("dayBoundaryLabel")}</legend>
        <Toggle
          options={[
            { value: "zi23", label: t("dayBoundaryZi23") },
            { value: "midnight", label: t("dayBoundaryMidnight") },
          ]}
          value={profile.dayBoundaryRule}
          onChange={(v) => update({ dayBoundaryRule: v as StoredProfile["dayBoundaryRule"] })}
        />
        <p className="mt-2 text-[13px] leading-relaxed text-hobun-faint">
          {t("dayBoundaryNote")}
        </p>
      </fieldset>

      {/* 태어난 곳 · 성별 */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor={`${uid}-place`}>
            {t("placeLabel")}
          </label>
          <select
            id={`${uid}-place`}
            value={profile.placeLabel}
            onChange={(e) => {
              const place = PLACES.find((p) => p.label === e.target.value);
              if (place) {
                update({
                  placeLabel: place.label,
                  lat: place.lat,
                  lng: place.lng,
                  timeZone: place.timeZone,
                });
              }
            }}
            className={fieldClass}
          >
            {PLACES.map((p) => (
              <option key={p.label} value={p.label}>
                {locale === "en" ? p.labelEn : p.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-[13px] text-hobun-faint">{t("placeNote")}</p>
        </div>

        <div>
          <span className={labelClass}>{t("genderLabel")}</span>
          <Toggle
            full
            options={[
              { value: "male", label: t("genderMale") },
              { value: "female", label: t("genderFemale") },
              { value: "unspecified", label: t("genderUnspecified") },
            ]}
            value={profile.gender}
            onChange={(v) => update({ gender: v as StoredProfile["gender"] })}
          />
          <p className="mt-2 text-[13px] text-hobun-faint">{t("genderNote")}</p>
        </div>
      </div>

      {error && (
        <p role="alert" className="border-l border-hwa pl-3 text-xs text-hobun">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="submit"
          className="bg-hobun px-6 py-3 text-sm font-medium text-ink-900 transition-opacity hover:opacity-85"
        >
          {t("submit")}
        </button>
        {restored && (
          <button
            type="button"
            onClick={() => {
              clearProfile();
              setDraft(DEFAULT_PROFILE);
            }}
            className="border border-ink-700 px-4 py-3 text-xs text-hobun-dim transition-colors hover:border-ink-600 hover:text-hobun"
          >
            {t("clearProfile")}
          </button>
        )}
      </div>

      {restored && (
        <p className="font-mono text-[13px] text-hobun-faint">{t("restoredNote")}</p>
      )}
    </form>
  );
}

function Toggle({
  options,
  value,
  onChange,
  full,
}: {
  readonly options: readonly { readonly value: string; readonly label: string }[];
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly full?: boolean;
}) {
  return (
    <div className={`flex gap-px ${full ? "w-full" : "w-fit"}`} role="group">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`${full ? "flex-1" : ""} inline-flex min-h-11 items-center justify-center border px-4 text-xs transition-colors ${
              active
                ? "border-hobun bg-hobun text-ink-900"
                : "border-ink-700 text-hobun-dim hover:border-ink-600 hover:text-hobun"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
