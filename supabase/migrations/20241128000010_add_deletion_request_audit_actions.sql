-- Add deletion request audit actions
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;

ALTER TABLE public.audit_logs 
  ADD CONSTRAINT audit_logs_action_check 
  CHECK (action IN (
    'asset_deleted', 
    'asset_created', 
    'asset_updated', 
    'user_created', 
    'user_updated',
    'category_created',
    'category_updated',
    'category_deleted',
    'department_created',
    'department_updated',
    'department_deleted',
    'deletion_request_submitted',
    'deletion_request_cancelled',
    'deletion_request_approved',
    'deletion_request_rejected'
  ));
