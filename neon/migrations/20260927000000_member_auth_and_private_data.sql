-- Creates the first member identity and private-data schemas. Apply only after
-- the selected Neon target has been reviewed with the guarded migration runner.

begin;

do $$
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'lumina_auth_app') then
    create role lumina_auth_app
      login nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls;
  end if;
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'lumina_member_app') then
    create role lumina_member_app
      login nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
      from pg_catalog.pg_roles
     where rolname in ('lumina_auth_app', 'lumina_member_app')
       and (
         not rolcanlogin
         or rolsuper
         or rolcreatedb
         or rolcreaterole
         or rolreplication
         or rolbypassrls
         or rolinherit
       )
  ) or (
    select count(*) from pg_catalog.pg_roles
     where rolname in ('lumina_auth_app', 'lumina_member_app')
  ) <> 2 then
    raise exception 'member application roles must have restricted login attributes';
  end if;
end
$$;

do $$
declare
  migration_role oid := (select oid from pg_catalog.pg_roles where rolname = current_user);
  auth_role oid := (select oid from pg_catalog.pg_roles where rolname = 'lumina_auth_app');
  member_role oid := (select oid from pg_catalog.pg_roles where rolname = 'lumina_member_app');
begin
  if exists (
    select 1 from pg_catalog.pg_namespace
     where nspname in ('identity', 'member') and nspowner <> migration_role
  ) then
    raise exception 'identity or member schema has a different owner; review ownership before migration';
  end if;

  if exists (
    select 1 from pg_catalog.pg_auth_members
     where member in ('lumina_auth_app'::regrole, 'lumina_member_app'::regrole)
        or (
          roleid in ('lumina_auth_app'::regrole, 'lumina_member_app'::regrole)
          and (
            member <> migration_role
            or not admin_option
            or inherit_option
            or set_option
          )
        )
  ) then
    raise exception 'member application roles have unexpected role memberships; review access before migration';
  end if;

  if exists (
    select 1 from pg_catalog.pg_namespace
     where nspowner in ('lumina_auth_app'::regrole, 'lumina_member_app'::regrole)
  ) or exists (
    select 1 from pg_catalog.pg_class
     where relowner in ('lumina_auth_app'::regrole, 'lumina_member_app'::regrole)
  ) or exists (
    select 1 from pg_catalog.pg_proc
     where proowner in ('lumina_auth_app'::regrole, 'lumina_member_app'::regrole)
  ) or exists (
    select 1 from pg_catalog.pg_type
     where typowner in ('lumina_auth_app'::regrole, 'lumina_member_app'::regrole)
  ) or exists (
    select 1 from pg_catalog.pg_database
     where datdba in ('lumina_auth_app'::regrole, 'lumina_member_app'::regrole)
  ) then
    raise exception 'member application roles own database objects; review ownership before migration';
  end if;

  if exists (
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('identity', 'member')
  ) or exists (
    select 1 from pg_catalog.pg_policy p
    join pg_catalog.pg_class c on c.oid = p.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('identity', 'member')
  ) or exists (
    select 1 from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('identity', 'member')
  ) or exists (
    select 1 from pg_catalog.pg_type t
    join pg_catalog.pg_namespace n on n.oid = t.typnamespace
    where n.nspname in ('identity', 'member') and t.typtype <> 'p'
  ) then
    raise exception 'identity or member schema is not empty; review existing objects, routines, types, and RLS policies before migration';
  end if;

  if exists (
    select 1 from (
      select acl.grantee
        from pg_catalog.pg_class c
        cross join lateral pg_catalog.aclexplode(c.relacl) acl
      union all
      select acl.grantee
        from pg_catalog.pg_namespace n
        cross join lateral pg_catalog.aclexplode(n.nspacl) acl
      union all
      select acl.grantee
        from pg_catalog.pg_proc p
        cross join lateral pg_catalog.aclexplode(p.proacl) acl
      union all
      select acl.grantee
        from pg_catalog.pg_type t
        cross join lateral pg_catalog.aclexplode(t.typacl) acl
      union all
      select acl.grantee
        from pg_catalog.pg_database d
        cross join lateral pg_catalog.aclexplode(d.datacl) acl
      union all
      select acl.grantee
        from pg_catalog.pg_attribute a
        cross join lateral pg_catalog.aclexplode(a.attacl) acl
       where a.attnum > 0
      union all
      select acl.grantee
        from pg_catalog.pg_default_acl d
        cross join lateral pg_catalog.aclexplode(d.defaclacl) acl
    ) existing_grants
    where grantee in (auth_role, member_role)
  ) then
    raise exception 'member application roles already have direct object privileges; review and revoke them before migration';
  end if;

  if exists (
    select 1
      from pg_catalog.pg_namespace n
      cross join lateral pg_catalog.aclexplode(n.nspacl) acl
     where n.nspname in ('identity', 'member')
       and acl.privilege_type = 'CREATE'
       and acl.grantee <> n.nspowner
  ) then
    raise exception 'identity or member schema grants CREATE to a non-owner role; review schema access before migration';
  end if;
end
$$;

create schema if not exists identity;
create schema if not exists member;

create table if not exists identity."user" (
  id text primary key,
  name text not null,
  email text not null,
  "emailVerified" boolean not null default false,
  image text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint user_email_unique unique (email)
);

