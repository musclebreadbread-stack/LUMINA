import { describe, expect, it } from "vitest";
import { buildAttachmentView } from "@/lib/attachmentModel";

describe("attachment view", () => {
  it("returns continuous axes without an empirical percentile", () => {
    const responses = Object.fromEntries(
      Array.from({ length: 36 }, (_, index) => [index + 1, 3]),
    ) as Record<number, 1 | 2 | 3 | 4 | 5>;
    const view = buildAttachmentView(responses);
    expect(view.anxiety.mean).toBe(3);
    expect(view.avoidance.mean).toBe(3);
    expect("percentile" in view.anxiety).toBe(false);
  });
});
