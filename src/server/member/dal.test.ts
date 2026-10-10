import type { PoolClient } from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type QueryResult = Readonly<{
  rows: readonly Record<string, unknown>[];
  rowCount: number | null;
}>;

const {
  encryptMemberDataMock,
  decryptMemberDataMock,
  getIdentityPoolMock,
  getSignedInMemberMock,
  hasRequiredMemberConsentsMock,
  identityConnectMock,
  identityQueryMock,
  identityReleaseMock,
  memberQueryMock,
  prepareMemberAccountDeletionMock,
} = vi.hoisted(() => ({
  encryptMemberDataMock: vi.fn<
    (plaintext: string, userId: string, recordId: string) => { ciphertext: string; keyVersion: number }
  >(),
  decryptMemberDataMock: vi.fn<(ciphertext: string, userId: string, recordId: string, keyVersion: number) => string>(),
  getIdentityPoolMock: vi.fn(),
  getSignedInMemberMock: vi.fn(),
  hasRequiredMemberConsentsMock: vi.fn(),
  identityConnectMock: vi.fn<() => Promise<PoolClient>>(),
  identityQueryMock: vi.fn<(statement: string, parameters?: readonly unknown[]) => Promise<QueryResult>>(),
  identityReleaseMock: vi.fn<() => void>(),
  memberQueryMock: vi.fn<(statement: string, parameters?: readonly unknown[]) => Promise<QueryResult>>(),
  prepareMemberAccountDeletionMock: vi.fn<(userId: string) => Promise<void>>(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/session", () => ({ getSignedInMember: getSignedInMemberMock }));
vi.mock("@/server/member/consents", () => ({ hasRequiredMemberConsents: hasRequiredMemberConsentsMock }));
vi.mock("@/server/member/database", () => ({ withMemberTransaction: vi.fn() }));
vi.mock("@/server/auth/database", () => ({ getIdentityPool: getIdentityPoolMock }));
vi.mock("@/server/billing/service", () => ({ prepareMemberAccountDeletion: prepareMemberAccountDeletionMock }));
vi.mock("@/server/crypto/privateData", () => ({
  decryptMemberData: decryptMemberDataMock,
  encryptMemberData: encryptMemberDataMock,
}));

import { decryptMemberData } from "@/server/crypto/privateData";
import { getIdentityPool } from "@/server/auth/database";
import { prepareMemberAccountDeletion } from "@/server/billing/service";
import {
  claimOwnLocalData,
  deleteOwnMemberAccount,
  exportOwnMemberData,
  getOwnProfile,
  getOwnSavedResults,
  InvalidMemberDataError,
} from "./dal";
import { withMemberTransaction } from "./database";

const memberId = "member-owner-1";
const profileId = "profile-existing-1";

const validProfile = {
  year: 1990,
  month: 7,
  day: 15,
  calendar: "solar",
  isLeapMonth: false,
  hour: 9,
  minute: 30,
  gender: "unspecified",
  dayBoundaryRule: "midnight",
  placeLabel: "서울",
  placeLabelEn: "Seoul",
  lat: 37.5665,
  lng: 126.978,
  timeZone: "Asia/Seoul",
} as const;

const validSnapshot = {
  schemaVersion: 1,
  id: "00000000-0000-4000-8000-000000000001",
  sourceAssessmentId: "00000000-0000-4000-8000-000000000002",
  analysisKey: "psychometrics",
  provenanceGroup: "ipip-50-v1",
  lane: "scientific",
  instrumentVersion: "IPIP-50/Goldberg-1992",
  scoringModelVersion: "big-five-derived-v1",
  completedAt: "2026-08-29T00:00:00.000Z",
  locale: "ko",
  signals: [
    {
      constructId: "bigfive.extraversion",
      value: { kind: "band", band: "mid" },
      descriptorIds: ["band.mid"],
      limitationIds: ["limitation.psychometrics"],
    },
  ],
  referenceIds: ["psychometrics"],
} as const;

type QueryCapture = Readonly<{ statement: string; parameters: readonly unknown[] }>;

const queryCaptures: QueryCapture[] = [];
const transactionUserIds: string[] = [];
const savedResultRowCounts: number[] = [];
let encryptionAttempt = 0;
const memberClient = { query: memberQueryMock } as unknown as PoolClient;
const identityClient = { query: identityQueryMock, release: identityReleaseMock } as unknown as PoolClient;
const identityPool = { connect: identityConnectMock } as unknown as ReturnType<typeof getIdentityPool>;

function normalize(statement: string): string {
  return statement.replace(/\s+/gu, " ").trim().toLowerCase();
}

function captureQuery(statement: string, parameters: readonly unknown[] = []): void {
  queryCaptures.push({ statement: normalize(statement), parameters: [...parameters] });
}

beforeEach(() => {
  queryCaptures.length = 0;
  getSignedInMemberMock.mockReset().mockResolvedValue({ user: { id: memberId, email: "member@example.test" } });
  hasRequiredMemberConsentsMock.mockReset().mockResolvedValue(true);
  memberQueryMock.mockReset();
  vi.mocked(withMemberTransaction).mockReset().mockImplementation(async (_userId, operation) => operation(memberClient));
  decryptMemberDataMock.mockReset();
  getIdentityPoolMock.mockReset().mockReturnValue(identityPool);
  identityConnectMock.mockReset().mockResolvedValue(identityClient);
  identityQueryMock.mockReset().mockImplementation(async (statement, parameters) => {
    captureQuery(statement, parameters);
    if (normalize(statement).startsWith('delete from identity."user"')) {
      return { rows: [{ id: memberId }], rowCount: 1 };
    }
    return { rows: [], rowCount: 1 };
  });
  identityReleaseMock.mockReset();
  prepareMemberAccountDeletionMock.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("claimOwnLocalData", () => {
  beforeEach(() => {
    queryCaptures.length = 0;
    transactionUserIds.length = 0;
    savedResultRowCounts.length = 0;
    encryptionAttempt = 0;
    memberQueryMock.mockReset();
    encryptMemberDataMock.mockReset();
    encryptMemberDataMock.mockImplementation(() => {
      encryptionAttempt += 1;
      return { ciphertext: `test-ciphertext-${encryptionAttempt}`, keyVersion: 7 };
    });
    getSignedInMemberMock.mockReset();
    hasRequiredMemberConsentsMock.mockReset();
    getSignedInMemberMock.mockResolvedValue({ user: { id: memberId, email: "member@example.test" } });
    hasRequiredMemberConsentsMock.mockResolvedValue(true);
    memberQueryMock.mockImplementation(async (statement, parameters) => {
      captureQuery(statement, parameters);
      if (normalize(statement).startsWith("insert into member.saved_results")) {
        return { rows: [], rowCount: savedResultRowCounts.shift() ?? 1 };
      }
      return { rows: [], rowCount: 1 };
    });
    vi.mocked(withMemberTransaction).mockReset();
    vi.mocked(withMemberTransaction).mockImplementation(async (userId, operation) => {
      transactionUserIds.push(userId);
      return operation(memberClient);
    });
  });

  it("requires an authenticated member before checking consent or opening a data transaction", async () => {
    getSignedInMemberMock.mockResolvedValue(null);

    await expect(claimOwnLocalData(null, [])).rejects.toMatchObject({ reason: "authentication_required" });

    expect(hasRequiredMemberConsentsMock).not.toHaveBeenCalled();
    expect(withMemberTransaction).not.toHaveBeenCalled();
    expect(memberQueryMock).not.toHaveBeenCalled();
  });

  it("requires the current member consents before opening a data transaction", async () => {
    hasRequiredMemberConsentsMock.mockResolvedValue(false);

    await expect(claimOwnLocalData(null, [])).rejects.toMatchObject({ reason: "consent_required" });

    expect(hasRequiredMemberConsentsMock).toHaveBeenCalledWith(memberId);
    expect(withMemberTransaction).not.toHaveBeenCalled();
    expect(memberQueryMock).not.toHaveBeenCalled();
  });

  it("rejects malformed profiles, unsafe snapshots, and duplicate snapshot IDs before claim writes", async () => {
    const profileWithUnexpectedField: unknown = { ...validProfile, userId: "another-member" };
    const snapshotWithRawResponses: unknown = { ...validSnapshot, responses: [1, 2, 3] };

    await expect(claimOwnLocalData(profileWithUnexpectedField, [])).rejects.toBeInstanceOf(InvalidMemberDataError);
    await expect(claimOwnLocalData(null, [snapshotWithRawResponses])).rejects.toBeInstanceOf(InvalidMemberDataError);
    await expect(claimOwnLocalData(null, [validSnapshot, validSnapshot])).rejects.toBeInstanceOf(InvalidMemberDataError);

    expect(withMemberTransaction).not.toHaveBeenCalled();
    expect(memberQueryMock).not.toHaveBeenCalled();
    expect(encryptMemberDataMock).not.toHaveBeenCalled();
  });

  it("locks and upserts the existing profile within the signed-in member's scope", async () => {
    memberQueryMock.mockImplementation(async (statement, parameters) => {
      const normalized = normalize(statement);
      captureQuery(statement, parameters);
      if (normalized.startsWith("select id, label_ciphertext, birth_profile_ciphertext")) {
        return {
          rows: [{
            id: profileId,
            label_ciphertext: "existing-label-ciphertext",
            birth_profile_ciphertext: "existing-profile-ciphertext",
            key_version: 6,
          }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 1 };
    });

    await expect(claimOwnLocalData(validProfile, [])).resolves.toEqual({ profileSaved: true, snapshotsSaved: 0 });

    expect(transactionUserIds).toEqual([memberId]);
    expect(queryCaptures).toContainEqual({
      statement: "select pg_advisory_xact_lock(hashtextextended($1, 0))",
      parameters: [`lumina-default-profile:${memberId}`],
    });
    expect(queryCaptures).toContainEqual({
      statement: expect.stringContaining("where user_id = $1 and source_key = 'local-default'"),
      parameters: [memberId],
    });
    const lockQueryIndex = queryCaptures.findIndex(({ statement }) => statement.startsWith("select pg_advisory_xact_lock"));
    const profileReadIndex = queryCaptures.findIndex(({ statement }) => statement.startsWith("select id, label_ciphertext"));
    expect(lockQueryIndex).toBeGreaterThanOrEqual(0);
    expect(profileReadIndex).toBeGreaterThan(lockQueryIndex);

    const profileInsert = queryCaptures.find(({ statement }) => statement.startsWith("insert into member.profiles"));
    expect(profileInsert?.statement).toContain("on conflict (user_id, source_key) do update");
    expect(profileInsert?.parameters).toEqual([
      profileId,
      memberId,
      "test-ciphertext-2",
      "test-ciphertext-1",
      7,
    ]);
    expect(encryptMemberDataMock).toHaveBeenNthCalledWith(1, JSON.stringify(validProfile), memberId, profileId);
    expect(encryptMemberDataMock).toHaveBeenNthCalledWith(2, validProfile.placeLabel, memberId, `${profileId}:label`);
  });

  it("locks before reading and binds a newly generated profile ID to its encrypted payload", async () => {
    await expect(claimOwnLocalData(validProfile, [])).resolves.toEqual({ profileSaved: true, snapshotsSaved: 0 });

    expect(queryCaptures[0]?.statement).toBe("select pg_advisory_xact_lock(hashtextextended($1, 0))");
    expect(queryCaptures[0]?.parameters).toEqual([`lumina-default-profile:${memberId}`]);
    expect(queryCaptures[1]?.statement).toContain("from member.profiles");
    expect(queryCaptures[1]?.parameters).toEqual([memberId]);

    const profileInsert = queryCaptures.find(({ statement }) => statement.startsWith("insert into member.profiles"));
    const generatedProfileId = profileInsert?.parameters[0];
    expect(typeof generatedProfileId).toBe("string");
    expect(generatedProfileId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu);
    expect(profileInsert?.parameters).toEqual([
      generatedProfileId,
      memberId,
      "test-ciphertext-2",
      "test-ciphertext-1",
      7,
    ]);
    expect(encryptMemberDataMock).toHaveBeenNthCalledWith(1, JSON.stringify(validProfile), memberId, generatedProfileId);
    expect(encryptMemberDataMock).toHaveBeenNthCalledWith(2, validProfile.placeLabel, memberId, `${String(generatedProfileId)}:label`);
  });

  it("keeps repeated result claims user-scoped and counts only the first insert", async () => {
    savedResultRowCounts.push(1, 0);

    await expect(claimOwnLocalData(null, [validSnapshot])).resolves.toEqual({ profileSaved: false, snapshotsSaved: 1 });
    await expect(claimOwnLocalData(null, [validSnapshot])).resolves.toEqual({ profileSaved: false, snapshotsSaved: 0 });

    expect(transactionUserIds).toEqual([memberId, memberId]);
    const savedResultInserts = queryCaptures.filter(({ statement }) => statement.startsWith("insert into member.saved_results"));
    expect(savedResultInserts).toHaveLength(2);
    for (const insert of savedResultInserts) {
      expect(insert.statement).toContain("on conflict (user_id, source_snapshot_id) do nothing");
      expect(insert.parameters.slice(0, 4)).toEqual([memberId, validSnapshot.id, validSnapshot.analysisKey, validSnapshot.locale]);
    }
    expect(savedResultInserts.map(({ parameters }) => parameters.slice(4, 6))).toEqual([
      ["test-ciphertext-1", 7],
      ["test-ciphertext-2", 7],
    ]);
    expect(encryptMemberDataMock).toHaveBeenCalledTimes(2);
    expect(encryptMemberDataMock).toHaveBeenNthCalledWith(1, JSON.stringify(validSnapshot), memberId, `snapshot:${validSnapshot.id}`);
    expect(encryptMemberDataMock).toHaveBeenNthCalledWith(2, JSON.stringify(validSnapshot), memberId, `snapshot:${validSnapshot.id}`);
  });
});

describe("member data access", () => {
  beforeEach(() => {
    decryptMemberDataMock.mockImplementation((ciphertext, userId, recordId, keyVersion) => {
      if (userId !== memberId) throw new Error("Unexpected member-data owner");
      if (recordId === profileId && ciphertext === "profile-ciphertext" && keyVersion === 7) {
        return JSON.stringify(validProfile);
      }
      if (recordId === `snapshot:${validSnapshot.id}` && ciphertext === "snapshot-ciphertext" && keyVersion === 8) {
        return JSON.stringify(validSnapshot);
      }
      throw new Error("Unexpected member-data decryption context");
    });
  });

  it("reads the signed-in member's profile through an owner-scoped query", async () => {
    memberQueryMock.mockImplementation(async (statement, parameters) => {
      captureQuery(statement, parameters);
      return {
        rows: [{ id: profileId, label_ciphertext: "label-ciphertext", birth_profile_ciphertext: "profile-ciphertext", key_version: 7 }],
        rowCount: 1,
      };
    });

    await expect(getOwnProfile()).resolves.toEqual(validProfile);

    expect(withMemberTransaction).toHaveBeenCalledWith(memberId, expect.any(Function));
    expect(queryCaptures).toContainEqual(expect.objectContaining({
      statement: expect.stringContaining("where user_id = $1 and source_key = 'local-default'"),
      parameters: [memberId],
    }));
    expect(decryptMemberData).toHaveBeenCalledWith("profile-ciphertext", memberId, profileId, 7);
  });

  it("returns only valid, owner-scoped saved result snapshots", async () => {
    memberQueryMock.mockImplementation(async (statement, parameters) => {
      captureQuery(statement, parameters);
      return {
        rows: [{ source_snapshot_id: validSnapshot.id, payload_ciphertext: "snapshot-ciphertext", key_version: 8 }],
        rowCount: 1,
      };
    });

    await expect(getOwnSavedResults()).resolves.toEqual([validSnapshot]);

    expect(queryCaptures).toContainEqual(expect.objectContaining({
      statement: expect.stringContaining("where user_id = $1"),
      parameters: [memberId],
    }));
    expect(queryCaptures[0]?.statement).toContain("limit 100");
    expect(decryptMemberData).toHaveBeenCalledWith("snapshot-ciphertext", memberId, `snapshot:${validSnapshot.id}`, 8);
  });
});

describe("exportOwnMemberData", () => {
  beforeEach(() => {
    decryptMemberDataMock.mockImplementation((ciphertext, userId, recordId, keyVersion) => {
      if (userId !== memberId) throw new Error("Unexpected member-data owner");
      if (recordId === profileId && ciphertext === "profile-ciphertext" && keyVersion === 7) {
        return JSON.stringify(validProfile);
      }
      if (recordId === `snapshot:${validSnapshot.id}` && ciphertext === "snapshot-ciphertext" && keyVersion === 8) {
        return JSON.stringify(validSnapshot);
      }
      throw new Error("Unexpected member-data decryption context");
    });
    memberQueryMock.mockImplementation(async (statement, parameters) => {
      const normalized = normalize(statement);
      captureQuery(statement, parameters);
      if (normalized.startsWith("select id, label_ciphertext")) {
        return { rows: [{ id: profileId, label_ciphertext: "label-ciphertext", birth_profile_ciphertext: "profile-ciphertext", key_version: 7 }], rowCount: 1 };
      }
      if (normalized.startsWith("select source_snapshot_id::text")) {
        return { rows: [{ source_snapshot_id: validSnapshot.id, payload_ciphertext: "snapshot-ciphertext", key_version: 8 }], rowCount: 1 };
      }
      if (normalized.startsWith("select consent_type, policy_version")) {
        return { rows: [{ consent_type: "analytics", policy_version: "v2", accepted_at: "2026-09-01T00:00:00.000Z" }], rowCount: 1 };
      }
      if (normalized.startsWith("select id::text, created_at::text, expires_at::text")) {
        return { rows: [{ id: "share-1", created_at: "2026-09-01T00:00:00.000Z", expires_at: "2027-09-01T00:00:00.000Z", revoked_at: null }], rowCount: 1 };
      }
      if (normalized.startsWith("select preference_status")) {
        return { rows: [{ preference_status: "unsubscribed", policy_version: "mkt-v1", consented_at: null, unsubscribed_at: "2026-09-02T00:00:00.000Z", updated_at: "2026-09-02T00:00:00.000Z" }], rowCount: 1 };
      }
      if (normalized.startsWith("select id::text, product_name_snapshot")) {
        return { rows: [{ id: "order-1", product_name_snapshot: "2027 Report", amount: 9900, currency: "KRW", status: "paid", created_at: "2026-09-03T00:00:00.000Z", paid_at: "2026-09-03T00:00:00.000Z", viewed_at: null }], rowCount: 1 };
      }
      if (normalized.startsWith("select c.order_id::text")) {
        return { rows: [{ order_id: "order-1", consent_type: "purchase_terms", document_version: "v1", accepted_at: "2026-09-03T00:00:00.000Z" }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
  });

  it("exports decrypted member records and billing history using the signed-in owner scope", async () => {
    vi.stubEnv("BILLING_DATABASE_URL", "postgres://billing.invalid/database");

    const exported = await exportOwnMemberData();

    expect(exported.account).toEqual({ email: "member@example.test" });
    expect(exported.profile).toEqual(validProfile);
    expect(exported.savedResults).toEqual([validSnapshot]);
    expect(exported.consents).toHaveLength(1);
    expect(exported.marketingPreference?.preference_status).toBe("unsubscribed");
    expect(exported.shareLinks).toHaveLength(1);
    expect(exported.purchases).toEqual([expect.objectContaining({ id: "order-1", amount: 9900, currency: "KRW" })]);
    expect(exported.purchaseConsents).toEqual([expect.objectContaining({ order_id: "order-1", consent_type: "purchase_terms" })]);
    expect(Number.isNaN(Date.parse(exported.exportedAt))).toBe(false);
    expect(decryptMemberData).toHaveBeenNthCalledWith(1, "profile-ciphertext", memberId, profileId, 7);
    expect(decryptMemberData).toHaveBeenNthCalledWith(2, "snapshot-ciphertext", memberId, `snapshot:${validSnapshot.id}`, 8);
    expect(withMemberTransaction).toHaveBeenCalledWith(memberId, expect.any(Function));
    expect(queryCaptures).toHaveLength(7);
    expect(queryCaptures.every(({ parameters }) => parameters.length === 1 && parameters[0] === memberId)).toBe(true);
    expect(queryCaptures.some(({ statement }) => statement.includes("from billing.orders where user_id = $1"))).toBe(true);
    expect(queryCaptures.some(({ statement }) => statement.includes("where o.user_id = $1"))).toBe(true);
  });

  it("returns empty billing sections and skips billing queries when storage is not configured", async () => {
    vi.stubEnv("BILLING_DATABASE_URL", "");

    const exported = await exportOwnMemberData();

    expect(exported.purchases).toEqual([]);
    expect(exported.purchaseConsents).toEqual([]);
    expect(queryCaptures).toHaveLength(5);
    expect(queryCaptures.some(({ statement }) => statement.includes("billing."))).toBe(false);
  });
});

describe("deleteOwnMemberAccount", () => {
  it("requires owner email confirmation before preparing billing deletion or opening identity storage", async () => {
    await expect(deleteOwnMemberAccount("someone-else@example.test"))
      .rejects.toBeInstanceOf(InvalidMemberDataError);

    expect(prepareMemberAccountDeletion).not.toHaveBeenCalled();
    expect(getIdentityPool).not.toHaveBeenCalled();
    expect(identityQueryMock).not.toHaveBeenCalled();
  });

  it("prepares billing records, then deletes exactly the authenticated identity in a transaction", async () => {
    await expect(deleteOwnMemberAccount(" MEMBER@example.test ")).resolves.toBeUndefined();

    expect(prepareMemberAccountDeletion).toHaveBeenCalledWith(memberId);
    expect(getIdentityPool).toHaveBeenCalledOnce();
    expect(identityConnectMock).toHaveBeenCalledOnce();
    expect(identityQueryMock).toHaveBeenNthCalledWith(1, "begin");
    expect(identityQueryMock).toHaveBeenCalledWith(
      expect.stringContaining('delete from identity."user"'),
      [memberId, "member@example.test"],
    );
    expect(identityQueryMock).toHaveBeenCalledWith("commit");
    expect(identityQueryMock).not.toHaveBeenCalledWith("rollback");
    expect(identityReleaseMock).toHaveBeenCalledOnce();
    expect(prepareMemberAccountDeletionMock.mock.invocationCallOrder[0])
      .toBeLessThan(getIdentityPoolMock.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY);
  });

  it("does not open identity storage when billing deletion preparation is blocked", async () => {
    const pendingBillingError = new Error("billing_pending_orders");
    prepareMemberAccountDeletionMock.mockRejectedValue(pendingBillingError);

    await expect(deleteOwnMemberAccount("member@example.test")).rejects.toBe(pendingBillingError);

    expect(prepareMemberAccountDeletion).toHaveBeenCalledWith(memberId);
    expect(getIdentityPool).not.toHaveBeenCalled();
    expect(identityConnectMock).not.toHaveBeenCalled();
    expect(identityQueryMock).not.toHaveBeenCalled();
  });

  it("rolls back and releases the identity client when the delete affects no account", async () => {
    identityQueryMock.mockImplementation(async (statement, parameters) => {
      captureQuery(statement, parameters);
      return normalize(statement).startsWith('delete from identity."user"')
        ? { rows: [], rowCount: 0 }
        : { rows: [], rowCount: 1 };
    });

    await expect(deleteOwnMemberAccount("member@example.test"))
      .rejects.toThrow("Member account deletion did not match one account");

    expect(identityQueryMock).toHaveBeenCalledWith("rollback");
    expect(identityQueryMock).not.toHaveBeenCalledWith("commit");
    expect(identityReleaseMock).toHaveBeenCalledOnce();
  });
});
