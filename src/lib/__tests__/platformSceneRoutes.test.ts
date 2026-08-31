import { describe, expect, it } from "vitest";
import { hasDedicatedPlatformScene, platformSceneTone } from "@/lib/platformSceneRoutes";

describe("platform scene route contract", () => {
  it("maps exploration routes to their visual language", () => {
    expect(platformSceneTone("/")).toBe("home");
    expect(platformSceneTone("/tarot")).toBe("tarot");
    expect(platformSceneTone("/numerology/result")).toBe("numerology");
    expect(platformSceneTone("/darktriad")).toBe("darktriad");
    expect(platformSceneTone("/attachment/result")).toBe("attachment");
    expect(platformSceneTone("/eq")).toBe("eq");
    expect(platformSceneTone("/cognitive/run/demo")).toBe("cognitive");
    expect(platformSceneTone("/psychometrics/types")).toBe("psychometrics");
    expect(platformSceneTone("/horoscope/modern/leo")).toBe("horoscope");
    expect(platformSceneTone("/privacy")).toBe("neutral");
  });

  it("does not mount a second WebGL canvas beside dedicated scenes", () => {
    expect(hasDedicatedPlatformScene("/")).toBe(true);
    expect(hasDedicatedPlatformScene("/compatibility")).toBe(true);
    expect(hasDedicatedPlatformScene("/compatibility/a/b")).toBe(true);
    expect(hasDedicatedPlatformScene("/cognitive/result")).toBe(true);
    expect(hasDedicatedPlatformScene("/psychometrics/result")).toBe(true);
    expect(hasDedicatedPlatformScene("/tarot/three/seed")).toBe(true);
    expect(hasDedicatedPlatformScene("/tarot")).toBe(false);
    expect(hasDedicatedPlatformScene("/methodology")).toBe(false);
  });
});
