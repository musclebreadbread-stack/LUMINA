import type { AnalysisKey } from "@engine/shared/evidence";
import { LOCALES } from "@/i18n/locale";

/** BGM is intentionally opt-in; this key only describes the current route. */
export type BgmArea = "home" | AnalysisKey;

export interface BgmTrack {
  readonly area: BgmArea;
  readonly src: string;
}

/** The supplied theme is shared across every exploration lens. */
const DIGITAL_OBSERVATORY_SRC = "/audio/bgm/digital-observatory.mp3";

export const BGM_TRACKS: Readonly<Record<BgmArea, BgmTrack>> = Object.freeze({
  home: { area: "home", src: DIGITAL_OBSERVATORY_SRC },
  saju: { area: "saju", src: DIGITAL_OBSERVATORY_SRC },
  astro: { area: "astro", src: DIGITAL_OBSERVATORY_SRC },
  tarot: { area: "tarot", src: DIGITAL_OBSERVATORY_SRC },
  numerology: { area: "numerology", src: DIGITAL_OBSERVATORY_SRC },
  psychometrics: { area: "psychometrics", src: DIGITAL_OBSERVATORY_SRC },
  jungian: { area: "jungian", src: DIGITAL_OBSERVATORY_SRC },
  darktriad: { area: "darktriad", src: DIGITAL_OBSERVATORY_SRC },
  attachment: { area: "attachment", src: DIGITAL_OBSERVATORY_SRC },
  eq: { area: "eq", src: DIGITAL_OBSERVATORY_SRC },
  cognitive: { area: "cognitive", src: DIGITAL_OBSERVATORY_SRC },
  horoscope: { area: "horoscope", src: DIGITAL_OBSERVATORY_SRC },
  compatibility: { area: "compatibility", src: DIGITAL_OBSERVATORY_SRC },
});

const SHARE_KIND_AREA: Readonly<Record<string, BgmArea>> = Object.freeze({
  jungian: "jungian",
  bigfive: "psychometrics",
  darktriad: "darktriad",
  attachment: "attachment",
  eq: "eq",
  cognitive: "cognitive",
});

function stripLocalePrefix(pathname: string): string {
  const locale = LOCALES.find((candidate) =>
    pathname === `/${candidate}` || pathname.startsWith(`/${candidate}/`),
  );
  if (locale) return pathname.slice(locale.length + 1) || "/";
  return pathname || "/";
}

function matchesPath(pathname: string, root: string): boolean {
  return pathname === root || pathname.startsWith(`${root}/`);
}

/**
 * Resolve both landing and result URLs to the same lens. The order matters for
 * nested routes such as /psychometrics/types and /r/<data>/astro.
 */
export function bgmAreaForPath(pathname: string | null | undefined, search = ""): BgmArea {
  const path = stripLocalePrefix(pathname ?? "/");
  if (path === "/") return "home";

  if (matchesPath(path, "/r")) {
    if (path.endsWith("/astro")) return "astro";
    if (path.endsWith("/today")) return "horoscope";
    return "saju";
  }

  if (matchesPath(path, "/s")) {
    const kind = path.split("/")[2] ?? "";
    return SHARE_KIND_AREA[kind] ?? "home";
  }

  if (matchesPath(path, "/psychometrics/types")) return "jungian";
  if (matchesPath(path, "/psychometrics")) {
    return new URLSearchParams(search).get("to") === "types" ? "jungian" : "psychometrics";
  }
  if (matchesPath(path, "/saju") || matchesPath(path, "/characters")) return "saju";
  if (matchesPath(path, "/astro")) return "astro";
  if (matchesPath(path, "/tarot")) return "tarot";
  if (matchesPath(path, "/numerology")) return "numerology";
  if (matchesPath(path, "/darktriad")) return "darktriad";
  if (matchesPath(path, "/attachment")) return "attachment";
  if (matchesPath(path, "/eq")) return "eq";
  if (matchesPath(path, "/cognitive")) return "cognitive";
  if (matchesPath(path, "/horoscope")) return "horoscope";
  if (matchesPath(path, "/compatibility")) return "compatibility";

  return "home";
}
