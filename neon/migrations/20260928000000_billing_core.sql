-- Introduces the billing ledger. Products and prices remain disabled until
-- merchant, pricing, legal, and payment-provider setup has been approved.

begin;

do $$
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'lumina_billing_worker') then
    create role lumina_billing_worker
      login nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
      from pg_catalog.pg_roles
     where rolname = 'lumina_billing_worker'
       and rolcanlogin
       and not rolsuper
       and not rolcreatedb
       and not rolcreaterole
       and not rolreplication
       and not rolbypassrls
       and not rolinherit
  ) then
    raise exception 'lumina_billing_worker must have restricted login attributes';
  end if;
end
$$;

do $$
declare
  migration_role oid := (select oid from pg_catalog.pg_roles where rolname = current_user);
  billing_role oid := (select oid from pg_catalog.pg_roles where rolname = 'lumina_billing_worker');
begin
  if exists (
    select 1 from pg_catalog.pg_namespace
     where nspname = 'billing' and nspowner <> migration_role
  ) then
    raise exception 'billing schema has a different owner; review ownership before migration';
  end if;

  if exists (
    select 1 from pg_catalog.pg_auth_members
     where member = billing_role
        or (
          roleid = billing_role
          and (
            member <> migration_role
            or not admin_option
            or inherit_option
            or set_option
          )
        )
  ) then
    raise exception 'lumina_billing_worker has unexpected role memberships; review access before migration';
  end if;

  if exists (
    select 1 from pg_catalog.pg_namespace where nspowner = billing_role
  ) or exists (
    select 1 from pg_catalog.pg_class where relowner = billing_role
  ) or exists (
    select 1 from pg_catalog.pg_proc where proowner = billing_role
  ) or exists (
    select 1 from pg_catalog.pg_type where typowner = billing_role
  ) or exists (
    select 1 from pg_catalog.pg_database where datdba = billing_role
  ) then
    raise exception 'lumina_billing_worker owns database objects; review ownership before migration';
  end if;

  if exists (
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'billing'
  ) or exists (
    select 1 from pg_catalog.pg_policy p
    join pg_catalog.pg_class c on c.oid = p.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'billing'
  ) or exists (
    select 1 from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'billing'
  ) or exists (
    select 1 from pg_catalog.pg_type t
    join pg_catalog.pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'billing' and t.typtype <> 'p'
  ) then
    raise exception 'billing schema is not empty; review existing objects, routines, types, and RLS policies before migration';
  end if;

  if exists (
    select 1 from (
      select acl.grantee from pg_catalog.pg_class c cross join lateral pg_catalog.aclexplode(c.relacl) acl
      union all
      select acl.grantee from pg_catalog.pg_namespace n cross join lateral pg_catalog.aclexplode(n.nspacl) acl
      union all
      select acl.grantee from pg_catalog.pg_proc p cross join lateral pg_catalog.aclexplode(p.proacl) acl
      union all
      select acl.grantee from pg_catalog.pg_type t cross join lateral pg_catalog.aclexplode(t.typacl) acl
      union all
      select acl.grantee from pg_catalog.pg_database d cross join lateral pg_catalog.aclexplode(d.datacl) acl
      union all
      select acl.grantee from pg_catalog.pg_attribute a cross join lateral pg_catalog.aclexplode(a.attacl) acl
       where a.attnum > 0
      union all
      select acl.grantee from pg_catalog.pg_default_acl d cross join lateral pg_catalog.aclexplode(d.defaclacl) acl
    ) existing_grants
    where grantee = billing_role
  ) then
    raise exception 'lumina_billing_worker already has direct object privileges; review and revoke them before migration';
  end if;
  if exists (
    select 1
      from pg_catalog.pg_namespace n
      cross join lateral pg_catalog.aclexplode(n.nspacl) acl
     where n.nspname = 'billing'
       and acl.privilege_type = 'CREATE'
       and acl.grantee <> n.nspowner
  ) then
    raise exception 'billing schema grants CREATE to a non-owner role; review schema access before migration';
  end if;
