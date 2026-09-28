import "server-only";

import { getOwnDirectEntitlementOrderId, getOwnOrderProfileIds } from "@/server/billing/service";
import type { ProductKey } from "@/server/billing/catalog";
import { getOwnProfile, getOwnProfileById } from "@/server/member/dal";
import type { MemberProfile } from "@/server/member/profileSchema";

/**
 * The profile a product's report should actually use: the one bound to the
 * purchase at checkout time (billing.order_profiles), not whatever profile
 * happens to be "live" on the account right now. Without this, a single
 * purchase could be reused to view a different person's report simply by
 * editing or switching the account's default profile after paying.
 *
 * Falls back to the live profile when there's no direct-purchase binding —
 * this is the correct behavior (not a bug) for LUMINA+ subscription access,
 * since a subscription isn't purchased for one specific chart, and for any
 * pre-B2 order that predates order_profiles existing.
 */
export async function getOwnBoundProfile(productKey: ProductKey): Promise<MemberProfile | null> {
  const orderId = await getOwnDirectEntitlementOrderId(productKey);
  if (orderId) {
    const [profileId] = await getOwnOrderProfileIds(orderId);
    if (profileId) {
      const profile = await getOwnProfileById(profileId);
      if (profile) return profile;
    }
  }
  return getOwnProfile();
}
