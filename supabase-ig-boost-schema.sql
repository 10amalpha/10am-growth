-- 10AMPRO IG Boost — Supabase Schema
-- Run once in Supabase SQL Editor before first cron execution.

-- Table 1: Daily cron writes top 10 boost candidates here
CREATE TABLE IF NOT EXISTS ig_boost_recommendations (
  id BIGSERIAL PRIMARY KEY,
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rank INT NOT NULL,
  
  -- Clip identity
  media_id TEXT NOT NULL,
  permalink TEXT NOT NULL,
  caption TEXT,
  thumbnail_url TEXT,
  duration_sec NUMERIC,
  published_at TIMESTAMP WITH TIME ZONE,
  
  -- Raw metrics
  views INT DEFAULT 0,
  reach INT DEFAULT 0,
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  shares INT DEFAULT 0,
  saves INT DEFAULT 0,
  follows INT DEFAULT 0,
  profile_visits INT DEFAULT 0,
  
  -- Derived
  follows_per_1k NUMERIC,
  saves_per_1k NUMERIC,
  profile_visits_per_1k NUMERIC,
  engagement_rate NUMERIC,
  
  -- Score + reasoning
  score NUMERIC,
  reasoning TEXT,
  
  CONSTRAINT ig_boost_rec_unique UNIQUE(computed_at, media_id)
);

CREATE INDEX IF NOT EXISTS idx_igbr_computed ON ig_boost_recommendations(computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_igbr_rank ON ig_boost_recommendations(computed_at DESC, rank ASC);

-- Table 2: Hernán's actual boost decisions
CREATE TABLE IF NOT EXISTS ig_boost_tracking (
  id BIGSERIAL PRIMARY KEY,
  boosted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- What was boosted
  media_id TEXT NOT NULL,
  permalink TEXT,
  caption TEXT,
  
  -- Where it goes
  landing_url TEXT NOT NULL,
  utm_campaign TEXT NOT NULL,
  
  -- Budget
  budget_usd NUMERIC,
  duration_days INT,
  
  -- Status
  status TEXT DEFAULT 'active',
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Results (filled later from Substack CSV)
  emails_attributed INT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_igbt_boosted ON ig_boost_tracking(boosted_at DESC);

-- RLS: allow anon to SELECT from both tables, INSERT only into tracking
ALTER TABLE ig_boost_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ig_boost_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read recs" ON ig_boost_recommendations;
CREATE POLICY "anon read recs" ON ig_boost_recommendations FOR SELECT USING (true);

DROP POLICY IF EXISTS "anon write recs" ON ig_boost_recommendations;
CREATE POLICY "anon write recs" ON ig_boost_recommendations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "anon delete recs" ON ig_boost_recommendations;
CREATE POLICY "anon delete recs" ON ig_boost_recommendations FOR DELETE USING (true);

DROP POLICY IF EXISTS "anon read tracking" ON ig_boost_tracking;
CREATE POLICY "anon read tracking" ON ig_boost_tracking FOR SELECT USING (true);

DROP POLICY IF EXISTS "anon write tracking" ON ig_boost_tracking;
CREATE POLICY "anon write tracking" ON ig_boost_tracking FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "anon update tracking" ON ig_boost_tracking;
CREATE POLICY "anon update tracking" ON ig_boost_tracking FOR UPDATE USING (true);
