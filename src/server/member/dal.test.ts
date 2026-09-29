import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getSignedInMember = vi.hoisted(() => vi.fn());
vi.mock("@/server/auth/session", () => ({ getSignedInMember }));

const hasRequiredMemberConsents = vi.hoisted(() => vi.fn());
vi.mock("./consents", () => ({ hasRequiredMemberConsents }));

const prepareMemberAccountDeletion = vi.hoisted(() => vi.fn());
vi.mock("@/server/billing/service", () => ({ prepareMemberAccountDeletion }));

// The fake cipher binds ciphertext to (userId, recordId) so wrong-record or
// wrong-user decryption is observable.
vi.mock("@/server/crypto/privateData", () => ({
  encryptMemberData: (plaintext: string, userId: string, recordId: string) => ({
    ciphertext: `enc|${userId}|${recordId}|${plaintext}`,
    keyVersion: 7,
  }),
  decryptMemberData: (ciphertext: string, userId: string, recordId: string, keyVersion: number) => {
    const prefix = `enc|${userId}|${recordId}|`;
    if (!ciphertext.startsWith(prefix) || keyVersion !== 7) throw new Error("decrypt failed");
    return ciphertext.slice(prefix.length);
  },
}));

vi.mock("@/lib/integratedPortrait/validation", () => ({
  validateSnapshot: (value: unknown) => {
    const v = value as { id?: string; valid?: boolean } | null;
    return v && v.valid === true && typeof v.id === "string" ? { ok: true, value: v } : { ok: false };
  },
}));

vi.mock("./profileSchema", () => ({
  memberProfileSchema: {
    safeParse: (value: unknown) => {
      const v = value as { placeLabel?: unknown } | null;
      return v && typeof v.placeLabel === "string" ? { success: true, data: v } : { success: false };
    },
  },
}));

type QueryResult = { rows: unknown[]; rowCount?: number };
type Route = readonly [RegExp, QueryResult | ((params: readonly unknown[]) => QueryResult)];
type Call = { sql: string; params: readonly unknown[] };

const db = vi.hoisted(() => ({
  routes: [] as unknown[],
  calls: [] as unknown[],
  released: 0,
  memberTxUsers: [] as string[],
  identityClient: null as unknown,
  memberClient: null as unknown,
  failSql: null as { pattern: RegExp; error: Error } | null,
  failRollback: false,
}));

function makeClient() {
  return {
    query: async (sql: string, params: readonly unknown[] = []) => {
      db.calls.push({ sql, params });
      if (db.failSql?.pattern.test(sql)) throw db.failSql.error;
      if (db.failRollback && /^rollback/u.test(sql)) throw new Error("rollback failed");
      for (const [pattern, result] of db.routes as Route[]) {
        if (pattern.test(sql)) return typeof result === "function" ? result(params) : result;
      }
      return { rows: [], rowCount: 0 };
    },
    release: () => {
      db.released += 1;
    },
  };
}

vi.mock("./database", () => ({
  getMemberPool: () => ({ connect: async () => makeClient() }),
  withMemberTransaction: async (userId: string, operation: (client: unknown) => Promise<unknown>) => {
    db.memberTxUsers.push(userId);
    return operation(makeClient());
  },
}));
vi.mock("@/server/auth/database", () => ({
  getIdentityPool: () => ({ connect: async () => makeClient() }),
}));

import { localePath } from "@/i18n/locale";
import {
  InvalidMemberDataError,
  MemberAccessError,
  claimOwnLocalData,
  createOwnShareLink,
  deleteOwnMemberAccount,
  exportOwnMemberData,
  getOwnProfile,
  getOwnProfileById,
  getOwnSavedResults,
  getPublicShare,
  listOwnShareLinks,
  revokeOwnShareLink,
} from "./dal";

const USER = { id: "user-1", email: "Member@Example.invalid" };
const SNAP_ID = "3f2b8c1e-6d4a-4b7e-9c1d-2a5e7f8b9c0d";
const OTHER_ID = "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d";

function route(pattern: RegExp, result: Route[1]): void {
  (db.routes as Route[]).push([pattern, result]);
}
const calls = (): Call[] => db.calls as Call[];
const callsMatching = (pattern: RegExp): Call[] => calls().filter((c) => pattern.test(c.sql));
const snapshot = (id: string) => ({ id, valid: true, analysisKey: "saju", locale: "ko" });
const encFor = (recordId: string, payload: unknown, user = USER.id) => `enc|${user}|${recordId}|${JSON.stringify(payload)}`;

