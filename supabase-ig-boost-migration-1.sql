-- Migration: Add baseline metrics + enable delta tracking
-- Run in Supabase SQL Editor after initial schema

ALTER TABLE ig_boost_tracking 
  ADD COLUMN IF NOT EXISTS baseline_views INT,
  ADD COLUMN IF NOT EXISTS baseline_reach INT,
  ADD COLUMN IF NOT EXISTS baseline_likes INT,
  ADD COLUMN IF NOT EXISTS baseline_comments INT,
  ADD COLUMN IF NOT EXISTS baseline_shares INT,
  ADD COLUMN IF NOT EXISTS baseline_saves INT,
  ADD COLUMN IF NOT EXISTS baseline_follows INT,
  ADD COLUMN IF NOT EXISTS baseline_profile_visits INT,
  ADD COLUMN IF NOT EXISTS baseline_engagement_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS baseline_follows_per_1k NUMERIC,
  ADD COLUMN IF NOT EXISTS paid_subs_attributed INT,
  ADD COLUMN IF NOT EXISTS mrr_attributed NUMERIC;
