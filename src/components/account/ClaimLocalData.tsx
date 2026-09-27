"use client";

import { useState } from "react";
import { clearProfile, getProfileSnapshot, type StoredProfile } from "@/lib/profile";
import { deleteAllPortraitSnapshots, listPortraitSnapshots } from "@/lib/integratedPortrait/vault.client";
import type { ResultSnapshotV1 } from "@/lib/integratedPortrait/contracts";
import type { Locale } from "@/i18n/locale";

type LocalClaimPreview = Readonly<{
  profile: StoredProfile | null;
  snapshots: readonly ResultSnapshotV1[];
}>;

const COPY = {
  ko: {
    title: "이 기기의 분석 자료 가져오기",
    intro: "프로필과 통합 리포트 스냅샷을 계정의 비공개 영역으로 암호화해 옮깁니다. 원본은 저장이 끝난 뒤 이 기기에서 지울 수 있습니다.",
    review: "가져올 자료 확인",
    profileFound: "저장된 출생 프로필 1개",
    noProfile: "저장된 출생 프로필 없음",
    snapshotCount: "통합 리포트 스냅샷 {count}개",
    consent: "이 자료를 내 계정에 저장하는 데 동의합니다.",
    save: "비공개로 저장",
    busy: "저장 중…",
    saved: "계정에 저장했습니다. 이 기기의 원본은 저장 성공 후 정리했습니다.",
    savedLocalRemain: "계정 저장은 완료됐지만 이 기기의 일부 원본을 지우지 못했습니다. 다시 시도하면 중복 없이 저장됩니다.",
    noData: "가져올 프로필이나 통합 리포트가 없습니다.",
    required: "계속하려면 자료 저장에 동의해 주세요.",
    error: "자료를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    consentError: "계정 동의를 다시 확인해야 합니다. 동의 화면으로 이동해 주세요.",
  },
  en: {
    title: "Bring this device's analysis data",
    intro: "Your profile and integrated report snapshots are encrypted in your private account area. You can clear the local copies after saving.",
    review: "Review local data",
    profileFound: "1 saved birth profile",
    noProfile: "No saved birth profile",
    snapshotCount: "{count} integrated report snapshots",
    consent: "I agree to save this data in my account.",
    save: "Save privately",
    busy: "Saving…",
    saved: "Saved to your account. Local copies were cleared after the save completed.",
    savedLocalRemain: "The account save completed, but some local copies could not be cleared. Retrying will not create duplicates.",
    noData: "There is no profile or integrated report to import.",
    required: "Agree to save the data before continuing.",
    error: "We couldn't save your data. Please try again shortly.",
    consentError: "Review your account consents before continuing.",
  },
} as const;

export function ClaimLocalData({ locale }: { locale: Locale }) {
  const copy = COPY[locale === "ko" ? "ko" : "en"];
  const [preview, setPreview] = useState<LocalClaimPreview | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function reviewLocalData() {
    setError("");
    setMessage("");
    try {
      const [vault, profile] = await Promise.all([listPortraitSnapshots(), Promise.resolve(getProfileSnapshot())]);
      setPreview({ profile, snapshots: vault.snapshots });
      setAccepted(false);
    } catch {
      setError(copy.error);
    }
  }

  async function saveLocalData() {
    if (!preview) return;
    if (!accepted) {
      setError(copy.required);
      return;
    }
    if (!preview.profile && preview.snapshots.length === 0) {
      setError(copy.noData);
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/account/claim-local-data", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true, profile: preview.profile, snapshots: preview.snapshots }),
      });
      if (response.status === 401 || response.status === 403) {
        setError(copy.consentError);
        return;
      }
      if (!response.ok) {
        setError(copy.error);
        return;
      }

      if (preview.profile) clearProfile();
      const vaultClear = preview.snapshots.length > 0 ? await deleteAllPortraitSnapshots() : null;
      const profileCleared = !preview.profile || getProfileSnapshot() === null;
      const snapshotsCleared = preview.snapshots.length === 0 || vaultClear?.ok === true;
      setMessage(profileCleared && snapshotsCleared ? copy.saved : copy.savedLocalRemain);
      setPreview(null);
      setAccepted(false);
    } catch {
      setError(copy.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10 border border-ink-700 bg-ink-900/30 p-5 sm:p-6" aria-labelledby="claim-local-data-title">
      <h2 id="claim-local-data-title" className="text-lg font-medium text-hobun">{copy.title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-hobun-dim">{copy.intro}</p>

      {!preview ? (
        <button
          className="theme-control mt-5 min-h-11 border border-ink-700 px-4 text-sm text-hobun hover:border-hobun-faint"
          disabled={busy}
          onClick={() => void reviewLocalData()}
          type="button"
        >
          {copy.review}
        </button>
      ) : (
        <div className="mt-5 space-y-4">
          <ul className="space-y-2 text-sm text-hobun-dim">
            <li>{preview.profile ? copy.profileFound : copy.noProfile}</li>
            <li>{copy.snapshotCount.replace("{count}", String(preview.snapshots.length))}</li>
          </ul>
          <label className="flex min-h-11 items-start gap-3 text-sm leading-relaxed text-hobun-dim">
            <input
              checked={accepted}
              className="mt-1 size-4 accent-hobun"
              onChange={(event) => setAccepted(event.currentTarget.checked)}
              type="checkbox"
            />
            <span>{copy.consent}</span>
          </label>
          <button
            className="theme-control min-h-11 border border-hobun bg-hobun px-4 text-sm font-medium text-ink-900 disabled:cursor-wait disabled:opacity-60"
            disabled={busy}
            onClick={() => void saveLocalData()}
            type="button"
          >
            {busy ? copy.busy : copy.save}
          </button>
        </div>
      )}

      <div className="mt-4 min-h-6 text-sm" aria-live="polite">
        {error && <p className="text-red-300" role="alert">{error}</p>}
        {!error && message && <p className="text-hobun-dim" role="status">{message}</p>}
      </div>
    </section>
  );
}
