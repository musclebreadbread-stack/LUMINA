-- Adds the pre-registered stratification variables (gender, education, region) that
-- research/cognitive/v1/analysis-plan.md requires alongside age_years. All three stay
-- optional and are only populated when a participant opts into research participation
-- (enforced in src/lib/cognitiveRunInput.ts and src/server/cognitive/runs.ts, not here).
-- This migration adds no active items and does not approve a norm release.

begin;

alter table private_cognitive.scoring_state
  add column if not exists gender_band text
    check (gender_band is null or gender_band in ('male', 'female', 'self_described', 'prefer_not_to_say'));

alter table private_cognitive.scoring_state
  add column if not exists education_band text
    check (education_band is null or education_band in (
      'middle_school_or_below', 'high_school', 'college_or_associate', 'bachelor', 'graduate_or_above', 'prefer_not_to_say'
    ));

alter table private_cognitive.scoring_state
  add column if not exists region_class text
    check (region_class is null or region_class in (
      'capital_region', 'chungcheong', 'honam', 'yeongnam', 'gangwon_jeju', 'overseas_or_unknown', 'prefer_not_to_say'
    ));

commit;
