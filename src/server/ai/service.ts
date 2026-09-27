import "server-only";

import { createHash, createHmac, randomUUID } from "node:crypto";
import { aiFactsSchema, AI_FACT_SHEET_VERSION, AI_NARRATIVE_PROMPT_VERSION, AI_NARRATIVE_SCHEMA_VERSION, narrativeOutputSchema, type AIFacts, type NarrativeJob, type NarrativeStatus } from "./types";
import { withAITransaction } from "./database";
import type { Locale } from "@/i18n/locale";

const PRODUCT_KEY = "saju-2027";
const USER_GENERATIONS_PER_ENTITLEMENT = 3;
const USER_GENERATIONS_PER_DAY = 3;
const USER_GENERATIONS_PER_MONTH = 10;

export class AIQuotaError extends Error {
  constructor(readonly reason: "entitlement_limit" | "daily_limit" | "monthly_limit" | "daily_budget_limit") {
    super(reason);
    this.name = "AIQuotaError";
  }
}

function userRefHmac(userId: string): Buffer {
  const key = process.env.AI_USER_REF_HMAC_KEY;
  if (!key || Buffer.byteLength(key, "utf8") < 32 || /[\r\n]/u.test(key)) {
    throw new Error("AI_USER_REF_HMAC_KEY is not configured");
  }
  return createHmac("sha256", key).update(userId, "utf8").digest();
}

function cacheKey(facts: AIFacts, locale: Locale): Buffer {
  const sortedFacts = [...facts].sort((left, right) => left.id.localeCompare(right.id));
  const canonical = JSON.stringify({
    product: PRODUCT_KEY,
    factSheetVersion: AI_FACT_SHEET_VERSION,
    facts: sortedFacts,
    locale,
    promptVersion: AI_NARRATIVE_PROMPT_VERSION,
    schemaVersion: AI_NARRATIVE_SCHEMA_VERSION,
    tier: "report",
  });
  return createHash("sha256").update(canonical, "utf8").digest();
}

