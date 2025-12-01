-- Allow users to view audit logs for their own assets
-- This policy enables users to see the change history for assets they created

CREATE POLICY "Users can view audit logs for their own assets"
  ON public.audit_logs FOR SELECT
  USING (
    -- Allow if user is viewing logs for an asset they created
    entity_type = 'asset' AND
    entity_id IN (
      SELECT id FROM public.assets WHERE created_by = auth.uid()
    )
  );
