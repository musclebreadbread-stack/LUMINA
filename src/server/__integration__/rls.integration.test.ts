import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { localIntegrationDatabaseUrl } from "./localDatabase";

/*
 * 실제 PostgreSQL에서 회원 RLS를 검증한다. 로컬 일회용 DB에서만 실행하고(호스트 가드),
 * 모든 쓰기는 한 트랜잭션 안에서 하고 끝에 되돌린다. 실행 방법은 docs/LOCAL-DB-INTEGRATION.md.
 */
const databaseUrl = localIntegrationDatabaseUrl();
const BUSINESS_SCHEMAS = ["identity", "member", "billing", "ai", "ops"] as const;
const USER_SCOPED_TABLES = [
  "member.profiles",
  "member.saved_results",
  "member.consents",
  "billing.orders",
  "billing.entitlements",
  "ai.user_narratives",
] as const;

describe.skipIf(!databaseUrl)("member RLS on a real PostgreSQL database", () => {
  const client = new Client({ connectionString: databaseUrl ?? undefined });
  const userA = `it-user-a-${randomUUID()}`;
  const userB = `it-user-b-${randomUUID()}`;

  async function seedUser(userId: string): Promise<void> {
    await client.query(
      `insert into identity."user" (id, name, email) values ($1, 'synthetic', $1 || '@example.invalid')`,
      [userId],
    );
    await client.query(
      `insert into member.profiles (user_id, source_key, label_ciphertext, birth_profile_ciphertext, key_version)
       values ($1, 'synthetic', 'synthetic', 'synthetic', 1)`,
      [userId],
    );
    await client.query(
      `insert into member.saved_results (user_id, source_snapshot_id, product_key, locale, payload_ciphertext, key_version)
       values ($1, gen_random_uuid(), 'saju-2027', 'ko', 'synthetic', 1)`,
      [userId],
    );
    await client.query(
      `insert into member.consents (user_id, consent_type, policy_version) values ($1, 'terms', 'synthetic-v1')`,
      [userId],
    );
    const order = await client.query<{ id: string }>(
      `insert into billing.orders
         (user_id, user_ref_hmac, product_key, price_id, provider, product_name_snapshot, amount, currency, expires_at)
       select $1, sha256(convert_to($1, 'utf8')), p.product_key, p.id, 'toss', 'synthetic', p.amount, p.currency, now() + interval '30 minutes'
         from billing.prices p where p.product_key = 'saju-2027' limit 1
       returning id`,
      [userId],
    );
    await client.query(
      `insert into billing.entitlements (user_id, user_ref_hmac, product_key, order_id)
       values ($1, sha256(convert_to($1, 'utf8')), 'saju-2027', $2)`,
      [userId, order.rows[0]?.id],
    );
    await client.query(
      `insert into ai.user_narratives
         (user_id, user_ref_hmac, product_key, cache_key, fact_sheet_version, locale, prompt_version, schema_version, tier, facts_json)
       values ($1, sha256(convert_to($1, 'utf8')), 'saju-2027', sha256(convert_to('cache:' || $1, 'utf8')), 'v1', 'ko', 'v1', 'v1', 'report', '[]'::jsonb)`,
      [userId],
    );
  }

  async function asMember<T>(userId: string | null, run: () => Promise<T>): Promise<T> {
    await client.query("savepoint member_scope");
    try {
      await client.query("set local role lumina_member_app");
      await client.query("select set_config('app.current_user_id', $1, true)", [userId ?? ""]);
      return await run();
    } finally {
      await client.query("rollback to savepoint member_scope");
    }
  }

  async function countRows(table: string, userId: string): Promise<number> {
    const result = await client.query<{ count: string }>(`select count(*) from ${table} where user_id = $1`, [userId]);
    return Number(result.rows[0]?.count ?? "0");
  }

  beforeAll(async () => {
    await client.connect();
    await client.query("begin");
    await seedUser(userA);
    await seedUser(userB);
  });

  afterAll(async () => {
    await client.query("rollback");
    await client.end();
  });

  it("forces RLS with at least one policy on every business table", async () => {
    const result = await client.query<{ table_name: string; safe: boolean }>(
      `select n.nspname || '.' || c.relname as table_name,
              (c.relrowsecurity and c.relforcerowsecurity and count(p.oid) > 0) as safe
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
         left join pg_policy p on p.polrelid = c.oid
        where n.nspname = any($1) and c.relkind in ('r', 'p')
        group by n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity`,
      [BUSINESS_SCHEMAS],
    );

    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows.filter((row) => !row.safe).map((row) => row.table_name)).toEqual([]);
  });

  it.each(USER_SCOPED_TABLES)("lets a member read only their own rows in %s", async (table) => {
    const counts = await asMember(userA, async () => ({
      own: await countRows(table, userA),
      other: await countRows(table, userB),
    }));

    expect(counts).toEqual({ own: 1, other: 0 });
  });

  it.each(USER_SCOPED_TABLES)("shows nothing in %s when no member identity is set", async (table) => {
    const counts = await asMember(null, async () => ({
      a: await countRows(table, userA),
      b: await countRows(table, userB),
    }));

    expect(counts).toEqual({ a: 0, b: 0 });
  });

  it("rejects writing a profile on behalf of another member", async () => {
    await expect(asMember(userA, () => client.query(
      `insert into member.profiles (user_id, source_key, label_ciphertext, birth_profile_ciphertext, key_version)
       values ($1, 'forged', 'synthetic', 'synthetic', 1)`,
      [userB],
    ))).rejects.toThrow(/row-level security/u);
  });

  it("does not let a member grant themselves an entitlement", async () => {
    await expect(asMember(userA, () => client.query(
      `insert into billing.entitlements (user_id, user_ref_hmac, product_key, order_id)
       select $1, sha256(convert_to($1, 'utf8')), 'saju-2027', id from billing.orders where user_id = $1 limit 1`,
      [userA],
    ))).rejects.toThrow(/permission denied|row-level security/u);
  });
});
