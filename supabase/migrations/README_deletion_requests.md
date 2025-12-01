# Deletion Requests Migration

## Overview

This migration creates the `deletion_requests` table and associated infrastructure for the asset deletion workflow feature. This table enables a request-approval process where regular users submit deletion requests with justification, and administrators review and approve or reject these requests.

## Migration File

`20241128000007_deletion_requests.sql`

## What This Migration Creates

### 1. Table: `deletion_requests`

A table to store all asset deletion requests with the following structure:

#### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier for the deletion request |
| `asset_id` | UUID | NOT NULL, FK to assets(id) ON DELETE CASCADE | Reference to the asset being requested for deletion |
| `asset_name` | TEXT | NOT NULL | Denormalized asset name (preserved after asset deletion) |
| `asset_cost` | DECIMAL(12,2) | NOT NULL | Denormalized asset cost (preserved after asset deletion) |
| `requested_by` | UUID | NOT NULL, FK to profiles(id) ON DELETE CASCADE | User who submitted the deletion request |
| `requester_email` | TEXT | NOT NULL | Denormalized requester email (preserved for audit trail) |
| `justification` | TEXT | NOT NULL, CHECK (length >= 10) | Reason for deletion (minimum 10 characters) |
| `status` | TEXT | NOT NULL, CHECK (IN 'pending', 'approved', 'rejected', 'cancelled'), DEFAULT 'pending' | Current status of the request |
| `reviewed_by` | UUID | NULLABLE, FK to profiles(id) ON DELETE SET NULL | Admin who reviewed the request |
| `reviewer_email` | TEXT | NULLABLE | Denormalized reviewer email |
| `review_comment` | TEXT | NULLABLE | Optional comment from reviewer |
| `reviewed_at` | TIMESTAMPTZ | NULLABLE | Timestamp when request was reviewed |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | When the request was created |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

#### Denormalized Fields

The following fields are denormalized (duplicated from other tables) to preserve historical data after asset deletion:
- `asset_name` - Preserved even after asset is deleted
- `asset_cost` - Preserved for audit purposes
- `requester_email` - Preserved even if user is deleted
- `reviewer_email` - Preserved even if admin is deleted

### 2. Indexes

Five indexes are created for optimal query performance:

1. `idx_deletion_requests_status` - Fast filtering by status (pending, approved, etc.)
2. `idx_deletion_requests_asset_id` - Quick lookup of requests for a specific asset
3. `idx_deletion_requests_requested_by` - Fast retrieval of user's own requests
4. `idx_deletion_requests_created_at` - Efficient sorting by submission date (DESC)
5. `idx_deletion_requests_reviewed_by` - Quick lookup of requests reviewed by an admin

### 3. Trigger

**`set_updated_at_deletion_requests`**
- Automatically updates the `updated_at` column whenever a row is modified
- Uses the existing `public.handle_updated_at()` function

### 4. Row Level Security (RLS)

RLS is enabled on the table with five policies:

#### Policy 1: "Users can view own deletion requests"
- **Operation**: SELECT
- **Condition**: `auth.uid() = requested_by`
- **Purpose**: Users can only see their own deletion requests

#### Policy 2: "Users can create deletion requests"
- **Operation**: INSERT
- **Condition**: `auth.uid() = requested_by`
- **Purpose**: Users can only create requests for themselves

#### Policy 3: "Users can cancel own pending requests"
- **Operation**: UPDATE
- **Condition**: `auth.uid() = requested_by AND status = 'pending'`
- **Check**: `status = 'cancelled'`
- **Purpose**: Users can only cancel their own pending requests

#### Policy 4: "Admins can view all deletion requests"
- **Operation**: SELECT
- **Condition**: `public.is_admin()`
- **Purpose**: Admins can see all deletion requests from all users

#### Policy 5: "Admins can review deletion requests"
- **Operation**: UPDATE
- **Condition**: `public.is_admin()`
- **Purpose**: Admins can approve or reject any deletion request

