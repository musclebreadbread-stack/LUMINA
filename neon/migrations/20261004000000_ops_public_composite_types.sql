-- Keep PUBLIC from using ops table row types. PostgreSQL creates these types
-- with explicit USAGE ACLs when the tables are created; schema access remains
-- separately denied and worker access stays column-scoped.

begin;

do $$
declare
  type_record record;
begin
  for type_record in
    select namespace.nspname, pgtype.typname
      from pg_catalog.pg_type pgtype
      join pg_catalog.pg_namespace namespace on namespace.oid = pgtype.typnamespace
     where namespace.nspname = 'ops'
       and pgtype.typtype = 'c'
       and pgtype.typelem = 0
  loop
    execute format('revoke usage on type %I.%I from public', type_record.nspname, type_record.typname);
  end loop;
end
$$;

commit;
