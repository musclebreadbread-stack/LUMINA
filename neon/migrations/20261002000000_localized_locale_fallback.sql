-- Extend routed locale values while using the English catalog until each
-- additional translation has completed its release review.

begin;

alter table member.saved_results
  drop constraint saved_results_locale_check,
  add constraint member_saved_results_locale_check
    check (locale in ('ko', 'en', 'ja', 'zh-Hant', 'es'));

alter table billing.orders
  drop constraint orders_receipt_locale_check,
  add constraint billing_orders_receipt_locale_check
    check (receipt_locale in ('ko', 'en', 'ja', 'zh-Hant', 'es'));

alter table ai.narrative_cache
  drop constraint narrative_cache_locale_check,
  add constraint ai_narrative_cache_locale_check
    check (locale in ('ko', 'en', 'ja', 'zh-Hant', 'es'));

alter table ai.user_narratives
  drop constraint user_narratives_locale_check,
  add constraint ai_user_narratives_locale_check
    check (locale in ('ko', 'en', 'ja', 'zh-Hant', 'es'));

alter table billing.subscriptions
  drop constraint billing_subscriptions_receipt_locale_check,
  add constraint billing_subscriptions_receipt_locale_check
    check (receipt_locale in ('ko', 'en', 'ja', 'zh-Hant', 'es'));

commit;