## Dependencies

This migration depends on:
- `public.assets` table (must exist)
- `public.profiles` table (must exist)
- `public.handle_updated_at()` function (must exist)
- `public.is_admin()` function (must exist)

All dependencies are created by previous migrations in this project.

## How to Apply

### Option 1: Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy the entire contents of `20241128000007_deletion_requests.sql`
6. Paste into the editor
7. Click **Run**

### Option 2: Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Link your project (first time only)
supabase link --project-ref your-project-ref

# Push all pending migrations
supabase db push
```

### Option 3: Verification Script

```bash
# Run the verification script
node scripts/apply-deletion-requests-migration.mjs
```

This script will:
- Validate the migration file structure
- Check if the migration has been applied
- Provide instructions if not applied

## Verification

After applying the migration, verify it was successful:

### Check Table Exists

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'deletion_requests';
```

### Check Indexes

```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'deletion_requests';
```

### Check RLS Policies

```sql
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'deletion_requests';
```

### Test Insert (as authenticated user)

```sql
-- This should work if you're authenticated
INSERT INTO deletion_requests (
  asset_id, 
  asset_name, 
  asset_cost, 
  requested_by, 
  requester_email, 
  justification
) VALUES (
  'some-asset-uuid',
  'Test Asset',
  100.00,
  auth.uid(),
  'user@example.com',
  'This is a test justification with more than 10 characters'
);
```

## Rollback

If you need to rollback this migration:

```sql
-- Drop all policies
DROP POLICY IF EXISTS "Users can view own deletion requests" ON public.deletion_requests;
DROP POLICY IF EXISTS "Users can create deletion requests" ON public.deletion_requests;
DROP POLICY IF EXISTS "Users can cancel own pending requests" ON public.deletion_requests;
DROP POLICY IF EXISTS "Admins can view all deletion requests" ON public.deletion_requests;
DROP POLICY IF EXISTS "Admins can review deletion requests" ON public.deletion_requests;

-- Drop trigger
DROP TRIGGER IF EXISTS set_updated_at_deletion_requests ON public.deletion_requests;

-- Drop indexes (will be dropped automatically with table, but listed for reference)
DROP INDEX IF EXISTS idx_deletion_requests_status;
DROP INDEX IF EXISTS idx_deletion_requests_asset_id;
DROP INDEX IF EXISTS idx_deletion_requests_requested_by;
DROP INDEX IF EXISTS idx_deletion_requests_created_at;
DROP INDEX IF EXISTS idx_deletion_requests_reviewed_by;

-- Drop table
DROP TABLE IF EXISTS public.deletion_requests;
```

## Testing

A test suite is available to verify the migration file structure:

```bash
npm test -- tests/deletion-requests-migration.test.ts
```

This test verifies:
- ✅ Table creation statement exists
- ✅ All required columns are present
- ✅ Constraints are properly defined
- ✅ Foreign keys are correctly configured
- ✅ All indexes are created
- ✅ Trigger is set up
- ✅ RLS is enabled
- ✅ All policies are created with correct conditions

## Next Steps

After applying this migration:

1. **Update TypeScript Types** - Add `DeletionRequest` interface to `types/database.ts`
2. **Create Server Actions** - Implement CRUD operations in `app/actions/deletion-requests.ts`
3. **Build UI Components** - Create user and admin interfaces for the workflow
4. **Add Audit Logging** - Update audit log actions to include deletion request events
5. **Write Tests** - Create unit and property-based tests for the new functionality

## Related Files

- Migration: `supabase/migrations/20241128000007_deletion_requests.sql`
- Verification Script: `scripts/apply-deletion-requests-migration.mjs`
- Test Suite: `tests/deletion-requests-migration.test.ts`
- Design Document: `.kiro/specs/asset-deletion-workflow/design.md`
- Requirements: `.kiro/specs/asset-deletion-workflow/requirements.md`
- Tasks: `.kiro/specs/asset-deletion-workflow/tasks.md`
