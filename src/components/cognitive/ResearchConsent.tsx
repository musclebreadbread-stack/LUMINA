"use client";

import { useState } from "react";

import type { Locale } from "@/i18n/locale";

export interface ConsentChoice {
  readonly operationalStorage: true;
  readonly researchParticipation: boolean;
}

interface ResearchConsentProps {
  readonly onContinue: (choice: ConsentChoice) => void;
  readonly locale?: Locale;
}

export function ResearchConsent({ onContinue, locale = "ko" }: ResearchConsentProps) {
  const [operationalStorage, setOperationalStorage] = useState(false);
  const [researchParticipation, setResearchParticipation] = useState(false);
  const korean = locale === "ko";

  function submit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!operationalStorage) return;
    onContinue({ operationalStorage: true, researchParticipation });
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
      <button
        type="submit"
        disabled={!operationalStorage}
        className="min-h-11 bg-hobun px-5 py-2 text-sm font-medium text-ink-900 transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {korean ? "계속" : "Continue"}
      </button>
    </form>
  );
}
