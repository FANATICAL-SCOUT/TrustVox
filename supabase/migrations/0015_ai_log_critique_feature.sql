-- TrustVox — Phase 12 · Step 12.3 · Migration 0015: allow 'critique_question' in the AI log
-- Design source of truth: docs/frontend/PHASE-12-AI-EXPANSION.md §12.3.
-- Run AFTER 0014.
--
-- 12.3 adds a third AI route (/api/critique-question) that reuses the same
-- per-user daily rate-limit table (ai_generation_log) as 11.5/11.6. The table's
-- `feature` CHECK from 0014 only permits 'generate_questions' / 'summarize_responses',
-- so a critique log-row insert would be rejected. This widens the constraint to
-- include the third feature value. No new table, no data change, no RLS change —
-- the existing per-user select/insert policies already cover every feature value.

alter table public.ai_generation_log
  drop constraint if exists ai_generation_log_feature_check;

alter table public.ai_generation_log
  add constraint ai_generation_log_feature_check
  check (feature in ('generate_questions', 'summarize_responses', 'critique_question'));
