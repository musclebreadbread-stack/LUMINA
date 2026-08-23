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
    typeof p.placeLabel === "string"
  );
}

export function loadProfile(): StoredProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValid(parsed)) return null;
    return Object.freeze({ ...parsed, dayBoundaryRule: parsed.dayBoundaryRule ?? "zi23" });
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

/** 도시 목록 — 좌표와 타임존을 함께 들고 있어야 진태양시를 보정할 수 있다. */
export interface PlaceOption {
  /** 저장·공유 링크에 실제로 쓰이는 값 — 로케일과 무관하게 항상 한글이다. */
  readonly label: string;
  readonly labelEn: string;
  readonly lat: number;
  readonly lng: number;
  readonly timeZone: string;
}

export const PLACES: readonly PlaceOption[] = Object.freeze([
  { label: "서울", labelEn: "Seoul", lat: 37.5665, lng: 126.978, timeZone: "Asia/Seoul" },
  { label: "부산", labelEn: "Busan", lat: 35.1796, lng: 129.0756, timeZone: "Asia/Seoul" },
  { label: "대구", labelEn: "Daegu", lat: 35.8714, lng: 128.6014, timeZone: "Asia/Seoul" },
  { label: "인천", labelEn: "Incheon", lat: 37.4563, lng: 126.7052, timeZone: "Asia/Seoul" },
  { label: "광주", labelEn: "Gwangju", lat: 35.1595, lng: 126.8526, timeZone: "Asia/Seoul" },
  { label: "대전", labelEn: "Daejeon", lat: 36.3504, lng: 127.3845, timeZone: "Asia/Seoul" },
  { label: "울산", labelEn: "Ulsan", lat: 35.5384, lng: 129.3114, timeZone: "Asia/Seoul" },
  { label: "제주", labelEn: "Jeju", lat: 33.4996, lng: 126.5312, timeZone: "Asia/Seoul" },
  { label: "강릉", labelEn: "Gangneung", lat: 37.7519, lng: 128.8761, timeZone: "Asia/Seoul" },
  { label: "전주", labelEn: "Jeonju", lat: 35.8242, lng: 127.148, timeZone: "Asia/Seoul" },
  { label: "도쿄", labelEn: "Tokyo", lat: 35.6762, lng: 139.6503, timeZone: "Asia/Tokyo" },
  { label: "베이징", labelEn: "Beijing", lat: 39.9042, lng: 116.4074, timeZone: "Asia/Shanghai" },
  { label: "뉴욕", labelEn: "New York", lat: 40.7128, lng: -74.006, timeZone: "America/New_York" },
  { label: "로스앤젤레스", labelEn: "Los Angeles", lat: 34.0522, lng: -118.2437, timeZone: "America/Los_Angeles" },
  { label: "런던", labelEn: "London", lat: 51.5074, lng: -0.1278, timeZone: "Europe/London" },
  { label: "시드니", labelEn: "Sydney", lat: -33.8688, lng: 151.2093, timeZone: "Australia/Sydney" },
]);

/**
 * 표시용 지명. profile.placeLabel 은 로케일과 무관하게 늘 한글로 저장되므로
 * (공유 링크·저장값의 안정성을 위해), 화면에 낼 때만 로케일에 맞게 바꾼다.
 * 프리셋에 없는 값(과거 저장분 등)은 그대로 돌려준다.
 */
export function placeDisplayLabel(rawLabel: string, locale: "ko" | "en"): string {
  if (locale === "ko") return rawLabel;
  return PLACES.find((p) => p.label === rawLabel)?.labelEn ?? rawLabel;
}
