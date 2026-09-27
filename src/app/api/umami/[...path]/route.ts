import "server-only";
import { scrubAnalyticsUrl } from "@/lib/analyticsScrub";

const UMAMI_HOSTNAME = "umami.railway.internal";
const UMAMI_PORT = "3000";
const MAX_EVENT_BODY_BYTES = 16 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;
const UMAMI_WEBSITE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

type UmamiRouteContext = {
  readonly params: Promise<{ readonly path: string[] }>;
};

function readUmamiOrigin(): string | null {
  const value = process.env.UMAMI_INTERNAL_ORIGIN?.trim();
  if (!value) return null;

  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== "http:" ||
      parsed.hostname !== UMAMI_HOSTNAME ||
      parsed.port !== UMAMI_PORT ||
      parsed.pathname !== "/" ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    ) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function unavailable(): Response {
  return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
}

function notFound(): Response {
  return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
}

function unavailableResponse(status: number): Response {
  return new Response(null, { status, headers: { "Cache-Control": "no-store" } });
}

async function getTrackerScript(): Promise<Response> {
  const origin = readUmamiOrigin();
  if (!origin) return unavailable();

  let upstream: Response;
  try {
    upstream = await fetch(new URL("/script.js", origin), {
      method: "GET",
      headers: { Accept: "application/javascript" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return unavailable();
  }

  if (!upstream.ok || !upstream.body) return unavailable();
  const headers = new Headers({
    "Content-Type": upstream.headers.get("content-type") ?? "application/javascript; charset=utf-8",
    "Cache-Control": upstream.headers.get("cache-control") ?? "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  });
  const etag = upstream.headers.get("etag");
  const lastModified = upstream.headers.get("last-modified");
  if (etag) headers.set("ETag", etag);
  if (lastModified) headers.set("Last-Modified", lastModified);
  return new Response(upstream.body, { status: 200, headers });
}

function safeHeaderValue(value: string | null, maxLength: number): string | null {
  if (value === null || value.length === 0 || value.length > maxLength || /[\r\n\u0000]/u.test(value)) {
    return null;
  }
  return value;
}

async function readBoundedBody(request: Request): Promise<ArrayBuffer | Response> {
  const reader = request.body?.getReader();
  if (!reader) return unavailableResponse(400);

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<{ readonly timedOut: true }>((resolve) => {
    timeoutId = setTimeout(() => resolve({ timedOut: true }), REQUEST_TIMEOUT_MS);
  });
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const next = await Promise.race([
        reader.read().then((result) => ({ timedOut: false as const, result })),
        deadline,
      ]);

      if (next.timedOut) {
        void reader.cancel().catch(() => undefined);
        return unavailableResponse(408);
      }
      if (next.result.done) break;

      totalBytes += next.result.value.byteLength;
      if (totalBytes > MAX_EVENT_BODY_BYTES) {
        void reader.cancel().catch(() => undefined);
        return unavailableResponse(413);
      }
      chunks.push(next.result.value);
    }
  } catch {
    return unavailableResponse(400);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    try {
      reader.releaseLock();
    } catch {
      // A timed out or rejected read may still own the stream lock.
    }
  }

  const body = new ArrayBuffer(totalBytes);
  const bodyView = new Uint8Array(body);
  let offset = 0;
  for (const chunk of chunks) {
    bodyView.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function scrubReferrer(value: string): string | null {
  if (value.length === 0) return "";

  try {
    const parsed = new URL(value, "https://lumina.jack.ai.kr");
    if (
      (parsed.protocol !== "https:" && parsed.protocol !== "http:") ||
      parsed.username ||
      parsed.password
    ) return null;

    const safePath = scrubAnalyticsUrl(parsed.pathname);
    return safePath === null ? null : `${parsed.origin}${safePath}`;
  } catch {
    return null;
  }
}

function sanitizeEventBody(body: ArrayBuffer, websiteId: string): ArrayBuffer | Response {
  try {
    const decoded: unknown = JSON.parse(new TextDecoder().decode(new Uint8Array(body)));
    if (!isRecord(decoded) || !isRecord(decoded.payload)) return unavailableResponse(400);

    const payload = decoded.payload;
    if (payload.website !== websiteId) return unavailableResponse(403);

    const safeUrl = typeof payload.url === "string" ? scrubAnalyticsUrl(payload.url) : null;
    if (safeUrl === null) return unavailableResponse(400);
    payload.url = safeUrl;

    if (typeof payload.referrer === "string") {
      const safeReferrer = scrubReferrer(payload.referrer);
      if (safeReferrer === null) delete payload.referrer;
      else payload.referrer = safeReferrer;
    } else {
      delete payload.referrer;
    }

    const sanitizedBody = new TextEncoder().encode(JSON.stringify(decoded));
    if (sanitizedBody.byteLength > MAX_EVENT_BODY_BYTES) return unavailableResponse(413);
    const safeBody = new ArrayBuffer(sanitizedBody.byteLength);
    new Uint8Array(safeBody).set(sanitizedBody);
    return safeBody;
  } catch {
    return unavailableResponse(400);
  }
}

async function sendEvent(request: Request): Promise<Response> {
  const origin = readUmamiOrigin();
  if (!origin) return unavailable();

  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID?.trim();
  if (!websiteId || !UMAMI_WEBSITE_ID_PATTERN.test(websiteId)) return unavailable();

  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    return new Response(null, { status: 415, headers: { "Cache-Control": "no-store" } });
  }

  const declaredLengthHeader = request.headers.get("content-length");
  if (declaredLengthHeader !== null) {
    const declaredLength = Number(declaredLengthHeader);
    if (!Number.isSafeInteger(declaredLength) || declaredLength < 0) {
      return new Response(null, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    if (declaredLength > MAX_EVENT_BODY_BYTES) {
      return new Response(null, { status: 413, headers: { "Cache-Control": "no-store" } });
    }
  }

  const bodyOrResponse = await readBoundedBody(request);
  if (bodyOrResponse instanceof Response) return bodyOrResponse;
  const body = bodyOrResponse;
  if (body.byteLength === 0 || body.byteLength > MAX_EVENT_BODY_BYTES) {
    return new Response(null, { status: body.byteLength === 0 ? 400 : 413, headers: { "Cache-Control": "no-store" } });
  }
  const sanitizedBody = sanitizeEventBody(body, websiteId);
  if (sanitizedBody instanceof Response) return sanitizedBody;

  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-umami-website-id": websiteId,
    "x-umami-hostname": "lumina.jack.ai.kr",
  });
  const userAgent = safeHeaderValue(request.headers.get("user-agent"), 512);
  const cacheToken = safeHeaderValue(request.headers.get("x-umami-cache"), 512);
  if (userAgent) headers.set("User-Agent", userAgent);
  if (cacheToken) headers.set("x-umami-cache", cacheToken);

  let upstream: Response;
  try {
    upstream = await fetch(new URL("/api/send", origin), {
      method: "POST",
      headers,
      body: sanitizedBody,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return unavailable();
  }

  const responseHeaders = new Headers({ "Cache-Control": "no-store" });
  const responseType = upstream.headers.get("content-type");
  if (responseType) responseHeaders.set("Content-Type", responseType);
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export async function GET(_request: Request, context: UmamiRouteContext): Promise<Response> {
  const { path } = await context.params;
  if (path.length !== 1 || path[0] !== "script.js") return notFound();
  return getTrackerScript();
}

export async function POST(request: Request, context: UmamiRouteContext): Promise<Response> {
  const { path } = await context.params;
  if (path.length !== 2 || path[0] !== "api" || path[1] !== "send") return notFound();
  return sendEvent(request);
}
