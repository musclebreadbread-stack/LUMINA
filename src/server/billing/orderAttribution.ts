import "server-only";

import type { PoolClient } from "pg";
import type { AttributionPayload } from "@/lib/attributionPayload";
import { captureServerError } from "@/server/observability/captureServerError";

const SAVEPOINT = "order_attribution_insert";

/**
 * Stores where a purchase came from (Track D7) inside the order's own transaction,
 * but behind a savepoint: an analytics row must never be able to fail a sale. A
 * plain failed statement would abort the whole surrounding transaction — including
 * the order itself — so a missing grant or a constraint mismatch in this one table
 * is rolled back to the savepoint, reported, and the checkout carries on without
 * attribution instead.
 */
export async function recordOrderAttribution(
  client: PoolClient,
  orderId: string,
  attribution: AttributionPayload | null | undefined,
): Promise<void> {
  if (!attribution) return;
  await client.query(`savepoint ${SAVEPOINT}`);
  try {
    await client.query(
      `insert into billing.order_attribution (order_id, utm_source, utm_medium, utm_campaign, landing_path)
       values ($1, $2, $3, $4, $5)`,
      [orderId, attribution.source, attribution.medium, attribution.campaign, attribution.landingPath],
    );
    await client.query(`release savepoint ${SAVEPOINT}`);
  } catch (error) {
    await client.query(`rollback to savepoint ${SAVEPOINT}`);
    await captureServerError(error, "billing-order");
  }
}
