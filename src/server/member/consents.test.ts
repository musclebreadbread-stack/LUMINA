import type { PoolClient } from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type ConsentQueryResult = Readonly<{
  rows: readonly Readonly<{ consent_type: string; policy_version: string }>[];
}>;

const {
  queryMock,
  withMemberTransactionMock,
} = vi.hoisted(() => ({
  queryMock: vi.fn<(statement: string, parameters?: readonly unknown[]) => Promise<ConsentQueryResult>>(),
  withMemberTransactionMock: vi.fn<
    <T>(userId: string, operation: (client: PoolClient) => Promise<T>) => Promise<T>
  >(),
}));

vi.mock("server-only", () => ({}));
vi.mock("./database", () => ({ withMemberTransaction: withMemberTransactionMock }));

import {
  getActiveConsentVersions,
  hasRequiredMemberConsents,
  recordRequiredMemberConsents,
  REQUIRED_MEMBER_CONSENTS,
} from "./consents";

const memberId = "member-consent-owner";
const memberClient = { query: queryMock } as unknown as PoolClient;
const transactionUserIds: string[] = [];
const currentVersions = {
  terms: "terms-v1",
  privacy: "privacy-v1",
  overseas_transfer: "transfer-v1",
} as const;
const allCurrentConsents = REQUIRED_MEMBER_CONSENTS.map((consent) => ({
  consent_type: consent,
  policy_version: currentVersions[consent],
}));

beforeEach(() => {
  transactionUserIds.length = 0;
  vi.stubEnv("MEMBER_TERMS_VERSION", currentVersions.terms);
  vi.stubEnv("MEMBER_PRIVACY_VERSION", currentVersions.privacy);
  vi.stubEnv("MEMBER_TRANSFER_VERSION", currentVersions.overseas_transfer);
  queryMock.mockReset().mockResolvedValue({ rows: [] });
  withMemberTransactionMock.mockReset().mockImplementation(async <T>(
    userId: string,
    operation: (client: PoolClient) => Promise<T>,
  ): Promise<T> => {
    transactionUserIds.push(userId);
    return operation(memberClient);
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("member consent policy versions", () => {
  it("returns the active version for every required policy", () => {
    expect(getActiveConsentVersions()).toEqual(currentVersions);
  });

  it.each([
    { name: "terms", variable: "MEMBER_TERMS_VERSION", value: "-invalid" },
    { name: "privacy", variable: "MEMBER_PRIVACY_VERSION", value: "contains spaces" },
    { name: "overseas transfer", variable: "MEMBER_TRANSFER_VERSION", value: "x".repeat(65) },
  ])("fails closed for an invalid $name policy version", ({ variable, value }) => {
    vi.stubEnv(variable, value);

    expect(getActiveConsentVersions()).toBeNull();
  });
});

describe("required member consents", () => {
  it("checks all three current versions inside the requesting member transaction", async () => {
    queryMock.mockResolvedValueOnce({ rows: allCurrentConsents });

    await expect(hasRequiredMemberConsents(memberId)).resolves.toBe(true);

    expect(transactionUserIds).toEqual([memberId]);
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("user_id = $1"), [
      memberId,
      [...REQUIRED_MEMBER_CONSENTS],
      Object.values(currentVersions),
    ]);
  });

  it("rejects missing or stale consent records", async () => {
    queryMock.mockResolvedValueOnce({ rows: allCurrentConsents.slice(0, 2) });
    await expect(hasRequiredMemberConsents(memberId)).resolves.toBe(false);

    queryMock.mockResolvedValueOnce({
      rows: [
        ...allCurrentConsents.slice(0, 2),
        { consent_type: "overseas_transfer", policy_version: "transfer-v0" },
      ],
    });
    await expect(hasRequiredMemberConsents(memberId)).resolves.toBe(false);
  });

  it("does not open a transaction when policy configuration is invalid", async () => {
    vi.stubEnv("MEMBER_TRANSFER_VERSION", "bad version");

    await expect(hasRequiredMemberConsents(memberId)).resolves.toBe(false);

    expect(withMemberTransactionMock).not.toHaveBeenCalled();
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("propagates a member database read failure", async () => {
    const databaseError = new Error("synthetic member database failure");
    queryMock.mockRejectedValueOnce(databaseError);

    await expect(hasRequiredMemberConsents(memberId)).rejects.toBe(databaseError);
  });

  it("records each current consent idempotently in the requesting member transaction", async () => {
    await recordRequiredMemberConsents(memberId);

    expect(transactionUserIds).toEqual([memberId]);
    expect(queryMock).toHaveBeenCalledTimes(3);
    for (const consent of REQUIRED_MEMBER_CONSENTS) {
      expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("on conflict (user_id, consent_type, policy_version) do nothing"), [
        memberId,
        consent,
        currentVersions[consent],
      ]);
    }
  });

  it("refuses to record consents without all active policy versions", async () => {
    vi.stubEnv("MEMBER_PRIVACY_VERSION", "");

    await expect(recordRequiredMemberConsents(memberId)).rejects.toThrow(
      "Current member consent versions are not configured",
    );

    expect(withMemberTransactionMock).not.toHaveBeenCalled();
    expect(queryMock).not.toHaveBeenCalled();
  });
});
