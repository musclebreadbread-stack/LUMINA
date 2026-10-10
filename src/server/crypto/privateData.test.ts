import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { decryptMemberData, encryptMemberData } from "./privateData";

const USER_ID = "member-test-1";
const RECORD_ID = "report-test-1";
const KEY_V1 = "a".repeat(64);
const KEY_V2 = "b".repeat(64);

describe("private member data encryption", () => {
  beforeEach(() => {
    vi.stubEnv("MEMBER_ENCRYPTION_CURRENT_KEY_VERSION", "2");
    vi.stubEnv("MEMBER_ENCRYPTION_KEY_V1", KEY_V1);
    vi.stubEnv("MEMBER_ENCRYPTION_KEY_V2", KEY_V2);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips private UTF-8 content with a versioned authenticated ciphertext", () => {
    const plaintext = "synthetic profile: 한국어 test data";
    const encrypted = encryptMemberData(plaintext, USER_ID, RECORD_ID);

    expect(encrypted.keyVersion).toBe(2);
    expect(encrypted.ciphertext.startsWith("v2.")).toBe(true);
    expect(encrypted.ciphertext).not.toContain(plaintext);
    expect(decryptMemberData(encrypted.ciphertext, USER_ID, RECORD_ID, encrypted.keyVersion)).toBe(plaintext);
  });

  it("round-trips empty content but rejects a removed payload segment", () => {
    const encrypted = encryptMemberData("", USER_ID, RECORD_ID);

    expect(encrypted.ciphertext.endsWith(".")).toBe(true);
    expect(decryptMemberData(encrypted.ciphertext, USER_ID, RECORD_ID, encrypted.keyVersion)).toBe("");
    expect(() => decryptMemberData(encrypted.ciphertext.slice(0, -1), USER_ID, RECORD_ID, encrypted.keyVersion))
      .toThrow("Encrypted member data has an invalid format or key version");
    expect(() => decryptMemberData(`${encrypted.ciphertext}A`, USER_ID, RECORD_ID, encrypted.keyVersion))
      .toThrow("Encrypted member data has an invalid format or key version");
  });

  it("uses a fresh IV for repeated plaintext and keeps both ciphertexts decryptable", () => {
    const first = encryptMemberData("synthetic profile", USER_ID, RECORD_ID);
    const second = encryptMemberData("synthetic profile", USER_ID, RECORD_ID);

    expect(first.ciphertext).not.toBe(second.ciphertext);
    expect(decryptMemberData(first.ciphertext, USER_ID, RECORD_ID, first.keyVersion)).toBe("synthetic profile");
    expect(decryptMemberData(second.ciphertext, USER_ID, RECORD_ID, second.keyVersion)).toBe("synthetic profile");
  });

  it.each([
    ["different user", "another-user", RECORD_ID],
    ["different record", USER_ID, "another-record"],
  ] as const)("rejects ciphertext bound to a %s", (_label, userId, recordId) => {
    const encrypted = encryptMemberData("synthetic profile", USER_ID, RECORD_ID);

    expect(() => decryptMemberData(encrypted.ciphertext, userId, recordId, encrypted.keyVersion)).toThrow();
  });

  it("rejects ciphertext whose authentication tag was changed", () => {
    const encrypted = encryptMemberData("synthetic profile", USER_ID, RECORD_ID);
    const [marker, iv, tag, payload] = encrypted.ciphertext.split(".");
    if (!marker || !iv || !tag || payload === undefined) throw new Error("Expected a four-part ciphertext");
    const replacement = tag[0] === "A" ? "B" : "A";
    const tampered = `${marker}.${iv}.${replacement}${tag.slice(1)}.${payload}`;

    expect(() => decryptMemberData(tampered, USER_ID, RECORD_ID, encrypted.keyVersion)).toThrow();
  });

  it("rejects ciphertext whose encrypted payload was changed", () => {
    const encrypted = encryptMemberData("synthetic profile", USER_ID, RECORD_ID);
    const [marker, iv, tag] = encrypted.ciphertext.split(".");
    if (!marker || !iv || !tag) throw new Error("Expected a four-part ciphertext");
    const tampered = `${marker}.${iv}.${tag}.AA`;

    expect(() => decryptMemberData(tampered, USER_ID, RECORD_ID, encrypted.keyVersion)).toThrow();
  });

  it.each([
    ["extra segment", (value: string) => `${value}.extra`],
    ["invalid version marker", (value: string) => value.replace(/^v2\./u, "v02.")],
    ["invalid IV size", (value: string) => value.replace(/^(v2\.)[^.]+/u, "$1AQ")],
    ["invalid tag size", (value: string) => value.replace(/^(v2\.[^.]+\.)[^.]+/u, "$1AQ")],
    ["missing authentication fields", () => "v2"],
  ])("rejects malformed ciphertext with %s", (_label, mutate) => {
    const encrypted = encryptMemberData("synthetic profile", USER_ID, RECORD_ID);

    expect(() => decryptMemberData(mutate(encrypted.ciphertext), USER_ID, RECORD_ID, encrypted.keyVersion)).toThrow();
  });

  it.each([
    ["missing version", ""],
    ["zero version", "0"],
    ["leading zero", "02"],
    ["version above the supported range", "10000"],
    ["non-numeric version", "invalid"],
  ] as const)("rejects an invalid current key version: %s", (_label, version) => {
    vi.stubEnv("MEMBER_ENCRYPTION_CURRENT_KEY_VERSION", version);

    expect(() => encryptMemberData("synthetic profile", USER_ID, RECORD_ID))
      .toThrow("MEMBER_ENCRYPTION_CURRENT_KEY_VERSION is not configured");
  });

  it.each([
    ["missing key", ""],
    ["short key", "a".repeat(62)],
    ["non-hexadecimal key", "g".repeat(64)],
  ] as const)("rejects an invalid key for the current version: %s", (_label, key) => {
    vi.stubEnv("MEMBER_ENCRYPTION_KEY_V2", key);

    expect(() => encryptMemberData("synthetic profile", USER_ID, RECORD_ID))
      .toThrow("A 32-byte MEMBER_ENCRYPTION_KEY_V2 key is required");
  });

  it.each([
    ["empty user ID", "", RECORD_ID],
    ["empty record ID", USER_ID, ""],
    ["overlong user ID", "u".repeat(257), RECORD_ID],
    ["overlong record ID", USER_ID, "r".repeat(257)],
    ["ambiguous user ID separator", "a\u001fb", "c"],
    ["ambiguous record ID separator", "a", "b\u001fc"],
  ] as const)("rejects an invalid encryption context: %s", (_label, userId, recordId) => {
    expect(() => encryptMemberData("synthetic profile", userId, recordId))
      .toThrow("Invalid member encryption context");
  });

  it("rejects both ID pairs that would collide under the legacy context separator", () => {
    expect(() => encryptMemberData("synthetic profile", "a\u001fb", "c"))
      .toThrow("Invalid member encryption context");
    expect(() => encryptMemberData("synthetic profile", "a", "b\u001fc"))
      .toThrow("Invalid member encryption context");
  });

  it("decrypts older records using their retained key after the current key rotates", () => {
    vi.stubEnv("MEMBER_ENCRYPTION_CURRENT_KEY_VERSION", "1");
    const oldCiphertext = encryptMemberData("older synthetic profile", USER_ID, RECORD_ID);
    vi.stubEnv("MEMBER_ENCRYPTION_CURRENT_KEY_VERSION", "2");

    expect(oldCiphertext.keyVersion).toBe(1);
    expect(decryptMemberData(oldCiphertext.ciphertext, USER_ID, RECORD_ID, oldCiphertext.keyVersion))
      .toBe("older synthetic profile");
  });

  it("rejects a ciphertext version that does not match the stored key version", () => {
    const encrypted = encryptMemberData("synthetic profile", USER_ID, RECORD_ID);

    expect(() => decryptMemberData(encrypted.ciphertext, USER_ID, RECORD_ID, 1))
      .toThrow("Encrypted member data has an invalid format or key version");
  });
});
