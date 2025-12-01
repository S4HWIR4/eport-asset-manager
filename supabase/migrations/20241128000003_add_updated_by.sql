-- Add updated_by column to assets table
ALTER TABLE public.assets
ADD COLUMN updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_assets_updated_by ON public.assets(updated_by);

-- Update the trigger function to set updated_by
CREATE OR REPLACE FUNCTION public.handle_asset_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  -- Set updated_by to the current user if available
  IF current_setting('request.jwt.claims', true)::json->>'sub' IS NOT NULL THEN
    NEW.updated_by = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace the existing updated_at trigger with the new one
DROP TRIGGER IF EXISTS set_updated_at_assets ON public.assets;

CREATE TRIGGER set_updated_at_assets
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.handle_asset_update();

-- Set initial updated_by values to created_by for existing records
UPDATE public.assets
SET updated_by = created_by
WHERE updated_by IS NULL;
