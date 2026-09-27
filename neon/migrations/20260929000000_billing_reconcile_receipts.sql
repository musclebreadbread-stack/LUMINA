begin;

alter table billing.orders
  add column receipt_locale text not null default 'ko'
    check (receipt_locale in ('ko', 'en'));

alter table billing.receipt_email_events
  drop constraint receipt_email_events_status_check;

alter table billing.receipt_email_events
  add constraint receipt_email_events_status_check
    check (status in ('pending', 'processing', 'sent', 'failed')),
  add column lock_expires_at timestamptz;

create index billing_toss_reconcile_pending_idx
  on billing.orders (expires_at asc)
  where provider = 'toss' and status = 'pending';

create index billing_receipt_email_queue_idx
  on billing.receipt_email_events (created_at asc)
  where status in ('pending', 'processing');

commit;
