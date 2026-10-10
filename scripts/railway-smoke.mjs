import { pathToFileURL } from "node:url";

const DEFAULT_ORIGIN = "https://lumina.jack.ai.kr";
const REQUEST_TIMEOUT_MS = 15_000;
// Invalid token shapes short-circuit before the share lookup touches Neon.
const PRIVATE_SHARE_PROBE = "x";
const PRIVATE_SHARE_LOCALES = ["ko", "en", "ja", "zh-Hant", "es"];

const SERVICE_CHECKS = [
  { method: "GET", path: "/", status: 200, contentType: "text/html", body: "text", securityHeaders: true },
  { method: "GET", path: "/api/health", status: 200, contentType: "application/json", body: "health" },
  { method: "GET", path: "/api/health/ready", status: 200, contentType: "application/json", body: "health" },
  { method: "GET", path: "/api/auth/get-session", status: 200, contentType: "application/json", body: "json" },
  { method: "POST", path: "/api/auth/sign-up/email", status: 403, contentType: "application/json", body: "sign-up-blocked", requestBody: "{}" },
  { method: "POST", path: "/api/auth/sign-in/social", status: 403, contentType: "application/json", body: "social-sign-in-blocked", requestBody: "{}" },
  { method: "GET", path: "/api/internal/analytics-rollup", status: 401, contentType: "application/json", body: "json" },
  { method: "HEAD", path: "/audio/bgm/digital-observatory.mp3", status: 200, contentType: "audio/mpeg", body: "none" },
];
const PRODUCTION_UMAMI_CHECK = {
  method: "GET",
  path: "/api/umami/script.js",
  status: 200,
  contentType: "application/javascript",
  body: "text",
};
const STAGING_UMAMI_CHECK = {
  method: "GET",
  path: "/api/umami/script.js",
  status: 503,
  contentType: "",
  body: "none",
};
const PRIVATE_SHARE_CHECKS = PRIVATE_SHARE_LOCALES.flatMap((locale) => {
  const prefix = locale === "ko" ? "" : `/${locale}`;
  return [
    { method: "HEAD", path: `${prefix}/p/${PRIVATE_SHARE_PROBE}`, status: 200, contentType: "text/html", body: "none", privateShare: true },
    { method: "HEAD", path: `${prefix}/r/not-a-real-share`, status: 200, contentType: "text/html", body: "none", privateShare: true },
  ];
});

function checksForEnvironment(appEnvironment) {
  const umamiCheck = appEnvironment === "staging" ? STAGING_UMAMI_CHECK : PRODUCTION_UMAMI_CHECK;
  return [...SERVICE_CHECKS, umamiCheck, ...PRIVATE_SHARE_CHECKS];
}

export function resolveOrigin(value) {
  let origin;
  try {
    origin = new URL(value);
  } catch {
    throw new Error("Origin must be a valid HTTPS origin.");
  }

  if (
    origin.protocol !== "https:"
    || origin.username !== ""
    || origin.password !== ""
    || origin.pathname !== "/"
    || origin.search !== ""
    || origin.hash !== ""
  ) {
    throw new Error("Origin must be HTTPS and cannot include credentials, a path, a query, or a fragment.");
  }

  return origin.origin;
}

export function hasRequiredSecurityHeaders(headers) {
  const hsts = new Set((headers.get("strict-transport-security") ?? "")
    .toLowerCase()
    .split(";")
    .map((directive) => directive.trim()));
  const permissions = new Set((headers.get("permissions-policy") ?? "")
    .toLowerCase()
    .split(",")
    .map((directive) => directive.trim()));
  const contentSecurityPolicy = new Set((headers.get("content-security-policy-report-only") ?? "")
    .toLowerCase()
    .split(";")
    .map((directive) => directive.trim()));

  return hsts.has("max-age=31536000")
    && headers.get("x-content-type-options")?.trim().toLowerCase() === "nosniff"
    && headers.get("referrer-policy")?.trim().toLowerCase() === "strict-origin-when-cross-origin"
    && permissions.has("camera=()")
    && permissions.has("microphone=()")
    && permissions.has("geolocation=()")
    && contentSecurityPolicy.has("default-src 'self'")
    && contentSecurityPolicy.has("frame-ancestors 'none'");
}

