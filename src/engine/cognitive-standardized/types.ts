/**
 * 표준화 인지능력 평가에서 공유하는, 정답·문항 모수를 제외한 공개 계약이다.
 *
 * 이 모듈은 순수 타입만 내보낸다. 정답 키, IRT 모수, 서버 시드는
 * `InternalItem`에만 존재하며 `ItemPresentation`으로 직렬화해서는 안 된다.
 */

export type StandardizedDomain = "gf" | "gc" | "gv" | "gwm" | "gs";

export type RunStatus = "active" | "paused" | "completed" | "invalid";

export type ResultStatus = "pilot_withheld" | "standardized_scored" | "ineligible";

export type MatrixShape = "circle" | "square" | "triangle" | "diamond" | "arrow" | null;

export type MatrixFill = "none" | "hatch" | "solid" | null;

export interface MatrixCell {
  readonly kind: "figure" | "blank";
  readonly shape: MatrixShape;
  readonly fill: MatrixFill;
  readonly rotationDegrees: number | null;
}

export interface Voxel {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface DeviceCapability {
  readonly locale: "ko" | "en";
  readonly device: "desktop" | "tablet" | "mobile";
  readonly keyboard: boolean;
  readonly pointer: boolean;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly reducedMotion: boolean;
}

export interface StandardizedScore {
  readonly fullScaleIq: number;
  readonly percentile: number;
  readonly confidenceInterval95: readonly [lower: number, upper: number];
  readonly normVersion: string;
}

export type CognitiveStimulus =
  | Readonly<{ kind: "text"; textKo: string; textEn: string }>
  | Readonly<{ kind: "matrix"; cells: readonly MatrixCell[] }>
  | Readonly<{ kind: "spatial"; cubes: readonly Voxel[] }>;

export interface PresentationOption {
  readonly id: string;
  readonly labelKo: string;
  readonly labelEn: string;
  readonly figure: CognitiveStimulus | null;
}

export interface ItemPresentation {
  readonly assignmentId: string;
  readonly ordinal: number;
  readonly domain: StandardizedDomain;
  readonly stimulus: CognitiveStimulus;
  readonly options: readonly PresentationOption[];
}

export interface IrtParameters {
  readonly discrimination: number;
  readonly difficulty: number;
  readonly guessing: number;
}

export interface InternalItem {
  readonly versionId: string;
  readonly domain: StandardizedDomain;
  readonly presentation: Omit<ItemPresentation, "assignmentId" | "ordinal">;
  readonly correctOptionId: string;
  readonly parameters: IrtParameters;
  readonly exposureRate: number;
}

export interface Blueprint {
  readonly minimumByDomain: Readonly<Record<StandardizedDomain, number>>;
  readonly maximumByDomain: Readonly<Record<StandardizedDomain, number>>;
  readonly maxExposureRate: number;
  readonly targetStandardError: number;
  readonly maximumItems: number;
}

export type GenderBand = "male" | "female" | "self_described" | "prefer_not_to_say";

export type EducationBand =
  | "middle_school_or_below"
  | "high_school"
  | "college_or_associate"
  | "bachelor"
  | "graduate_or_above"
  | "prefer_not_to_say";

export type RegionClass =
  | "capital_region"
  | "chungcheong"
  | "honam"
  | "yeongnam"
  | "gangwon_jeju"
  | "overseas_or_unknown"
  | "prefer_not_to_say";

export interface StartRunInput {
  readonly consent: Readonly<{
    operationalStorage: true;
    researchParticipation: boolean;
  }>;
  readonly capability: DeviceCapability;
  /** Optional norming input; the server accepts these only with research consent. */
  readonly ageYears?: number;
  readonly genderBand?: GenderBand;
  readonly educationBand?: EducationBand;
  readonly regionClass?: RegionClass;
}

export interface ScoreRunInput {
  readonly releaseMode: "pilot" | "standardized";
  readonly standardizationEligible: boolean;
  readonly normVersion: string | null;
  readonly score: StandardizedScore | null;
}

export type ScoredRun =
  | Readonly<{ status: "pilot_withheld"; score: null }>
  | Readonly<{ status: "standardized_scored"; score: StandardizedScore }>;

export interface RunSnapshot {
  readonly runId: string;
  readonly status: RunStatus;
  readonly nextItem: ItemPresentation | null;
  readonly answeredCount: number;
  readonly targetItemCount: number;
}

export type SubmissionError = "invalid_run" | "stale_assignment" | "invalid_option" | null;

export interface SubmissionResult {
  readonly run: RunSnapshot;
  readonly error: SubmissionError;
}

export type DomainCounts = Readonly<Partial<Record<StandardizedDomain, number>>>;

export interface SelectionState {
  readonly items: readonly InternalItem[];
  readonly blueprint: Blueprint;
  readonly theta: number;
  readonly answeredItemIds: readonly string[];
  readonly answeredDomainCounts?: DomainCounts;
  readonly recentItemIds: readonly string[];
  /** 서버가 보관하는 시드에서 파생한 결정론적 난수 함수. */
  readonly random: () => number;
}
