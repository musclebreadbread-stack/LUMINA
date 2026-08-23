export function getSiteUrl(): URL {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredUrl) {
    try {
      return new URL(configuredUrl);
    } catch {
      // Keep local builds and preview deployments usable when the optional URL is malformed.
    }
  }

  return new URL("http://localhost:3000");
}
