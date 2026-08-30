import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import type { RunSnapshot } from "@engine/cognitive-standardized/types";
import { StandardizedRunClient } from "../StandardizedRunClient";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const run: RunSnapshot = {
  runId: "11111111-1111-4111-8111-111111111111",
  status: "active",
  answeredCount: 0,
  targetItemCount: 20,
  nextItem: {
    assignmentId: "22222222-2222-4222-8222-222222222222",
    ordinal: 1,
    domain: "gf",
    stimulus: { kind: "text", textKo: "2 + 2 = ?", textEn: "2 + 2 = ?" },
    options: [
      { id: "a", labelKo: "3", labelEn: "3", figure: null },
      { id: "b", labelKo: "4", labelEn: "4", figure: null },
    ],
  },
};

describe("StandardizedRunClient", () => {
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

  it("does not expose an answer key and disables submit until an option is selected", () => {
    act(() =>
      root.render(
        <StandardizedRunClient
          initialRun={run}
          locale="ko"
          labels={{ progress: "{answered} / {total}", submit: "답변 제출", invalid: "실행 오류", stale: "실행 만료", option: "선택지", timerNote: "채점에 쓰이지 않습니다" }}
        />,
      ),
    );

    const submit = container.querySelector<HTMLButtonElement>("button[type='button']");
    expect(submit?.disabled).toBe(true);
    expect(container.textContent).not.toContain("correctOptionId");
    expect(container.textContent).not.toContain("secret");
  });

  it("exposes progress as an accessible progressbar and shows the scoring-exempt timer", () => {
    act(() =>
      root.render(
        <StandardizedRunClient
          initialRun={run}
          locale="ko"
          labels={{ progress: "{answered} / {total}", submit: "답변 제출", invalid: "실행 오류", stale: "실행 만료", option: "선택지", timerNote: "채점에 쓰이지 않습니다" }}
        />,
      ),
    );

    const progressbar = container.querySelector("[role='progressbar']");
    expect(progressbar?.getAttribute("aria-valuenow")).toBe("0");
    expect(progressbar?.getAttribute("aria-valuemax")).toBe("20");
    expect(container.textContent).toContain("0:00");
    expect(container.textContent).toContain("채점에 쓰이지 않습니다");
  });
});
