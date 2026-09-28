import { Client } from "@neondatabase/serverless";
import { loadNeonAdminEnvironment } from "./lib/neonAdminEnv.mjs";

/**
 * Flips the two purely-commercial switches for a product — billing.products.enabled
 * and billing.prices.enabled for its currently-valid price row(s) — so it becomes
 * purchasable. Deliberately does NOT touch billing.products.license_status. That
 * column means "an expert has reviewed this content," a legal/editorial sign-off
 * distinct from "this is commercially for sale today," and this script has no
 * business asserting the former. Enabling a product whose content was never
 * reviewed is refused outright (see requireVerifiedLicense below).
 */

const PRODUCT_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/u;
const USAGE = "Usage: node scripts/billing-product-admin.mjs --product <key> (--enable | --disable) --reason \"<text>\" [--apply]";

function parseArguments(args) {
  if (args.includes("--help")) {
    console.log(`${USAGE}\nDefault: --dry-run`);
    process.exit(0);
  }

  let product;
  let reason;
  let enable;
  let apply = false;

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === "--product") {
      product = args[index + 1];
      index += 1;
    } else if (flag === "--reason") {
      reason = args[index + 1];
      index += 1;
    } else if (flag === "--enable") {
      if (enable === false) throw new Error("Choose exactly one of --enable or --disable");
      enable = true;
    } else if (flag === "--disable") {
      if (enable === true) throw new Error("Choose exactly one of --enable or --disable");
      enable = false;
    } else if (flag === "--apply") {
      apply = true;
    } else if (flag === "--dry-run") {
      apply = false;
    } else {
      throw new Error(USAGE);
    }
  }

  if (!product || !PRODUCT_KEY_PATTERN.test(product)) {
    throw new Error("A valid --product key is required (lowercase letters, digits, hyphens)");
  }
  if (enable === undefined) throw new Error("Specify --enable or --disable");
  const trimmedReason = reason?.trim();
  if (!trimmedReason || trimmedReason.length > 500 || /[\r\n]/u.test(trimmedReason)) {
    throw new Error("A single-line --reason (1-500 characters) is required for the audit trail");
  }

  return { product, enable, reason: trimmedReason, apply };
}

const { product, enable, reason, apply } = parseArguments(process.argv.slice(2));
const admin = await loadNeonAdminEnvironment({ requireProductionOptIn: apply });
const client = new Client(admin.databaseUrl);

try {
  try {
    await client.connect();
  } catch {
    throw new Error("Could not connect to the selected Neon endpoint; verify the local admin env file");
  }

  const current = await client.query(
    `select p.enabled, p.license_status,
            (select count(*)::int from billing.prices pr
              where pr.product_key = p.product_key
                and pr.valid_from <= now() and (pr.valid_until is null or pr.valid_until > now())) as active_price_count
       from billing.products p
      where p.product_key = $1`,
    [product],
  );
  const row = current.rows[0];
  if (!row) throw new Error(`Unknown product_key: ${product}`);
  if (enable && row.license_status !== "verified") {
    throw new Error(
      `Refusing to enable ${product}: license_status is '${row.license_status}', not 'verified'. `
      + "Expert review sign-off sets license_status separately; this script only toggles commercial availability.",
    );
  }

  if (!apply) {
    console.log(JSON.stringify({
      mode: "dry-run",
      envFile: admin.fileName,
      product,
      action: enable ? "enable" : "disable",
      currentlyEnabled: row.enabled,
      licenseStatus: row.license_status,
      activePriceRowsToUpdate: row.active_price_count,
    }, null, 2));
  } else {
    await client.query("begin");
    try {
      await client.query("update billing.products set enabled = $2, updated_at = now() where product_key = $1", [product, enable]);
      const prices = await client.query(
        `update billing.prices set enabled = $2
          where product_key = $1
            and valid_from <= now() and (valid_until is null or valid_until > now())
          returning id`,
        [product, enable],
      );
      await client.query(
        `insert into billing.audit_events (actor_user_id, actor_ref_hmac, action, entity_type, entity_id, reason_code)
         values (null, null, $1, 'billing_product', $2, $3)`,
        [enable ? "product_enabled" : "product_disabled", product, reason],
      );
      await client.query("commit");
      console.log(JSON.stringify({
        mode: "apply",
        envFile: admin.fileName,
        product,
        action: enable ? "enable" : "disable",
        pricesUpdated: prices.rowCount,
      }, null, 2));
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }
} finally {
  await client.end();
}