async function validateBody(response, mode) {
  if (mode === "none") return true;
  if (mode === "text") {
    await response.arrayBuffer();
    return true;
  }

  try {
    const body = await response.json();
    if (mode === "health") {
      return typeof body === "object" && body !== null && "ok" in body && body.ok === true;
    }
    if (mode === "sign-up-blocked") {
      return typeof body === "object" && body !== null && body.error === "Sign-up is disabled.";
    }
    if (mode === "social-sign-in-blocked") {
      return typeof body === "object" && body !== null && body.error === "This sign-in method is disabled.";
    }
    return true;
  } catch {
    return false;
  }
}

async function runCheck(origin, check, fetchImpl) {
  try {
    const response = await fetchImpl(new URL(check.path, origin), {
      method: check.method,
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      ...(check.requestBody === undefined ? {} : {
        headers: { "content-type": "application/json" },
        body: check.requestBody,
      }),
    });
    const contentType = (response.headers.get("content-type") ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    const lengthHeader = response.headers.get("content-length");
    const lengthIsValid = check.method !== "HEAD"
      || lengthHeader === null
      || /^\d+$/u.test(lengthHeader) && Number(lengthHeader) > 0;
    const cacheDirectives = new Set((response.headers.get("cache-control") ?? "")
      .toLowerCase()
      .split(",")
      .map((directive) => directive.trim()));
    const privateShareHeadersValid = check.privateShare !== true || (
      response.headers.get("referrer-policy")?.trim().toLowerCase() === "no-referrer"
      && cacheDirectives.has("private")
      && cacheDirectives.has("no-store")
    );
    const securityHeadersValid = check.securityHeaders !== true || hasRequiredSecurityHeaders(response.headers);
    const bodyIsValid = await validateBody(response, check.body);
    const passed = response.status === check.status
      && contentType === check.contentType
      && lengthIsValid
      && privateShareHeadersValid
      && securityHeadersValid
      && bodyIsValid;

    return {
      method: check.method,
      path: check.path,
      passed,
      status: response.status,
      contentType: contentType || "missing content-type",
      privateShareHeadersValid,
      securityHeadersValid,
    };
  } catch {
    return {
      method: check.method,
      path: check.path,
      passed: false,
      status: null,
      contentType: "unavailable",
    };
  }
}

export async function runSmoke(originValue, fetchImpl = fetch, appEnvironment = "production") {
  const origin = resolveOrigin(originValue);
  const results = [];
  for (const check of checksForEnvironment(appEnvironment)) results.push(await runCheck(origin, check, fetchImpl));
  return results;
}

function parseArguments(args, environment) {
  let origin = environment.RAILWAY_SMOKE_ORIGIN
    ?? environment.NEXT_PUBLIC_SITE_URL
    ?? DEFAULT_ORIGIN;

  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== "--origin" || args[index + 1] === undefined) {
      throw new Error("Usage: node scripts/railway-smoke.mjs [--origin https://example.com]");
    }
    origin = args[index + 1];
    index += 1;
  }

  return resolveOrigin(origin);
}

export async function main(args = process.argv.slice(2), environment = process.env, log = console) {
  let origin;
  try {
    origin = parseArguments(args, environment);
  } catch (error) {
    log.error(error instanceof Error ? error.message : "Invalid smoke-check arguments.");
    return 2;
  }

  const appEnvironment = environment.APP_ENV === "staging" ? "staging" : "production";
  const results = await runSmoke(origin, fetch, appEnvironment);
  for (const result of results) {
    const label = result.passed ? "PASS" : "FAIL";
    const status = result.status === null ? "request failed" : `HTTP ${result.status}`;
    log[result.passed ? "log" : "error"](
      `${label} ${result.method} ${result.path} — ${status}; ${result.contentType}`
        + `${result.privateShareHeadersValid === false ? "; share privacy headers invalid" : ""}`
        + `${result.securityHeadersValid === false ? "; required security headers invalid" : ""}`,
    );
  }

  const passed = results.filter((result) => result.passed).length;
  log.log(`Railway non-mutating smoke check: ${passed}/${results.length} passed; no analytics events were sent.`);
  return passed === results.length ? 0 : 1;
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href) {
  process.exitCode = await main();
}
