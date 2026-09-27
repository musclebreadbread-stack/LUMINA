-- Adds storage and role boundaries for Phase 9 growth capabilities.
-- Every operational status stays inactive until its policy approval metadata exists.

begin;

do $$
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'lumina_growth_worker') then
    create role lumina_growth_worker
      login nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
      from pg_catalog.pg_roles
     where rolname = 'lumina_growth_worker'
       and rolcanlogin
       and not rolsuper
       and not rolcreatedb
       and not rolcreaterole
       and not rolreplication
       and not rolbypassrls
       and not rolinherit
  ) then
    raise exception 'lumina_growth_worker must have restricted login attributes';
  end if;
end
$$;

do $$
declare
  migration_role oid := (select oid from pg_catalog.pg_roles where rolname = current_user);
  growth_role oid := (select oid from pg_catalog.pg_roles where rolname = 'lumina_growth_worker');
begin
  if exists (
    select 1
      from pg_catalog.pg_namespace
     where nspname in ('identity', 'member', 'billing')
       and nspowner <> migration_role
  ) then
    raise exception 'identity, member, and billing schemas must be owned by the migration role';
  end if;

  if exists (
    select 1 from pg_catalog.pg_namespace
     where nspname = 'growth' and nspowner <> migration_role
  ) then
    raise exception 'growth schema has a different owner; review ownership before migration';
  end if;

  if exists (
    select 1 from pg_catalog.pg_auth_members
     where member = growth_role
        or (
          roleid = growth_role
          and (
            member <> migration_role
            or not admin_option
            or inherit_option
            or set_option
          )
        )
  ) then
    raise exception 'lumina_growth_worker has unexpected role memberships; review access before migration';
  end if;

  if exists (
    select 1 from pg_catalog.pg_namespace where nspowner = growth_role
  ) or exists (
    select 1 from pg_catalog.pg_class where relowner = growth_role
  ) or exists (
    select 1 from pg_catalog.pg_proc where proowner = growth_role
  ) or exists (
    select 1 from pg_catalog.pg_type where typowner = growth_role
  ) or exists (
    select 1 from pg_catalog.pg_database where datdba = growth_role
  ) then
    raise exception 'lumina_growth_worker owns database objects; review ownership before migration';
  end if;

  if exists (
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'growth'
  ) or exists (
    select 1 from pg_catalog.pg_policy p
    join pg_catalog.pg_class c on c.oid = p.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'growth'
  ) or exists (
    select 1 from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'growth'
  ) or exists (
    select 1 from pg_catalog.pg_type t
    join pg_catalog.pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'growth' and t.typtype <> 'p'
  ) then
    raise exception 'growth schema is not empty; review existing objects, routines, types, and RLS policies';
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
    where grantee = growth_role
  ) then
    raise exception 'lumina_growth_worker already has direct object privileges; review and revoke them before migration';
  end if;

  if exists (
    select 1
      from pg_catalog.pg_namespace n
      cross join lateral pg_catalog.aclexplode(n.nspacl) acl
     where n.nspname in ('member', 'growth')
       and acl.privilege_type = 'CREATE'
       and acl.grantee <> n.nspowner
  ) then
    raise exception 'member or growth schema grants CREATE to a non-owner role; review schema access';
  end if;
end
$$;

create schema if not exists growth;
revoke all on schema growth from public;
revoke all on all tables in schema growth from public;

create table member.marketing_preferences (
  user_id text primary key references identity."user" (id) on delete cascade,
  preference_status text not null default 'not_opted_in'
    check (preference_status in ('not_opted_in', 'subscribed', 'unsubscribed')),
  policy_version text,
  consented_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_marketing_preferences_state_check check (
    (preference_status = 'not_opted_in'
      and policy_version is null and consented_at is null and unsubscribed_at is null)
    or (preference_status = 'subscribed'
      and policy_version is not null and consented_at is not null and unsubscribed_at is null)
    or (preference_status = 'unsubscribed' and unsubscribed_at is not null)
  )
);

