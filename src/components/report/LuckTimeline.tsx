import { getLocale, getTranslations } from "next-intl/server";
import { stageEvidenceRef } from "@engine/saju";
import { ELEMENT_STYLE } from "@/lib/elements";
import { stageLabel, tenGodLabel, type ReportView } from "@/lib/reportModel";
import type { Locale } from "@/i18n/locale";
import { OverflowFade } from "@/components/ui/OverflowFade";

const STAGE_MESSAGE_KEY: Readonly<Record<string, string>> = Object.freeze({
  장생: "growth",
  목욕: "bath",
  관대: "cap",
  건록: "prosperity",
  제왕: "peak",
  쇠: "decline",
  병: "illness",
  사: "death",
  묘: "tomb",
  절: "extinction",
  태: "gestation",
  양: "nurture",
});

/**
 * 대운(大運).
 *
 * 월주에서 출발해 10년마다 한 칸씩 옮겨 가는 간지의 행렬이다. 순행이면 60갑자를
 * 앞으로, 역행이면 뒤로 밟는다. 첫 칸이 시작되는 나이는 출생 시각에서 기준 절입까지의
 * 거리를 3일=1년으로 환산해 얻는다.
 */

interface Props {
  readonly luck: ReportView["luck"];
}

export async function LuckTimeline({ luck }: Props) {
  const [t, tCommon] = await Promise.all([
    getTranslations("saju"),
    getTranslations("common"),
  ]);
  const locale = (await getLocale()) as Locale;
  const directionLabel = t(luck.direction === "forward" ? "luckForward" : "luckBackward");
  const current = luck.rows.find((row) => row.isCurrent) ?? luck.rows[0] ?? null;

  return (
    <div>
      <p className="mb-4 font-mono text-[13px] text-hobun-faint">
        {t("luckDirectionNote", {
          direction: directionLabel,
          age: luck.startAge,
          note: t("luckStartNote", { days: luck.startDays.toFixed(1) }),
        })}
      </p>

      {/* 대운은 10칸이 좁은 화면에서 반드시 넘친다 — 현재 대운이 초기 시야
          가운데 오도록 하고, 넘칠 때만 "더 있다" 가장자리를 보여 준다. */}
      <OverflowFade className="print-scroll -mx-1 overflow-x-auto pb-2" centerCurrent>
        <ol className="flex gap-px px-1">
          {luck.rows.map((row) => {
            const stemStyle = ELEMENT_STYLE[row.stemElement];
            const branchStyle = ELEMENT_STYLE[row.branchElement];
            return (
              <li
                key={row.ordinal}
                aria-current={row.isCurrent ? "true" : undefined}
                className={`min-w-[62px] flex-1 border px-1.5 py-3 text-center ${
                  row.isCurrent
                    ? "border-hobun/40 bg-ink-800 shadow-[0_14px_30px_-16px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(237,230,216,0.08)]"
                    : "border-ink-700 bg-transparent"
                }`}
              >
                <div className="tabular font-mono text-[12px] text-hobun-faint">
                  {t("ageLabel", { age: row.fromAge })}
                </div>
                <div className="font-hanja mt-2 flex flex-col leading-none">
                  <span className={`glyph glyph-inlay-sm text-2xl font-black ${stemStyle.text}`}>
                    {row.stemHanja}
                  </span>
                  <span className={`glyph glyph-inlay-sm mt-1 text-2xl font-black ${branchStyle.text}`}>
                    {row.branchHanja}
                  </span>
                </div>
                <div className="mt-2.5 space-y-0.5 text-[12px] leading-tight text-hobun-faint">
                  <div>{tenGodLabel(row.stemTenGod, locale)}</div>
                  <div>{tenGodLabel(row.branchTenGod, locale)}</div>
                  <div>
                    <a
                      href={`#calculation-${stageEvidenceRef(row.stage)}`}
                      title={tCommon("evidenceView")}
                      className="underline decoration-ink-700 underline-offset-2 hover:text-hobun"
                    >
                      {stageLabel(row.stage, locale)}
                    </a>
                  </div>
                </div>
                <div className="tabular mt-2 border-t border-ink-700 pt-1.5 font-mono text-[12px] text-hobun-faint">
                  {row.fromYear}
                </div>
              </li>
            );
          })}
        </ol>
      </OverflowFade>

      <p className="mt-4 text-xs leading-relaxed text-hobun-faint">{t("luckTransitionNote")}</p>

      {current && (
        <div className="mt-5 border-l border-ink-600 pl-4">
          <p className="text-[13px] text-hobun-dim">
            <a
              href={`#calculation-${stageEvidenceRef(current.stage)}`}
              title={tCommon("evidenceView")}
              className="underline decoration-ink-700 underline-offset-2 hover:text-hobun"
            >
              {stageLabel(current.stage, locale)}
            </a>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-hobun-faint">
            {t(`stageReadings.${STAGE_MESSAGE_KEY[current.stage] ?? "growth"}`)}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-hobun-faint">{t("stageNote")}</p>
        </div>
      )}
    </div>
  );
}
