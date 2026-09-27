-- Subscription lifecycle for the LUMINA+ card billing flow.
-- Checkout, billing-key issuance, and scheduled charges stay disabled until the
-- separate Toss billing contract and approved legal documents are configured.

begin;

alter table billing.products
  add column license_status text not null default 'unverified'
    check (license_status in ('unverified', 'verified'));

alter table billing.subscriptions
  add column receipt_email_ciphertext text,
  add column receipt_email_key_version smallint,
  add column receipt_locale text not null default 'ko',
  add column billing_auth_claimed_at timestamptz,
  add column cancellation_requested_at timestamptz,
  add constraint billing_subscriptions_receipt_email_pair_check
    check ((receipt_email_ciphertext is null) = (receipt_email_key_version is null)),
  add constraint billing_subscriptions_receipt_email_version_check
    check (receipt_email_key_version is null or receipt_email_key_version > 0),
  add constraint billing_subscriptions_receipt_locale_check
    check (receipt_locale in ('ko', 'en'));

create unique index billing_subscriptions_one_live_product_idx
  on billing.subscriptions (user_id, product_key)
  where user_id is not null and status in ('pending', 'active', 'past_due');

create table billing.subscription_consents (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references billing.subscriptions (id) on delete restrict,
  consent_type text not null check (consent_type in ('subscription_terms', 'automatic_renewal', 'renewal_price')),
  document_version text not null check (document_version ~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$'),
  accepted_at timestamptz not null default now(),
  unique (subscription_id, consent_type)
);

create table billing.subscription_invoices (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references billing.subscriptions (id) on delete restrict,
  period_start timestamptz not null,
  period_end timestamptz not null,
  due_at timestamptz not null,
  amount integer not null check (amount > 0),
  currency text not null check (currency = 'KRW'),
  status text not null default 'queued' check (status in ('queued', 'processing', 'paid', 'failed', 'void')),
  attempt_count smallint not null default 0 check (attempt_count between 0 and 4),
  next_attempt_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  last_failure_code text check (last_failure_code is null or last_failure_code ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end > period_start),
  unique (subscription_id, period_start, period_end)
);

create index billing_subscription_invoices_due_idx
  on billing.subscription_invoices (next_attempt_at, created_at)
  where status = 'queued';

alter table billing.orders
  add column subscription_invoice_id uuid unique references billing.subscription_invoices (id) on delete restrict;
alter table billing.orders
  add constraint billing_orders_subscription_product_check
    check (subscription_invoice_id is null or product_key in ('lumina-plus-monthly', 'lumina-plus-yearly'));

create index billing_subscriptions_due_period_idx
  on billing.subscriptions (current_period_end)
  where status = 'active' and not cancel_at_period_end;

create table billing.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null unique references billing.subscription_invoices (id) on delete restrict,
  payment_id uuid not null unique references billing.payments (id) on delete restrict,
  provider text not null check (provider in ('toss', 'lemonsqueezy')),
  amount integer not null check (amount > 0),
  currency text not null check (currency = 'KRW'),
  method text not null check (length(method) between 1 and 80),
  status text not null check (status in ('approved', 'cancelled')),
  provider_transaction_id text,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table billing.subscription_notices (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references billing.subscriptions (id) on delete restrict,
  invoice_id uuid references billing.subscription_invoices (id) on delete restrict,
  notice_type text not null check (notice_type in ('subscription_receipt', 'renewal_reminder', 'payment_failed_1', 'payment_failed_3', 'payment_failed_7', 'subscription_ended')),
  status text not null default 'queued' check (status in ('queued', 'processing', 'sent', 'failed')),
  attempt_count smallint not null default 0 check (attempt_count between 0 and 10),
  send_after timestamptz not null default now(),
  provider_message_id text,
  last_error_code text check (last_error_code is null or last_error_code ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint billing_subscription_notice_dedup unique (subscription_id, invoice_id, notice_type)
);

create index billing_subscription_notices_due_idx
  on billing.subscription_notices (send_after, created_at)
  where status = 'queued';

alter table billing.subscription_consents enable row level security;
alter table billing.subscription_consents force row level security;
alter table billing.subscription_invoices enable row level security;
alter table billing.subscription_invoices force row level security;
alter table billing.subscription_payments enable row level security;
alter table billing.subscription_payments force row level security;
alter table billing.subscription_notices enable row level security;
alter table billing.subscription_notices force row level security;

create policy billing_subscription_consents_owner_read on billing.subscription_consents
  for select to lumina_member_app using (
    exists (select 1 from billing.subscriptions s where s.id = subscription_id and s.user_id = app.current_user_id())
  );
create policy billing_subscription_invoices_owner_read on billing.subscription_invoices
  for select to lumina_member_app using (
    exists (select 1 from billing.subscriptions s where s.id = subscription_id and s.user_id = app.current_user_id())
  );
create policy billing_subscription_consents_worker on billing.subscription_consents
  for all to lumina_billing_worker using (true) with check (true);
create policy billing_subscription_invoices_worker on billing.subscription_invoices
  for all to lumina_billing_worker using (true) with check (true);
create policy billing_subscription_payments_worker on billing.subscription_payments
  for all to lumina_billing_worker using (true) with check (true);
create policy billing_subscription_notices_worker on billing.subscription_notices
  for all to lumina_billing_worker using (true) with check (true);

revoke select on billing.subscriptions from lumina_member_app;
grant select (id, user_id, product_key, price_id, provider, status, current_period_start,
  current_period_end, cancel_at_period_end, cancelled_at, created_at, updated_at)
  on billing.subscriptions to lumina_member_app;
grant select on billing.subscription_consents, billing.subscription_invoices to lumina_member_app;
grant select, insert, update, delete on billing.subscription_consents, billing.subscription_invoices,
  billing.subscription_payments, billing.subscription_notices to lumina_billing_worker;

commit;