const savedEnv: Record<string, string | undefined> = {};
const ENV_KEYS = ["NEXT_PUBLIC_SITE_URL", "APP_ENV", "BILLING_DATABASE_URL"];

beforeEach(() => {
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
  process.env.NEXT_PUBLIC_SITE_URL = "https://lumina.example";
  delete process.env.BILLING_DATABASE_URL;
  db.routes = [];
  db.calls = [];
  db.released = 0;
  db.memberTxUsers = [];
  db.failSql = null;
  db.failRollback = false;
  getSignedInMember.mockReset();
  getSignedInMember.mockResolvedValue({ user: USER });
  hasRequiredMemberConsents.mockReset();
  hasRequiredMemberConsents.mockResolvedValue(true);
  prepareMemberAccountDeletion.mockReset();
  prepareMemberAccountDeletion.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

describe("member access guard", () => {
  const operations: Array<[string, () => Promise<unknown>]> = [
    ["claimOwnLocalData", () => claimOwnLocalData(null, [])],
    ["getOwnProfile", () => getOwnProfile()],
    ["getOwnProfileById", () => getOwnProfileById(SNAP_ID)],
    ["getOwnSavedResults", () => getOwnSavedResults()],
    ["createOwnShareLink", () => createOwnShareLink(SNAP_ID, "ko")],
    ["listOwnShareLinks", () => listOwnShareLinks()],
    ["revokeOwnShareLink", () => revokeOwnShareLink(SNAP_ID)],
    ["deleteOwnMemberAccount", () => deleteOwnMemberAccount(USER.email)],
    ["exportOwnMemberData", () => exportOwnMemberData()],
  ];

  it.each(operations)("%s requires a signed-in member", async (_name, run) => {
    getSignedInMember.mockResolvedValue(null);
    await expect(run()).rejects.toMatchObject({ name: "MemberAccessError", reason: "authentication_required" });
    expect(calls()).toHaveLength(0);
  });

  it.each(operations)("%s requires current consents", async (_name, run) => {
    hasRequiredMemberConsents.mockResolvedValue(false);
    await expect(run()).rejects.toMatchObject({ reason: "consent_required" });
    expect(hasRequiredMemberConsents).toHaveBeenCalledWith(USER.id);
    expect(calls()).toHaveLength(0);
  });

  it("exposes typed errors", () => {
    expect(new MemberAccessError("consent_required").message).toBe("consent_required");
    expect(new InvalidMemberDataError().name).toBe("InvalidMemberDataError");
  });
});

describe("claimOwnLocalData", () => {
  const profile = { placeLabel: "Seoul", birth: "1990" };

  it("rejects invalid profile input before opening a transaction", async () => {
    await expect(claimOwnLocalData({ bogus: true }, [])).rejects.toBeInstanceOf(InvalidMemberDataError);
    expect(db.memberTxUsers).toHaveLength(0);
  });

  it("rejects invalid or duplicate snapshots", async () => {
    await expect(claimOwnLocalData(null, [{ id: "x", valid: false }])).rejects.toBeInstanceOf(InvalidMemberDataError);
    await expect(claimOwnLocalData(null, [snapshot(SNAP_ID), snapshot(SNAP_ID)])).rejects.toBeInstanceOf(InvalidMemberDataError);
    expect(db.memberTxUsers).toHaveLength(0);
  });

  it("saves nothing for an empty claim but still opens a scoped transaction", async () => {
    expect(await claimOwnLocalData(null, [])).toEqual({ profileSaved: false, snapshotsSaved: 0 });
    expect(db.memberTxUsers).toEqual([USER.id]);
    expect(calls()).toHaveLength(0);
  });

  it("creates a new profile row under an advisory lock when none exists", async () => {
    expect(await claimOwnLocalData(profile, [])).toEqual({ profileSaved: true, snapshotsSaved: 0 });
    expect(calls()[0]!.sql).toContain("pg_advisory_xact_lock");
    expect(calls()[0]!.params).toEqual([`lumina-default-profile:${USER.id}`]);
    const upsert = callsMatching(/insert into member\.profiles/)[0]!;
    const [profileId, userId, labelCipher, profileCipher, keyVersion] = upsert.params as string[];
    expect(profileId).toMatch(/^[0-9a-f-]{36}$/u);
    expect(userId).toBe(USER.id);
    expect(labelCipher).toBe(`enc|${USER.id}|${profileId}:label|Seoul`);
    expect(profileCipher).toBe(`enc|${USER.id}|${profileId}|${JSON.stringify(profile)}`);
    expect(keyVersion).toBe(7);
  });

  it("reuses the existing profile id so the ciphertext stays bound to the same record", async () => {
    route(/for update/, { rows: [{ id: "existing-profile" }] });
    await claimOwnLocalData(profile, []);
    const upsert = callsMatching(/insert into member\.profiles/)[0]!;
    expect(upsert.params[0]).toBe("existing-profile");
    expect(upsert.params[3]).toContain("|existing-profile|");
  });

  it("counts only newly inserted snapshots", async () => {
    let n = 0;
    route(/insert into member\.saved_results/, () => ({ rows: [], rowCount: n++ === 0 ? 1 : 0 }));
    const result = await claimOwnLocalData(null, [snapshot(SNAP_ID), snapshot(OTHER_ID)]);
    expect(result).toEqual({ profileSaved: false, snapshotsSaved: 1 });
    const inserts = callsMatching(/insert into member\.saved_results/);
    expect(inserts[0]!.params.slice(0, 4)).toEqual([USER.id, SNAP_ID, "saju", "ko"]);
    expect(inserts[0]!.params[4]).toContain(`|snapshot:${SNAP_ID}|`);
  });

  it("treats a missing rowCount as zero", async () => {
    route(/insert into member\.saved_results/, { rows: [], rowCount: undefined });
    expect((await claimOwnLocalData(null, [snapshot(SNAP_ID)])).snapshotsSaved).toBe(0);
  });
});

describe("getOwnProfile / getOwnProfileById", () => {
  const profile = { placeLabel: "Busan" };

  it("returns null when there is no profile", async () => {
    expect(await getOwnProfile()).toBeNull();
    expect(await getOwnProfileById(SNAP_ID)).toBeNull();
  });

  it("decrypts the profile bound to the member and record id", async () => {
    route(/from member\.profiles/, { rows: [{ id: "p1", label_ciphertext: "x", birth_profile_ciphertext: encFor("p1", profile), key_version: 7 }] });
    expect(await getOwnProfile()).toEqual(profile);
    expect(await getOwnProfileById("p1")).toEqual(profile);
    const byId = callsMatching(/and id = \$2/)[0]!;
    expect(byId.params).toEqual([USER.id, "p1"]);
  });

  it("fails when ciphertext belongs to another user or record", async () => {
    route(/from member\.profiles/, { rows: [{ id: "p1", label_ciphertext: "x", birth_profile_ciphertext: encFor("p1", profile, "other-user"), key_version: 7 }] });
    await expect(getOwnProfile()).rejects.toThrow("decrypt failed");
  });

  it("fails on non-JSON plaintext and on schema-invalid profiles", async () => {
    route(/from member\.profiles/, { rows: [{ id: "p1", label_ciphertext: "x", birth_profile_ciphertext: `enc|${USER.id}|p1|{not json`, key_version: 7 }] });
    await expect(getOwnProfile()).rejects.toThrow("Stored member data is invalid");
    db.routes = [];
    route(/from member\.profiles/, { rows: [{ id: "p1", label_ciphertext: "x", birth_profile_ciphertext: encFor("p1", { nope: 1 }), key_version: 7 }] });
    await expect(getOwnProfile()).rejects.toThrow("Stored member profile is invalid");
  });
});

describe("getOwnSavedResults", () => {
  it("decrypts each saved snapshot with its record id", async () => {
    route(/from member\.saved_results/, {
      rows: [
        { source_snapshot_id: SNAP_ID, payload_ciphertext: encFor(`snapshot:${SNAP_ID}`, snapshot(SNAP_ID)), key_version: 7 },
        { source_snapshot_id: OTHER_ID, payload_ciphertext: encFor(`snapshot:${OTHER_ID}`, snapshot(OTHER_ID)), key_version: 7 },
      ],
    });
    const results = await getOwnSavedResults();
    expect(results.map((r) => r.id)).toEqual([SNAP_ID, OTHER_ID]);
    expect(calls()[0]!.params).toEqual([USER.id]);
  });

  it("rejects a stored snapshot that no longer validates", async () => {
    route(/from member\.saved_results/, {
      rows: [{ source_snapshot_id: SNAP_ID, payload_ciphertext: encFor(`snapshot:${SNAP_ID}`, { id: SNAP_ID, valid: false }), key_version: 7 }],
    });
    await expect(getOwnSavedResults()).rejects.toThrow("Stored member result is invalid");
  });

  it("returns an empty list when nothing is saved", async () => {
    expect(await getOwnSavedResults()).toEqual([]);
  });
});

describe("createOwnShareLink", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T10:20:30.400Z"));
  });

  function routeSaved(): void {
    route(/from member\.saved_results/, {
      rows: [{ source_snapshot_id: SNAP_ID, payload_ciphertext: encFor(`snapshot:${SNAP_ID}`, snapshot(SNAP_ID)), key_version: 7 }],
    });
  }

  it("rejects malformed snapshot ids without querying", async () => {
    await expect(createOwnShareLink("not-a-uuid", "ko")).rejects.toBeInstanceOf(InvalidMemberDataError);
    await expect(createOwnShareLink(`${SNAP_ID}; drop table x`, "ko")).rejects.toBeInstanceOf(InvalidMemberDataError);
    expect(calls()).toHaveLength(0);
  });

  it("rejects snapshots the member has not saved", async () => {
    await expect(createOwnShareLink(SNAP_ID, "ko")).rejects.toBeInstanceOf(InvalidMemberDataError);
    expect(callsMatching(/insert into member\.share_links/)).toHaveLength(0);
    expect(calls()[0]!.params).toEqual([USER.id, SNAP_ID]);
  });

  it("stores only the token hash and returns a 12-month locale URL", async () => {
    routeSaved();
    const share = await createOwnShareLink(SNAP_ID, "en");
    expect(share.expiresAt).toBe("2027-03-15T10:20:30.400Z");
    const url = new URL(share.url);
    const token = url.pathname.split("/").pop()!;
    expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/u);
    expect(url.pathname).toBe(localePath(`/p/${token}`, "en"));
    expect(url.origin).toBe("https://lumina.example");

    const insert = callsMatching(/insert into member\.share_links/)[0]!;
    const [id, userId, tokenHash, cipher, keyVersion, createdAt, expiresAt] = insert.params as [string, string, Buffer, string, number, Date, Date];
    expect(id).toBe(share.id);
    expect(userId).toBe(USER.id);
    expect(tokenHash.equals(createHash("sha256").update(Buffer.from(token, "base64url")).digest())).toBe(true);
    expect(cipher).toBe(`enc|${USER.id}|share:${share.id}|${JSON.stringify(snapshot(SNAP_ID))}`);
    expect(keyVersion).toBe(7);
    expect(createdAt.toISOString()).toBe("2026-03-15T10:20:30.400Z");
    expect(expiresAt.toISOString()).toBe(share.expiresAt);
    expect(JSON.stringify(insert.params)).not.toContain(token);
  });

  it.each([
    ["2026-01-31T00:00:00.000Z", "2027-01-31T00:00:00.000Z"],
    ["2027-02-28T05:00:00.000Z", "2028-02-28T05:00:00.000Z"],
    ["2028-02-29T12:00:00.000Z", "2029-02-28T12:00:00.000Z"],
    ["2026-12-31T23:59:59.999Z", "2027-12-31T23:59:59.999Z"],
  ])("expires %s at %s", async (now, expected) => {
    vi.setSystemTime(new Date(now));
    routeSaved();
    expect((await createOwnShareLink(SNAP_ID, "ko")).expiresAt).toBe(expected);
  });

  it("fails on misconfigured site URLs", async () => {
    routeSaved();
    process.env.APP_ENV = "production";
    for (const [site, message] of [
      ["", "NEXT_PUBLIC_SITE_URL is not configured"],
      ["https://user:pw@lumina.example", "only the public origin"],
      ["https://lumina.example/sub", "only the public origin"],
      ["https://lumina.example/?a=1", "only the public origin"],
      ["https://lumina.example/#a", "only the public origin"],
      ["http://lumina.example", "must use HTTPS"],
    ] as const) {
      process.env.NEXT_PUBLIC_SITE_URL = site;
      await expect(createOwnShareLink(SNAP_ID, "ko")).rejects.toThrow(message);
    }
  });

  it("allows http only in development", async () => {
    routeSaved();
    process.env.APP_ENV = "development";
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    expect((await createOwnShareLink(SNAP_ID, "ko")).url.startsWith("http://localhost:3000/")).toBe(true);
  });
});

