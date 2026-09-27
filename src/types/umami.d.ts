interface UmamiTracker {
  track(
    payload: Readonly<Record<string, string | Readonly<Record<string, string>>>>
      | ((properties: Readonly<Record<string, unknown>>) => Readonly<Record<string, unknown>>),
  ): void;
}

interface Window {
  umami?: UmamiTracker;
}
