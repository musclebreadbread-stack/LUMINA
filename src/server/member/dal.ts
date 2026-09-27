import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { validateSnapshot } from "@/lib/integratedPortrait/validation";
import type { ResultSnapshotV1 } from "@/lib/integratedPortrait/contracts";
import { decryptMemberData, encryptMemberData } from "@/server/crypto/privateData";
import { getSignedInMember } from "@/server/auth/session";
import { hasRequiredMemberConsents } from "./consents";
import { getMemberPool, withMemberTransaction } from "./database";
import { getIdentityPool } from "@/server/auth/database";
import { memberProfileSchema, type MemberProfile } from "./profileSchema";
import { prepareMemberAccountDeletion } from "@/server/billing/service";
import { localePath, type Locale } from "@/i18n/locale";

export class MemberAccessError extends Error {
  constructor(readonly reason: "authentication_required" | "consent_required") {
    super(reason);
    this.name = "MemberAccessError";
  }
}

export class InvalidMemberDataError extends Error {
  constructor() {
    super("Member data is invalid");
    this.name = "InvalidMemberDataError";
  }
}

type MemberIdentity = Readonly<{ id: string; email: string }>;

async function requireMemberIdentity(): Promise<MemberIdentity> {
  const session = await getSignedInMember();
  if (!session) throw new MemberAccessError("authentication_required");
  if (!(await hasRequiredMemberConsents(session.user.id))) {
    throw new MemberAccessError("consent_required");
  }
  return { id: session.user.id, email: session.user.email };
}

type ProfileRow = Readonly<{
  id: string;
  label_ciphertext: string;
  birth_profile_ciphertext: string;
  key_version: number;
}>;

type SavedResultRow = Readonly<{
  source_snapshot_id: string;
  payload_ciphertext: string;
  key_version: number;
}>;

type ConsentRow = Readonly<{
  consent_type: string;
  policy_version: string;
  accepted_at: string;
}>;

type BillingExportRow = Readonly<{
  id: string;
  product_name_snapshot: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  viewed_at: string | null;
}>;

type BillingConsentRow = Readonly<{
  order_id: string;
  consent_type: string;
  document_version: string;
  accepted_at: string;
}>;

type ShareLinkRow = Readonly<{
  id: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
}>;

type MarketingPreferenceExportRow = Readonly<{
  preference_status: "not_opted_in" | "subscribed" | "unsubscribed";
  policy_version: string | null;
  consented_at: string | null;
  unsubscribed_at: string | null;
  updated_at: string;
}>;

type PublicShareRow = Readonly<{
  id: string;
  user_id: string;
  payload_ciphertext: string;
  key_version: number;
}>;

function decryptJson<T>(ciphertext: string, userId: string, recordId: string, keyVersion: number, parse: (value: unknown) => T): T {
  const plaintext = decryptMemberData(ciphertext, userId, recordId, keyVersion);
  let value: unknown;
  try {
    value = JSON.parse(plaintext) as unknown;
  } catch {
    throw new Error("Stored member data is invalid");
  }
  return parse(value);
}

function parseProfile(value: unknown): MemberProfile {
  const parsed = memberProfileSchema.safeParse(value);
  if (!parsed.success) throw new Error("Stored member profile is invalid");
  return parsed.data;
}

function parseSnapshot(value: unknown): ResultSnapshotV1 {
  const parsed = validateSnapshot(value);
  if (!parsed.ok) throw new Error("Stored member result is invalid");
  return parsed.value;
}

function validatedSnapshots(values: readonly unknown[]): readonly ResultSnapshotV1[] {
  const snapshots: ResultSnapshotV1[] = [];
  const ids = new Set<string>();
  for (const value of values) {
    const parsed = validateSnapshot(value);
    if (!parsed.ok || ids.has(parsed.value.id)) throw new InvalidMemberDataError();
    ids.add(parsed.value.id);
    snapshots.push(parsed.value);
  }
  return snapshots;
}

async function lockProfileRow(client: PoolClient, userId: string): Promise<ProfileRow | null> {
  await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [`lumina-default-profile:${userId}`]);
  const result = await client.query<ProfileRow>(
    `select id, label_ciphertext, birth_profile_ciphertext, key_version
       from member.profiles
      where user_id = $1 and source_key = 'local-default'
      for update`,
    [userId],
  );
  return result.rows[0] ?? null;
}

