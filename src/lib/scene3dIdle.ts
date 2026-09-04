type IdleTask = () => void;

interface IdleWindow {
  readonly requestIdleCallback?: (callback: IdleTask, options?: { readonly timeout: number }) => number;
  readonly cancelIdleCallback?: (handle: number) => void;
}

const IDLE_TIMEOUT_MS = 1200;
const MIN_DELAY_MS = 350;

/** Defer decorative WebGL work until the first render has had time to settle. */
export function scheduleScene3dIdle(task: IdleTask): () => void {
  if (typeof window === "undefined") return () => undefined;

  const idleWindow = window as unknown as IdleWindow;
  let idleReady = typeof idleWindow.requestIdleCallback !== "function";
  let delayReady = false;
  let cancelled = false;
  const runIfReady = (): void => {
    if (!cancelled && idleReady && delayReady) task();
  };
  const delayHandle = window.setTimeout(() => {
    delayReady = true;
    runIfReady();
  }, MIN_DELAY_MS);
  const idleHandle = idleWindow.requestIdleCallback?.(() => {
    idleReady = true;
    runIfReady();
  }, { timeout: IDLE_TIMEOUT_MS });

  return () => {
    cancelled = true;
    window.clearTimeout(delayHandle);
    if (idleHandle !== undefined) idleWindow.cancelIdleCallback?.(idleHandle);
  };
}
