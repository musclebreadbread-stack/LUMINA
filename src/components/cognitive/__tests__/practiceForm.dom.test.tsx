import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { PRACTICE_ITEMS } from "@/server/cognitive/practiceItems";
import { PracticeForm } from "../PracticeForm";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("PracticeForm", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("disables explanations until a practice answer is selected", () => {
    act(() => {
      root.render(<PracticeForm items={PRACTICE_ITEMS} locale="ko" />);
    });

    const explanationButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button[data-role='explanation']"),
    );
    expect(explanationButtons.length).toBeGreaterThan(0);
    expect(explanationButtons.every((button) => button.disabled)).toBe(true);
  });

  it("reveals an explanation only after the selected item is checked", () => {
    act(() => {
      root.render(<PracticeForm items={PRACTICE_ITEMS.slice(0, 1)} locale="ko" />);
    });

    const radio = container.querySelector<HTMLInputElement>("input[type='radio']");
    const button = container.querySelector<HTMLButtonElement>("button[data-role='explanation']");
    expect(radio).not.toBeNull();
    expect(button).not.toBeNull();
    expect(button?.disabled).toBe(true);

    act(() => {
      radio!.click();
    });
    expect(button?.disabled).toBe(false);

    act(() => {
      button!.click();
    });
    expect(container.textContent).toContain("매번 3씩 증가");
  });
});
