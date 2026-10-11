import { describe, expect, it } from "vitest";
import { buildAdsTxt, readAdSenseClient, readAdSenseSlotId } from "../adsense";

describe("readAdSenseClient", () => {
  it("accepts a ca-pub publisher ID and trims whitespace", () => {
    expect(readAdSenseClient(" ca-pub-1234567890123456 ")).toBe("ca-pub-1234567890123456");
  });

  it.each([undefined, "", "  ", "pub-1234567890123456", "ca-pub-12ab", "ca-pub-1234567890\nx"])(
    "rejects %j",
    (value) => {
      expect(readAdSenseClient(value)).toBeNull();
    },
  );
});

describe("readAdSenseSlotId", () => {
  it("accepts a numeric ad unit ID", () => {
    expect(readAdSenseSlotId("1234567890")).toBe("1234567890");
  });

  it.each([undefined, "", "saju-bottom", "12345", "12345abc"])("rejects %j", (value) => {
    expect(readAdSenseSlotId(value)).toBeNull();
  });
});

describe("buildAdsTxt", () => {
  it("declares Google as a direct seller with the publisher ID", () => {
    expect(buildAdsTxt("ca-pub-1234567890123456")).toContain(
      "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0",
    );
  });

  it("authorizes nobody when no publisher ID is configured", () => {
    const text = buildAdsTxt(null);
    expect(text.split("\n").filter((line) => line.trim() !== "" && !line.startsWith("#"))).toEqual([]);
  });
});
