export async function callRailwayInternalRoute(path, secretName, timeoutMs, fetchImpl = fetch) {
  if (process.env.APP_ENV !== "production") {
    throw new Error("Railway internal jobs require APP_ENV=production");
  }

  const secret = process.env[secretName];
  if (typeof secret !== "string" || secret.length < 32 || /[\r\n]/u.test(secret)) {
    throw new Error(`${secretName} must contain at least 32 characters`);
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
  if (!/^\/api\/internal\/[a-z0-9-]+$/u.test(path)) throw new Error("Invalid internal route path");

  let response;
  try {
    response = await fetchImpl(new URL(path, origin), {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new Error("Railway internal job request failed");
  }

  if (!response.ok) throw new Error(`Railway internal job returned HTTP ${response.status}`);
}
