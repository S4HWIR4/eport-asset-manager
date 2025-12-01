-- Add deletion_request to entity_type constraint
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_entity_type_check;

ALTER TABLE public.audit_logs 
  ADD CONSTRAINT audit_logs_entity_type_check 
  CHECK (entity_type IN (
    'asset',
    'user',
    'category',
    'department',
    'deletion_request'
  ));
