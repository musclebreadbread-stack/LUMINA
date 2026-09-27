"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { narrativeOutputSchema, type NarrativeOutput } from "@/lib/aiNarrativeSchema";
import type { Locale } from "@/i18n/locale";

const requestResultSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["queued", "processing", "succeeded", "fallback"]),
});

const pollResultSchema = z.object({
  status: z.enum(["queued", "processing", "succeeded", "fallback"]),
  output: narrativeOutputSchema.nullable(),
});

type PanelStatus = "idle" | "loading" | "queued" | "processing" | "succeeded" | "fallback" | "error";

const sectionTitles = Object.freeze({
  ko: {
    annual: "종합 해설",
    work: "일과 자원",
    relationships: "관계",
    wellbeing: "몸과 리듬",
    growth: "배움과 성장",
    monthly: "월별 코멘트",
  },
  en: {
    annual: "Overall reflection",
    work: "Work and resources",
    relationships: "Relationships",
    wellbeing: "Wellbeing and rhythm",
    growth: "Learning and growth",
    monthly: "Monthly notes",
  },
});

export function NarrativeChapters({ locale }: Readonly<{ locale: Locale }>) {
  const [status, setStatus] = useState<PanelStatus>("idle");
  const [narrativeId, setNarrativeId] = useState<string | null>(null);
  const [output, setOutput] = useState<NarrativeOutput | null>(null);
  const english = locale !== "ko";

  useEffect(() => {
    if (!narrativeId || (status !== "queued" && status !== "processing")) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const response = await fetch(`/api/premium/saju-2027/narrative?id=${encodeURIComponent(narrativeId)}`, {
          cache: "no-store",
          headers: { accept: "application/json" },
        });
        const body: unknown = await response.json().catch(() => null);
        const parsed = pollResultSchema.safeParse(body);
        if (!response.ok || !parsed.success) throw new Error("narrative_status_unavailable");
        if (cancelled) return;
        setStatus(parsed.data.status);
        setOutput(parsed.data.output);
        if (parsed.data.status === "queued" || parsed.data.status === "processing") {
          timer = setTimeout(() => { void poll(); }, 2_500);
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    };
    timer = setTimeout(() => { void poll(); }, 1_000);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [narrativeId, status]);

  const requestNarrative = async () => {
    setStatus("loading");
    setOutput(null);
    try {
      const response = await fetch("/api/premium/saju-2027/narrative", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ locale }),
      });
      const body: unknown = await response.json().catch(() => null);
      const parsed = requestResultSchema.safeParse(body);
      if (!response.ok || !parsed.success) throw new Error("narrative_request_unavailable");
      setNarrativeId(parsed.data.id);
      if (parsed.data.status === "succeeded") {
        const statusResponse = await fetch(`/api/premium/saju-2027/narrative?id=${encodeURIComponent(parsed.data.id)}`, {
          cache: "no-store",
          headers: { accept: "application/json" },
        });
        const statusBody: unknown = await statusResponse.json().catch(() => null);
        const statusParsed = pollResultSchema.safeParse(statusBody);
        if (!statusResponse.ok || !statusParsed.success) throw new Error("narrative_status_unavailable");
        setOutput(statusParsed.data.output);
        setStatus(statusParsed.data.status);
      } else {
        setStatus(parsed.data.status);
      }
    } catch {
      setNarrativeId(null);
      setStatus("error");
    }
  };

  const statusText = status === "queued" || status === "processing"
    ? (english ? "Preparing the cited reflection…" : "근거를 연결한 해설을 준비하고 있습니다…")
    : status === "fallback"
      ? (english ? "The deterministic explanation below is available." : "아래의 결정론적 근거 해설을 확인해 주세요.")
      : status === "error"
        ? (english ? "The AI reflection is unavailable. Please try again later." : "AI 해설을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.")
        : "";

  return (
    <section className="mt-10 border border-ink-700 bg-ink-950/60 p-5 sm:p-7" aria-labelledby="ai-narrative-heading">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-hobun-faint">AI · EVIDENCE-LINKED</p>
      <h2 id="ai-narrative-heading" className="mt-2 text-xl font-medium text-hobun">
        {english ? "Cross-system reflection" : "교차 통합 해설"}
      </h2>
      <p className="mt-3 text-sm leading-7 text-hobun-dim">
        {english
          ? "AI-generated cultural reflection based only on the calculation categories shown in this report. It is not a prediction or professional advice. Only non-identifying category labels are sent when you request it."
          : "이 리포트의 계산 분류만 바탕으로 AI가 작성하는 문화적 자기성찰 해설입니다. 예언이나 전문 조언이 아닙니다. 요청할 때 개인을 식별하지 않는 분류값만 전송합니다."}
      </p>

      {output ? (
        <div className="mt-6 space-y-7">
          {output.sections.map((section) => (
            <section key={section.id} aria-labelledby={`ai-section-${section.id}`}>
              <h3 id={`ai-section-${section.id}`} className="text-base font-medium text-hobun">
                {sectionTitles[locale === "ko" ? "ko" : "en"][section.id]}
              </h3>
              <div className="mt-3 space-y-3">
                {section.paragraphs.map((paragraph, index) => (
                  <div key={`${section.id}-${index}`}>
                    <p className="text-sm leading-7 text-hobun-dim">{paragraph.text}</p>
                    <p className="mt-1 text-[10px] leading-5 text-hobun-faint">
                      {english ? "Evidence" : "근거"}: {paragraph.citedFactIds.join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {statusText ? <p className="mt-5 text-sm text-hobun-dim" role="status" aria-live="polite">{statusText}</p> : null}
      {status !== "succeeded" && status !== "fallback" ? (
        <button
          type="button"
          onClick={() => { void requestNarrative(); }}
          disabled={status === "loading" || status === "queued" || status === "processing"}
          className="mt-5 min-h-11 border border-hobun/60 px-4 text-sm text-hobun transition-colors hover:bg-hobun/10 disabled:cursor-wait disabled:opacity-60"
        >
          {status === "loading"
            ? (english ? "Requesting…" : "요청 중…")
            : status === "error"
              ? (english ? "Try again" : "다시 요청")
              : (english ? "Generate AI reflection" : "AI 해설 생성")}
        </button>
      ) : null}
    </section>
  );
}