create table if not exists identity.session (
  id text primary key,
  "expiresAt" timestamptz not null,
  token text not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references identity."user" (id) on delete cascade,
  constraint session_token_unique unique (token)
);

create table if not exists identity.account (
  id text primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references identity."user" (id) on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope text,
  password text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists identity.verification (
  id text primary key,
  identifier text not null,
  value text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists identity."rateLimit" (
  id text primary key,
  key text not null,
  count integer not null,
  "lastRequest" bigint not null default (extract(epoch from clock_timestamp()) * 1000)::bigint,
  constraint rate_limit_key_unique unique (key)
);

create index if not exists session_userId_idx on identity.session ("userId");
create index if not exists account_userId_idx on identity.account ("userId");
create index if not exists verification_identifier_idx on identity.verification (identifier);

alter table identity."user" enable row level security;
alter table identity."user" force row level security;
alter table identity.session enable row level security;
alter table identity.session force row level security;
alter table identity.account enable row level security;
alter table identity.account force row level security;
alter table identity.verification enable row level security;
alter table identity.verification force row level security;
alter table identity."rateLimit" enable row level security;
alter table identity."rateLimit" force row level security;

drop policy if exists member_auth_user_access on identity."user";
create policy member_auth_user_access on identity."user"
  for all to lumina_auth_app using (true) with check (true);
drop policy if exists member_auth_session_access on identity.session;
create policy member_auth_session_access on identity.session
  for all to lumina_auth_app using (true) with check (true);
drop policy if exists member_auth_account_access on identity.account;
create policy member_auth_account_access on identity.account
  for all to lumina_auth_app using (true) with check (true);
drop policy if exists member_auth_verification_access on identity.verification;
create policy member_auth_verification_access on identity.verification
  for all to lumina_auth_app using (true) with check (true);
drop policy if exists member_auth_rate_limit_access on identity."rateLimit";
create policy member_auth_rate_limit_access on identity."rateLimit"
  for all to lumina_auth_app using (true) with check (true);

create or replace function app.current_user_id()
returns text
language sql
stable
set search_path = pg_catalog
as $$
  select nullif(current_setting('app.current_user_id', true), '')
$$;

revoke all on schema identity, member from public;
revoke all on all tables in schema identity, member from public;
revoke all on function app.current_user_id() from public;

grant usage on schema identity to lumina_auth_app;
grant select, insert, update, delete on table
  identity."user", identity.session, identity.account, identity.verification, identity."rateLimit"
  to lumina_auth_app;

grant usage on schema member to lumina_member_app;
grant usage on schema app to lumina_member_app;
grant execute on function app.current_user_id() to lumina_member_app;

create table if not exists member.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references identity."user" (id) on delete cascade,
  source_key text not null,
  label_ciphertext text not null,
  birth_profile_ciphertext text not null,
  key_version smallint not null check (key_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists member.saved_results (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references identity."user" (id) on delete cascade,
  source_snapshot_id uuid not null,
  product_key text not null,
  locale text not null check (locale in ('ko', 'en')),
  payload_ciphertext text not null,
  key_version smallint not null check (key_version > 0),
  created_at timestamptz not null default now(),
  constraint member_saved_results_source_unique unique (user_id, source_snapshot_id)
);

create table if not exists member.consents (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references identity."user" (id) on delete cascade,
  consent_type text not null check (consent_type in ('terms', 'privacy', 'overseas_transfer', 'marketing')),
  policy_version text not null,
  accepted_at timestamptz not null default now(),
  constraint member_consents_unique unique (user_id, consent_type, policy_version)
);

create table if not exists member.share_links (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references identity."user" (id) on delete cascade,
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  payload_ciphertext text not null,
  key_version smallint not null check (key_version > 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  constraint member_share_links_expiry_check check (expires_at > created_at)
);

grant select, insert, update, delete on table
  member.profiles, member.saved_results, member.consents, member.share_links
  to lumina_member_app;

create unique index if not exists member_profiles_owner_key_unique on member.profiles (user_id, source_key);
create index if not exists member_saved_results_user_id_created_idx on member.saved_results (user_id, created_at desc);
create index if not exists member_consents_user_id_idx on member.consents (user_id);
create index if not exists member_share_links_user_id_idx on member.share_links (user_id);

alter table member.profiles enable row level security;
alter table member.profiles force row level security;
alter table member.saved_results enable row level security;
alter table member.saved_results force row level security;
alter table member.consents enable row level security;
alter table member.consents force row level security;
alter table member.share_links enable row level security;
alter table member.share_links force row level security;

create policy member_profiles_owner on member.profiles
  for all to lumina_member_app
  using (user_id = app.current_user_id())
  with check (user_id = app.current_user_id());
create policy member_saved_results_owner on member.saved_results
  for all to lumina_member_app
  using (user_id = app.current_user_id())
  with check (user_id = app.current_user_id());
create policy member_consents_owner on member.consents
  for all to lumina_member_app
  using (user_id = app.current_user_id())
  with check (user_id = app.current_user_id());
create policy member_share_links_owner on member.share_links
  for all to lumina_member_app
  using (user_id = app.current_user_id())
  with check (user_id = app.current_user_id());

create policy member_share_links_bearer_select on member.share_links
  for select to lumina_member_app
  using (
    token_hash = decode(nullif(current_setting('app.current_share_token_hash', true), ''), 'hex')
    and revoked_at is null
    and expires_at > now()
  );

commit;
