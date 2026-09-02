import tzlookup from "tz-lookup";
import { DEFAULT_PLACE, type BirthPlace } from "./birth";

/**
 * 좌표로부터 IANA 타임존을 해석한다.
 *
 * IANA tz 데이터베이스는 한국의 표준시 변경 이력(1954~1961 UTC+8:30)과
 * 서머타임(1948~51, 1955~60, 1987~88)을 모두 담고 있으므로, 벽시계 시각 →
 * UTC 변환은 luxon + IANA 존에 전적으로 위임한다. 표준시 이력을 직접
 * 하드코딩하지 않는다.
 */
export function resolveTimeZone(place?: BirthPlace): string {
  if (place?.timeZone) return place.timeZone;
  if (place) {
    try {
      return tzlookup(place.lat, place.lng);
    } catch {
      /* 해양 좌표 등 조회 실패 시 경도 기반 폴백으로 내려간다. */
    }
    const offsetHours = Math.round(place.lng / 15);
    return `Etc/GMT${offsetHours <= 0 ? "+" : "-"}${Math.abs(offsetHours)}`;
  }
  return DEFAULT_PLACE.timeZone;
}
