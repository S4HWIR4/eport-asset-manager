-- Add category and department audit actions
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
    'department_deleted'
  ));
