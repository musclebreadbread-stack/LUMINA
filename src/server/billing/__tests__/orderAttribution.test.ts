import type { PoolClient } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const captureServerError = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("@/server/observability/captureServerError", () => ({ captureServerError }));

import { recordOrderAttribution } from "../orderAttribution";

const ORDER_ID = "55555555-5555-4555-8555-555555555555";
const ATTRIBUTION = { source: "naver", medium: null, campaign: null, landingPath: "/saju/2027" } as const;

function fakeClient(failOn?: RegExp): { readonly client: PoolClient; readonly statements: string[] } {
  const statements: string[] = [];
  const query = vi.fn(async (text: string) => {
    statements.push(text.replace(/\s+/gu, " ").trim());
    if (failOn?.test(text)) throw new Error("permission denied for table order_attribution");
    return { rows: [] };
  });
  return { client: { query } as unknown as PoolClient, statements };
}

beforeEach(() => captureServerError.mockClear());

describe("recordOrderAttribution", () => {
  it("does nothing when there is no attribution to record", async () => {
    const { client, statements } = fakeClient();
    await recordOrderAttribution(client, ORDER_ID, null);
    await recordOrderAttribution(client, ORDER_ID, undefined);
    expect(statements).toEqual([]);
  });

  it("inserts inside a savepoint that is released on success", async () => {
    const { client, statements } = fakeClient();
    await recordOrderAttribution(client, ORDER_ID, ATTRIBUTION);
    expect(statements[0]).toBe("savepoint order_attribution_insert");
    expect(statements[1]).toContain("insert into billing.order_attribution");
    expect(statements[2]).toBe("release savepoint order_attribution_insert");
    expect(statements).toHaveLength(3);
    expect(captureServerError).not.toHaveBeenCalled();
  });

  it("passes the order id and normalized values as bind parameters, never inline", async () => {
    const { client } = fakeClient();
    await recordOrderAttribution(client, ORDER_ID, ATTRIBUTION);
    const insertCall = vi.mocked(client.query).mock.calls.find(([text]) => String(text).includes("insert into"));
    expect(insertCall?.[1]).toEqual([ORDER_ID, "naver", null, null, "/saju/2027"]);
  });

  it("rolls back to the savepoint and reports — without throwing — when the insert fails, so the order survives", async () => {
    const { client, statements } = fakeClient(/insert into billing\.order_attribution/u);
    await expect(recordOrderAttribution(client, ORDER_ID, ATTRIBUTION)).resolves.toBeUndefined();
    expect(statements).toContain("rollback to savepoint order_attribution_insert");
    expect(statements).not.toContain("release savepoint order_attribution_insert");
    expect(captureServerError).toHaveBeenCalledTimes(1);
    expect(captureServerError).toHaveBeenCalledWith(expect.any(Error), "billing-order");
  });
});
