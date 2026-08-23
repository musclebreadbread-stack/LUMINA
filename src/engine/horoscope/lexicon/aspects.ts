import type { AspectDef } from "@engine/astro/constants";

export const ASPECT_SIGNAL_BY_KEY: Readonly<Record<string, string>> = Object.freeze({
  "mars-moon-square": "moon-mars-square",
  "moon-sun-conjunction": "sun-moon-conjunction",
  "mercury-saturn-square": "mercury-saturn-square",
});

export function aspectSignalId(first: string, second: string, aspect: AspectDef): string | null {
  const pair = [first, second].sort().join("-");
  const key = `${pair}-${aspect.key}`;
  return ASPECT_SIGNAL_BY_KEY[key] ?? null;
}
