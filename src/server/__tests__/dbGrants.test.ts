import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildGrantModel, canInsertColumns } from "./lib/sqlGrantModel";
import { scanInsertsByRole } from "./lib/insertColumnScanner";

// Regression coverage for the launch-blocking bug fixed in
// 20261006000000_billing_orders_receipt_locale_grant.sql: createPendingOrder()
// (src/server/billing/service.ts) inserts billing.orders.receipt_locale while
// running as lumina_member_app, but the column-level grant added alongside
// billing.orders in 20260928000000_billing_core.sql never listed that column
// (it was only added a day later, in 20260929000000_billing_reconcile_receipts.sql).
// Every real order insert failed with a Postgres permission error until the
// missing grant was added. This file parses the actual migrations and the
// actual server source, so it fails again if either regresses.

const MIGRATIONS_DIR = fileURLToPath(new URL("../../../neon/migrations/", import.meta.url));
const SERVER_SRC_DIR = fileURLToPath(new URL("../../", import.meta.url)); // src/server

function readMigrationsInApplyOrder(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => /^\d+_[A-Za-z0-9_-]+\.sql$/u.test(file))
    .sort()
    .map((file) => readFileSync(`${MIGRATIONS_DIR}${file}`, "utf8"));
}

function walkTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "__tests__") continue; // this directory's own helpers/tests are not billing code
    const fullPath = `${dir}${dir.endsWith("/") ? "" : "/"}${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...walkTypeScriptFiles(`${fullPath}/`));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts") && !entry.name.endsWith(".d.ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("database grants match the insert statements the server actually runs", () => {
  it("allows every scanned insert, for every role that runs one via a tracked transaction helper", () => {
    const model = buildGrantModel(readMigrationsInApplyOrder());
    const failures: string[] = [];

    for (const file of walkTypeScriptFiles(SERVER_SRC_DIR)) {
      const source = readFileSync(file, "utf8");
      for (const insert of scanInsertsByRole(source)) {
        const result = canInsertColumns(model, insert.role, insert.table, insert.columns);
        if (!result.allowed) {
          const before = source.slice(0, insert.index);
          const line = before.split("\n").length;
          failures.push(
            `${file}:${line} — role "${insert.role}" inserts into ${insert.table} ` +
              `but is missing grant for column(s): ${result.missingColumns.join(", ")}`,
          );
        }
      }
    }

    expect(failures).toEqual([]);
  });

  it("finds at least one insert per tracked role, so the scan itself is not silently empty", () => {
    const model = buildGrantModel(readMigrationsInApplyOrder());
    const rolesSeen = new Set<string>();
    for (const file of walkTypeScriptFiles(SERVER_SRC_DIR)) {
      for (const insert of scanInsertsByRole(readFileSync(file, "utf8"))) {
        expect(canInsertColumns(model, insert.role, insert.table, insert.columns).allowed).toBe(true);
        rolesSeen.add(insert.role);
      }
    }
    expect(rolesSeen).toEqual(new Set(["lumina_member_app", "lumina_billing_worker", "lumina_ai_worker"]));
  });
});

describe("sqlGrantModel reproduces the original bug against the pre-fix migration text", () => {
  it("rejects billing.orders.receipt_locale when only the original 20260928 grant is applied", () => {
    const originalGrantOnly = `
      begin;
      grant insert (id, user_id, user_ref_hmac, product_key, price_id, provider, product_name_snapshot,
        amount, currency, receipt_email_ciphertext, receipt_email_key_version, expires_at)
        on billing.orders to lumina_member_app;
      commit;
    `;
    const model = buildGrantModel([originalGrantOnly]);
    const result = canInsertColumns(model, "lumina_member_app", "billing.orders", [
      "id",
      "user_id",
      "user_ref_hmac",
      "product_key",
      "price_id",
      "provider",
      "product_name_snapshot",
      "amount",
      "currency",
      "receipt_email_ciphertext",
      "receipt_email_key_version",
      "receipt_locale",
      "expires_at",
    ]);
    expect(result.allowed).toBe(false);
    expect(result.missingColumns).toEqual(["receipt_locale"]);
  });

  it("accepts the same insert once the follow-up grant migration is included", () => {
    const originalGrant = `grant insert (id, user_id, user_ref_hmac, product_key, price_id, provider,
      product_name_snapshot, amount, currency, receipt_email_ciphertext, receipt_email_key_version, expires_at)
      on billing.orders to lumina_member_app;`;
    const fixGrant = `grant insert (receipt_locale) on billing.orders to lumina_member_app;`;
    const model = buildGrantModel([originalGrant, fixGrant]);
    const result = canInsertColumns(model, "lumina_member_app", "billing.orders", [
      "id",
      "receipt_locale",
      "expires_at",
    ]);
    expect(result.allowed).toBe(true);
  });

  it("treats 'all tables in schema' as a wildcard that covers any column", () => {
    const sql = `grant select, insert, update, delete on all tables in schema billing to lumina_billing_worker;`;
    const model = buildGrantModel([sql]);
    const result = canInsertColumns(model, "lumina_billing_worker", "billing.anything", ["whatever_column"]);
    expect(result.allowed).toBe(true);
  });

  it("a later revoke narrows a previously granted column set", () => {
    const model = buildGrantModel([
      `grant select on billing.subscriptions to lumina_member_app;`,
      `revoke select on billing.subscriptions from lumina_member_app;`,
      `grant select (id, status) on billing.subscriptions to lumina_member_app;`,
    ]);
    // canInsertColumns only checks the "insert" action; read the raw model to confirm the
    // select grant itself narrowed, since that's the shape this repository actually uses
    // (subscription_lifecycle.sql revokes the blanket select before re-granting columns).
    const selectGrant = model.tableGrants.get("lumina_member_app")?.get("billing.subscriptions")?.get("select");
    expect(selectGrant).toEqual(new Set(["id", "status"]));
  });
});