describe("getPublicShare", () => {
  const token = Buffer.alloc(16, 7).toString("base64url");
  const expectedHash = createHash("sha256").update(Buffer.alloc(16, 7)).digest();

  it.each([
    ["too short", "abc"],
    ["too long", `${token}A`],
    ["illegal character", `${token.slice(0, 21)}!`],
    ["non-canonical trailing bits", "AAAAAAAAAAAAAAAAAAAAAB"],
    ["empty", ""],
  ])("returns null for a %s token without touching the database", async (_n, bad) => {
    expect(await getPublicShare(bad)).toBeNull();
    expect(calls()).toHaveLength(0);
  });

  it("returns null and releases the client when no active share matches", async () => {
    expect(await getPublicShare(token)).toBeNull();
    expect(calls().map((c) => c.sql.split("\n")[0]!.trim())).toEqual([
      "begin",
      "select set_config('app.current_share_token_hash', $1, true)",
      expect.stringContaining("select id::text, user_id"),
      "commit",
    ]);
    expect(calls()[1]!.params).toEqual([expectedHash.toString("hex")]);
    expect(callsMatching(/token_hash = \$1/)[0]!.sql).toMatch(/revoked_at is null[\s\S]*expires_at > now\(\)/u);
    expect(db.released).toBe(1);
  });

  it("decrypts using the share owner's id and share record id", async () => {
    route(/from member\.share_links/, {
      rows: [{ id: "share-1", user_id: "owner-9", payload_ciphertext: encFor("share:share-1", snapshot(SNAP_ID), "owner-9"), key_version: 7 }],
    });
    expect((await getPublicShare(token))?.id).toBe(SNAP_ID);
    expect((callsMatching(/token_hash = \$1/)[0]!.params[0] as Buffer).equals(expectedHash)).toBe(true);
  });

  it("rolls back and releases on failure, preserving the original error", async () => {
    route(/from member\.share_links/, { rows: [{ id: "s", user_id: "u", payload_ciphertext: "garbage", key_version: 7 }] });
    await expect(getPublicShare(token)).rejects.toThrow("decrypt failed");
    expect(callsMatching(/^rollback/)).toHaveLength(1);
    expect(callsMatching(/^commit/)).toHaveLength(0);
    expect(db.released).toBe(1);
  });

  it("still surfaces the original error when rollback fails", async () => {
    db.failSql = { pattern: /from member\.share_links/, error: new Error("query failed") };
    db.failRollback = true;
    await expect(getPublicShare(token)).rejects.toThrow("query failed");
    expect(db.released).toBe(1);
  });
});