end
$$;

create schema if not exists billing;

create table billing.products (
  product_key text primary key check (product_key ~ '^[a-z0-9][a-z0-9-]{1,63}$'),
  product_type text not null check (product_type in ('one_time', 'subscription')),
  name_ko text not null,
  name_en text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_products_key_type_unique unique (product_key, product_type)
);

create table billing.prices (
  id uuid primary key default gen_random_uuid(),
  product_key text not null references billing.products (product_key) on delete restrict,
  product_type text not null check (product_type in ('one_time', 'subscription')),
  currency text not null check (currency in ('KRW', 'USD', 'JPY', 'TWD', 'EUR')),
  amount integer not null check (amount > 0),
  billing_interval text check (billing_interval in ('month', 'year')),
  enabled boolean not null default false,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  constraint billing_prices_product_type_fk foreign key (product_key, product_type)
    references billing.products (product_key, product_type) on delete restrict,
  constraint billing_prices_order_values_unique unique (id, product_key, amount, currency),
  check ((billing_interval is null) = (product_type = 'one_time')),
  check (valid_until is null or valid_until > valid_from)
);

create unique index billing_prices_one_current_interval_idx
  on billing.prices (product_key, currency, coalesce(billing_interval, 'one_time'))
  where enabled and valid_until is null;

create table billing.orders (
  id uuid primary key default gen_random_uuid(),
  user_id text references identity."user" (id) on delete set null,
  user_ref_hmac bytea not null check (octet_length(user_ref_hmac) = 32),
  product_key text not null references billing.products (product_key) on delete restrict,
  price_id uuid not null references billing.prices (id) on delete restrict,
  provider text not null check (provider in ('toss', 'lemonsqueezy')),
  product_name_snapshot text not null,
  amount integer not null check (amount > 0),
  currency text not null,
  receipt_email_ciphertext text,
  receipt_email_key_version smallint check (receipt_email_key_version is null or receipt_email_key_version > 0),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'refunding', 'failed', 'cancelled', 'refunded', 'partially_refunded')),
  expires_at timestamptz not null,
  paid_at timestamptz,
  viewed_at timestamptz,
  retain_until timestamptz not null default (now() + interval '5 years'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_orders_expiry_check check (expires_at > created_at),
  constraint billing_orders_receipt_email_pair_check check ((receipt_email_ciphertext is null) = (receipt_email_key_version is null)),
  constraint billing_orders_price_values_fk foreign key (price_id, product_key, amount, currency)
    references billing.prices (id, product_key, amount, currency) on delete restrict
);

create index billing_orders_user_id_created_idx on billing.orders (user_id, created_at desc);
create index billing_orders_status_created_idx on billing.orders (status, created_at);

create table billing.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references billing.orders (id) on delete restrict,
  provider text not null check (provider in ('toss', 'lemonsqueezy')),
  provider_payment_key_ciphertext text not null,
  provider_payment_key_digest bytea not null unique check (octet_length(provider_payment_key_digest) = 32),
  key_version smallint not null check (key_version > 0),
  amount integer not null check (amount > 0),
  currency text not null,
  method text not null,
  status text not null check (status in ('approved', 'cancelled', 'partially_cancelled')),
  provider_transaction_id text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table billing.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references billing.payments (id) on delete restrict,
  amount integer not null check (amount > 0),
  reason_code text not null check (reason_code ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  status text not null check (status in ('pending', 'succeeded', 'failed')),
  provider_refund_id text,
  actor_user_id text references identity."user" (id) on delete set null,
  actor_ref_hmac bytea check (actor_ref_hmac is null or octet_length(actor_ref_hmac) = 32),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index billing_refunds_payment_id_created_idx on billing.refunds (payment_id, created_at desc);

create table billing.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id text references identity."user" (id) on delete set null,
  user_ref_hmac bytea not null check (octet_length(user_ref_hmac) = 32),
  product_key text not null references billing.products (product_key) on delete restrict,
  order_id uuid not null unique references billing.orders (id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at is null or expires_at > granted_at)
);

