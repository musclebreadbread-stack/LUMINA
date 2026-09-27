"use client";

import { useState } from "react";
import { z } from "zod";
import { intlLocale, type Locale } from "@/i18n/locale";

const createdShareSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  expiresAt: z.string().datetime(),
}).strict();

export interface SavedReportForSharing {
  readonly id: string;
  readonly analysisKey: string;
  readonly completedAt: string;
  readonly locale: Locale;
}

export interface ShareLinkForManagement {
  readonly id: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly revokedAt: string | null;
}

export function ShareSavedResults({
  locale,
  savedResults,
  initialShareLinks,
}: {
  readonly locale: Locale;
  readonly savedResults: readonly SavedReportForSharing[];
  readonly initialShareLinks: readonly ShareLinkForManagement[];
}) {
  const [shareLinks, setShareLinks] = useState(initialShareLinks);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const text = locale !== "ko"
    ? {
        title: "Share a saved report",
        empty: "Save a result to your account before creating a share link.",
        create: "Create a 12 month link",
        sharing: "Creating…",
        linkCreated: "The link is ready. Anyone with it can view this report until it expires or you revoke it.",
        links: "Share links",
        revoke: "Revoke",
        revoked: "Revoked",
        issued: "Issued",
        unavailable: "The share link could not be created. Please try again.",
        revokeFailed: "The link could not be revoked. Please try again.",
      }
    : {
        title: "저장한 리포트 공유",
        empty: "계정에 결과를 저장한 뒤 공유 링크를 만들 수 있습니다.",
        create: "12개월 공유 링크 만들기",
        sharing: "만드는 중…",
        linkCreated: "링크가 준비됐습니다. 링크를 가진 사람은 만료되거나 해지될 때까지 이 리포트를 볼 수 있습니다.",
        links: "공유 링크 관리",
        revoke: "해지",
        revoked: "해지됨",
        issued: "발급 기록",
        unavailable: "공유 링크를 만들지 못했습니다. 다시 시도해 주세요.",
        revokeFailed: "링크를 해지하지 못했습니다. 다시 시도해 주세요.",
      };

  async function createLink(snapshotId: string) {
    setWorkingId(snapshotId);
    setMessage(null);
    setCreatedUrl(null);
    try {
      const response = await fetch("/api/account/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshotId, locale }),
        cache: "no-store",
      });
      const payload: unknown = await response.json();
      const parsed = createdShareSchema.safeParse(payload);
      if (!response.ok || !parsed.success) throw new Error("Share link creation failed");
      setCreatedUrl(parsed.data.url);
      setShareLinks((current) => [
        {
          id: parsed.data.id,
          createdAt: new Date().toISOString(),
          expiresAt: parsed.data.expiresAt,
          revokedAt: null,
        },
        ...current,
      ]);
    } catch {
      setMessage(text.unavailable);
    } finally {
      setWorkingId(null);
    }
  }

  async function revokeLink(id: string) {
    setWorkingId(id);
    setMessage(null);
    try {
      const response = await fetch(`/api/account/share/${encodeURIComponent(id)}`, {
        method: "DELETE",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Share link revocation failed");
      setShareLinks((current) => current.map((link) => link.id === id
        ? { ...link, revokedAt: link.revokedAt ?? new Date().toISOString() }
        : link));
    } catch {
      setMessage(text.revokeFailed);
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <section className="mt-10 border-t border-ink-700 pt-8" aria-labelledby="account-share-title">
      <h2 id="account-share-title" className="text-lg font-medium text-hobun">{text.title}</h2>
      {savedResults.length === 0 ? (
        <p className="mt-3 text-sm text-hobun-dim">{text.empty}</p>
      ) : (
        <ul className="mt-4 divide-y divide-ink-800 border-y border-ink-800">
          {savedResults.map((result) => (
            <li key={result.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="text-sm text-hobun">{result.analysisKey}</p>
                <time className="mt-1 block font-mono text-xs text-hobun-faint" dateTime={result.completedAt}>
                  {new Date(result.completedAt).toLocaleDateString(intlLocale(locale))}
                </time>
              </div>
              <button
                type="button"
                disabled={workingId !== null}
                onClick={() => void createLink(result.id)}
                className="inline-flex min-h-11 items-center border border-ink-700 px-4 text-xs text-hobun-dim transition-colors hover:border-ink-600 hover:text-hobun disabled:opacity-50"
              >
                {workingId === result.id ? text.sharing : text.create}
              </button>
            </li>
          ))}
        </ul>
      )}

      {createdUrl ? (
        <div className="mt-5 border border-ink-700 p-4">
          <p className="text-sm leading-relaxed text-hobun-dim">{text.linkCreated}</p>
          <a className="mt-3 block break-all font-mono text-xs text-hobun underline underline-offset-4" href={createdUrl}>
            {createdUrl}
          </a>
        </div>
      ) : null}
      {message ? <p role="alert" className="mt-4 text-sm text-hwa">{message}</p> : null}

      {shareLinks.length > 0 ? (
        <div className="mt-8">
          <h3 className="text-sm font-medium text-hobun">{text.links}</h3>
          <ul className="mt-3 divide-y divide-ink-800 border-y border-ink-800">
            {shareLinks.map((link) => {
              const inactive = link.revokedAt !== null;
              return (
                <li key={link.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="text-xs text-hobun-dim">
                    <time dateTime={link.createdAt}>{new Date(link.createdAt).toLocaleDateString(intlLocale(locale))}</time>
                    <span className="mx-2 text-ink-600">·</span>
                    <time dateTime={link.expiresAt}>{new Date(link.expiresAt).toLocaleDateString(intlLocale(locale))}</time>
                    <span className="ml-2 text-hobun-faint">{link.revokedAt ? text.revoked : text.issued}</span>
                  </div>
                  {!inactive ? (
                    <button
                      type="button"
                      disabled={workingId !== null}
                      onClick={() => void revokeLink(link.id)}
                      className="inline-flex min-h-11 items-center border border-ink-700 px-4 text-xs text-hobun-dim hover:border-hwa hover:text-hwa disabled:opacity-50"
                    >
                      {workingId === link.id ? text.sharing : text.revoke}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
