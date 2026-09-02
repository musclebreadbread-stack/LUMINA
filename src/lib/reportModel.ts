import { DateTime } from "luxon";
import {
  SOLAR_TERMS,
  TEN_GOD_LABEL,
  TWELVE_STAGE_EN,
  TWELVE_STAGES,
  branchAt,
  computeSaju,
  computeYearlyLuckRange,
  elementRole,
  hiddenStemsOf,
  hourBranchOf,
  monthBracketOf,
  stemAt,
  twelveStageOf,
  voidBranchesOf,
  type FiveElement,
  type LuckDirection,
  type SajuResult,
  computeSajuRarity,
  type TenGod,
} from "@engine/saju";
import type { Gender } from "@engine/shared/birth";
import { resolveSajuCharacter, type CharacterDef } from "@engine/characters";
import {
  pillarExplanation,
  luckExplanation,
  sajuMethodExplanation,
  stageExplanation,
  strengthExplanation,
  tenGodExplanation,
  voidExplanation,
} from "@engine/saju/explanations";
import { rarityExplanation } from "@engine/saju/rarity";
import type { ExplanationBlock } from "@engine/shared/explanation";
import type { Locale } from "@/i18n/locale";
import { assetPath } from "./assets";
import { ELEMENT_SEQUENCE } from "./elements";
import { toBirthInput, type StoredProfile } from "./profile";

/**
 * 엔진 결과(SajuResult) → 화면 전용 뷰 모델.
 *
 * 이 변환은 서버에서만 일어난다. 덕분에 astronomy-engine·luxon 같은 계산 의존성이
 * 클라이언트 번들에 들어가지 않고, 컴포넌트는 순수 직렬화 가능한 값만 받는다.
 *
 * 이 파일은 로케일을 모른다. 천간·지지·십신·십이운성처럼 이미 ko/en 짝을 가진
 * 엔진 데이터는 그 짝을 그대로 실어 보내고("ko"/"en" 필드 또는 원래의 한글 id),
 * 문장으로 엮어야 하는 부분(안내문 등)은 조립하지 않은 채 구조화된 값으로 남겨
 * 둔다 — 실제 문구 선택과 조립은 next-intl 을 쓸 수 있는 서버 컴포넌트가 한다.
 */

export interface CharCell {
  readonly hanja: string;
  readonly ko: string;
  readonly en: string;
  readonly element: FiveElement;
  readonly tenGod: TenGod | null;
}

export interface PillarColumn {
  /** 時 · 日 · 月 · 年 — 한자는 로케일과 무관하다 */
  readonly mark: string;
  /** 라벨·자리 설명 문구를 고르는 데 쓰는 키 (예: saju.pillarHourLabel) */
  readonly key: "hour" | "day" | "month" | "year";
  readonly stem: CharCell;
  readonly branch: CharCell;
  readonly zodiacKo: string;
  readonly zodiacEn: string;
  /** public/saju/zodiac/{영문 띠 이름 소문자}.webp */
  readonly zodiacImageSrc: string;
  /** 십이운성 — 한글 id. TWELVE_STAGE_EN 으로 영문을 조회한다. */
  readonly stage: string;
  readonly hidden: readonly { readonly hanja: string; readonly tenGod: TenGod | null }[];
  /** 일간(나) 자리인가 */
  readonly isDayMaster: boolean;
  /** 이 지지가 공망인가 */
  readonly isVoid: boolean;
}

export interface ElementRow {
  readonly element: FiveElement;
  readonly simple: number;
  readonly weighted: number;
  readonly percent: number;
}

export interface LuckRow {
  readonly ordinal: number;
  readonly stemHanja: string;
  readonly branchHanja: string;
  readonly stemElement: FiveElement;
  readonly branchElement: FiveElement;
  readonly fromAge: number;
  readonly fromYear: number;
  readonly stemTenGod: TenGod;
  readonly branchTenGod: TenGod;
  readonly stage: string;
  readonly isCurrent: boolean;
}

export interface DialTerm {
  readonly ko: string;
  readonly en: string;
  /** 입춘을 0°로 둔 각도 */
  readonly angle: number;
  readonly isMajor: boolean;
  readonly isCurrent: boolean;
}

/** 리포트 하단 안내문. 조립되지 않은 구조화된 값 — 문구 선택은 화면 쪽 책임이다. */
export type ReportNote =
  | { readonly key: "timeUnknown" }
  | { readonly key: "lateZiHour" }
  | { readonly key: "trueSolarShift"; readonly clockBranch: number; readonly solarBranch: number }
  | { readonly key: "nearTermBoundary"; readonly hours: number }
  | { readonly key: "genderUnspecified" }
  | { readonly key: "dst" };

