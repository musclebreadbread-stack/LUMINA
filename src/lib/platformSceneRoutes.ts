import type { PlatformSceneTone } from "./scene3dAssets";

function matchesPath(pathname: string, root: string): boolean {
  return pathname === root || pathname.startsWith(`${root}/`);
}

/** URL의 탐구 방법을 관측소 색온도로 바꾼다. 결과 해석의 의미는 바꾸지 않는다. */
export function platformSceneTone(pathname: string | null): PlatformSceneTone {
  const path = pathname ?? "/";
  if (path === "/") return "home";
  if (matchesPath(path, "/tarot")) return "tarot";
  if (matchesPath(path, "/saju") || matchesPath(path, "/characters") || matchesPath(path, "/r")) return "saju";
  if (matchesPath(path, "/numerology")) return "numerology";
  if (matchesPath(path, "/darktriad")) return "darktriad";
  if (matchesPath(path, "/attachment") || matchesPath(path, "/compatibility")) return "attachment";
  if (matchesPath(path, "/eq")) return "eq";
  if (matchesPath(path, "/cognitive")) return "cognitive";
  if (matchesPath(path, "/horoscope")) return "horoscope";
  if (matchesPath(path, "/psychometrics")) return "psychometrics";
  return "neutral";
}

/** 전용 Canvas가 이미 있는 라우트에서는 GPU 장면을 중복 마운트하지 않는다. */
export function hasDedicatedPlatformScene(pathname: string | null): boolean {
  const path = pathname ?? "/";
  if (path === "/" || matchesPath(path, "/compatibility") || matchesPath(path, "/cognitive") || matchesPath(path, "/r")) {
    return true;
  }

  return [
    "/attachment/result",
    "/darktriad/result",
    "/eq/result",
    "/horoscope/",
    "/numerology/result",
    "/psychometrics/result",
    "/psychometrics/types/result",
    "/tarot/",
  ].some((root) => path.startsWith(root));
}
