import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getLocale, getTranslations } from "next-intl/server";
import { buildReportView, formatBirthLabel } from "@/lib/reportModel";
import { decodeProfile } from "@/lib/share";
import { placeDisplayLabel } from "@/lib/profile";
import type { Locale } from "@/i18n/locale";

/**
 * 공유 카드 이미지.
 *
 * 카카오톡·X 미리보기 규격인 1200×630. 링크에 담긴 입력값으로 그 자리에서
 * 다시 계산하므로 서버에 저장해 둔 것이 없다.
 *
 * Satori(next/og)는 CSS 변수·filter·상속을 지원하지 않으므로 색은 전부 리터럴로
 * 적고 레이아웃은 flex 만 쓴다. 한자·한글은 웹폰트가 없으면 두부(tofu)로 나오므로,
 * 필요한 글자만 담은 초소형 서브셋을 구글 폰트에서 받아 쓴다.
 */

export const alt = "LUMINA 사주 원국";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

const INK = "#12100D";
const INK_LINE = "#2A251E";
const HOBUN = "#EDE6D8";
const HOBUN_DIM = "#A79E90";
const HOBUN_FAINT = "#8A8276";

const ELEMENT_HEX: Record<string, string> = {
  wood: "#5BA383",
  fire: "#D95B41",
  earth: "#DFA83E",
  metal: "#B9BFC4",
  water: "#5580D4",
};

/**
 * 구글 폰트에서 필요한 글자만 잘라 받는다.
 * 오래된 User-Agent 를 보내야 woff2 대신 Satori 가 읽을 수 있는 ttf 를 준다.
 */
type FontFamilyKey = "serif" | "sans";
type FontWeight = 500 | 900;

interface FontSubset {
  readonly file: string;
  readonly range: string;
}

type FontManifest = Record<FontFamilyKey, Record<string, FontSubset>>;

interface OgFont {
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

let fontManifestPromise: Promise<FontManifest | null> | null = null;

function isFontManifest(value: unknown): value is FontManifest {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<Record<FontFamilyKey, unknown>>;
  return (["serif", "sans"] as const).every((key) => {
    const family = candidate[key];
    if (!family || typeof family !== "object") return false;

    return Object.values(family).every((subset) => {
      if (!subset || typeof subset !== "object") return false;
      const entry = subset as Partial<FontSubset>;
      return typeof entry.file === "string" && typeof entry.range === "string";
    });
  });
}

async function loadFontManifest(): Promise<FontManifest | null> {
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

function rangeContainsCodePoint(range: string, codePoint: number): boolean {
  return range.split(",").some((token) => {
    const values = token.trim().toUpperCase().replace(/^U\+/, "").split("-");
    const start = Number.parseInt(values[0] ?? "", 16);
    const end = Number.parseInt(values[1] ?? values[0] ?? "", 16);

    return Number.isFinite(start) && Number.isFinite(end) && codePoint >= start && codePoint <= end;
  });
}

function subsetSupportsText(range: string, text: string): boolean {
  return [...text].some((character) =>
    rangeContainsCodePoint(range, character.codePointAt(0) ?? -1),
  );
}

async function loadLocalFontFamily(key: FontFamilyKey, text: string): Promise<OgFont[]> {
  const manifest = await loadFontManifest();
  if (!manifest) return [];

  const packageName = FONT_PACKAGE_BY_KEY[key];
  const weight = FONT_WEIGHT_BY_KEY[key];
  const familyName = key === "serif" ? "Serif" : "Sans";
  const candidates = Object.values(manifest[key]).filter((subset) =>
    subsetSupportsText(subset.range, text),
  );

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

export default async function Image({ params }: { params: Promise<{ data: string }> }) {
  const { data } = await params;
  const profile = decodeProfile(data);

  if (!profile) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: INK,
            color: HOBUN,
            fontSize: 56,
            letterSpacing: 18,
          }}
        >
          LUMINA
        </div>
      ),
      size,
    );
  }

  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("common");
  const view = buildReportView(profile, new Date());
  const spirit = view.character.def;
  const spiritHex = ELEMENT_HEX[spirit.element] ?? HOBUN;
  const spiritName = locale === "en" ? spirit.nameEn : spirit.name;
  const spiritTagline = locale === "en" ? spirit.taglineEn : spirit.tagline;
  const birthLabel = formatBirthLabel(view.birthLocalISO, view.precision.timeUnknown, locale);
  const tierLabel = t("tierCultural");
  const placeLabel = placeDisplayLabel(view.placeLabel, locale);

  // 카드에 실제로 찍히는 글자만 모아 서브셋을 만든다.
  const hanjaText = [
    ...view.pillars.flatMap((p) => [p.mark, p.stem.hanja, p.branch.hanja]),
    spirit.hanja,
  ].join("");
  const koreanText = `${birthLabel}${placeLabel}${spiritName}${spiritTagline}${tierLabel}LUMINA0123456789 ·`;

  const fonts = await Promise.all([
    loadLocalFontFamily("serif", hanjaText),
    loadLocalFontFamily("sans", koreanText),
  ]).then((families) => families.flat());

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: INK,
          padding: "56px 64px",
          fontFamily: "Sans",
        }}
      >
        {/* 머리 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: HOBUN, fontSize: 22, letterSpacing: 10 }}>LUMINA</div>
          <div
            style={{
              display: "flex",
              border: `1px solid ${INK_LINE}`,
              color: HOBUN_FAINT,
              fontSize: 18,
              padding: "8px 16px",
            }}
          >
            {tierLabel}
          </div>
        </div>

        {/* 여덟 글자 */}
        <div style={{ display: "flex", alignItems: "center", gap: 56 }}>
          <div style={{ display: "flex", gap: 26 }}>
            {view.pillars.map((p) => (
              <div
                key={p.mark}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
              >
                <div style={{ color: HOBUN_FAINT, fontSize: 18, fontFamily: "Serif" }}>{p.mark}</div>
                <div
                  style={{
                    fontFamily: "Serif",
                    fontSize: 92,
                    lineHeight: 1,
                    color: ELEMENT_HEX[p.stem.element] ?? HOBUN,
                  }}
                >
                  {p.stem.hanja}
                </div>
                <div
                  style={{
                    fontFamily: "Serif",
                    fontSize: 92,
                    lineHeight: 1,
                    color: ELEMENT_HEX[p.branch.element] ?? HOBUN,
                  }}
                >
                  {p.branch.hanja}
                </div>
              </div>
            ))}
          </div>

          {/* 정령 — 인장 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              borderLeft: `1px solid ${INK_LINE}`,
              paddingLeft: 52,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 132,
                height: 132,
                borderRadius: 66,
                border: `2px solid ${spiritHex}`,
                color: spiritHex,
                fontFamily: "Serif",
                fontSize: 62,
              }}
            >
              {spirit.hanja}
            </div>
            <div style={{ color: spiritHex, fontSize: 30 }}>{spiritName}</div>
          </div>
        </div>

        {/* 꼬리 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Satori 는 자식이 여럿인 div 에 display:flex 를 요구한다.
              `{a} · {b}` 는 텍스트 노드 세 개가 되므로 미리 한 문자열로 합친다. */}
          <div style={{ color: HOBUN_DIM, fontSize: 26 }}>
            {`${birthLabel} · ${placeLabel}`}
          </div>
          <div style={{ color: HOBUN_FAINT, fontSize: 20 }}>{spiritTagline}</div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