export interface ReportView {
  /** ISO(오프셋 포함) — 화면에서 로케일에 맞는 형식으로 다시 포맷한다 */
  readonly birthLocalISO: string;
  readonly lunar: { readonly year: number; readonly month: number; readonly day: number; readonly isLeapMonth: boolean } | null;
  readonly placeLabel: string;
  readonly placeLabelEn: string;
  readonly gender: Gender;
  readonly dayBoundaryRule: "zi23" | "midnight";

  readonly precision: {
    readonly timeZone: string;
    readonly offsetLabel: string;
    readonly isDST: boolean;
    readonly clockLabel: string;
    readonly trueSolarLabel: string;
    /** null이면 출생지가 이미 한국 표준시(Asia/Seoul)를 쓴다는 뜻. */
    readonly kstLabel: string | null;
    /** 분 단위. 단위 표기("분"/"min")는 화면에서 로케일에 맞게 붙인다. */
    readonly longitudeCorrectionMinutes: number;
    readonly equationOfTimeMinutes: number;
    readonly totalCorrectionMinutes: number;
    readonly timeUnknown: boolean;
  };

  readonly termEntry: {
    readonly ko: string;
    readonly en: string;
    readonly instantLabel: string;
    readonly daysSince: number;
  };

  readonly pillars: readonly PillarColumn[];
  readonly dayMaster: {
    readonly hanja: string;
    readonly ko: string;
    readonly en: string;
    readonly element: FiveElement;
  };

  readonly elements: {
    readonly rows: readonly ElementRow[];
    readonly missing: readonly FiveElement[];
    readonly dominant: FiveElement;
  };

  readonly strength: {
    readonly verdict: "strong" | "balanced" | "weak";
    readonly ratio: number;
    readonly seasonal: boolean;
    readonly root: boolean;
    readonly peer: boolean;
  };

  /**
   * 십신을 육친(六親) 다섯 갈래로 묶은 것.
   * 각 갈래는 일간과의 오행 관계로 정의되므로, 오행 색을 그대로 물려받는다.
   */
  readonly tenGodGroups: readonly {
    readonly role: "self" | "output" | "wealth" | "officer" | "resource";
    readonly element: FiveElement;
    readonly total: number;
    readonly items: readonly { readonly name: TenGod; readonly count: number }[];
  }[];

  readonly luck: {
    readonly direction: LuckDirection;
    readonly startAge: number;
    readonly startDays: number;
    readonly rows: readonly LuckRow[];
  };

  readonly current: {
    readonly age: number;
    readonly year: number;
    readonly yearHanja: string;
    readonly yearStemElement: FiveElement;
    readonly yearBranchElement: FiveElement;
    readonly stemTenGod: TenGod;
    readonly branchTenGod: TenGod;
  } | null;

  readonly yearly: readonly {
    readonly year: number;
    readonly yearHanja: string;
    readonly yearStemElement: FiveElement;
    readonly yearBranchElement: FiveElement;
    readonly stemTenGod: TenGod;
    readonly branchTenGod: TenGod;
    readonly stage: string;
    readonly startsAtISO: string;
    readonly isCurrent: boolean;
  }[];

  readonly dial: {
    readonly terms: readonly DialTerm[];
    /** 입춘을 0°로 둔 출생 시각의 위치 */
    readonly birthAngle: number;
  };

  /** 결과를 한 장으로 요약하는 오행 정령 */
  readonly character: {
    readonly def: CharacterDef;
    readonly dominantShare: number;
  };
  readonly rarity: ReturnType<typeof computeSajuRarity>;

  readonly notes: readonly ReportNote[];
  readonly voidLabel: string;

  readonly explanations: {
    readonly method: ExplanationBlock;
    readonly pillars: readonly ExplanationBlock[];
    readonly tenGods: readonly ExplanationBlock[];
    readonly stages: readonly ExplanationBlock[];
    readonly luck: readonly ExplanationBlock[];
    readonly strength: ExplanationBlock;
    readonly void: ExplanationBlock;
    readonly rarity: ExplanationBlock;
  };
}

const PILLAR_META = [
  { mark: "時", key: "hour" as const },
  { mark: "日", key: "day" as const },
  { mark: "月", key: "month" as const },
  { mark: "年", key: "year" as const },
];

/**
 * 부호 있는 분 단위 값을 문구로 만든다. 단위(분/min)는 호출부가 로케일에 맞게
 * 넘긴다 — 이 함수 자체는 로케일을 모른다.
 */
