-- Binds a purchase to the birth profile it was bought for, so a report keeps
-- showing that chart even if the buyer later edits or switches their account's
-- default profile (previously the report always recomputed from whatever
-- profile is "live," so one purchase could be reused to view several people's
-- reports). profile_id points at a snapshot row in member.profiles (source_key
-- 'order:<order id>', see src/server/member/profileSnapshot.ts) rather than the
-- live profile; it is nulled if that snapshot is later deleted (e.g. account
-- deletion), while the order itself is retained for 5 years. profile_fingerprint
-- is a non-reversible HMAC-SHA256 marker of the birth data that survives even
-- after profile_id is nulled.
--
-- As with 20261001000000_subscription_lifecycle.sql, this table is created
-- after the original billing schema grants (20260928000000_billing_core.sql:410
-- "grant ... on all tables in schema billing"), which in real Postgres only
-- covers tables that existed when that grant ran — not this one. Both roles'
-- grants are therefore restated explicitly below.

begin;

create table billing.order_profiles (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references billing.orders (id) on delete restrict,
  slot smallint not null check (slot > 0),
  profile_id uuid references member.profiles (id) on delete set null,
  profile_fingerprint bytea not null check (octet_length(profile_fingerprint) = 32),
  created_at timestamptz not null default now(),
  unique (order_id, slot)
);

create index billing_order_profiles_profile_id_idx on billing.order_profiles (profile_id);

alter table billing.order_profiles enable row level security;
alter table billing.order_profiles force row level security;

create policy billing_order_profiles_owner_read on billing.order_profiles
  for select to lumina_member_app using (
    exists (select 1 from billing.orders o where o.id = order_profiles.order_id and o.user_id = app.current_user_id())
  );
create policy billing_order_profiles_owner_create on billing.order_profiles
  for insert to lumina_member_app with check (
    exists (select 1 from billing.orders o where o.id = order_profiles.order_id and o.user_id = app.current_user_id())
  );
create policy billing_order_profiles_worker on billing.order_profiles
  for all to lumina_billing_worker using (true) with check (true);

grant select on billing.order_profiles to lumina_member_app;
grant insert (order_id, slot, profile_id, profile_fingerprint) on billing.order_profiles to lumina_member_app;
grant select, insert, update, delete on billing.order_profiles to lumina_billing_worker;

commit;