create table member.support_cases (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references identity."user" (id) on delete cascade,
  category text not null check (category in ('account', 'billing', 'privacy', 'technical', 'other')),
  subject_ciphertext text not null,
  body_ciphertext text not null,
  key_version smallint not null check (key_version > 0),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table growth.referral_programs (
  id uuid primary key default gen_random_uuid(),
  program_key text not null unique check (program_key ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  status text not null default 'draft' check (status in ('draft', 'paused', 'active', 'closed')),
  policy_version text,
  approved_at timestamptz,
  approved_by_ref_hmac bytea check (approved_by_ref_hmac is null or octet_length(approved_by_ref_hmac) = 32),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_referral_program_approval_check check (
    status <> 'active' or (policy_version is not null and approved_at is not null and approved_by_ref_hmac is not null)
  )
);

create table growth.referral_codes (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references growth.referral_programs (id) on delete restrict,
  owner_user_id text references identity."user" (id) on delete set null,
  owner_ref_hmac bytea not null check (octet_length(owner_ref_hmac) = 32),
  code_digest bytea not null unique check (octet_length(code_digest) = 32),
  status text not null default 'draft' check (status in ('draft', 'active', 'revoked')),
  policy_version text,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  constraint growth_referral_code_approval_check check (
    status <> 'active' or (policy_version is not null and activated_at is not null)
  )
);

create table growth.referral_attributions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references growth.referral_programs (id) on delete restrict,
  referral_code_id uuid not null references growth.referral_codes (id) on delete restrict,
  referrer_user_id text references identity."user" (id) on delete set null,
  referrer_ref_hmac bytea not null check (octet_length(referrer_ref_hmac) = 32),
  referred_user_id text references identity."user" (id) on delete set null,
  referred_ref_hmac bytea not null check (octet_length(referred_ref_hmac) = 32),
  status text not null default 'pending_policy' check (status in ('pending_policy', 'qualified', 'ineligible', 'reversed')),
  policy_version text,
  qualified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint growth_referral_no_self_referral check (referrer_ref_hmac <> referred_ref_hmac),
  constraint growth_referral_qualified_policy_check check (
    status <> 'qualified' or (policy_version is not null and qualified_at is not null)
  ),
  constraint growth_referral_one_attribution_per_user unique (program_id, referred_ref_hmac)
);

create table growth.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  attribution_id uuid not null references growth.referral_attributions (id) on delete restrict,
  beneficiary_user_id text references identity."user" (id) on delete set null,
  beneficiary_ref_hmac bytea not null check (octet_length(beneficiary_ref_hmac) = 32),
  status text not null default 'pending_policy' check (status in ('pending_policy', 'approved', 'paid', 'reversed')),
  amount_minor integer check (amount_minor is null or amount_minor > 0),
  currency text check (currency is null or currency in ('KRW', 'USD', 'JPY', 'TWD', 'EUR')),
  policy_version text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  constraint growth_referral_reward_amount_pair check ((amount_minor is null) = (currency is null)),
  constraint growth_referral_reward_approval_check check (
    status not in ('approved', 'paid', 'reversed')
    or (amount_minor is not null and policy_version is not null and approved_at is not null)
  ),
  constraint growth_referral_reward_paid_check check (status <> 'paid' or paid_at is not null)
);

create table growth.gift_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references billing.orders (id) on delete restrict,
  purchaser_user_id text references identity."user" (id) on delete set null,
  recipient_user_id text references identity."user" (id) on delete set null,
  recipient_ref_hmac bytea check (recipient_ref_hmac is null or octet_length(recipient_ref_hmac) = 32),
  gift_code_digest bytea unique check (gift_code_digest is null or octet_length(gift_code_digest) = 32),
  status text not null default 'draft'
    check (status in ('draft', 'pending_policy', 'issued', 'redeemed', 'refund_pending', 'refunded', 'transfer_pending', 'transferred', 'cancelled')),
  policy_version text,
  approved_at timestamptz,
  approved_by_ref_hmac bytea check (approved_by_ref_hmac is null or octet_length(approved_by_ref_hmac) = 32),
  issued_at timestamptz,
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_gift_recipient_check check (recipient_user_id is not null or recipient_ref_hmac is not null or status in ('draft', 'pending_policy', 'cancelled')),
  constraint growth_gift_code_issued_check check (status not in ('issued', 'redeemed') or gift_code_digest is not null),
  constraint growth_gift_approval_check check (
    status not in ('issued', 'redeemed', 'refund_pending', 'refunded', 'transfer_pending', 'transferred')
    or (policy_version is not null and approved_at is not null and approved_by_ref_hmac is not null)
  ),
  constraint growth_gift_issue_time_check check (status not in ('issued', 'redeemed') or issued_at is not null),
  constraint growth_gift_redeemed_time_check check (status <> 'redeemed' or redeemed_at is not null)
);

create table growth.gift_events (
  id uuid primary key default gen_random_uuid(),
  gift_order_id uuid not null references growth.gift_orders (id) on delete restrict,
  event_type text not null check (event_type in ('created', 'issued', 'redeemed', 'refund_requested', 'refunded', 'transfer_requested', 'transferred', 'cancelled')),
  actor_ref_hmac bytea check (actor_ref_hmac is null or octet_length(actor_ref_hmac) = 32),
  policy_version text,
  created_at timestamptz not null default now()
);

