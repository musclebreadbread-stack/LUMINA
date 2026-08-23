"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState, useSyncExternalStore } from "react";
import {
  getProfileServerSnapshot,
  getProfileSnapshot,
  hydrationStore,
  subscribeProfile,
} from "@/lib/profile";

/**
 * 생년월일(필수) + 로마자 이름(선택)을 받아 결과 주소로 보낸다.
 * 서버에 저장하지 않는다 — 입력값이 곧 URL 이다.
 */

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

const fieldClass =
  "w-full border border-ink-700 bg-ink-850 px-3 py-2.5 font-mono text-sm text-hobun " +
  "transition-colors hover:border-ink-600 focus:border-hobun focus:outline-none";

const labelClass = "mb-2 block text-[13px] tracking-wide text-hobun-faint";

export function NumerologyForm() {
  const router = useRouter();
  const uid = useId();
  const t = useTranslations("numerology");
  const hydrated = useSyncExternalStore(
    hydrationStore.subscribe,
    hydrationStore.getSnapshot,
    hydrationStore.getServerSnapshot,
  );
  const storedProfile = useSyncExternalStore(
    subscribeProfile,
    getProfileSnapshot,
    getProfileServerSnapshot,
  );

  const [dateDraft, setDateDraft] = useState<
    Partial<Readonly<{ year: number; month: number; day: number }>>
  >({});
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const storedSolarProfile =
    hydrated && storedProfile?.calendar === "solar" ? storedProfile : null;
  const year = dateDraft.year ?? storedSolarProfile?.year ?? 1995;
  const month = dateDraft.month ?? storedSolarProfile?.month ?? 6;
  const day = dateDraft.day ?? storedSolarProfile?.day ?? 15;

  const maxDay = useMemo(() => daysInMonth(year, month), [year, month]);
  const days = useMemo(() => Array.from({ length: maxDay }, (_, i) => i + 1), [maxDay]);
  const traceDigits = useMemo(
    () => `${year}${String(month).padStart(2, "0")}${String(Math.min(day, maxDay)).padStart(2, "0")}`.split(""),
    [day, maxDay, month, year],
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (year < 1900 || year > 2100) {
      setError(t("yearRangeError"));
      return;
    }
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
      day: String(Math.min(day, maxDay)),
    });
    if (name.trim()) params.set("name", name.trim());
    router.push(`/numerology/result?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <fieldset>
        <legend className={labelClass}>{t("dateLegend")}</legend>
        <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2">
          <label className="sr-only" htmlFor={`${uid}-year`}>
            {t("yearLabel")}
          </label>
          <input
            id={`${uid}-year`}
            type="number"
            inputMode="numeric"
            min={1900}
            max={2100}
            value={year}
            onChange={(e) => setDateDraft((previous) => ({ ...previous, year: Number(e.target.value) }))}
            className={fieldClass}
          />
          <label className="sr-only" htmlFor={`${uid}-month`}>
            {t("monthLabel")}
          </label>
          <select
            id={`${uid}-month`}
            value={month}
            onChange={(e) => setDateDraft((previous) => ({ ...previous, month: Number(e.target.value) }))}
            className={fieldClass}
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {t("monthOptionFormat", { m })}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor={`${uid}-day`}>
            {t("dayLabel")}
          </label>
          <select
            id={`${uid}-day`}
            value={Math.min(day, maxDay)}
            onChange={(e) => setDateDraft((previous) => ({ ...previous, day: Number(e.target.value) }))}
            className={fieldClass}
          >
            {days.map((d) => (
              <option key={d} value={d}>
                {t("dayOptionFormat", { d })}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <div className="number-trace border border-ink-800 bg-ink-950/60 px-4 py-4" aria-label={t("traceLabel")}>
        <p className="font-mono text-[12px] tracking-[0.16em] text-hobun-faint">{t("traceLabel")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-hidden>
          {traceDigits.map((digit, index) => (
            <span key={`${digit}-${index}`} className="number-trace-digit tabular font-mono text-lg text-hobun">
              {digit}
            </span>
          ))}
          <span className="px-1 text-hobun-faint">→</span>
          <span className="number-trace-ring tabular font-mono text-lg text-hobun">Σ</span>
        </div>
      </div>

      <fieldset>
        <label className={labelClass} htmlFor={`${uid}-name`}>
          {t("nameLabel")}
        </label>
        <input
          id={`${uid}-name`}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          className={fieldClass}
        />
        <p className="mt-2 text-[13px] leading-relaxed text-hobun-faint">{t("nameNote")}</p>
      </fieldset>

      {error && (
        <p role="alert" className="border-l border-hwa pl-3 text-xs text-hobun">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="bg-hobun px-6 py-3 text-sm font-medium text-ink-900 transition-opacity hover:opacity-85"
      >
        {t("submit")}
      </button>
    </form>
  );
}
