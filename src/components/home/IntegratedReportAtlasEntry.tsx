"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { listPortraitSnapshots } from "@/lib/integratedPortrait/vault.client";

/** Self Atlas에 통합 자기초상 보관함으로 이어지는 작은 Client Island. */
export function IntegratedReportAtlasEntry() {
  const t = useTranslations("integratedPortrait");
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    void listPortraitSnapshots().then((result) => {
      if (active) setCount(result.snapshots.length);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="integrated-atlas-entry mt-6" data-integrated-report-atlas-entry>
      <div>
        <p className="font-mono text-[11px] tracking-[0.16em] text-hobun-faint">{t("entry.kicker")}</p>
        <p className="mt-2 text-sm leading-relaxed text-hobun-dim">{t("atlas.body", { count })}</p>
      </div>
      <Link
        href="/integrated-report"
        className="inline-flex min-h-11 shrink-0 items-center border border-hobun/60 px-4 text-sm text-hobun transition-colors hover:bg-hobun/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hobun"
      >
        {t("entry.cta")}
      </Link>
    </div>
  );
}
