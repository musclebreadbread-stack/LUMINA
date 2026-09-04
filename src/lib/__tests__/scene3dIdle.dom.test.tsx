import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scheduleScene3dIdle } from "../scene3dIdle";

describe("scheduleScene3dIdle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits for the first render settling window before starting work", () => {
    const task = vi.fn();

    scheduleScene3dIdle(task);
    vi.advanceTimersByTime(349);
    expect(task).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(task).toHaveBeenCalledOnce();
  });

  it("cancels deferred work during unmount", () => {
    const task = vi.fn();
    const cancel = scheduleScene3dIdle(task);

    cancel();
    vi.advanceTimersByTime(1200);

    expect(task).not.toHaveBeenCalled();
  });
});
