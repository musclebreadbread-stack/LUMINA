"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

/**
 * 결과 공유.
 *
 * 링크에 입력값이 통째로 담겨 있어 서버에 저장할 것이 없다.
 * 같은 링크는 언제 열어도 같은 원국을 낸다.
 */

const buttonClass =
  "inline-flex min-h-11 items-center border border-ink-700 px-4 text-xs text-hobun-dim transition-colors " +
  "hover:border-ink-600 hover:text-hobun";

export function ShareBar({
  title,
  restartHref = "/",
  restartLabel,
}: {
  readonly title: string;
  readonly restartHref?: string;
  readonly restartLabel?: string;
}) {
  const t = useTranslations("common");
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 권한이 없으면 주소창을 쓰라고 알린다.
      setCopied(false);
    }
  }

  async function share() {
    if (!navigator.share) {
      void copyLink();
      return;
    }
    try {
      await navigator.share({ title, url: window.location.href });
    } catch {
      /* 사용자가 공유 시트를 닫은 경우 — 아무 일도 일어나지 않는다. */
    }
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <button type="button" onClick={share} className={buttonClass}>
        {t("share")}
      </button>
      <button type="button" onClick={copyLink} className={buttonClass}>
        {copied ? t("copyLinkDone") : t("copyLink")}
      </button>
      <button type="button" onClick={() => window.print()} className={buttonClass}>
        {t("savePdf")}
      </button>
      <Link href={restartHref} className={buttonClass}>
        {restartLabel ?? t("restartDefault")}
      </Link>
    </div>
  );
}
