import "server-only";

import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { decryptMemberData, encryptMemberData } from "@/server/crypto/privateData";
import { memberProfileSchema, type MemberProfile } from "./profileSchema";

type ProfileRow = Readonly<{
  id: string;
  birth_profile_ciphertext: string;
  key_version: number;
}>;

function parseProfile(value: unknown): MemberProfile {
  const parsed = memberProfileSchema.safeParse(value);
  if (!parsed.success) throw new Error("Stored member profile is invalid");
  return parsed.data;
}

/**
 * Copies the caller's live 'local-default' birth profile into a new, independently
 * encrypted member.profiles row under `sourceKey` (e.g. "order:<orderId>"). AES-GCM
 * binds each ciphertext to its own row id via AAD, so this decrypts under the live
 * profile's id and re-encrypts under a freshly generated one — it cannot just copy
 * ciphertext bytes. The result is a point-in-time snapshot that a later edit to the
 * live profile (or its deletion) never changes, which is what lets a purchased
 * report keep showing the chart it was bought for. Returns null if the caller has
 * no saved profile yet; the caller decides how to surface that.
 */
export async function snapshotOwnProfile(
  client: PoolClient,
  userId: string,
  sourceKey: string,
): Promise<Readonly<{ id: string; profile: MemberProfile }> | null> {
  const result = await client.query<ProfileRow>(
    `select id, birth_profile_ciphertext, key_version
       from member.profiles
      where user_id = $1 and source_key = 'local-default'
      limit 1`,
    [userId],
  );
  const row = result.rows[0];
  if (!row) return null;

  const plaintext = decryptMemberData(row.birth_profile_ciphertext, userId, row.id, row.key_version);
  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(plaintext) as unknown;
  } catch {
    throw new Error("Stored member profile is invalid");
  }
  const profile = parseProfile(parsedValue);

  const snapshotId = randomUUID();
  const encryptedProfile = encryptMemberData(JSON.stringify(profile), userId, snapshotId);
  const encryptedLabel = encryptMemberData(profile.placeLabel, userId, `${snapshotId}:label`);
  await client.query(
    `insert into member.profiles
       (id, user_id, source_key, label_ciphertext, birth_profile_ciphertext, key_version, updated_at)
     values ($1, $2, $3, $4, $5, $6, now())`,
    [snapshotId, userId, sourceKey, encryptedLabel.ciphertext, encryptedProfile.ciphertext, encryptedProfile.keyVersion],
  );

  return { id: snapshotId, profile };
}
