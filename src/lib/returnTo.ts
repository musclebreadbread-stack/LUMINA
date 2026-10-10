import { DEFAULT_LOCALE, LOCALES } from "@/i18n/locale";

const LOCALE_PREFIX = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE).join("|");
const RETURN_TO_PATTERN = new RegExp(`^(?:/(?:${LOCALE_PREFIX}))?/(?:premium|r)/\\S*$`, "u");

/**
 * Validates a `returnTo` value carried through the sign-in -> consent chain
 * (Track C1), so a shortened checkout flow can land the buyer back where they
 * started instead of always dumping them on /account. Only internal
 * /premium/* and /r/* paths are allowed (optionally locale-prefixed, since
 * callers build the value with localePath() before it round-trips through a
 * query string) — returnTo is attacker-controllable before authentication, so
 * this guards against open-redirect and path-traversal tricks (".." segments
 * a browser would normalize away after this check would otherwise slip
 * through a prefix-only test).
 */
export function sanitizeReturnTo(value: string | null | undefined): string | null {
  if (!value || value.length > 512) return null;
  if (value.includes("..") || value.includes("\\") || value.includes("://")) return null;
  return RETURN_TO_PATTERN.test(value) ? value : null;
}