create index billing_entitlements_user_product_idx on billing.entitlements (user_id, product_key, status);

create table billing.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text references identity."user" (id) on delete set null,
  user_ref_hmac bytea not null check (octet_length(user_ref_hmac) = 32),
  product_key text not null references billing.products (product_key) on delete restrict,
  price_id uuid not null references billing.prices (id) on delete restrict,
  provider text not null check (provider in ('toss', 'lemonsqueezy')),
  billing_key_ciphertext text,
  billing_key_version smallint check (billing_key_version is null or billing_key_version > 0),
  provider_customer_id text,
  status text not null check (status in ('pending', 'active', 'past_due', 'cancelled', 'expired')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((billing_key_ciphertext is null) = (billing_key_version is null))
);

create index billing_subscriptions_user_status_idx on billing.subscriptions (user_id, status);

create table billing.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('toss', 'lemonsqueezy')),
  provider_event_id text not null,
  event_type text not null,
  payload_hash bytea not null check (octet_length(payload_hash) = 32),
  status text not null default 'applied' check (status in ('applied', 'ignored')),
  received_at timestamptz not null default now(),
  constraint billing_webhook_provider_event_unique unique (provider, provider_event_id)
);

create table billing.receipt_email_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references billing.orders (id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempt_count smallint not null default 0 check (attempt_count between 0 and 20),
  provider_message_id text,
  last_error_code text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table billing.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id text references identity."user" (id) on delete set null,
  actor_ref_hmac bytea check (actor_ref_hmac is null or octet_length(actor_ref_hmac) = 32),
  action text not null check (action ~ '^[a-z0-9][a-z0-9_.-]{1,63}$'),
  entity_type text not null check (entity_type ~ '^[a-z0-9][a-z0-9_.-]{1,63}$'),
  entity_id text not null,
  reason_code text,
  created_at timestamptz not null default now()
);

create index billing_audit_events_entity_idx on billing.audit_events (entity_type, entity_id, created_at desc);

insert into billing.products (product_key, product_type, name_ko, name_en, enabled)
values
  ('saju-2027', 'one_time', '2027 신년운세 리포트', '2027 Saju Year Report', false),
  ('saju-deep', 'one_time', '사주 심층 리포트', 'Saju Deep Report', false),
  ('compatibility-deep', 'one_time', '궁합 심층 리포트', 'Compatibility Deep Report', false),
  ('types-career', 'one_time', '16유형 커리어·관계 리포트', '16-Type Career and Relationship Report', false),
  ('tarot-deep', 'one_time', '타로 심층 리포트', 'Tarot Deep Report', false),
  ('lumina-plus-monthly', 'subscription', 'LUMINA+ 월간 구독', 'LUMINA+ Monthly', false),
  ('lumina-plus-yearly', 'subscription', 'LUMINA+ 연간 구독', 'LUMINA+ Annual', false)
on conflict (product_key) do nothing;

insert into billing.prices (product_key, product_type, currency, amount, billing_interval, enabled)
values
  ('saju-2027', 'one_time', 'KRW', 9900, null, false),
  ('saju-deep', 'one_time', 'KRW', 19900, null, false),
  ('compatibility-deep', 'one_time', 'KRW', 12900, null, false),
  ('types-career', 'one_time', 'KRW', 14900, null, false),
  ('tarot-deep', 'one_time', 'KRW', 3900, null, false),
  ('lumina-plus-monthly', 'subscription', 'KRW', 7900, 'month', false),
  ('lumina-plus-yearly', 'subscription', 'KRW', 59000, 'year', false)
on conflict do nothing;

create table billing.order_consents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references billing.orders (id) on delete restrict,
  consent_type text not null check (consent_type in ('purchase_terms', 'withdrawal_restriction', 'eu_withdrawal_waiver', 'overseas_transfer')),
  document_version text not null,
  accepted_at timestamptz not null default now(),
  unique (order_id, consent_type)
);

