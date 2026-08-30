import { readFile } from "node:fs/promises";
import path from "node:path";
import { isFontManifest, selectSubsets, type FontFamilyKey, type FontManifest } from "./fontSubset";

/**
 * 구글 폰트에서 필요한 글자만 잘라 받는다.
 * next/og(Satori)는 woff2 를 못 읽으므로 scripts/prepare-og-fonts.mjs 가
 * 미리 woff 로 잘라 public/fonts/og 에 저장해 둔 것을 읽는다.
 *
 * 서버 전용 모듈 — "use client" 컴포넌트에서 import 하지 않는다.
 */

type FontWeight = 500 | 900;

export interface OgFont {
  readonly name: "Serif" | "Sans";
  readonly data: ArrayBuffer;
  readonly weight: FontWeight;
  readonly style: "normal";
}

const FONT_PACKAGE_BY_KEY: Record<FontFamilyKey, string> = {
  serif: "noto-serif-kr",
  sans: "ibm-plex-sans-kr",
};

const FONT_WEIGHT_BY_KEY: Record<FontFamilyKey, FontWeight> = {
  serif: 900,
  sans: 500,
};

const FONT_NAME_BY_KEY: Record<FontFamilyKey, "Serif" | "Sans"> = {
  serif: "Serif",
  sans: "Sans",
};

let fontManifestPromise: Promise<FontManifest | null> | null = null;

// 같은 서버 인스턴스에서 반복 호출돼도 파일을 다시 읽지 않도록 모듈 스코프에 캐시한다.
function loadFontManifest(): Promise<FontManifest | null> {
  if (!fontManifestPromise) {
    fontManifestPromise = readFile(
      path.join(process.cwd(), "public/fonts/og/manifest.json"),
      "utf8",
    )
      .then((contents) => {
        const parsed: unknown = JSON.parse(contents);
        return isFontManifest(parsed) ? parsed : null;
      })
      .catch(() => null);
  }

  return fontManifestPromise;
}

async function loadFontFamily(key: FontFamilyKey, text: string): Promise<OgFont[]> {
  const manifest = await loadFontManifest();
  if (!manifest) return [];

  const packageName = FONT_PACKAGE_BY_KEY[key];
  const weight = FONT_WEIGHT_BY_KEY[key];
  const familyName = FONT_NAME_BY_KEY[key];
  const candidates = selectSubsets(manifest, key, text);

  const loaded = await Promise.all(
    candidates.map(async (subset): Promise<OgFont | null> => {
      try {
        const bytes = await readFile(
          path.join(process.cwd(), "public/fonts/og", packageName, subset.file),
        );
        const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        return { name: familyName, data, weight, style: "normal" };
      } catch {
        return null;
      }
    }),
  );

  return loaded.filter((font): font is OgFont => font !== null);
}

export async function loadOgFonts(args: {
  readonly serifText: string;
  readonly sansText: string;
}): Promise<readonly OgFont[]> {
  const families = await Promise.all([
    loadFontFamily("serif", args.serifText),
    loadFontFamily("sans", args.sansText),
  ]);

  return families.flat();
}
