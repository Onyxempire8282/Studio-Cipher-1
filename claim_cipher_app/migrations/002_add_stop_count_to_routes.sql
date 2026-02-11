-- ============================================
-- ADD stop_count TO ROUTES TABLE
-- Stores destination count at optimization time
-- so closeRoute() can populate mileage_logs.claim_count
-- ============================================

ALTER TABLE routes ADD COLUMN IF NOT EXISTS stop_count INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN routes.stop_count IS 'Number of destinations in optimized route (set at save time)';

-- Backfill existing rows
UPDATE routes SET stop_count = 1 WHERE stop_count IS NULL OR stop_count = 0;

-- Backfill existing mileage_logs where claim_count was saved as 0
UPDATE mileage_logs SET claim_count = 1 WHERE claim_count = 0;
