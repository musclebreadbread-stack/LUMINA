import "server-only";

import { withMemberTransaction } from "@/server/member/database";
import { withGrowthTransaction } from "./database";
import { getApprovedMarketingPolicyVersion, isGrowthCapabilityEnabled } from "./featureGate";

export type MarketingPreferenceStatus = "not_opted_in" | "subscribed" | "unsubscribed";

export type MarketingPreference = Readonly<{
  status: MarketingPreferenceStatus;
  policyVersion: string | null;
  consentedAt: string | null;
  unsubscribedAt: string | null;
}>;

type MarketingPreferenceRow = Readonly<{
  preference_status: MarketingPreferenceStatus;
  policy_version: string | null;
  consented_at: string | null;
  unsubscribed_at: string | null;
}>;

function toPreference(row: MarketingPreferenceRow | undefined): MarketingPreference {
  if (!row) {
    return { status: "not_opted_in", policyVersion: null, consentedAt: null, unsubscribedAt: null };
  }
  return {
    status: row.preference_status,
    policyVersion: row.policy_version,
    consentedAt: row.consented_at,
    unsubscribedAt: row.unsubscribed_at,
  };
}

export type MarketingSubscriberCounts = Readonly<{ subscribed: number; unsubscribed: number }>;

/**
 * Aggregate counts only — no member is identified. Read through the growth worker
 * role (which already has select on member.marketing_preferences), so it is null
 * whenever GROWTH_DATABASE_URL isn't configured rather than an error the admin
 * page has to handle. This is the "launch-notification sign-ups" number the
 * rollout plan asks to start recording before sales open.
 */
export async function getMarketingSubscriberCounts(): Promise<MarketingSubscriberCounts | null> {
  if (!process.env.GROWTH_DATABASE_URL?.trim()) return null;
  return withGrowthTransaction(async (client) => {
    const result = await client.query<{ subscribed: number; unsubscribed: number }>(
      `select count(*) filter (where preference_status = 'subscribed')::int as subscribed,
              count(*) filter (where preference_status = 'unsubscribed')::int as unsubscribed
         from member.marketing_preferences`,
    );
    const row = result.rows[0];
    return { subscribed: Math.max(0, row?.subscribed ?? 0), unsubscribed: Math.max(0, row?.unsubscribed ?? 0) };
  });
}

export async function getOwnMarketingPreference(userId: string): Promise<MarketingPreference> {
  return withMemberTransaction(userId, async (client) => {
    const result = await client.query<MarketingPreferenceRow>(
      `select preference_status, policy_version, consented_at::text, unsubscribed_at::text
         from member.marketing_preferences
        where user_id = $1
        limit 1`,
      [userId],
    );
    return toPreference(result.rows[0]);
  });
}

export async function setOwnMarketingPreference(
  userId: string,
  subscribed: boolean,
): Promise<MarketingPreference> {
  const policyVersion = subscribed ? getApprovedMarketingPolicyVersion() : null;
  if (subscribed && (!isGrowthCapabilityEnabled("marketingRetention") || !policyVersion)) {
    throw new Error("Marketing retention is not approved and enabled");
  }

  await withMemberTransaction(userId, async (client) => {
    if (subscribed && policyVersion) {
      await client.query(
        `insert into member.consents (user_id, consent_type, policy_version)
         values ($1, 'marketing', $2)
         on conflict (user_id, consent_type, policy_version) do nothing`,
        [userId, policyVersion],
      );
      await client.query(
        `insert into member.marketing_preferences as existing
           (user_id, preference_status, policy_version, consented_at, unsubscribed_at, updated_at)
         values ($1, 'subscribed', $2, now(), null, now())
         on conflict (user_id) do update
           set preference_status = 'subscribed',
               policy_version = excluded.policy_version,
               consented_at = case
                 when existing.preference_status = 'subscribed'
                   and existing.policy_version = excluded.policy_version
                   then existing.consented_at
                 else now()
               end,
               unsubscribed_at = null,
               updated_at = now()`,
        [userId, policyVersion],
      );
      return;
    }

    await client.query(
      `insert into member.marketing_preferences
         (user_id, preference_status, policy_version, consented_at, unsubscribed_at, updated_at)
       values ($1, 'unsubscribed', null, null, now(), now())
       on conflict (user_id) do update
         set preference_status = 'unsubscribed',
             unsubscribed_at = now(),
             updated_at = now()`,
      [userId],
    );
  });

  return getOwnMarketingPreference(userId);
}