describe("listOwnShareLinks / revokeOwnShareLink", () => {
  it("lists only the member's links", async () => {
    const rows = [{ id: "a", created_at: "c", expires_at: "e", revoked_at: null }];
    route(/from member\.share_links/, { rows });
    expect(await listOwnShareLinks()).toEqual(rows);
    expect(calls()[0]!.params).toEqual([USER.id]);
  });

  it("rejects malformed share ids", async () => {
    await expect(revokeOwnShareLink("nope")).rejects.toBeInstanceOf(InvalidMemberDataError);
    expect(calls()).toHaveLength(0);
  });

  it("revokes only links owned by the member and reports whether anything changed", async () => {
    route(/update member\.share_links/, { rows: [{ id: SNAP_ID }], rowCount: 1 });
    expect(await revokeOwnShareLink(SNAP_ID)).toBe(true);
    expect(calls()[0]!.params).toEqual([SNAP_ID, USER.id]);
    db.routes = [];
    route(/update member\.share_links/, { rows: [], rowCount: 0 });
    expect(await revokeOwnShareLink(SNAP_ID)).toBe(false);
    db.routes = [];
    route(/update member\.share_links/, { rows: [], rowCount: undefined });
    expect(await revokeOwnShareLink(SNAP_ID)).toBe(false);
  });
});