create table growth.pricing_experiments (
  id uuid primary key default gen_random_uuid(),
  experiment_key text not null unique check (experiment_key ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  product_key text not null references billing.products (product_key) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'paused', 'running', 'completed')),
  policy_version text,
  approved_at timestamptz,
  approved_by_ref_hmac bytea check (approved_by_ref_hmac is null or octet_length(approved_by_ref_hmac) = 32),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_pricing_experiment_window_check check (ends_at is null or starts_at is null or ends_at > starts_at),
  constraint growth_pricing_experiment_approval_check check (
    status <> 'running' or (policy_version is not null and approved_at is not null and approved_by_ref_hmac is not null)
  )
);

create table growth.pricing_variants (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references growth.pricing_experiments (id) on delete restrict,
  variant_key text not null check (variant_key ~ '^[a-z0-9][a-z0-9_-]{0,31}$'),
  price_id uuid not null references billing.prices (id) on delete restrict,
  allocation_basis_points integer not null check (allocation_basis_points between 0 and 10000),
  created_at timestamptz not null default now(),
  constraint growth_pricing_variant_key_unique unique (experiment_id, variant_key),
  constraint growth_pricing_variant_experiment_id_unique unique (experiment_id, id)
);

create table growth.pricing_assignments (
  experiment_id uuid not null references growth.pricing_experiments (id) on delete restrict,
  user_id text not null references identity."user" (id) on delete cascade,
  variant_id uuid not null,
  assigned_at timestamptz not null default now(),
  primary key (experiment_id, user_id),
  constraint growth_pricing_assignment_variant_fk foreign key (experiment_id, variant_id)
    references growth.pricing_variants (experiment_id, id) on delete restrict
);

create table growth.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  campaign_key text not null unique check (campaign_key ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  template_key text not null check (template_key ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  status text not null default 'draft' check (status in ('draft', 'queued', 'paused', 'sending', 'completed', 'cancelled')),
  policy_version text,
  approved_at timestamptz,
  approved_by_ref_hmac bytea check (approved_by_ref_hmac is null or octet_length(approved_by_ref_hmac) = 32),
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_marketing_campaign_approval_check check (
    status not in ('queued', 'sending') or (policy_version is not null and approved_at is not null and approved_by_ref_hmac is not null)
  )
);

create table growth.marketing_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references growth.marketing_campaigns (id) on delete restrict,
  user_id text references identity."user" (id) on delete set null,
  user_ref_hmac bytea not null check (octet_length(user_ref_hmac) = 32),
  status text not null default 'suppressed' check (status in ('queued', 'suppressed', 'sent', 'failed')),
  queued_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint growth_marketing_recipient_unique unique (campaign_id, user_ref_hmac),
  constraint growth_marketing_recipient_sent_check check ((status = 'sent') = (sent_at is not null))
);

create table growth.support_case_events (
  id uuid primary key default gen_random_uuid(),
  support_case_id uuid not null references member.support_cases (id) on delete cascade,
  actor_type text not null check (actor_type in ('member', 'staff', 'system')),
  event_type text not null check (event_type in ('message', 'status_changed', 'assigned', 'closed')),
  body_ciphertext text,
  key_version smallint check (key_version is null or key_version > 0),
  created_by_admin_ref_hmac bytea check (created_by_admin_ref_hmac is null or octet_length(created_by_admin_ref_hmac) = 32),
  created_at timestamptz not null default now(),
  constraint growth_support_case_event_cipher_pair check ((body_ciphertext is null) = (key_version is null)),
  constraint growth_support_case_event_admin_actor_check check (
    (actor_type = 'staff') = (created_by_admin_ref_hmac is not null)
  )
);

create index member_support_cases_user_created_idx on member.support_cases (user_id, created_at desc);
create index growth_referral_attributions_referrer_idx on growth.referral_attributions (referrer_ref_hmac, created_at desc);
create index growth_referral_rewards_status_created_idx on growth.referral_rewards (status, created_at);
create index growth_gift_orders_status_created_idx on growth.gift_orders (status, created_at);
create index growth_pricing_assignments_user_idx on growth.pricing_assignments (user_id, assigned_at desc);
create index growth_marketing_recipients_campaign_status_idx on growth.marketing_recipients (campaign_id, status);
create index growth_support_case_events_case_created_idx on growth.support_case_events (support_case_id, created_at);

