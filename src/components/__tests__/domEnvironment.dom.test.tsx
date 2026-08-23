import { describe, expect, it } from "vitest";

describe("component test environment", () => {
  it("provides a DOM for future component tests", () => {
    const element = document.createElement("button");
    element.textContent = "LUMINA";
    document.body.append(element);

    expect(document.querySelector("button")?.textContent).toBe("LUMINA");
  });
});