describe("deleteOwnMemberAccount", () => {
  it("rejects a mismatched confirmation email before any deletion work", async () => {
    await expect(deleteOwnMemberAccount("someone@else.invalid")).rejects.toBeInstanceOf(InvalidMemberDataError);
    expect(prepareMemberAccountDeletion).not.toHaveBeenCalled();
    expect(calls()).toHaveLength(0);
  });

  it("accepts a case- and whitespace-insensitive email, deletes the identity, and commits", async () => {
    route(/delete from identity/, { rows: [{ id: USER.id }], rowCount: 1 });
    await deleteOwnMemberAccount("  member@example.INVALID ");
    expect(prepareMemberAccountDeletion).toHaveBeenCalledWith(USER.id);
    expect(callsMatching(/delete from identity/)[0]!.params).toEqual([USER.id, USER.email]);
    expect(calls().map((c) => c.sql.split("\n")[0]!.trim())).toEqual(["begin", expect.stringContaining("delete from identity"), "commit"]);
    expect(db.released).toBe(1);
  });

  it("rolls back when the delete does not match exactly one account", async () => {
    route(/delete from identity/, { rows: [], rowCount: 0 });
    await expect(deleteOwnMemberAccount(USER.email)).rejects.toThrow("did not match one account");
    expect(callsMatching(/^rollback/)).toHaveLength(1);
    expect(callsMatching(/^commit/)).toHaveLength(0);
    expect(db.released).toBe(1);
  });

  it("preserves the original error when rollback fails", async () => {
    db.failSql = { pattern: /delete from identity/, error: new Error("boom") };
    db.failRollback = true;
    await expect(deleteOwnMemberAccount(USER.email)).rejects.toThrow("boom");
    expect(db.released).toBe(1);
  });

  it("does not touch the identity database when account preparation fails", async () => {
    prepareMemberAccountDeletion.mockRejectedValue(new Error("billing blocked"));
    await expect(deleteOwnMemberAccount(USER.email)).rejects.toThrow("billing blocked");
    expect(calls()).toHaveLength(0);
  });
});