alter table member.marketing_preferences enable row level security;
alter table member.marketing_preferences force row level security;
alter table member.support_cases enable row level security;
alter table member.support_cases force row level security;

alter table growth.referral_programs enable row level security;
alter table growth.referral_programs force row level security;
alter table growth.referral_codes enable row level security;
alter table growth.referral_codes force row level security;
alter table growth.referral_attributions enable row level security;
alter table growth.referral_attributions force row level security;
alter table growth.referral_rewards enable row level security;
alter table growth.referral_rewards force row level security;
alter table growth.gift_orders enable row level security;
alter table growth.gift_orders force row level security;
alter table growth.gift_events enable row level security;
alter table growth.gift_events force row level security;
alter table growth.pricing_experiments enable row level security;
alter table growth.pricing_experiments force row level security;
alter table growth.pricing_variants enable row level security;
alter table growth.pricing_variants force row level security;
alter table growth.pricing_assignments enable row level security;
alter table growth.pricing_assignments force row level security;
alter table growth.marketing_campaigns enable row level security;
alter table growth.marketing_campaigns force row level security;
alter table growth.marketing_recipients enable row level security;
alter table growth.marketing_recipients force row level security;
alter table growth.support_case_events enable row level security;
alter table growth.support_case_events force row level security;

create policy member_marketing_preferences_owner on member.marketing_preferences
  for all to lumina_member_app
  using (user_id = app.current_user_id())
  with check (user_id = app.current_user_id());
create policy member_support_cases_owner_select on member.support_cases
  for select to lumina_member_app
  using (user_id = app.current_user_id());
create policy member_support_cases_owner_insert on member.support_cases
  for insert to lumina_member_app
  with check (user_id = app.current_user_id() and status = 'open' and resolved_at is null);
create policy growth_worker_support_cases_access on member.support_cases
  for all to lumina_growth_worker
  using (true)
  with check (true);

create policy member_support_case_events_owner_select on growth.support_case_events
  for select to lumina_member_app
  using (exists (
    select 1 from member.support_cases c
     where c.id = support_case_id and c.user_id = app.current_user_id()
  ));
create policy member_support_case_events_owner_insert on growth.support_case_events
  for insert to lumina_member_app
  with check (
    actor_type = 'member'
    and event_type = 'message'
    and body_ciphertext is not null
    and exists (
      select 1 from member.support_cases c
       where c.id = support_case_id and c.user_id = app.current_user_id()
    )
  );

do $$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'referral_programs', 'referral_codes', 'referral_attributions', 'referral_rewards',
    'gift_orders', 'gift_events', 'pricing_experiments', 'pricing_variants',
    'pricing_assignments', 'marketing_campaigns', 'marketing_recipients', 'support_case_events'
  ] loop
    execute format(
      'create policy %I on growth.%I for all to lumina_growth_worker using (true) with check (true)',
      'growth_worker_' || relation_name || '_access',
      relation_name
    );
  end loop;
end
$$;

create policy growth_worker_marketing_preferences_read on member.marketing_preferences
  for select to lumina_growth_worker using (true);

revoke all on table
  member.marketing_preferences, member.support_cases, growth.referral_programs, growth.referral_codes,
  growth.referral_attributions, growth.referral_rewards, growth.gift_orders, growth.gift_events,
  growth.pricing_experiments, growth.pricing_variants, growth.pricing_assignments,
  growth.marketing_campaigns, growth.marketing_recipients, growth.support_case_events
  from public;

grant usage on schema member to lumina_member_app;
grant usage on schema growth to lumina_member_app, lumina_growth_worker;
grant usage on schema member to lumina_growth_worker;
grant execute on function app.current_user_id() to lumina_member_app;

grant select, insert, update on table member.marketing_preferences to lumina_member_app;
grant select, insert on table member.support_cases to lumina_member_app;
grant select, insert on table growth.support_case_events to lumina_member_app;

grant select on table member.marketing_preferences to lumina_growth_worker;
grant select, update on table member.support_cases to lumina_growth_worker;
grant select, insert on table growth.support_case_events to lumina_growth_worker;
grant select, insert, update on table
  growth.referral_programs, growth.referral_codes, growth.referral_attributions,
  growth.referral_rewards, growth.gift_orders, growth.pricing_experiments,
  growth.pricing_variants, growth.marketing_campaigns, growth.marketing_recipients
  to lumina_growth_worker;
grant select, insert on table
  growth.gift_events, growth.pricing_assignments, growth.support_case_events
  to lumina_growth_worker;

commit;
