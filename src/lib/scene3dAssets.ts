export type LensScenePreset = "result" | "relationship" | "evidence";

export interface LensScenePalette {
  readonly primary: string;
  readonly secondary: string;
  readonly tertiary: string;
  readonly glow: string;
}

export type PlatformSceneTone =
  | "home"
  | "tarot"
  | "saju"
  | "numerology"
  | "psychometrics"
  | "darktriad"
  | "attachment"
  | "eq"
  | "cognitive"
  | "horoscope"
  | "neutral";

export const PLATFORM_SCENE_MODEL_SRC = "/3d/lumina-observatory.glb" as const;

/** Blender MCP로 제작한 관측소 자산과 같은 색온도를 모든 라우트에 전달한다. */
export const PLATFORM_SCENE_PALETTES: Readonly<Record<PlatformSceneTone, LensScenePalette>> = Object.freeze({
  home: Object.freeze({ primary: "#dfa83e", secondary: "#9badff", tertiary: "#ede6d8", glow: "#82d8ce" }),
  tarot: Object.freeze({ primary: "#d1a46a", secondary: "#d0b7ec", tertiary: "#ede6d8", glow: "#82d8ce" }),
  saju: Object.freeze({ primary: "#5ba383", secondary: "#dfa83e", tertiary: "#ede6d8", glow: "#82d8ce" }),
  numerology: Object.freeze({ primary: "#dfa83e", secondary: "#9badff", tertiary: "#d7b47b", glow: "#82d8ce" }),
  psychometrics: Object.freeze({ primary: "#9badff", secondary: "#82d8ce", tertiary: "#ede6d8", glow: "#d0b7ec" }),
  darktriad: Object.freeze({ primary: "#d95b41", secondary: "#d0b7ec", tertiary: "#ede6d8", glow: "#dfa83e" }),
  attachment: Object.freeze({ primary: "#d95b41", secondary: "#5580d4", tertiary: "#ede6d8", glow: "#82d8ce" }),
  eq: Object.freeze({ primary: "#82d8ce", secondary: "#dfa83e", tertiary: "#ede6d8", glow: "#9badff" }),
  cognitive: Object.freeze({ primary: "#5580d4", secondary: "#9badff", tertiary: "#ede6d8", glow: "#82d8ce" }),
  horoscope: Object.freeze({ primary: "#dfa83e", secondary: "#5580d4", tertiary: "#ede6d8", glow: "#d0b7ec" }),
  neutral: Object.freeze({ primary: "#9badff", secondary: "#82d8ce", tertiary: "#ede6d8", glow: "#d7b47b" }),
});

export const PLATFORM_SCENE_BUDGET = Object.freeze({
  maxParticles: 36,
  maxDevicePixelRatio: 1.25,
  maxCanvasPerRoute: 1,
});

/**
 * Blender MCP 연결이 없는 환경에서도 동일한 아트 디렉션을 유지하기 위한
 * 절차적 R3F 팔레트입니다. 외부 텍스처와 원격 모델을 사용하지 않습니다.
 */
export const LENS_SCENE_PALETTES: Readonly<Record<LensScenePreset, LensScenePalette>> = Object.freeze({
  result: Object.freeze({
    primary: "#dfa83e",
    secondary: "#9badff",
    tertiary: "#ede6d8",
    glow: "#82d8ce",
  }),
  relationship: Object.freeze({
    primary: "#d95b41",
    secondary: "#dfa83e",
    tertiary: "#5580d4",
    glow: "#ede6d8",
  }),
  evidence: Object.freeze({
    primary: "#5580d4",
    secondary: "#82d8ce",
    tertiary: "#ede6d8",
    glow: "#9badff",
  }),
});

export const LENS_SCENE_BUDGET = Object.freeze({
  maxParticles: 48,
  maxMaterials: 4,
  maxCanvasPerRoute: 1,
  maxDevicePixelRatio: 1.25,
});
