import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Deletion Requests Migration', () => {
  const migrationPath = join(process.cwd(), 'supabase', 'migrations', '20241128000007_deletion_requests.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');

  it('should contain CREATE TABLE statement', () => {
    expect(migrationSQL).toContain('CREATE TABLE public.deletion_requests');
  });

  it('should have all required columns', () => {
    const requiredColumns = [
      'id UUID PRIMARY KEY',
      'asset_id UUID NOT NULL',
      'asset_name TEXT NOT NULL',
      'asset_cost DECIMAL',
      'requested_by UUID NOT NULL',
      'requester_email TEXT NOT NULL',
      'justification TEXT NOT NULL',
      'status TEXT NOT NULL',
      'reviewed_by UUID',
      'reviewer_email TEXT',
      'review_comment TEXT',
      'reviewed_at TIMESTAMPTZ',
      'created_at TIMESTAMPTZ',
      'updated_at TIMESTAMPTZ',
    ];

    requiredColumns.forEach((column) => {
      expect(migrationSQL).toContain(column);
    });
  });

  it('should have justification length constraint', () => {
    expect(migrationSQL).toContain('CHECK (length(justification) >= 10)');
  });

  it('should have status constraint with all valid values', () => {
    expect(migrationSQL).toContain("CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'))");
  });

  it('should have foreign key to assets table', () => {
    expect(migrationSQL).toContain('REFERENCES public.assets(id) ON DELETE CASCADE');
  });

  it('should have foreign keys to profiles table', () => {
    expect(migrationSQL).toContain('REFERENCES public.profiles(id) ON DELETE CASCADE');
    expect(migrationSQL).toContain('REFERENCES public.profiles(id) ON DELETE SET NULL');
  });

  it('should create all required indexes', () => {
    const indexes = [
      'idx_deletion_requests_status',
      'idx_deletion_requests_asset_id',
      'idx_deletion_requests_requested_by',
      'idx_deletion_requests_created_at',
      'idx_deletion_requests_reviewed_by',
    ];

    indexes.forEach((index) => {
      expect(migrationSQL).toContain(`CREATE INDEX ${index}`);
    });
  });

  it('should have updated_at trigger', () => {
    expect(migrationSQL).toContain('CREATE TRIGGER set_updated_at_deletion_requests');
    expect(migrationSQL).toContain('BEFORE UPDATE ON public.deletion_requests');
    expect(migrationSQL).toContain('EXECUTE FUNCTION public.handle_updated_at()');
  });

  it('should enable RLS', () => {
    expect(migrationSQL).toContain('ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY');
  });

  it('should create all required RLS policies', () => {
    const policies = [
      'Users can view own deletion requests',
      'Users can create deletion requests',
      'Users can cancel own pending requests',
      'Admins can view all deletion requests',
      'Admins can review deletion requests',
    ];

    policies.forEach((policy) => {
      expect(migrationSQL).toContain(`CREATE POLICY "${policy}"`);
    });
  });

  it('should have user view policy with correct condition', () => {
    expect(migrationSQL).toContain('USING (auth.uid() = requested_by)');
  });

  it('should have user insert policy with correct condition', () => {
    expect(migrationSQL).toContain('WITH CHECK (auth.uid() = requested_by)');
  });

  it('should have user cancel policy with status check', () => {
    expect(migrationSQL).toContain("USING (auth.uid() = requested_by AND status = 'pending')");
    expect(migrationSQL).toContain("WITH CHECK (status = 'cancelled')");
  });

  it('should have admin policies using is_admin() function', () => {
    expect(migrationSQL).toContain('USING (public.is_admin())');
  });

  it('should have default value for status', () => {
    expect(migrationSQL).toContain("DEFAULT 'pending'");
  });

  it('should have default values for timestamps', () => {
    expect(migrationSQL).toContain('DEFAULT NOW()');
    expect(migrationSQL).toContain('DEFAULT gen_random_uuid()');
  });
});
