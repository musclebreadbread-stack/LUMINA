import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LUMINA",
    short_name: "LUMINA",
    description: "동서양 통합 성향·운세 분석 플랫폼",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0D1118",
    theme_color: "#0D1118",
    categories: ["lifestyle"],
    icons: [
      { src: "/icon.png", sizes: "any", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "any", type: "image/png", purpose: "any" },
    ],
  };
}
