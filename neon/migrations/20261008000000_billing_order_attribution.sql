-- Records which channel a purchase came from (Track D7): the first-touch UTM
-- tags and the landing page the buyer first arrived on. Every value is
-- normalized by src/lib/attributionPayload.ts before it is stored — landing
-- paths have dynamic segments (e.g. the encoded birth data in "/r/<data>")
-- replaced by placeholders, and UTM tags are restricted to a short, lowercase,
-- non-identifying character set — so this table carries nothing that identifies
-- a person beyond the order it is attached to. It is only written when the
-- visitor accepted the analytics consent choice.
--
-- As with 20261007000000_billing_order_profiles.sql, this table is created after
-- the original billing schema grants (20260928000000_billing_core.sql "grant ...
-- on all tables in schema billing"), which in real Postgres only covers tables
-- that existed when that grant ran. Both roles' grants are therefore stated
-- explicitly below, in the same migration that creates the table.

begin;

create table billing.order_attribution (
  order_id uuid primary key references billing.orders (id) on delete restrict,
  utm_source text check (utm_source is null or utm_source ~ '^[a-z0-9][a-z0-9._~+-]{0,63}$'),
  utm_medium text check (utm_medium is null or utm_medium ~ '^[a-z0-9][a-z0-9._~+-]{0,63}$'),
  utm_campaign text check (utm_campaign is null or utm_campaign ~ '^[a-z0-9][a-z0-9._~+-]{0,63}$'),
  landing_path text not null check (
    char_length(landing_path) between 1 and 120
    and left(landing_path, 1) = '/'
    and strpos(landing_path, ' ') = 0
    and strpos(landing_path, '?') = 0
    and strpos(landing_path, '#') = 0
  ),
  created_at timestamptz not null default now()
);

create index billing_order_attribution_source_idx on billing.order_attribution (utm_source, created_at desc);
create index billing_order_attribution_landing_idx on billing.order_attribution (landing_path, created_at desc);

alter table billing.order_attribution enable row level security;
alter table billing.order_attribution force row level security;

create policy billing_order_attribution_owner_create on billing.order_attribution
  for insert to lumina_member_app with check (
    exists (select 1 from billing.orders o where o.id = order_attribution.order_id and o.user_id = app.current_user_id())
  );
create policy billing_order_attribution_worker on billing.order_attribution
  for all to lumina_billing_worker using (true) with check (true);

grant insert (order_id, utm_source, utm_medium, utm_campaign, landing_path) on billing.order_attribution to lumina_member_app;
grant select on billing.order_attribution to lumina_billing_worker;

commit;