alter table billing.products enable row level security;
alter table billing.products force row level security;
alter table billing.prices enable row level security;
alter table billing.prices force row level security;
alter table billing.orders enable row level security;
alter table billing.orders force row level security;
alter table billing.order_consents enable row level security;
alter table billing.order_consents force row level security;
alter table billing.payments enable row level security;
alter table billing.payments force row level security;
alter table billing.refunds enable row level security;
alter table billing.refunds force row level security;
alter table billing.entitlements enable row level security;
alter table billing.entitlements force row level security;
alter table billing.subscriptions enable row level security;
alter table billing.subscriptions force row level security;
alter table billing.webhook_events enable row level security;
alter table billing.webhook_events force row level security;
alter table billing.receipt_email_events enable row level security;
alter table billing.receipt_email_events force row level security;
alter table billing.audit_events enable row level security;
alter table billing.audit_events force row level security;

create policy billing_products_visible_to_member on billing.products
  for select to lumina_member_app using (enabled);
create policy billing_prices_visible_to_member on billing.prices
  for select to lumina_member_app using (
    enabled and valid_from <= now() and (valid_until is null or valid_until > now())
    and exists (select 1 from billing.products p where p.product_key = prices.product_key
         and p.product_type = prices.product_type
         and p.enabled)
  );
create policy billing_orders_owner_read on billing.orders
  for select to lumina_member_app using (user_id = app.current_user_id());
create policy billing_orders_owner_create on billing.orders
  for insert to lumina_member_app with check (user_id = app.current_user_id());
create policy billing_order_consents_owner_read on billing.order_consents
  for select to lumina_member_app using (
    exists (select 1 from billing.orders o where o.id = order_consents.order_id and o.user_id = app.current_user_id())
  );
create policy billing_order_consents_owner_create on billing.order_consents
  for insert to lumina_member_app with check (
    exists (select 1 from billing.orders o where o.id = order_consents.order_id and o.user_id = app.current_user_id())
  );
create policy billing_entitlements_owner_read on billing.entitlements
  for select to lumina_member_app using (user_id = app.current_user_id());
create policy billing_subscriptions_owner_read on billing.subscriptions
  for select to lumina_member_app using (user_id = app.current_user_id());

create policy billing_worker_products on billing.products
  for all to lumina_billing_worker using (true) with check (true);
create policy billing_worker_prices on billing.prices
  for all to lumina_billing_worker using (true) with check (true);
create policy billing_worker_orders on billing.orders
  for all to lumina_billing_worker using (true) with check (true);
create policy billing_worker_order_consents on billing.order_consents
  for all to lumina_billing_worker using (true) with check (true);
create policy billing_worker_payments on billing.payments
  for all to lumina_billing_worker using (true) with check (true);
create policy billing_worker_refunds on billing.refunds
  for all to lumina_billing_worker using (true) with check (true);
create policy billing_worker_entitlements on billing.entitlements
  for all to lumina_billing_worker using (true) with check (true);
create policy billing_worker_subscriptions on billing.subscriptions
  for all to lumina_billing_worker using (true) with check (true);
create policy billing_worker_webhook_events on billing.webhook_events
  for all to lumina_billing_worker using (true) with check (true);
create policy billing_worker_receipt_email_events on billing.receipt_email_events
  for all to lumina_billing_worker using (true) with check (true);
create policy billing_worker_audit_events on billing.audit_events
  for all to lumina_billing_worker using (true) with check (true);

revoke all on schema billing from public;
revoke all on all tables in schema billing from public;
grant usage on schema billing to lumina_member_app, lumina_billing_worker;
grant select on billing.products, billing.prices, billing.entitlements, billing.subscriptions, billing.order_consents to lumina_member_app;
grant select on billing.orders to lumina_member_app;
grant insert (id, user_id, user_ref_hmac, product_key, price_id, provider, product_name_snapshot, amount, currency, receipt_email_ciphertext, receipt_email_key_version, expires_at) on billing.orders to lumina_member_app;
grant insert (order_id, consent_type, document_version) on billing.order_consents to lumina_member_app;
grant select, insert, update, delete on all tables in schema billing to lumina_billing_worker;

commit;
