-- Add all CRUD action types to audit_logs action constraint
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;

ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check 
  CHECK (action IN (
    'asset_created',
    'asset_updated',
    'asset_deleted', 
    'user_created', 
    'user_updated',
    'user_deleted',
    'category_created',
    'category_updated',
    'category_deleted',
    'department_created',
    'department_updated',
    'department_deleted'
  ));
