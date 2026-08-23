import type { AttachmentResponse } from "@engine/attachment/scoring";

const STORAGE_KEY = "lumina.attachment.draft";

export function saveDraft(responses: AttachmentResponse): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(responses));
  } catch (error) {
    console.warn("Failed to save attachment draft:", error);
  }
}

export function loadDraft(): AttachmentResponse | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    return JSON.parse(stored) as AttachmentResponse;
  } catch (error) {
    console.warn("Failed to load attachment draft:", error);
    return null;
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to clear attachment draft:", error);
  }
}