describe("exportOwnMemberData", () => {
  const profile = { placeLabel: "Seoul" };

  function routeMemberData(): void {
    route(/from member\.profiles/, { rows: [{ id: "p1", label_ciphertext: "l", birth_profile_ciphertext: encFor("p1", profile), key_version: 7 }] });
    route(/from member\.saved_results/, {
      rows: [{ source_snapshot_id: SNAP_ID, payload_ciphertext: encFor(`snapshot:${SNAP_ID}`, snapshot(SNAP_ID)), key_version: 7 }],
    });
    route(/from member\.consents/, { rows: [{ consent_type: "terms", policy_version: "1", accepted_at: "t" }] });
    route(/from member\.share_links/, { rows: [{ id: "s1", created_at: "c", expires_at: "e", revoked_at: null }] });
    route(/from member\.marketing_preferences/, {
      rows: [{ preference_status: "subscribed", policy_version: "2", consented_at: "c", unsubscribed_at: null, updated_at: "u" }],
    });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-29T00:00:00.000Z"));
  });

  it("exports decrypted member data without purchases when billing is not configured", async () => {
    routeMemberData();
    const data = await exportOwnMemberData();
    expect(data.exportedAt).toBe("2026-09-29T00:00:00.000Z");
    expect(data.account).toEqual({ email: USER.email });
    expect(data.profile).toEqual(profile);
    expect(data.savedResults.map((r) => r.id)).toEqual([SNAP_ID]);
    expect(data.consents).toHaveLength(1);
    expect(data.marketingPreference).toMatchObject({ preference_status: "subscribed" });
    expect(data.shareLinks).toHaveLength(1);
    expect(data.purchases).toEqual([]);
    expect(data.purchaseConsents).toEqual([]);
    expect(callsMatching(/billing\./)).toHaveLength(0);
    for (const call of calls()) expect(call.params).toEqual([USER.id]);
  });

  it("includes purchases scoped to the member when billing is configured", async () => {
    process.env.BILLING_DATABASE_URL = "postgres://billing.invalid/db";
    routeMemberData();
    route(/from billing\.orders where/, { rows: [{ id: "o1", product_name_snapshot: "Plus", amount: 100, currency: "KRW", status: "paid", created_at: "c", paid_at: "p", viewed_at: null }] });
    route(/from billing\.order_consents/, { rows: [{ order_id: "o1", consent_type: "terms", document_version: "1", accepted_at: "a" }] });
    const data = await exportOwnMemberData();
    expect(data.purchases).toHaveLength(1);
    expect(data.purchaseConsents).toEqual([{ order_id: "o1", consent_type: "terms", document_version: "1", accepted_at: "a" }]);
    expect(callsMatching(/billing\./).every((c) => c.params[0] === USER.id)).toBe(true);
  });

  it("returns null profile and marketing preference when absent", async () => {
    const data = await exportOwnMemberData();
    expect(data.profile).toBeNull();
    expect(data.marketingPreference).toBeNull();
    expect(data.savedResults).toEqual([]);
  });
});