export function formatSignedMinutes(minutes: number, unit: string): string {
  const sign = minutes >= 0 ? "+" : "−";
  return `${sign}${Math.abs(minutes).toFixed(1)}${unit}`;
}

function offsetLabel(minutes: number): string {
  const sign = minutes >= 0 ? "+" : "−";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}

/**
 * 표시용 생년월일시 문구. 순수 포맷팅(날짜 토큰 선택)이라 메시지 카탈로그가
 * 필요 없다 — 로케일을 렌더 시점에 인자로 받아 화면(페이지·OG 이미지)에서 호출한다.
 */
export function formatBirthLabel(localISO: string, timeUnknown: boolean, locale: Locale): string {
  const dt = DateTime.fromISO(localISO, { setZone: true });
  if (locale === "en") {
    return dt.toFormat(timeUnknown ? "MMMM d, yyyy" : "MMMM d, yyyy 'at' HH:mm");
  }
  return dt.toFormat(timeUnknown ? "yyyy년 M월 d일" : "yyyy년 M월 d일 HH시 mm분");
}

function buildPillars(result: SajuResult): PillarColumn[] {
  const [voidA, voidB] = voidBranchesOf(result.pillars.day);
  const order = [
    { pillar: result.pillars.hour, gods: result.tenGods.hour, meta: PILLAR_META[0]! },
    { pillar: result.pillars.day, gods: result.tenGods.day, meta: PILLAR_META[1]! },
    { pillar: result.pillars.month, gods: result.tenGods.month, meta: PILLAR_META[2]! },
    { pillar: result.pillars.year, gods: result.tenGods.year, meta: PILLAR_META[3]! },
  ];

  return order.flatMap(({ pillar, gods, meta }) => {
    if (!pillar || !gods) return [];
    const stem = stemAt(pillar.stem);
    const branch = branchAt(pillar.branch);
    return [
      {
        mark: meta.mark,
        key: meta.key,
        stem: {
          hanja: stem.hanja,
          ko: stem.ko,
          en: stem.en,
          element: stem.element,
          tenGod: gods.stem,
        },
        branch: {
          hanja: branch.hanja,
          ko: branch.ko,
          en: branch.en,
          element: branch.element,
          tenGod: gods.branch,
        },
        zodiacKo: branch.zodiacKo,
        zodiacEn: branch.zodiacEn,
        zodiacImageSrc: assetPath("saju/zodiac", branch.zodiacEn.toLowerCase()),
        stage: twelveStageOf(result.pillars.day.stem, pillar.branch),
        hidden: hiddenStemsOf(pillar.branch).map((h) => ({
          hanja: stemAt(h.stem).hanja,
          tenGod: gods.hidden.find((g) => g.stem === h.stem)?.tenGod ?? null,
        })),
        isDayMaster: meta.mark === "日",
        isVoid: pillar.branch === voidA || pillar.branch === voidB,
      },
    ];
  });
}

function buildDial(result: SajuResult): ReportView["dial"] {
  const instant = new Date(result.time.instantISO);
  const bracket = monthBracketOf(instant);

  const span = bracket.next.instant.getTime() - bracket.start.instant.getTime();
  const progress = span === 0 ? 0 : (instant.getTime() - bracket.start.instant.getTime()) / span;
  const birthAngle = (bracket.monthOrdinal * 30 + progress * 30) % 360;

  return {
    birthAngle,
    terms: SOLAR_TERMS.map((term, i) => ({
      ko: term.ko,
      en: term.en,
      angle: i * 15,
      isMajor: term.kind === "major",
      isCurrent: i === bracket.monthOrdinal * 2,
    })),
  };
}

/**
 * 십신 → 육친 다섯 갈래.
 * 갈래를 가르는 기준이 일간과의 오행 관계이므로, 색도 그 오행을 그대로 쓴다.
 */
const TEN_GOD_GROUPS = [
  { role: "self" as const, names: ["비견", "겁재"] as const },
  { role: "output" as const, names: ["식신", "상관"] as const },
  { role: "wealth" as const, names: ["편재", "정재"] as const },
  { role: "officer" as const, names: ["편관", "정관"] as const },
  { role: "resource" as const, names: ["편인", "정인"] as const },
];

function buildTenGodGroups(result: SajuResult): ReportView["tenGodGroups"] {
  const dayElement = stemAt(result.pillars.day.stem).element;

  const elementForRole = new Map<string, FiveElement>();
  for (const el of ELEMENT_SEQUENCE) elementForRole.set(elementRole(dayElement, el), el);

  const counts = result.tenGods.counts;

  return TEN_GOD_GROUPS.map((group) => ({
    role: group.role,
    element: elementForRole.get(group.role) ?? dayElement,
    total: group.names.reduce((sum, name) => sum + counts[name], 0),
    items: group.names.map((name) => ({ name, count: counts[name] })),
  }));
}