async function reserveUserQuota(
  client: Parameters<Parameters<typeof withAITransaction>[0]>[0],
  userId: string,
  periodKind: "day" | "month",
  periodStart: string,
  maximum: number,
): Promise<boolean> {
  const result = await client.query(
    `insert into ai.quota_counters (user_id, period_kind, period_start, generation_count)
     values ($1, $2, $3::date, 1)
     on conflict (user_id, period_kind, period_start) do update
       set generation_count = ai.quota_counters.generation_count + 1, updated_at = now()
       where ai.quota_counters.generation_count < $4
     returning user_id`,
    [userId, periodKind, periodStart, maximum],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function enqueueYearForecastNarrative(input: Readonly<{
  userId: string;
  entitlementId: string;
  locale: Locale;
  facts: AIFacts;
}>): Promise<Readonly<{ id: string; status: NarrativeStatus }>> {
  const facts = aiFactsSchema.parse(input.facts);
  const userReference = userRefHmac(input.userId);
  const key = cacheKey(facts, input.locale);
  return withAITransaction(async (client) => {
    await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [input.entitlementId]);

    const existing = await client.query<{ id: string; status: NarrativeStatus }>(
      `select id::text, status from ai.user_narratives
        where entitlement_id = $1 and cache_key = $2 limit 1`,
      [input.entitlementId, key],
    );
    if (existing.rows[0]) return existing.rows[0];

    const cached = await client.query<{ payload: unknown }>(
      `select payload from ai.narrative_cache
        where cache_key = $1 and expires_at > now() limit 1`,
      [key],
    );
    const cachedOutput = cached.rows[0] ? narrativeOutputSchema.safeParse(cached.rows[0].payload) : null;

    if (!cachedOutput?.success) {
      const prior = await client.query<{ count: number }>(
        `select count(*)::int as count from ai.user_narratives where entitlement_id = $1`,
        [input.entitlementId],
      );
      if ((prior.rows[0]?.count ?? 0) >= USER_GENERATIONS_PER_ENTITLEMENT) {
        throw new AIQuotaError("entitlement_limit");
      }

      const utcNow = new Date();
      const utcDay = utcNow.toISOString().slice(0, 10);
      const utcMonth = `${utcDay.slice(0, 7)}-01`;
      if (!(await reserveUserQuota(client, input.userId, "day", utcDay, USER_GENERATIONS_PER_DAY))) {
        throw new AIQuotaError("daily_limit");
      }
      if (!(await reserveUserQuota(client, input.userId, "month", utcMonth, USER_GENERATIONS_PER_MONTH))) {
        throw new AIQuotaError("monthly_limit");
      }
    }

    const id = randomUUID();
    const inserted = await client.query<{ id: string; status: NarrativeStatus }>(
      `insert into ai.user_narratives
        (id, user_id, user_ref_hmac, entitlement_id, product_key, cache_key, fact_sheet_version,
         locale, prompt_version, schema_version, tier, facts_json, status, payload)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'report', $11::jsonb, $12, $13::jsonb)
       returning id::text, status`,
      [id, input.userId, userReference, input.entitlementId, PRODUCT_KEY, key,
        AI_FACT_SHEET_VERSION, input.locale, AI_NARRATIVE_PROMPT_VERSION, AI_NARRATIVE_SCHEMA_VERSION,
        JSON.stringify(facts), cachedOutput?.success ? "succeeded" : "queued",
        cachedOutput?.success ? JSON.stringify(cachedOutput.data) : null],
    );
    const row = inserted.rows[0];
    if (!row) throw new Error("AI narrative was not created");
    return row;
  });
}

export async function getOwnYearForecastNarrative(userId: string, narrativeId: string): Promise<Readonly<{
  status: NarrativeStatus;
  output: ReturnType<typeof narrativeOutputSchema.parse> | null;
}> | null> {
  return withAITransaction(async (client) => {
    const result = await client.query<{ status: NarrativeStatus; payload: unknown }>(
      `select status, payload from ai.user_narratives where id = $1 and user_id = $2 limit 1`,
      [narrativeId, userId],
    );
    const row = result.rows[0];
    if (!row) return null;
    const parsed = row.status === "succeeded" ? narrativeOutputSchema.safeParse(row.payload) : null;
    return { status: parsed?.success ? row.status : row.status === "succeeded" ? "fallback" : row.status, output: parsed?.success ? parsed.data : null };
  });
}

export async function claimYearForecastNarrative(narrativeId?: string): Promise<NarrativeJob | null> {
  return withAITransaction(async (client) => {
    const result = await client.query<{
      id: string;
      user_id: string;
      user_ref_hmac: Buffer;
      cache_key: Buffer;
      fact_sheet_version: string;
  locale: Locale;
      prompt_version: string;
      schema_version: string;
      tier: "report" | "qa" | "repair";
      facts_json: unknown;
      attempt_count: number;
    }>(
      `with candidate as (
         select id from ai.user_narratives
          where user_id is not null and attempt_count < 3
            and ($1::uuid is null or id = $1::uuid)
            and (status = 'queued' or (status = 'processing' and processing_until <= now()))
          order by created_at asc
          for update skip locked
          limit 1
       )
       update ai.user_narratives n
          set status = 'processing', attempt_count = n.attempt_count + 1,
              processing_until = now() + interval '2 minutes', updated_at = now()
         from candidate c
        where n.id = c.id
       returning n.id::text, n.user_id, n.user_ref_hmac, n.cache_key, n.fact_sheet_version,
                 n.locale, n.prompt_version, n.schema_version, n.tier, n.facts_json, n.attempt_count`,
      [narrativeId ?? null],
    );
    const row = result.rows[0];
    if (!row) return null;
    const facts = aiFactsSchema.safeParse(row.facts_json);
    if (!facts.success) {
      await client.query(
        `update ai.user_narratives set status = 'fallback', processing_until = null, updated_at = now()
          where id = $1 and status = 'processing'`,
        [row.id],
      );
      return null;
    }
    return {
      id: row.id,
      userId: row.user_id,
      userRefHmac: row.user_ref_hmac,
      cacheKey: row.cache_key,
      factSheetVersion: row.fact_sheet_version,
      locale: row.locale,
      promptVersion: row.prompt_version,
      schemaVersion: row.schema_version,
      tier: row.tier,
      facts: facts.data,
      attemptCount: row.attempt_count,
    };
  });
}

export async function listYearForecastNarrativesForSweep(limit = 2): Promise<readonly string[]> {
  const boundedLimit = Math.max(1, Math.min(10, Math.floor(limit)));
  return withAITransaction(async (client) => {
    await client.query(
      `update ai.user_narratives
          set status = 'fallback', processing_until = null, updated_at = now()
        where status = 'processing' and processing_until <= now() and attempt_count >= 3`,
    );
    const result = await client.query<{ id: string }>(
      `select id::text from ai.user_narratives
        where user_id is not null and attempt_count < 3
          and (status = 'queued' or (status = 'processing' and processing_until <= now()))
        order by created_at asc limit $1`,
      [boundedLimit],
    );
    return result.rows.map((row) => row.id);
  });
}

export async function markYearForecastNarrativeFallback(narrativeId: string): Promise<void> {
  await withAITransaction(async (client) => {
    await client.query(
      `update ai.user_narratives
          set status = 'fallback', processing_until = null, updated_at = now()
        where id = $1 and status = 'processing'`,
      [narrativeId],
    );
  });
}

export async function completeYearForecastNarrative(job: NarrativeJob, output: ReturnType<typeof narrativeOutputSchema.parse>): Promise<void> {
  await withAITransaction(async (client) => {
    await client.query(
      `insert into ai.narrative_cache
       (cache_key, product_key, fact_sheet_version, locale, prompt_version, schema_version, tier, payload)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       on conflict (cache_key) do update set
         payload = excluded.payload, expires_at = excluded.expires_at
       where ai.narrative_cache.expires_at <= now()`,
      [job.cacheKey, PRODUCT_KEY, job.factSheetVersion, job.locale, job.promptVersion,
        job.schemaVersion, job.tier, JSON.stringify(output)],
    );
    const cached = await client.query<{ payload: unknown }>(
      `select payload from ai.narrative_cache where cache_key = $1 and expires_at > now() limit 1`,
      [job.cacheKey],
    );
    const canonical = narrativeOutputSchema.safeParse(cached.rows[0]?.payload);
    if (!canonical.success) throw new Error("Canonical AI narrative cache is invalid");
    await client.query(
      `update ai.user_narratives
          set status = 'succeeded', payload = $2::jsonb, processing_until = null, updated_at = now()
        where id = $1 and status = 'processing'`,
      [job.id, JSON.stringify(canonical.data)],
    );
  });
}

export async function reserveAIDailyBudget(input: Readonly<{
  reservationId: string;
  narrativeId: string;
  requestLimitMicrousd: number;
  dailyBudgetMicrousd: number;
}>): Promise<boolean> {
  return withAITransaction(async (client) => {
    await client.query(
      `with expired as (
         delete from ai.budget_reservations where expires_at <= now()
         returning budget_date, amount_microusd
       ), totals as (
         select budget_date, sum(amount_microusd)::bigint as amount_microusd
           from expired group by budget_date
       )
       update ai.daily_budgets b
          set reserved_microusd = greatest(0, b.reserved_microusd - totals.amount_microusd), updated_at = now()
         from totals where b.budget_date = totals.budget_date`,
    );
    const date = new Date().toISOString().slice(0, 10);
    await client.query(
      `insert into ai.daily_budgets (budget_date, budget_limit_microusd)
       values ($1::date, $2)
       on conflict (budget_date) do update
         set budget_limit_microusd = least(ai.daily_budgets.budget_limit_microusd, excluded.budget_limit_microusd), updated_at = now()`,
      [date, input.dailyBudgetMicrousd],
    );
    const budget = await client.query<{ budget_limit_microusd: string; spent_microusd: string; reserved_microusd: string }>(
      `select budget_limit_microusd::text, spent_microusd::text, reserved_microusd::text
         from ai.daily_budgets where budget_date = $1::date for update`,
      [date],
    );
    const row = budget.rows[0];
    if (!row || Number(row.spent_microusd) + Number(row.reserved_microusd) + input.requestLimitMicrousd > Number(row.budget_limit_microusd)) {
      return false;
    }
    await client.query(
      `insert into ai.budget_reservations (id, narrative_id, budget_date, amount_microusd, expires_at)
       values ($1, $2, $3::date, $4, now() + interval '5 minutes')`,
      [input.reservationId, input.narrativeId, date, input.requestLimitMicrousd],
    );
    await client.query(
      `update ai.daily_budgets set reserved_microusd = reserved_microusd + $2, updated_at = now()
        where budget_date = $1::date`,
      [date, input.requestLimitMicrousd],
    );
    return true;
  });
}

async function finishAIBudgetReservation(input: Readonly<{
  reservationId: string;
  usage?: Readonly<{
    narrativeId: string;
    requestId: string;
    userRefHmac: Buffer;
    tier: "report" | "qa" | "repair";
    model: string;
    inputTokens: number;
    outputTokens: number;
    costMicrousd: number;
    costIsEstimate: boolean;
  }>;
}>): Promise<void> {
  await withAITransaction(async (client) => {
    const reservationResult = await client.query<{ budget_date: string; amount_microusd: string }>(
      `select budget_date::text, amount_microusd::text from ai.budget_reservations where id = $1 for update`,
      [input.reservationId],
    );
    const reservation = reservationResult.rows[0];
    if (!reservation) return;
    await client.query(
      `update ai.daily_budgets
          set reserved_microusd = greatest(0, reserved_microusd - $2),
              spent_microusd = spent_microusd + $3, updated_at = now()
        where budget_date = $1::date`,
      [reservation.budget_date, reservation.amount_microusd, input.usage?.costMicrousd ?? 0],
    );
    if (input.usage) {
      const inputTokens = Math.max(0, Math.min(2_147_483_647, Math.floor(input.usage.inputTokens)));
      const outputTokens = Math.max(0, Math.min(2_147_483_647, Math.floor(input.usage.outputTokens)));
      const model = input.usage.model.slice(0, 200);
      await client.query(
        `insert into ai.usage_ledger
          (request_id, narrative_id, user_ref_hmac, tier, model, input_tokens, output_tokens, cost_microusd, cost_is_estimate)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         on conflict (request_id) do nothing`,
        [input.usage.requestId, input.usage.narrativeId, input.usage.userRefHmac, input.usage.tier,
          model, inputTokens, outputTokens, Math.max(0, input.usage.costMicrousd), input.usage.costIsEstimate],
      );
    }
    await client.query(`delete from ai.budget_reservations where id = $1`, [input.reservationId]);
  });
}

export function recordAIBudgetUsage(input: Parameters<typeof finishAIBudgetReservation>[0] & { readonly usage: NonNullable<Parameters<typeof finishAIBudgetReservation>[0]["usage"]> }): Promise<void> {
  return finishAIBudgetReservation(input);
}

export async function getAIUsageCostSummary(days = 30): Promise<Readonly<{ costMicrousd: number; estimatedRequests: number; requests: number }>> {
  const boundedDays = Math.max(1, Math.min(90, Math.trunc(days)));
  return withAITransaction(async (client) => {
    const result = await client.query<{ cost_microusd: string; estimated_requests: number; requests: number }>(
      `select coalesce(sum(cost_microusd), 0)::text as cost_microusd,
              count(*) filter (where cost_is_estimate)::int as estimated_requests,
              count(*)::int as requests
         from ai.usage_ledger
        where created_at >= now() - ($1::text || ' days')::interval`,
      [boundedDays],
    );
    const row = result.rows[0];
    const cost = Number(row?.cost_microusd ?? 0);
    return {
      costMicrousd: Number.isSafeInteger(cost) && cost >= 0 ? cost : 0,
      estimatedRequests: row?.estimated_requests ?? 0,
      requests: row?.requests ?? 0,
    };
  });
}

export function releaseAIBudgetReservation(reservationId: string): Promise<void> {
  return finishAIBudgetReservation({ reservationId });
}
