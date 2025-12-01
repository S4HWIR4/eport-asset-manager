-- Audit logs table for tracking asset deletions and other actions
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL CHECK (action IN ('asset_deleted', 'asset_created', 'asset_updated', 'user_created', 'user_updated')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('asset', 'user', 'category', 'department')),
  entity_id UUID NOT NULL,
  entity_data JSONB,
  performed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_audit_logs_performed_by ON public.audit_logs(performed_by);
CREATE INDEX idx_audit_logs_entity_id ON public.audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

-- Authenticated users can insert audit logs (system will enforce proper usage)
CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (performed_by = auth.uid());
