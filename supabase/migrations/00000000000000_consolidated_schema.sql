-- ============================================================================
-- CONSOLIDATED DATABASE MIGRATION
-- Asset Manager Application - Complete Schema
-- ============================================================================
-- This migration consolidates all individual migrations into a single file
-- It is idempotent and can be run multiple times safely
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CLEANUP: Drop existing objects in reverse dependency order
-- ============================================================================

-- Drop policies first
DO $$ 
BEGIN
  -- Deletion requests policies
  DROP POLICY IF EXISTS "Users can view own deletion requests" ON public.deletion_requests;
  DROP POLICY IF EXISTS "Users can create deletion requests" ON public.deletion_requests;
  DROP POLICY IF EXISTS "Users can cancel own pending requests" ON public.deletion_requests;
  DROP POLICY IF EXISTS "Admins can view all deletion requests" ON public.deletion_requests;
  DROP POLICY IF EXISTS "Admins can review deletion requests" ON public.deletion_requests;

  -- Audit logs policies
  DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
  DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
  DROP POLICY IF EXISTS "Users can view audit logs for their own assets" ON public.audit_logs;

  -- Assets policies
  DROP POLICY IF EXISTS "Users can view own assets" ON public.assets;
  DROP POLICY IF EXISTS "Admins can view all assets" ON public.assets;
  DROP POLICY IF EXISTS "Authenticated users can create assets" ON public.assets;
  DROP POLICY IF EXISTS "Users can update own assets" ON public.assets;
  DROP POLICY IF EXISTS "Admins can update any asset" ON public.assets;
  DROP POLICY IF EXISTS "Admins can delete any asset" ON public.assets;

  -- Departments policies
  DROP POLICY IF EXISTS "Authenticated users can view departments" ON public.departments;
  DROP POLICY IF EXISTS "Admins can insert departments" ON public.departments;
  DROP POLICY IF EXISTS "Admins can update departments" ON public.departments;
  DROP POLICY IF EXISTS "Admins can delete departments" ON public.departments;

  -- Categories policies
  DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categories;
  DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
  DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
  DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;

  -- Profiles policies
  DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
END $$;

-- Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
DROP TRIGGER IF EXISTS set_updated_at_assets ON public.assets;
DROP TRIGGER IF EXISTS set_updated_at_deletion_requests ON public.deletion_requests;

-- Drop functions
DROP FUNCTION IF EXISTS public.approve_deletion_request(UUID, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_updated_at();
DROP FUNCTION IF EXISTS public.is_admin();

-- Drop indexes
DROP INDEX IF EXISTS public.idx_one_pending_per_asset;
DROP INDEX IF EXISTS public.idx_deletion_requests_reviewed_by;
DROP INDEX IF EXISTS public.idx_deletion_requests_created_at;
DROP INDEX IF EXISTS public.idx_deletion_requests_requested_by;
DROP INDEX IF EXISTS public.idx_deletion_requests_asset_id;
DROP INDEX IF EXISTS public.idx_deletion_requests_status;
DROP INDEX IF EXISTS public.idx_audit_logs_action;
DROP INDEX IF EXISTS public.idx_audit_logs_created_at;
DROP INDEX IF EXISTS public.idx_audit_logs_entity_id;
DROP INDEX IF EXISTS public.idx_audit_logs_performed_by;
DROP INDEX IF EXISTS public.idx_assets_date_purchased;
DROP INDEX IF EXISTS public.idx_assets_department_id;
DROP INDEX IF EXISTS public.idx_assets_category_id;
DROP INDEX IF EXISTS public.idx_assets_created_by;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS public.deletion_requests CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.assets CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================================================
-- TABLES: Create all tables
-- ============================================================================

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Departments table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Assets table
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  date_purchased DATE NOT NULL,
  cost DECIMAL(12, 2) NOT NULL CHECK (cost >= 0),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Audit logs table for tracking all actions
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL CHECK (action IN (
    'asset_created',
    'asset_updated',
    'asset_deleted',
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
  )),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('asset', 'user', 'category', 'department', 'deletion_request')),
  entity_id UUID NOT NULL,
  entity_data JSONB,
  performed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deletion requests table for asset deletion workflow
CREATE TABLE public.deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
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

-- ============================================================================
-- INDEXES: Create all indexes for performance
-- ============================================================================

-- Assets indexes
CREATE INDEX idx_assets_created_by ON public.assets(created_by);
CREATE INDEX idx_assets_category_id ON public.assets(category_id);
CREATE INDEX idx_assets_department_id ON public.assets(department_id);
CREATE INDEX idx_assets_date_purchased ON public.assets(date_purchased);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_performed_by ON public.audit_logs(performed_by);
CREATE INDEX idx_audit_logs_entity_id ON public.audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