export async function claimOwnLocalData(
  profileInput: unknown | null,
  snapshotInputs: readonly unknown[],
): Promise<Readonly<{ profileSaved: boolean; snapshotsSaved: number }>> {
  const member = await requireMemberIdentity();
  const profile = profileInput === null ? null : memberProfileSchema.safeParse(profileInput);
  if (profileInput !== null && (!profile || !profile.success)) throw new InvalidMemberDataError();
  const snapshots = validatedSnapshots(snapshotInputs);

  return withMemberTransaction(member.id, async (client) => {
    let profileSaved = false;
    if (profile?.success) {
      const existing = await lockProfileRow(client, member.id);
      const profileId = existing?.id ?? randomUUID();
      const serialized = JSON.stringify(profile.data);
      const encryptedProfile = encryptMemberData(serialized, member.id, profileId);
      const encryptedLabel = encryptMemberData(profile.data.placeLabel, member.id, `${profileId}:label`);
      await client.query(
        `insert into member.profiles
           (id, user_id, source_key, label_ciphertext, birth_profile_ciphertext, key_version, updated_at)
         values ($1, $2, 'local-default', $3, $4, $5, now())
         on conflict (user_id, source_key) do update
           set label_ciphertext = excluded.label_ciphertext,
               birth_profile_ciphertext = excluded.birth_profile_ciphertext,
               key_version = excluded.key_version,
               updated_at = now()`,
        [profileId, member.id, encryptedLabel.ciphertext, encryptedProfile.ciphertext, encryptedProfile.keyVersion],
      );
      profileSaved = true;
    }

    let snapshotsSaved = 0;
    for (const snapshot of snapshots) {
      const recordId = `snapshot:${snapshot.id}`;
      const encrypted = encryptMemberData(JSON.stringify(snapshot), member.id, recordId);
      const result = await client.query(
        `insert into member.saved_results
           (user_id, source_snapshot_id, product_key, locale, payload_ciphertext, key_version)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (user_id, source_snapshot_id) do nothing`,
        [member.id, snapshot.id, snapshot.analysisKey, snapshot.locale, encrypted.ciphertext, encrypted.keyVersion],
      );
      snapshotsSaved += result.rowCount ?? 0;
    }

    return { profileSaved, snapshotsSaved };
  });
}

export async function getOwnProfile(): Promise<MemberProfile | null> {
  const member = await requireMemberIdentity();
  return withMemberTransaction(member.id, async (client) => {
    const result = await client.query<ProfileRow>(
      `select id, label_ciphertext, birth_profile_ciphertext, key_version
         from member.profiles
        where user_id = $1 and source_key = 'local-default'
        limit 1`,
      [member.id],
    );
    const row = result.rows[0];
    if (!row) return null;
    return decryptJson(row.birth_profile_ciphertext, member.id, row.id, row.key_version, parseProfile);
  });
}

export async function getOwnSavedResults(): Promise<readonly ResultSnapshotV1[]> {
  const member = await requireMemberIdentity();
  return withMemberTransaction(member.id, async (client) => {
    const result = await client.query<SavedResultRow>(
      `select source_snapshot_id::text, payload_ciphertext, key_version
         from member.saved_results
        where user_id = $1
        order by created_at desc
        limit 100`,
      [member.id],
    );
    return result.rows.map((row) => decryptJson(
      row.payload_ciphertext,
      member.id,
      `snapshot:${row.source_snapshot_id}`,
      row.key_version,
      parseSnapshot,
    ));
  });
}

function shareTokenHash(token: string): Buffer | null {
  if (!/^[A-Za-z0-9_-]{22}$/u.test(token)) return null;
  const decoded = Buffer.from(token, "base64url");
  if (decoded.length !== 16 || decoded.toString("base64url") !== token) return null;
  return createHash("sha256").update(decoded).digest();
}

function publicSiteUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) throw new Error("NEXT_PUBLIC_SITE_URL is not configured");
  const url = new URL(raw);
  if (url.username || url.password || url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) {
    throw new Error("NEXT_PUBLIC_SITE_URL must contain only the public origin");
  }
  if (process.env.APP_ENV !== "development" && url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS outside local development");
  }
  return url;
}

