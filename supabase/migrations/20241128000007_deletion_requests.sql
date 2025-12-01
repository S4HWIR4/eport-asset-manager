-- Deletion requests table for asset deletion workflow
CREATE TABLE public.deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  asset_name TEXT NOT NULL,
  asset_cost DECIMAL(12, 2) NOT NULL,
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requester_email TEXT NOT NULL,
  justification TEXT NOT NULL CHECK (length(justification) >= 10),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewer_email TEXT,
  review_comment TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_deletion_requests_status ON public.deletion_requests(status);
CREATE INDEX idx_deletion_requests_asset_id ON public.deletion_requests(asset_id);
CREATE INDEX idx_deletion_requests_requested_by ON public.deletion_requests(requested_by);
CREATE INDEX idx_deletion_requests_created_at ON public.deletion_requests(created_at DESC);
CREATE INDEX idx_deletion_requests_reviewed_by ON public.deletion_requests(reviewed_by);

-- Unique partial index to enforce one pending request per asset (Business Rule: Property 19)
CREATE UNIQUE INDEX idx_one_pending_per_asset ON public.deletion_requests(asset_id) WHERE status = 'pending';

-- Trigger for updated_at timestamp
CREATE TRIGGER set_updated_at_deletion_requests
  BEFORE UPDATE ON public.deletion_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS on deletion_requests
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own deletion requests
CREATE POLICY "Users can view own deletion requests"
  ON public.deletion_requests FOR SELECT
  USING (auth.uid() = requested_by);

-- Users can insert their own deletion requests
CREATE POLICY "Users can create deletion requests"
  ON public.deletion_requests FOR INSERT
  WITH CHECK (auth.uid() = requested_by);

-- Users can cancel their own pending requests
CREATE POLICY "Users can cancel own pending requests"
  ON public.deletion_requests FOR UPDATE
  USING (auth.uid() = requested_by AND status = 'pending')
  WITH CHECK (status = 'cancelled');

-- Admins can view all deletion requests
CREATE POLICY "Admins can view all deletion requests"
  ON public.deletion_requests FOR SELECT
  USING (public.is_admin());

-- Admins can update deletion requests (approve/reject)
CREATE POLICY "Admins can review deletion requests"
  ON public.deletion_requests FOR UPDATE
  USING (public.is_admin());
