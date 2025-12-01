-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;

DROP POLICY IF EXISTS "Authenticated users can view departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can insert departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can update departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can delete departments" ON public.departments;

DROP POLICY IF EXISTS "Users can view own assets" ON public.assets;
DROP POLICY IF EXISTS "Admins can view all assets" ON public.assets;
DROP POLICY IF EXISTS "Authenticated users can create assets" ON public.assets;
DROP POLICY IF EXISTS "Users can update own assets" ON public.assets;
DROP POLICY IF EXISTS "Admins can update any asset" ON public.assets;
DROP POLICY IF EXISTS "Admins can delete any asset" ON public.assets;

-- Create a helper function to check if current user is admin
-- This function is SECURITY DEFINER to bypass RLS and prevent infinite recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES RLS POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- Admins can insert profiles (for user creation)
CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin());

-- Admins can update profiles
CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- ============================================================================
-- CATEGORIES RLS POLICIES
-- ============================================================================

-- All authenticated users can view categories
CREATE POLICY "Authenticated users can view categories"
  ON public.categories FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admins can insert categories
CREATE POLICY "Admins can insert categories"
  ON public.categories FOR INSERT
  WITH CHECK (public.is_admin());

-- Admins can update categories
CREATE POLICY "Admins can update categories"
  ON public.categories FOR UPDATE
  USING (public.is_admin());

-- Admins can delete categories
CREATE POLICY "Admins can delete categories"
  ON public.categories FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- DEPARTMENTS RLS POLICIES
-- ============================================================================

-- All authenticated users can view departments
CREATE POLICY "Authenticated users can view departments"
  ON public.departments FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admins can insert departments
CREATE POLICY "Admins can insert departments"
  ON public.departments FOR INSERT
  WITH CHECK (public.is_admin());

-- Admins can update departments
CREATE POLICY "Admins can update departments"
  ON public.departments FOR UPDATE
  USING (public.is_admin());

-- Admins can delete departments
CREATE POLICY "Admins can delete departments"
  ON public.departments FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- ASSETS RLS POLICIES
-- ============================================================================

-- Users can view their own assets
CREATE POLICY "Users can view own assets"
  ON public.assets FOR SELECT
  USING (created_by = auth.uid());

-- Admins can view all assets
CREATE POLICY "Admins can view all assets"
  ON public.assets FOR SELECT
  USING (public.is_admin());

-- Authenticated users can create assets (will be associated with their user ID)
CREATE POLICY "Authenticated users can create assets"
  ON public.assets FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Users can update their own assets
CREATE POLICY "Users can update own assets"
  ON public.assets FOR UPDATE
  USING (created_by = auth.uid());

-- Admins can update any asset
CREATE POLICY "Admins can update any asset"
  ON public.assets FOR UPDATE
  USING (public.is_admin());

-- Admins can delete any asset
CREATE POLICY "Admins can delete any asset"
  ON public.assets FOR DELETE
  USING (public.is_admin());