function buildNotes(result: SajuResult): ReportNote[] {
  const notes: ReportNote[] = [];

  if (result.boundary.timeUnknown) notes.push({ key: "timeUnknown" });
  if (result.boundary.inLateZiHour) notes.push({ key: "lateZiHour" });

  // 진태양시 보정이 시지 자체를 옮긴 경우 — 시계 시각만 보면 결과가 어긋나 보인다.
  if (!result.time.timeUnknown && result.options.applyTrueSolarTime) {
    const clockHour = DateTime.fromISO(result.time.localISO, { setZone: true }).hour;
    const solarHour = DateTime.fromISO(result.time.trueSolarISO, { setZone: true }).hour;
    const clockBranch = hourBranchOf(clockHour);
    const solarBranch = hourBranchOf(solarHour);
    if (clockBranch !== solarBranch) {
      notes.push({ key: "trueSolarShift", clockBranch, solarBranch });
    }
  }
  if (result.boundary.hoursToNearestTermBoundary < 12) {
    notes.push({ key: "nearTermBoundary", hours: result.boundary.hoursToNearestTermBoundary });
  }
  if (result.boundary.genderUnspecified) notes.push({ key: "genderUnspecified" });
  if (result.time.isDST) notes.push({ key: "dst" });

  return notes;
}

/**
 * 십신 표시 문구. tenGod 값 자체가 한글 id 이므로 로케일이 "ko"면 그대로 쓴다.
 * 화면(서버 컴포넌트·클라이언트 컴포넌트)에서 렌더 시점에 로케일을 받아 호출한다.
 */
export function tenGodLabel(tenGod: TenGod, locale: Locale): string {
  return locale === "en" ? TEN_GOD_LABEL[tenGod].en : tenGod;
}

/** 십이운성 표시 문구. stage 값 자체가 한글 id다. */
export function stageLabel(stage: string, locale: Locale): string {
  return locale === "en" ? (TWELVE_STAGE_EN[stage] ?? stage) : stage;
}

