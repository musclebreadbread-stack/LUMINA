import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LocationCombobox } from "../LocationCombobox";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const COMMITTED_LABEL = "서울특별시 강남구";

function setInputValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("LocationCombobox", () => {
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

  it("reverts the displayed text to the committed value when blurred without a selection", () => {
    const onSelect = vi.fn();
    act(() => {
      root.render(
        <LocationCombobox
          id="test-place"
          value={COMMITTED_LABEL}
          placeholder="place"
          emptyLabel="no results"
          loadingLabel="loading"
          onSelect={onSelect}
        />,
      );
    });

    const input = container.querySelector<HTMLInputElement>("input#test-place")!;
    expect(input.value).toBe(COMMITTED_LABEL);

    act(() => {
      input.focus();
    });
    act(() => {
      setInputValue(input, "부산");
    });
    expect(input.value).toBe("부산");

    act(() => {
      input.blur();
    });

    expect(input.value).toBe(COMMITTED_LABEL);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("still commits a genuine selection made via the listbox", () => {
    const onSelect = vi.fn();
    act(() => {
      root.render(
        <LocationCombobox
          id="test-place"
          value={COMMITTED_LABEL}
          placeholder="place"
          emptyLabel="no results"
          loadingLabel="loading"
          onSelect={onSelect}
        />,
      );
    });

    const input = container.querySelector<HTMLInputElement>("input#test-place")!;
    act(() => {
      input.focus();
    });
    act(() => {
      setInputValue(input, "부산광역시");
    });

    const option = container.querySelector<HTMLLIElement>('li[role="option"]');
    expect(option).not.toBeNull();
    const expectedLabel = option!.textContent;

    act(() => {
      option!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(input.value).toBe(expectedLabel);
  });
});
