import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ResearchConsent } from "../ResearchConsent";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("ResearchConsent", () => {
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

  it("keeps the continue action disabled until operational storage is accepted", () => {
    const onContinue = vi.fn();
    act(() => root.render(<ResearchConsent onContinue={onContinue} locale="ko" />));

    const button = container.querySelector<HTMLButtonElement>("button[type='submit']");
    const operational = container.querySelector<HTMLInputElement>("input[name='operationalStorage']");
    const research = container.querySelector<HTMLInputElement>("input[name='researchParticipation']");
    expect(button?.disabled).toBe(true);
    expect(operational?.checked).toBe(false);
    expect(research?.checked).toBe(false);

    act(() => operational!.click());
    expect(button?.disabled).toBe(false);
    act(() => button!.click());
    expect(onContinue).toHaveBeenCalledWith({ operationalStorage: true, researchParticipation: false });
  });
});