export function buildReportView(profile: StoredProfile, referenceDate: Date): ReportView {
  const result = computeSaju(toBirthInput(profile), {
    referenceDate,
    dayBoundaryRule: profile.dayBoundaryRule,
  });
  const zone = result.time.timeZone;

  const local = DateTime.fromISO(result.time.localISO, { setZone: true });
  const trueSolar = DateTime.fromISO(result.time.trueSolarISO, { setZone: true });
  const bracket = monthBracketOf(new Date(result.time.instantISO));
  const termEntry = DateTime.fromJSDate(bracket.start.instant, { zone });

  const daysSinceEntry =
    (new Date(result.time.instantISO).getTime() - bracket.start.instant.getTime()) / 86_400_000;

  const dayStem = stemAt(result.pillars.day.stem);
  const rarity = computeSajuRarity(result.pillars);
  const [voidA, voidB] = result.voidBranches;
  const yearly = result.current
    ? computeYearlyLuckRange(result.pillars, result.current.yearlyLuck.year - 1, 5)
    : [];

  const kstLabel =
    zone === "Asia/Seoul"
      ? null
      : DateTime.fromISO(result.time.instantISO, { zone: "Asia/Seoul" }).toFormat("yyyy-MM-dd HH:mm");

  return {
    birthLocalISO: local.toISO() ?? "",
    lunar: result.birth.lunar
      ? {
          year: result.birth.lunar.year,
          month: result.birth.lunar.month,
          day: result.birth.lunar.day,
          isLeapMonth: result.birth.lunar.isLeapMonth,
        }
      : null,
    placeLabel: profile.placeLabel,
    placeLabelEn: profile.placeLabelEn,
    gender: profile.gender,
    dayBoundaryRule: result.options.dayBoundaryRule,

    precision: {
      timeZone: zone,
      offsetLabel: offsetLabel(result.time.utcOffsetMinutes),
      isDST: result.time.isDST,
      clockLabel: local.toFormat("HH:mm"),
      trueSolarLabel: trueSolar.toFormat("HH:mm:ss"),
      kstLabel,
      longitudeCorrectionMinutes: result.time.longitudeCorrectionMinutes,
      equationOfTimeMinutes: result.time.equationOfTimeMinutes,
      totalCorrectionMinutes: result.time.totalCorrectionMinutes,
      timeUnknown: result.time.timeUnknown,
    },

    termEntry: {
      ko: bracket.start.def.ko,
      en: bracket.start.def.en,
      instantLabel: termEntry.toFormat("yyyy-MM-dd HH:mm:ss"),
      daysSince: daysSinceEntry,
    },

    pillars: buildPillars(result),
    dayMaster: {
      hanja: dayStem.hanja,
      ko: dayStem.ko,
      en: dayStem.en,
      element: dayStem.element,
    },

    elements: {
      rows: ELEMENT_SEQUENCE.map((element) => ({
        element,
        simple: result.elements.simple[element],
        weighted: result.elements.weighted[element],
        percent: result.elements.percentage[element],
      })),
      missing: result.elements.missing,
      dominant: result.elements.dominant,
    },

    strength: {
      verdict: result.strength.verdict,
      ratio: result.strength.ratio,
      seasonal: result.strength.hasSeasonalSupport,
      root: result.strength.hasRootSupport,
      peer: result.strength.hasPeerSupport,
    },

    tenGodGroups: buildTenGodGroups(result),

    luck: {
      direction: result.luck.direction,
      startAge: result.luck.start.startAge,
      startDays: result.luck.start.daysToBoundary,
      rows: result.luck.periods.map((p) => ({
        ordinal: p.ordinal,
        stemHanja: stemAt(p.pillar.stem).hanja,
        branchHanja: branchAt(p.pillar.branch).hanja,
        stemElement: stemAt(p.pillar.stem).element,
        branchElement: branchAt(p.pillar.branch).element,
        fromAge: p.fromAge,
        fromYear: p.fromYear,
        stemTenGod: p.stemTenGod,
        branchTenGod: p.branchTenGod,
        stage: p.stage,
        isCurrent: result.current?.luckPeriod?.ordinal === p.ordinal,
      })),
    },

    current: result.current
      ? {
          age: result.current.age,
          year: result.current.yearlyLuck.year,
          yearHanja:
            stemAt(result.current.yearlyLuck.pillar.stem).hanja +
            branchAt(result.current.yearlyLuck.pillar.branch).hanja,
          yearStemElement: stemAt(result.current.yearlyLuck.pillar.stem).element,
          yearBranchElement: branchAt(result.current.yearlyLuck.pillar.branch).element,
          stemTenGod: result.current.yearlyLuck.stemTenGod,
          branchTenGod: result.current.yearlyLuck.branchTenGod,
        }
      : null,

    yearly: yearly.map((item) => ({
      year: item.year,
      yearHanja: stemAt(item.pillar.stem).hanja + branchAt(item.pillar.branch).hanja,
      yearStemElement: stemAt(item.pillar.stem).element,
      yearBranchElement: branchAt(item.pillar.branch).element,
      stemTenGod: item.stemTenGod,
      branchTenGod: item.branchTenGod,
      stage: item.stage,
      startsAtISO: item.startsAt.toISOString(),
      isCurrent: item.year === result.current?.yearlyLuck.year,
    })),

    dial: buildDial(result),
    character: (() => {
      const resolved = resolveSajuCharacter(result);
      return Object.freeze({
        def: resolved.def,
        dominantShare: resolved.source.dominantShare,
      });
    })(),
    rarity,
    notes: buildNotes(result),
    voidLabel: `${branchAt(voidA).hanja}${branchAt(voidB).hanja}`,
    explanations: {
      method: sajuMethodExplanation(result.options.dayBoundaryRule),
      pillars: Object.freeze([
        pillarExplanation("hour"),
        pillarExplanation("day"),
        pillarExplanation("month"),
        pillarExplanation("year"),
      ]),
      tenGods: Object.freeze(
        TEN_GOD_GROUPS.flatMap((group) => group.names).map((god) =>
          tenGodExplanation(god, result.tenGods.counts[god]),
        ),
      ),
      stages: Object.freeze(TWELVE_STAGES.map((stage) => stageExplanation(stage))),
      luck: Object.freeze(
        result.luck.periods.map((period) => luckExplanation(period, result.luck.direction)),
      ),
      strength: strengthExplanation({
        ratio: result.strength.ratio,
        verdict: result.strength.verdict,
        seasonal: result.strength.hasSeasonalSupport,
        root: result.strength.hasRootSupport,
        peer: result.strength.hasPeerSupport,
      }),
      void: voidExplanation(`${branchAt(voidA).hanja}${branchAt(voidB).hanja}`),
      rarity: rarityExplanation(rarity),
    },
  };
}
