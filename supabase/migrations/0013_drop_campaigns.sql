-- TrustVox — Phase 11 · Migration 0013: drop the campaigns table
-- Design source of truth: docs/frontend/PHASE-11-CLIENT-REBUILD-AI.md §11.1.
-- Run AFTER 0012.
--
-- The Campaigns feature (page + lib/client-campaigns.ts) is deleted in 11.1:
-- there was never a real create-campaign UI — every client's 3 "campaigns"
-- were auto-invented fixtures (DEFAULT_CAMPAIGN_TEMPLATES), and forms were
-- bucketed into them by a keyword heuristic, not a real relationship. With the
-- UI gone, the table is fully unused. Not added to the supabase_realtime
-- publication in 0007, so there's nothing to remove there.

drop policy if exists campaigns_select_own_or_admin on public.campaigns;
drop policy if exists campaigns_insert_own_client   on public.campaigns;
drop policy if exists campaigns_update_own_client   on public.campaigns;
drop policy if exists campaigns_delete_own_client   on public.campaigns;

drop table if exists public.campaigns;
drop type if exists public.campaign_status;
