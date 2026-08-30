"use client";

import { useState } from "react";

import type { EducationBand, GenderBand, RegionClass } from "@engine/cognitive-standardized/types";
import type { Locale } from "@/i18n/locale";

export interface ConsentChoice {
  readonly operationalStorage: true;
  readonly researchParticipation: boolean;
  readonly ageYears?: number;
  readonly genderBand?: GenderBand;
  readonly educationBand?: EducationBand;
  readonly regionClass?: RegionClass;
}

const GENDER_OPTIONS: readonly { readonly value: GenderBand; readonly ko: string; readonly en: string }[] = [
  { value: "female", ko: "여성", en: "Female" },
  { value: "male", ko: "남성", en: "Male" },
  { value: "self_described", ko: "직접 서술", en: "Self-described" },
  { value: "prefer_not_to_say", ko: "응답하지 않음", en: "Prefer not to say" },
];

const EDUCATION_OPTIONS: readonly { readonly value: EducationBand; readonly ko: string; readonly en: string }[] = [
  { value: "middle_school_or_below", ko: "중졸 이하", en: "Middle school or below" },
  { value: "high_school", ko: "고졸", en: "High school" },
  { value: "college_or_associate", ko: "전문대 재학·졸업", en: "College / associate degree" },
  { value: "bachelor", ko: "대졸", en: "Bachelor's degree" },
  { value: "graduate_or_above", ko: "대학원 이상", en: "Graduate degree or above" },
  { value: "prefer_not_to_say", ko: "응답하지 않음", en: "Prefer not to say" },
];

const REGION_OPTIONS: readonly { readonly value: RegionClass; readonly ko: string; readonly en: string }[] = [
  { value: "capital_region", ko: "수도권(서울·인천·경기)", en: "Capital region (Seoul/Incheon/Gyeonggi)" },
  { value: "chungcheong", ko: "충청권", en: "Chungcheong" },
  { value: "honam", ko: "호남권", en: "Honam" },
  { value: "yeongnam", ko: "영남권", en: "Yeongnam" },
  { value: "gangwon_jeju", ko: "강원·제주권", en: "Gangwon / Jeju" },
  { value: "overseas_or_unknown", ko: "해외 거주·기타", en: "Overseas / other" },
  { value: "prefer_not_to_say", ko: "응답하지 않음", en: "Prefer not to say" },
];

interface ResearchConsentProps {
  readonly onContinue: (choice: ConsentChoice) => void;
  readonly locale?: Locale;
  readonly disabled?: boolean;
  readonly disabledReason?: string;
}

