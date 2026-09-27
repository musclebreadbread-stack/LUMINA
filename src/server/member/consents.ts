import "server-only";

import { withMemberTransaction } from "./database";

export const REQUIRED_MEMBER_CONSENTS = ["terms", "privacy", "overseas_transfer"] as const;
export type RequiredMemberConsent = (typeof REQUIRED_MEMBER_CONSENTS)[number];

export type ActiveConsentVersions = Readonly<Record<RequiredMemberConsent, string>>;

function isPolicyVersion(value: string | undefined): value is string {
  return value !== undefined && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/u.test(value);
}

export function getActiveConsentVersions(): ActiveConsentVersions | null {
  const terms = process.env.MEMBER_TERMS_VERSION;
  const privacy = process.env.MEMBER_PRIVACY_VERSION;
  const overseasTransfer = process.env.MEMBER_TRANSFER_VERSION;

  if (!isPolicyVersion(terms) || !isPolicyVersion(privacy) || !isPolicyVersion(overseasTransfer)) return null;
  return { terms, privacy, overseas_transfer: overseasTransfer };
}

export async function hasRequiredMemberConsents(userId: string): Promise<boolean> {
  const versions = getActiveConsentVersions();
  if (!versions) return false;

  const accepted = await withMemberTransaction(userId, async (client) => {
    const result = await client.query<{ consent_type: string; policy_version: string }>(
      `select consent_type, policy_version
         from member.consents
        where user_id = $1
          and consent_type = any($2::text[])
          and policy_version = any($3::text[])`,
      [userId, [...REQUIRED_MEMBER_CONSENTS], Object.values(versions)],
    );
    return new Set(result.rows.map((row) => `${row.consent_type}:${row.policy_version}`));
  });

  return REQUIRED_MEMBER_CONSENTS.every((consent) => accepted.has(`${consent}:${versions[consent]}`));
}

export async function recordRequiredMemberConsents(userId: string): Promise<void> {
  const versions = getActiveConsentVersions();
  if (!versions) throw new Error("Current member consent versions are not configured");

  await withMemberTransaction(userId, async (client) => {
    for (const consent of REQUIRED_MEMBER_CONSENTS) {
      await client.query(
        `insert into member.consents (user_id, consent_type, policy_version)
         values ($1, $2, $3)
         on conflict (user_id, consent_type, policy_version) do nothing`,
        [userId, consent, versions[consent]],
      );
    }

  });
}
