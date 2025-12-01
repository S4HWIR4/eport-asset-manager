-- Add unique partial index to enforce one pending request per asset
-- This enforces Business Rule: Property 19 - One active request per asset
-- For any asset, there should be at most one deletion request with status 'pending' at any given time

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_per_asset 
  ON public.deletion_requests(asset_id) 
  WHERE status = 'pending';