function twelveMonthsFrom(now: Date): Date {
  const targetMonth = now.getUTCMonth() + 12;
  const lastDay = new Date(Date.UTC(now.getUTCFullYear(), targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(
    now.getUTCFullYear() + Math.floor(targetMonth / 12),
    targetMonth % 12,
    Math.min(now.getUTCDate(), lastDay),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds(),
    now.getUTCMilliseconds(),
  ));
}

async function withBearerShareTransaction<T>(tokenHash: Buffer, operation: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getMemberPool().connect();
  try {
    await client.query("begin");
    await client.query("select set_config('app.current_share_token_hash', $1, true)", [tokenHash.toString("hex")]);
    const result = await operation(client);
    await client.query("commit");
    return result;
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // Preserve the original application error.
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function createOwnShareLink(sourceSnapshotId: string, locale: Locale): Promise<Readonly<{
  id: string;
  url: string;
  expiresAt: string;
}>> {
  const member = await requireMemberIdentity();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(sourceSnapshotId)) {
    throw new InvalidMemberDataError();
  }

  const tokenBytes = randomBytes(16);
  const token = tokenBytes.toString("base64url");
  const tokenHash = createHash("sha256").update(tokenBytes).digest();
  const shareId = randomUUID();
  const now = new Date();
  const expiresAt = twelveMonthsFrom(now);

  await withMemberTransaction(member.id, async (client) => {
    const result = await client.query<SavedResultRow>(
      `select source_snapshot_id::text, payload_ciphertext, key_version
         from member.saved_results
        where user_id = $1 and source_snapshot_id = $2
        limit 1`,
      [member.id, sourceSnapshotId],
    );
    const saved = result.rows[0];
    if (!saved) throw new InvalidMemberDataError();
    const snapshot = decryptJson(
      saved.payload_ciphertext,
      member.id,
      `snapshot:${saved.source_snapshot_id}`,
      saved.key_version,
      parseSnapshot,
    );
    const encrypted = encryptMemberData(JSON.stringify(snapshot), member.id, `share:${shareId}`);
    await client.query(
      `insert into member.share_links
         (id, user_id, token_hash, payload_ciphertext, key_version, created_at, expires_at)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [shareId, member.id, tokenHash, encrypted.ciphertext, encrypted.keyVersion, now, expiresAt],
    );
  });

  const sharePath = localePath(`/p/${token}`, locale);
  return { id: shareId, url: new URL(sharePath, publicSiteUrl()).toString(), expiresAt: expiresAt.toISOString() };
}

export async function getPublicShare(token: string): Promise<ResultSnapshotV1 | null> {
  const tokenHash = shareTokenHash(token);
  if (!tokenHash) return null;
  return withBearerShareTransaction(tokenHash, async (client) => {
    const result = await client.query<PublicShareRow>(
      `select id::text, user_id, payload_ciphertext, key_version
         from member.share_links
        where token_hash = $1
          and revoked_at is null
          and expires_at > now()
        limit 1`,
      [tokenHash],
    );
    const row = result.rows[0];
    if (!row) return null;
    return decryptJson(row.payload_ciphertext, row.user_id, `share:${row.id}`, row.key_version, parseSnapshot);
  });
}

export async function listOwnShareLinks(): Promise<readonly ShareLinkRow[]> {
  const member = await requireMemberIdentity();
  return withMemberTransaction(member.id, async (client) => {
    const result = await client.query<ShareLinkRow>(
      `select id::text, created_at::text, expires_at::text, revoked_at::text
         from member.share_links
        where user_id = $1
        order by created_at desc
        limit 100`,
      [member.id],
    );
    return result.rows;
  });
}

export async function revokeOwnShareLink(shareId: string): Promise<boolean> {
  const member = await requireMemberIdentity();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(shareId)) {
    throw new InvalidMemberDataError();
  }
  return withMemberTransaction(member.id, async (client) => {
    const result = await client.query(
      `update member.share_links
          set revoked_at = coalesce(revoked_at, now())
        where id = $1 and user_id = $2 and revoked_at is null
        returning id`,
      [shareId, member.id],
    );
    return (result.rowCount ?? 0) > 0;
  });
}

export async function deleteOwnMemberAccount(confirmedEmail: string): Promise<void> {
  const member = await requireMemberIdentity();
  if (confirmedEmail.trim().toLocaleLowerCase("en-US") !== member.email.trim().toLocaleLowerCase("en-US")) {
    throw new InvalidMemberDataError();
  }

  await prepareMemberAccountDeletion(member.id);

  const client = await getIdentityPool().connect();
  try {
    await client.query("begin");
    const result = await client.query<{ id: string }>(
      `delete from identity."user"
        where id = $1 and lower(email) = lower($2)
        returning id`,
      [member.id, member.email],
    );
    if (result.rowCount !== 1) throw new Error("Member account deletion did not match one account");
    await client.query("commit");
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // Preserve the original deletion error.
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function exportOwnMemberData(): Promise<Readonly<{
  exportedAt: string;
  account: Readonly<{ email: string }>;
  profile: MemberProfile | null;
  savedResults: readonly ResultSnapshotV1[];
  consents: readonly ConsentRow[];
  marketingPreference: MarketingPreferenceExportRow | null;
  shareLinks: readonly ShareLinkRow[];
  purchases: readonly BillingExportRow[];
  purchaseConsents: readonly BillingConsentRow[];
}>> {
  const member = await requireMemberIdentity();
  const data = await withMemberTransaction(member.id, async (client) => {
    const [profileResult, snapshotsResult, consentsResult, shareLinksResult, marketingPreferenceResult] = await Promise.all([
      client.query<ProfileRow>(
        `select id, label_ciphertext, birth_profile_ciphertext, key_version
           from member.profiles
          where user_id = $1 and source_key = 'local-default'
          limit 1`,
        [member.id],
      ),
      client.query<SavedResultRow>(
        `select source_snapshot_id::text, payload_ciphertext, key_version
           from member.saved_results
          where user_id = $1
          order by created_at desc`,
        [member.id],
      ),
      client.query<ConsentRow>(
        `select consent_type, policy_version, accepted_at::text
           from member.consents
          where user_id = $1
          order by accepted_at asc`,
        [member.id],
      ),
      client.query<ShareLinkRow>(
        `select id::text, created_at::text, expires_at::text, revoked_at::text
           from member.share_links
          where user_id = $1
          order by created_at asc`,
        [member.id],
      ),
      client.query<MarketingPreferenceExportRow>(
        `select preference_status, policy_version, consented_at::text,
                unsubscribed_at::text, updated_at::text
           from member.marketing_preferences
          where user_id = $1
          limit 1`,
        [member.id],
      ),
    ]);
    const [purchasesResult, purchaseConsentsResult] = process.env.BILLING_DATABASE_URL
      ? await Promise.all([
          client.query<BillingExportRow>(
            `select id::text, product_name_snapshot, amount, currency, status,
                    created_at::text, paid_at::text, viewed_at::text
               from billing.orders where user_id = $1 order by created_at asc`,
            [member.id],
          ),
          client.query<BillingConsentRow>(
            `select c.order_id::text, c.consent_type, c.document_version, c.accepted_at::text
               from billing.order_consents c
               join billing.orders o on o.id = c.order_id
              where o.user_id = $1 order by c.accepted_at asc`,
            [member.id],
          ),
        ])
      : [null, null];

    const profileRow = profileResult.rows[0];
    const profile = profileRow
      ? decryptJson(profileRow.birth_profile_ciphertext, member.id, profileRow.id, profileRow.key_version, parseProfile)
      : null;
    const savedResults = snapshotsResult.rows.map((row) => decryptJson(
      row.payload_ciphertext,
      member.id,
      `snapshot:${row.source_snapshot_id}`,
      row.key_version,
      parseSnapshot,
    ));

    return {
      profile,
      savedResults,
      consents: consentsResult.rows,
      marketingPreference: marketingPreferenceResult.rows[0] ?? null,
      shareLinks: shareLinksResult.rows,
      purchases: purchasesResult?.rows ?? [],
      purchaseConsents: purchaseConsentsResult?.rows ?? [],
    };
  });

  return {
    exportedAt: new Date().toISOString(),
    account: { email: member.email },
    ...data,
  };
}
