-- Fix deletion_requests foreign key to NOT cascade delete
-- This ensures deletion request records are preserved for audit purposes (Requirement 5.5)

-- Drop the existing foreign key constraint
ALTER TABLE public.deletion_requests 
  DROP CONSTRAINT IF EXISTS deletion_requests_asset_id_fkey;

-- Add the foreign key constraint without CASCADE
-- Use SET NULL instead so the reference is cleared but the record remains
ALTER TABLE public.deletion_requests 
  ADD CONSTRAINT deletion_requests_asset_id_fkey 
  FOREIGN KEY (asset_id) 
  REFERENCES public.assets(id) 
  ON DELETE SET NULL;

-- Make asset_id nullable since it can be set to NULL when asset is deleted
ALTER TABLE public.deletion_requests 
  ALTER COLUMN asset_id DROP NOT NULL;
