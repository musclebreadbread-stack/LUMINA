import "server-only";

import { getOwnDirectEntitlementOrderId, getOwnOrder, getOwnOrderProfileIds } from "@/server/billing/service";
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

/**
 * The order id to route through the "open report" consent gate before showing
 * this product's report — the point where reading actually begins, and where
 * the digital-content withdrawal right (전자상거래법) ends. Returns null when no
 * gate is needed: either the relevant order was already opened, or access
 * comes from a LUMINA+ subscription rather than a direct purchase, which has
 * no order-specific withdrawal window to protect. Marking a render-triggered
 * page load (link previews, prefetch, crawlers) as "opened" would burn that
 * right without the buyer ever actually reading anything, so the mark itself
 * only happens from the explicit POST in /api/billing/orders/[id]/open.
 */
export async function getOwnPendingReportOpenOrderId(productKey: ProductKey): Promise<string | null> {
  const orderId = await getOwnDirectEntitlementOrderId(productKey);
  if (!orderId) return null;
  const order = await getOwnOrder(orderId).catch(() => null);
  if (!order || order.viewedAt !== null) return null;
  return orderId;
}
