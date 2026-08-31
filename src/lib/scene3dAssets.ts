export type LensScenePreset = "result" | "relationship" | "evidence";

export interface LensScenePalette {
  readonly primary: string;
  readonly secondary: string;
  readonly tertiary: string;
  readonly glow: string;
}

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
