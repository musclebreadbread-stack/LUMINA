import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/r/",
        "/compatibility/",
        "/numerology/result",
        "/psychometrics/result",
        "/psychometrics/types/result",
        "/darktriad/result",
        "/attachment/result",
        "/eq/result",
        "/cognitive/result",
        "/cognitive/internal-preview",
      ],
    },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
