import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAttachmentDraft,
  getAttachmentDraftServerSnapshot,
  getAttachmentDraftSnapshot,
  loadAttachmentDraft,
  saveAttachmentDraft,
  subscribeAttachmentDraft,
} from "../attachmentDraft";

const STORAGE_KEY = "lumina.attachment.draft";

describe("attachment draft storage", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips valid partial responses", () => {
    saveAttachmentDraft({ 1: 5, 2: 2 });
    expect(loadAttachmentDraft()).toEqual({ 1: 5, 2: 2 });
  });

  it("drops malformed entries", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ 1: 6, 2: "3", invalid: 4 }),
    );
    expect(loadAttachmentDraft()).toEqual({});
  });

  it("survives a stored value that is not an object", () => {
    window.localStorage.setItem(STORAGE_KEY, '"not-an-object"');
    expect(loadAttachmentDraft()).toEqual({});
  });

  it("survives unparseable JSON", () => {
    window.localStorage.setItem(STORAGE_KEY, "{oops");
    expect(loadAttachmentDraft()).toEqual({});
  });

  it("clears a completed draft", () => {
    saveAttachmentDraft({ 1: 4 });
    clearAttachmentDraft();
    expect(loadAttachmentDraft()).toEqual({});
  });

  it("serves an empty, referentially stable snapshot on the server", () => {
    expect(getAttachmentDraftServerSnapshot()).toEqual({});
    expect(getAttachmentDraftServerSnapshot()).toBe(getAttachmentDraftServerSnapshot());
  });

  it("keeps the browser snapshot identical until the stored value changes", () => {
    saveAttachmentDraft({ 1: 3 });
    const first = getAttachmentDraftSnapshot();

    expect(getAttachmentDraftSnapshot()).toBe(first);

    saveAttachmentDraft({ 1: 3, 2: 4 });
    const second = getAttachmentDraftSnapshot();

    expect(second).not.toBe(first);
    expect(second).toEqual({ 1: 3, 2: 4 });
  });

  it("notifies subscribers on save and on clear, and stops after unsubscribing", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeAttachmentDraft(listener);

    saveAttachmentDraft({ 1: 2 });
    clearAttachmentDraft();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    saveAttachmentDraft({ 1: 1 });
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
