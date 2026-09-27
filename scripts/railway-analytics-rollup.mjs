const appEnvironment = process.env.APP_ENV;
if (appEnvironment !== "production") {
  throw new Error("Railway analytics rollup only runs when APP_ENV=production");
}

const secret = process.env.CRON_SECRET;
if (typeof secret !== "string" || secret.length < 32) {
  throw new Error("CRON_SECRET must contain at least 32 characters");
}

const configuredOrigin = process.env.INTERNAL_WEB_ORIGIN;
if (!configuredOrigin) throw new Error("INTERNAL_WEB_ORIGIN is required");

let origin;
try {
  origin = new URL(configuredOrigin);
} catch {
  throw new Error("INTERNAL_WEB_ORIGIN must be a valid URL");
}

const isRailwayPrivateHost = origin.hostname.endsWith(".railway.internal");
if ((origin.protocol !== "https:" && !(origin.protocol === "http:" && isRailwayPrivateHost))
  || origin.username !== "" || origin.password !== "" || origin.search !== "" || origin.hash !== ""
  || (origin.pathname !== "" && origin.pathname !== "/")) {
  throw new Error("INTERNAL_WEB_ORIGIN must be an HTTPS origin or a Railway private-network origin");
}

const target = new URL("/api/internal/analytics-rollup", origin);
let response;
try {
  response = await fetch(target, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
} catch {
  throw new Error("Railway analytics rollup request failed");
}

if (!response.ok) {
  throw new Error(`Railway analytics rollup returned HTTP ${response.status}`);
}

console.log("Railway analytics rollup completed");
