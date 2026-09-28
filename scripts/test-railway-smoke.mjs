import assert from "node:assert/strict";
import test from "node:test";
import { hasRequiredSecurityHeaders, resolveOrigin, runSmoke } from "./railway-smoke.mjs";

const REQUIRED_SECURITY_HEADERS = {
  "strict-transport-security": "max-age=31536000",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "content-security-policy-report-only": "default-src 'self'; frame-ancestors 'none'",
};
const AUTH_GUARD_RESPONSES = {
  "/api/auth/sign-up/email": "Sign-up is disabled.",
  "/api/auth/sign-in/social": "This sign-in method is disabled.",
};

function authGuardResponse(pathname) {
  const error = AUTH_GUARD_RESPONSES[pathname];
  return error === undefined ? null : Response.json({ error }, { status: 403 });
}

test("requires the Phase 0 production security headers", () => {
  const headers = new Headers({
    "strict-transport-security": "max-age=31536000",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    "content-security-policy-report-only": "default-src 'self'; frame-ancestors 'none'",
  });

  assert.equal(hasRequiredSecurityHeaders(headers), true);
  headers.delete("content-security-policy-report-only");
  assert.equal(hasRequiredSecurityHeaders(headers), false);
});

test("accepts HTTPS origins and removes a trailing slash", () => {
  assert.equal(resolveOrigin("https://example.com/"), "https://example.com");
});

for (const origin of [
  "http://example.com",
  "https://example.com/path",
  "https://example.com?token=secret",
  "https://user:password@example.com",
]) {
  test(`rejects unsafe origin ${origin}`, () => {
    assert.throws(() => resolveOrigin(origin));
  });
}

test("checks only the expected routes and passes on healthy responses", async () => {
  const requests = [];
  const mockFetch = async (input, init) => {
    const url = new URL(input);
    requests.push({ path: url.pathname, method: init.method, body: init.body });

    const authResponse = authGuardResponse(url.pathname);
    if (authResponse !== null) return authResponse;

    if (init.method === "HEAD") {
      if (url.pathname.startsWith("/audio/")) {
        return new Response(null, {
          status: 200,
          headers: { "content-type": "audio/mpeg", "content-length": "32" },
        });
      }
      return new Response(null, {
        status: 200,
        headers: {
          "content-type": "text/html",
          "referrer-policy": "no-referrer",
          "cache-control": "private, no-store",
        },
      });
    }

    if (url.pathname === "/") {
      return new Response("<html></html>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8", ...REQUIRED_SECURITY_HEADERS },
      });
    }
    if (url.pathname === "/api/health" || url.pathname === "/api/health/ready") {
      return Response.json({ ok: true });
    }
    if (url.pathname === "/api/auth/get-session") {
      return Response.json(null);
    }
    if (url.pathname === "/api/internal/analytics-rollup") {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    return new Response("export {};", { status: 200, headers: { "content-type": "application/javascript" } });
  };

  const results = await runSmoke("https://example.com", mockFetch);

  assert.equal(results.length, 19);
  assert.ok(results.every((result) => result.passed));
  assert.equal(results.find((result) => result.path === "/")?.securityHeadersValid, true);
  assert.ok(requests.some((request) => request.path === "/audio/bgm/digital-observatory.mp3" && request.method === "HEAD"));
  for (const locale of ["ko", "en", "ja", "zh-Hant", "es"]) {
    const prefix = locale === "ko" ? "" : `/${locale}`;
    assert.ok(requests.some((request) => request.path === `${prefix}/p/x` && request.method === "HEAD"));
    assert.ok(requests.some((request) => request.path === `${prefix}/r/not-a-real-share` && request.method === "HEAD"));
  }
  assert.deepEqual(
    requests.filter((request) => request.method === "POST"),
    [
      { path: "/api/auth/sign-up/email", method: "POST", body: "{}" },
      { path: "/api/auth/sign-in/social", method: "POST", body: "{}" },
    ],
  );
  assert.ok(requests.every((request) => ["GET", "HEAD", "POST"].includes(request.method)));
  assert.ok(requests.filter((request) => request.method === "POST").every(({ path }) => Object.hasOwn(AUTH_GUARD_RESPONSES, path)));
  assert.ok(requests.every((request) => !request.path.includes("/api/umami/api/send")));
});

test("expects the Umami proxy to stay disabled in staging", async () => {
  const mockFetch = async (input, init) => {
    const url = new URL(input);
    const authResponse = authGuardResponse(url.pathname);
    if (authResponse !== null) return authResponse;

    if (init.method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: url.pathname.startsWith("/audio/")
          ? { "content-type": "audio/mpeg", "content-length": "32" }
          : {
            "content-type": "text/html",
            "referrer-policy": "no-referrer",
            "cache-control": "private, no-store",
          },
      });
    }
    if (url.pathname === "/api/umami/script.js") {
      return new Response(null, { status: 503, headers: { "cache-control": "no-store" } });
    }
    if (url.pathname === "/api/health" || url.pathname === "/api/health/ready") {
      return Response.json({ ok: true });
    }
    if (url.pathname === "/api/internal/analytics-rollup") {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    if (url.pathname === "/") {
      return new Response("<html></html>", {
        status: 200,
        headers: { "content-type": "text/html", ...REQUIRED_SECURITY_HEADERS },
      });
    }
    return Response.json(null);
  };

  const results = await runSmoke("https://example.com", mockFetch, "staging");

  assert.equal(results.length, 19);
  assert.ok(results.every((result) => result.passed));
  assert.equal(results.find((result) => result.path === "/api/umami/script.js")?.status, 503);
});

test("fails when health JSON is malformed or the unauthenticated endpoint is not rejected", async () => {
  const mockFetch = async (input, init) => {
    const url = new URL(input);
    if (init.method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: url.pathname.startsWith("/audio/")
          ? { "content-type": "audio/mpeg" }
          : { "content-type": "text/html", "cache-control": "private, no-store" },
      });
    }
    if (url.pathname === "/") {
      return new Response("<html></html>", {
        status: 200,
        headers: { "content-type": "text/html", ...REQUIRED_SECURITY_HEADERS },
      });
    }
    if (url.pathname === "/api/health") {
      return new Response("not-json", { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url.pathname === "/api/auth/sign-up/email") {
      return Response.json({ ok: true }, { status: 200 });
    }
    if (url.pathname === "/api/auth/sign-in/social") {
      return Response.json({ ok: true }, { status: 200 });
    }
    if (url.pathname === "/api/umami/script.js") {
      return new Response("export {};", { status: 200, headers: { "content-type": "application/javascript" } });
    }
    return Response.json({ ok: true }, { status: 200 });
  };

  const results = await runSmoke("https://example.com", mockFetch);

  assert.equal(results.find((result) => result.path === "/api/health")?.passed, false);
  assert.equal(results.find((result) => result.path === "/api/internal/analytics-rollup")?.passed, false);
  assert.equal(results.find((result) => result.path === "/api/auth/sign-up/email")?.passed, false);
  assert.equal(results.find((result) => result.path === "/api/auth/sign-in/social")?.passed, false);
  assert.equal(results.find((result) => result.path === "/ja/p/x")?.privateShareHeadersValid, false);
});
