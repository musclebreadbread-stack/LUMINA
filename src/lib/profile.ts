import type { BirthInput, CalendarType, Gender } from "@engine/shared/birth";
import type { DayBoundaryRule } from "@engine/saju/pillars";

/**
 * 비회원 프로필 저장소.
 *
 * 서버에는 어떤 식별 정보도 보내지 않는다. 입력값은 이 브라우저의 localStorage에만
 * 남고, "내 정보 지우기"를 누르면 흔적 없이 사라진다.
 */

const STORAGE_KEY = "lumina.profile.v1";

export interface StoredProfile {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly calendar: CalendarType;
  readonly isLeapMonth: boolean;
  /** 시각 미상이면 null */
  readonly hour: number | null;
  readonly minute: number | null;
  readonly gender: Gender;
  /** 23시 자시 경계 학설. 공유 링크에 함께 저장해 계산을 재현한다. */
  readonly dayBoundaryRule: DayBoundaryRule;
  readonly placeLabel: string;
  /** 영어 로케일 표시용. 검색 시점에 선택한 항목의 en 값을 그대로 저장한다 —
   *  과거 공유 링크처럼 값이 없으면 빈 문자열이고, placeDisplayLabel이 그 경우
   *  레거시 표로 폴백한다. */
  readonly placeLabelEn: string;
  readonly lat: number;
  readonly lng: number;
  readonly timeZone: string;
}

export const DEFAULT_PROFILE: StoredProfile = Object.freeze({
  year: 1995,
  month: 6,
  day: 15,
  calendar: "solar",
  isLeapMonth: false,
  hour: 12,
  minute: 0,
  gender: "unspecified",
  dayBoundaryRule: "zi23",
  placeLabel: "서울",
  placeLabelEn: "Seoul",
  lat: 37.5665,
  lng: 126.978,
  timeZone: "Asia/Seoul",
});

function isValid(value: unknown): value is StoredProfile {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.year === "number" &&
    typeof p.month === "number" &&
    typeof p.day === "number" &&
    (p.calendar === "solar" || p.calendar === "lunar") &&
    typeof p.isLeapMonth === "boolean" &&
    (p.hour === null || typeof p.hour === "number") &&
    (p.minute === null || typeof p.minute === "number") &&
    typeof p.gender === "string" &&
    (p.dayBoundaryRule === undefined || p.dayBoundaryRule === "zi23" || p.dayBoundaryRule === "midnight") &&
    typeof p.lat === "number" &&
    typeof p.lng === "number" &&
    typeof p.timeZone === "string" &&
    typeof p.placeLabel === "string" &&
    (p.placeLabelEn === undefined || typeof p.placeLabelEn === "string")
  );
}

export function loadProfile(): StoredProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValid(parsed)) return null;
    return Object.freeze({
      ...parsed,
      dayBoundaryRule: parsed.dayBoundaryRule ?? "zi23",
      placeLabelEn: parsed.placeLabelEn ?? "",
    });
  } catch {
    // 저장소가 막혀 있거나(사생활 보호 모드) 값이 깨졌으면 없는 것으로 본다.
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * 외부 저장소 구독 — useSyncExternalStore 용
 *
 * localStorage는 React 바깥의 상태다. 효과 안에서 setState 하는 대신
 * 구독 모델로 읽으면 다른 탭에서 지운 값도 즉시 반영된다.
 * getSnapshot은 참조가 안정적이어야 하므로 원문 문자열을 키로 캐시한다.
 * ------------------------------------------------------------------ */

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedProfile: StoredProfile | null = null;

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribeProfile(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function getProfileSnapshot(): StoredProfile | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedProfile = loadProfile();
  }
  return cachedProfile;
}

/** 서버 렌더링·하이드레이션 시점에는 저장된 값이 없는 것으로 본다. */
export function getProfileServerSnapshot(): StoredProfile | null {
  return null;
}

export function saveProfile(profile: StoredProfile): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    /* 저장에 실패해도 이번 세션의 분석은 그대로 진행된다. */
  }
  notify();
}

export function clearProfile(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* 지울 것이 없으면 그대로 둔다. */
  }
  notify();
}

/** 하이드레이션이 끝났는지 — 서버와 클라이언트의 스냅샷이 다를 때만 쓴다. */
export const hydrationStore = {
  subscribe: () => () => {},
  getSnapshot: () => true,
  getServerSnapshot: () => false,
} as const;

/** 저장 형식 → 엔진 입력 형식 */
export function toBirthInput(p: StoredProfile): BirthInput {
  return {
    date: { year: p.year, month: p.month, day: p.day },
    time: p.hour === null || p.minute === null ? undefined : { hour: p.hour, minute: p.minute },
    calendar: p.calendar,
    isLeapMonth: p.isLeapMonth,
    gender: p.gender,
    place: { lat: p.lat, lng: p.lng, timeZone: p.timeZone, label: p.placeLabel },
  };
}

/**
 * 과거 16개 프리셋의 영어 표기 — 이 프리셋으로 저장된 옛 공유 링크에는
 * placeLabelEn이 없으므로, 그런 경우에만 이 작은 상수 표로 폴백한다.
 * 새 데이터셋(수만 건)은 여기서 참조하지 않는다 — placeDisplayLabel은
 * 항상 가벼워야 한다(서버 컴포넌트에서 매 요청 호출된다).
 */
const LEGACY_PLACE_LABELS_EN: Readonly<Record<string, string>> = Object.freeze({
  서울: "Seoul",
  부산: "Busan",
  대구: "Daegu",
  인천: "Incheon",
  광주: "Gwangju",
  대전: "Daejeon",
  울산: "Ulsan",
  제주: "Jeju",
  강릉: "Gangneung",
  전주: "Jeonju",
  도쿄: "Tokyo",
  베이징: "Beijing",
  뉴욕: "New York",
  로스앤젤레스: "Los Angeles",
  런던: "London",
  시드니: "Sydney",
});

/**
 * 표시용 지명. placeLabel은 로케일과 무관하게 항상 선택 시점의 값을 그대로
 * 저장한다(국내는 한글, 해외 비별칭 도시는 영문). placeLabelEn이 있으면
 * 영어 로케일에서 그 값을 쓰고, 없으면(과거 저장분) 16개 레거시 프리셋
 * 표에서 찾는다. 그래도 없으면 원문을 그대로 돌려준다.
 */
export function placeDisplayLabel(rawLabel: string, rawLabelEn: string, locale: "ko" | "en"): string {
  if (locale === "ko") return rawLabel;
  if (rawLabelEn) return rawLabelEn;
  return LEGACY_PLACE_LABELS_EN[rawLabel] ?? rawLabel;
}
