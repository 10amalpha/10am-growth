-- Gumroad cleanup tracking table
-- Tracks which Gumroad-expired users have been manually removed from Alpha WhatsApp
-- COMPLETELY SEPARATE from churn_removed (which tracks Stripe)

CREATE TABLE IF NOT EXISTS gumroad_to_remove (
  email TEXT PRIMARY KEY,
  expired_date DATE NOT NULL,
  removed_at TIMESTAMPTZ,
  removed_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gumroad_to_remove ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open_all" ON gumroad_to_remove
  USING (true) WITH CHECK (true);

-- Seed the 48 expired Gumroad users (Apr 29, 2026 batch)
INSERT INTO gumroad_to_remove (email, expired_date) VALUES
  ('juancamiloardila@gmail.com', '2026-04-18'),
  ('julianzr2138@gmail.com', '2026-04-09'),
  ('sebastatrader@gmail.com', '2026-04-05'),
  ('tomasuribem@gmail.com', '2026-03-20'),
  ('camilos17@gmail.com', '2026-03-15'),
  ('santiago.serna1992@gmail.com', '2026-02-25'),
  ('glaca28@gmail.com', '2026-02-21'),
  ('jairoisg@gmail.com', '2026-02-19'),
  ('sofiabuitrago0915@gmail.com', '2026-02-11'),
  ('juanjose.bcr@gmail.com', '2026-02-09'),
  ('julianrpo@gmail.com', '2026-02-06'),
  ('verollano@gmail.com', '2026-02-05'),
  ('santiagososa1@me.com', '2026-02-01'),
  ('cadavid.alejo@gmail.com', '2026-01-17'),
  ('idlaura19@gmail.com', '2025-12-22'),
  ('josephmildenberg@gmail.com', '2025-12-18'),
  ('aj@swiset.com', '2025-12-06'),
  ('caldas.juancamilo@gmail.com', '2025-11-04'),
  ('ing.aldanag@hotmail.com', '2025-10-20'),
  ('londono.cristina@gmail.com', '2025-09-27'),
  ('restrepobridge@gmail.com', '2025-09-24'),
  ('javquin76@gmail.com', '2025-09-14'),
  ('caaghoy@gmail.com', '2025-09-06'),
  ('pnuttin1@hotmail.com', '2025-09-06'),
  ('juanm.rpo@gmail.com', '2025-09-02'),
  ('gabrielaggarcia70@gmail.com', '2025-08-28'),
  ('amorenom@gmail.com', '2025-08-25'),
  ('jhonerenteriad@gmail.com', '2025-08-13'),
  ('davidbedoya2903@icloud.com', '2025-08-13'),
  ('cgiraldopareja@gmail.com', '2025-07-26'),
  ('leigo13@gmail.com', '2025-07-09'),
  ('jlcc1111@icloud.com', '2025-06-25'),
  ('buritica.eledenco@gmail.com', '2025-06-25'),
  ('daniel.cardona90@gmail.com', '2025-06-25'),
  ('smendoza@24vista.co', '2025-06-05'),
  ('kanaarva9223@gmail.com', '2025-06-05'),
  ('capalacio6@gmail.com', '2025-05-19'),
  ('camiloguzmansaenz@gmail.com', '2025-05-04'),
  ('8812abileth@gmail.com', '2025-04-24'),
  ('andreanami789@gmail.com', '2025-04-20'),
  ('miguelvilag@gmail.com', '2025-04-07'),
  ('shirleydayannareyes@gmail.com', '2025-04-01'),
  ('yepes724@gmail.com', '2025-04-01'),
  ('anfego@gmail.com', '2025-03-24'),
  ('rkjmanager@gmail.com', '2025-03-04'),
  ('carloshugo5@gmail.com', '2025-03-02'),
  ('wilcom10@hotmail.com', '2025-03-01'),
  ('adaniel29@hotmail.com', '2025-02-22')
ON CONFLICT (email) DO NOTHING;
