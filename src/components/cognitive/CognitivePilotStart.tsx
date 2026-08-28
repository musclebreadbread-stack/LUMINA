"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { DeviceCapability, StartRunInput } from "@engine/cognitive-standardized/types";
import type { Locale } from "@/i18n/locale";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { evaluateEligibility } from "@/lib/cognitiveEligibility";
import { startCognitiveRunAction } from "@/app/cognitive/actions";
import { DeviceCheck } from "./DeviceCheck";
import { ResearchConsent, type ConsentChoice } from "./ResearchConsent";

interface CognitivePilotStartProps {
  readonly locale: Locale;
  readonly labels: Readonly<{
    readonly setupRequired: string;
    readonly signInRequired: string;
    readonly starting: string;
    readonly ineligible: string;
  }>;
}

function detectCapability(locale: Locale): DeviceCapability {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const touchPoints = navigator.maxTouchPoints;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const device = width < 640 ? "mobile" : touchPoints > 0 && width < 1024 ? "tablet" : "desktop";
  return {
    locale,
    device,
    keyboard: device !== "mobile",
    pointer: !coarsePointer || touchPoints > 0,
    viewportWidth: width,
    viewportHeight: height,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
}

export function CognitivePilotStart({ locale, labels }: CognitivePilotStartProps) {
  const router = useRouter();
  const [capability, setCapability] = useState<DeviceCapability | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eligibility = capability === null ? null : evaluateEligibility(capability);

  useEffect(() => {
    const timer = window.setTimeout(() => setCapability(detectCapability(locale)), 0);
    return () => window.clearTimeout(timer);
  }, [locale]);

  async function continueToRun(consent: ConsentChoice): Promise<void> {
    if (capability === null || busy) return;
    if (eligibility?.eligibleForComposite !== true) {
      setError(labels.ineligible);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const session = await supabase.auth.getSession();
      if (session.data.session === null) {
        const { error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) throw new Error(labels.signInRequired);
      }

      const input: StartRunInput = { consent, capability };
      const run = await startCognitiveRunAction(input);
      router.push(`/cognitive/run/${run.runId}`);
    } catch {
      setError(labels.setupRequired);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {capability !== null && <DeviceCheck capability={capability} locale={locale} />}
      <ResearchConsent
        onContinue={continueToRun}
        locale={locale}
        disabled={eligibility?.eligibleForComposite === false}
        disabledReason={eligibility?.eligibleForComposite === false ? labels.ineligible : undefined}
      />
      {busy && <p role="status" className="text-sm text-hobun-dim">{labels.starting}</p>}
      {error !== null && (
        <p role="alert" className="border-l border-hwa pl-3 text-sm leading-relaxed text-hobun">
          {error}
        </p>
      )}
    </div>
  );
}