-- Deletion requests indexes
CREATE INDEX idx_deletion_requests_status ON public.deletion_requests(status);
CREATE INDEX idx_deletion_requests_asset_id ON public.deletion_requests(asset_id);
CREATE INDEX idx_deletion_requests_requested_by ON public.deletion_requests(requested_by);
CREATE INDEX idx_deletion_requests_created_at ON public.deletion_requests(created_at DESC);
CREATE INDEX idx_deletion_requests_reviewed_by ON public.deletion_requests(reviewed_by);

-- Unique partial index to enforce one pending request per asset
CREATE UNIQUE INDEX idx_one_pending_per_asset ON public.deletion_requests(asset_id) WHERE status = 'pending';

-- ============================================================================
-- FUNCTIONS: Create all database functions
-- ============================================================================

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    'user', -- Default role
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$;

-- Function to approve deletion request in a transaction
CREATE OR REPLACE FUNCTION public.approve_deletion_request(
  p_request_id UUID,
  p_reviewer_id UUID,
  p_reviewer_email TEXT,
  p_review_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_request deletion_requests%ROWTYPE;
  v_asset assets%ROWTYPE;
  v_result JSONB;
BEGIN
  -- Get the deletion request
  SELECT * INTO v_request
  FROM deletion_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Deletion request not found'
    );
  END IF;

  -- Verify request is pending
  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only pending requests can be approved'
    );
  END IF;

  -- Get the asset (for audit logging)
  SELECT * INTO v_asset
  FROM assets
  WHERE id = v_request.asset_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Asset not found'
    );
  END IF;

  -- Delete the asset
  DELETE FROM assets
  WHERE id = v_request.asset_id;

  -- Update deletion request status to approved
  UPDATE deletion_requests
  SET
    status = 'approved',
    reviewed_by = p_reviewer_id,
    reviewer_email = p_reviewer_email,
    review_comment = p_review_comment,
    reviewed_at = NOW()
  WHERE id = p_request_id;

  -- Create audit log entry for approval
  INSERT INTO audit_logs (action, entity_type, entity_id, entity_data, performed_by)
  VALUES (
    'deletion_request_approved',
    'deletion_request',
    p_request_id,
    jsonb_build_object(
      'asset_id', v_request.asset_id,
      'asset_name', v_request.asset_name,
      'review_comment', p_review_comment
    ),
    p_reviewer_id
  );

  -- Create audit log entry for asset deletion
  INSERT INTO audit_logs (action, entity_type, entity_id, entity_data, performed_by)
  VALUES (
    'asset_deleted',
    'asset',
    v_request.asset_id,
    jsonb_build_object(
      'name', v_asset.name,
      'cost', v_asset.cost,
      'date_purchased', v_asset.date_purchased,
      'created_by', v_asset.created_by,
      'deleted_via_request', true,
      'deletion_request_id', p_request_id
    ),
    p_reviewer_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'data', NULL
  );
END;
$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.approve_deletion_request TO authenticated;

-- ============================================================================
-- TRIGGERS: Create all triggers
-- ============================================================================

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggers for updated_at
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_assets
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_deletion_requests
  BEFORE UPDATE ON public.deletion_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY: Enable RLS on all tables
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: Profiles
-- ============================================================================

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: Categories
-- ============================================================================

CREATE POLICY "Authenticated users can view categories"
  ON public.categories FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert categories"
  ON public.categories FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update categories"
  ON public.categories FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete categories"
  ON public.categories FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: Departments
-- ============================================================================

CREATE POLICY "Authenticated users can view departments"
  ON public.departments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert departments"
  ON public.departments FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update departments"
  ON public.departments FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete departments"
  ON public.departments FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: Assets
-- ============================================================================

CREATE POLICY "Users can view own assets"
  ON public.assets FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Admins can view all assets"
  ON public.assets FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Authenticated users can create assets"
  ON public.assets FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own assets"
  ON public.assets FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Admins can update any asset"
  ON public.assets FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete any asset"
  ON public.assets FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: Audit Logs
-- ============================================================================

CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (performed_by = auth.uid());

CREATE POLICY "Users can view audit logs for their own assets"
  ON public.audit_logs FOR SELECT
  USING (
    entity_type = 'asset' AND
    entity_id IN (
      SELECT id FROM public.assets WHERE created_by = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES: Deletion Requests
-- ============================================================================

CREATE POLICY "Users can view own deletion requests"
  ON public.deletion_requests FOR SELECT
  USING (auth.uid() = requested_by);

CREATE POLICY "Users can create deletion requests"
  ON public.deletion_requests FOR INSERT
  WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Users can cancel own pending requests"
  ON public.deletion_requests FOR UPDATE
  USING (auth.uid() = requested_by AND status = 'pending')
  WITH CHECK (status = 'cancelled');

CREATE POLICY "Admins can view all deletion requests"
  ON public.deletion_requests FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can review deletion requests"
  ON public.deletion_requests FOR UPDATE
  USING (public.is_admin());

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
