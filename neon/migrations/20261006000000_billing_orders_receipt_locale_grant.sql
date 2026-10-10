-- Fixes a launch-blocking gap: billing.orders.receipt_locale was added by
-- 20260929000000_billing_reconcile_receipts.sql, but no migration ever
-- granted lumina_member_app permission to insert that column. Every
-- createPendingOrder() insert (src/server/billing/service.ts) writes
-- receipt_locale and fails with a permission error until this runs.

begin;

grant insert (receipt_locale) on billing.orders to lumina_member_app;

commit;