export function ResearchConsent({ onContinue, locale = "ko", disabled = false, disabledReason }: ResearchConsentProps) {
  const [operationalStorage, setOperationalStorage] = useState(false);
  const [researchParticipation, setResearchParticipation] = useState(false);
  const [ageYears, setAgeYears] = useState("");
  const [genderBand, setGenderBand] = useState<GenderBand | "">("");
  const [educationBand, setEducationBand] = useState<EducationBand | "">("");
  const [regionClass, setRegionClass] = useState<RegionClass | "">("");
  const korean = locale === "ko";

  function submit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!operationalStorage || disabled) return;
    const parsedAge = researchParticipation && ageYears !== "" ? Number(ageYears) : undefined;
    onContinue({
      operationalStorage: true,
      researchParticipation,
      ...(parsedAge === undefined ? {} : { ageYears: parsedAge }),
      ...(researchParticipation && genderBand !== "" ? { genderBand } : {}),
      ...(researchParticipation && educationBand !== "" ? { educationBand } : {}),
      ...(researchParticipation && regionClass !== "" ? { regionClass } : {}),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5 border border-ink-700 p-5">
      <div>
        <h2 className="text-lg text-hobun">{korean ? "검사 진행 전 동의" : "Before you begin"}</h2>
        <p className="mt-2 text-sm leading-relaxed text-hobun-dim">
          {korean
            ? "검사 진행을 위해 답변과 진행 상태를 익명 계정에 저장합니다. 연구 참여는 선택 사항입니다."
            : "Your answers and progress are stored under an anonymous account so you can resume. Research participation is optional."}
        </p>
      </div>
      <label className="flex min-h-11 items-start gap-3 text-sm text-hobun-dim">
        <input
          type="checkbox"
          name="operationalStorage"
          checked={operationalStorage}
          onChange={(event) => setOperationalStorage(event.target.checked)}
          className="mt-1 size-4 accent-hobun"
        />
        <span>
          {korean
            ? "익명 운영 저장(검사 진행에 필요)에 동의합니다."
            : "I agree to anonymous operational storage required to run this assessment."}
        </span>
      </label>
      <label className="flex min-h-11 items-start gap-3 text-sm text-hobun-dim">
        <input
          type="checkbox"
          name="researchParticipation"
          checked={researchParticipation}
          onChange={(event) => setResearchParticipation(event.target.checked)}
          className="mt-1 size-4 accent-hobun"
        />
        <span>
          {korean
            ? "비식별 연구 분석에 참여하는 데 동의합니다(선택)."
            : "I agree to de-identified research analysis (optional)."}
        </span>
      </label>
      <div className="space-y-2 border-l border-ink-700 pl-3">
        <label htmlFor="cognitive-age-years" className="block text-sm text-hobun-dim">
          {korean ? "만 나이 (연구 참여 시 선택)" : "Age in years (optional for research participation)"}
        </label>
        <select
          id="cognitive-age-years"
          name="ageYears"
          value={ageYears}
          onChange={(event) => setAgeYears(event.target.value)}
          disabled={!researchParticipation}
          className="min-h-11 w-full border border-ink-600 bg-ink-950 px-3 text-sm text-hobun disabled:cursor-not-allowed disabled:opacity-45 sm:max-w-xs"
          aria-describedby="cognitive-age-note"
        >
          <option value="">{korean ? "선택하지 않음" : "Prefer not to say"}</option>
          {Array.from({ length: 47 }, (_, index) => index + 18).map((age) => (
            <option key={age} value={age}>
              {korean ? `${age}세` : `${age} years`}
            </option>
          ))}
        </select>
        <p id="cognitive-age-note" className="text-xs leading-relaxed text-hobun-faint">
          {korean
            ? "연구 참여에 동의한 경우에만 규준화 연령대 산출을 위해 저장됩니다. 선택하지 않아도 검사를 진행할 수 있습니다."
            : "Only stored for norming when you opt into research. You can continue without selecting an age."}
        </p>
      </div>
      <div className="space-y-2 border-l border-ink-700 pl-3">
        <label htmlFor="cognitive-gender-band" className="block text-sm text-hobun-dim">
          {korean ? "성별 (연구 참여 시 선택)" : "Gender (optional for research participation)"}
        </label>
        <select
          id="cognitive-gender-band"
          value={genderBand}
          onChange={(event) => setGenderBand(event.target.value as GenderBand | "")}
          disabled={!researchParticipation}
          className="min-h-11 w-full border border-ink-600 bg-ink-950 px-3 text-sm text-hobun disabled:cursor-not-allowed disabled:opacity-45 sm:max-w-xs"
        >
          <option value="">{korean ? "선택하지 않음" : "Prefer not to say"}</option>
          {GENDER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {korean ? option.ko : option.en}
            </option>
          ))}
        </select>

        <label htmlFor="cognitive-education-band" className="mt-3 block text-sm text-hobun-dim">
          {korean ? "최종 학력 (연구 참여 시 선택)" : "Education (optional for research participation)"}
        </label>
        <select
          id="cognitive-education-band"
          value={educationBand}
          onChange={(event) => setEducationBand(event.target.value as EducationBand | "")}
          disabled={!researchParticipation}
          className="min-h-11 w-full border border-ink-600 bg-ink-950 px-3 text-sm text-hobun disabled:cursor-not-allowed disabled:opacity-45 sm:max-w-xs"
        >
          <option value="">{korean ? "선택하지 않음" : "Prefer not to say"}</option>
          {EDUCATION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {korean ? option.ko : option.en}
            </option>
          ))}
        </select>

        <label htmlFor="cognitive-region-class" className="mt-3 block text-sm text-hobun-dim">
          {korean ? "거주 권역 (연구 참여 시 선택)" : "Region (optional for research participation)"}
        </label>
        <select
          id="cognitive-region-class"
          value={regionClass}
          onChange={(event) => setRegionClass(event.target.value as RegionClass | "")}
          disabled={!researchParticipation}
          className="min-h-11 w-full border border-ink-600 bg-ink-950 px-3 text-sm text-hobun disabled:cursor-not-allowed disabled:opacity-45 sm:max-w-xs"
        >
          <option value="">{korean ? "선택하지 않음" : "Prefer not to say"}</option>
          {REGION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {korean ? option.ko : option.en}
            </option>
          ))}
        </select>
        <p className="text-xs leading-relaxed text-hobun-faint">
          {korean
            ? "성별·학력·지역은 규준 층화 표본 구성을 위한 것으로, 연구 참여에 동의한 경우에만 저장됩니다."
            : "Gender, education, and region are used only to build the stratified norming sample, and are stored only when you opt into research."}
        </p>
      </div>
      <button
        type="submit"
        disabled={!operationalStorage || disabled}
        className="min-h-11 bg-hobun px-5 py-2 text-sm font-medium text-ink-900 transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {korean ? "계속" : "Continue"}
      </button>
      {disabled && disabledReason !== undefined && (
        <p role="alert" className="border-l border-hwa pl-3 text-sm leading-relaxed text-hobun">
          {disabledReason}
        </p>
      )}
    </form>
  );
}
