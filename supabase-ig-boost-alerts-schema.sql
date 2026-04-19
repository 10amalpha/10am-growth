-- IG Boost Alerts — track which reels we've already emailed about
-- Anti-spam: don't re-alert about same reel within 7 days

CREATE TABLE IF NOT EXISTS ig_boost_alerts_sent (
  id BIGSERIAL PRIMARY KEY,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  media_id TEXT NOT NULL,
  score NUMERIC,
  reel_age_days INT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_igas_media ON ig_boost_alerts_sent(media_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_igas_sent ON ig_boost_alerts_sent(sent_at DESC);

ALTER TABLE ig_boost_alerts_sent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read alerts" ON ig_boost_alerts_sent;
CREATE POLICY "anon read alerts" ON ig_boost_alerts_sent FOR SELECT USING (true);

DROP POLICY IF EXISTS "anon insert alerts" ON ig_boost_alerts_sent;
CREATE POLICY "anon insert alerts" ON ig_boost_alerts_sent FOR INSERT WITH CHECK (true);
