# Unique Pending Constraint Migration

## Overview
This migration adds a database-level constraint to enforce the business rule that only one pending deletion request can exist per asset at any given time.

## Business Rule
**Property 19: One active request per asset**
- For any asset, there should be at most one deletion request with status 'pending' at any given time
- This prevents duplicate pending requests and ensures clear workflow state

## Implementation

### Database Constraint
```sql
CREATE UNIQUE INDEX idx_one_pending_per_asset 
  ON public.deletion_requests(asset_id) 
  WHERE status = 'pending';
```

This is a **partial unique index** that:
- Only applies to rows where `status = 'pending'`
- Allows multiple requests per asset with other statuses (approved, rejected, cancelled)
- Enforces uniqueness at the database level, preventing race conditions

### Migration Files
1. **20241128000007_deletion_requests.sql** - Updated to include the constraint
2. **20241128000008_add_unique_pending_constraint.sql** - Standalone migration for existing databases

## Why This Matters

### Before the Constraint
- Application code checked for existing pending requests
- Direct database operations could bypass this check
- Race conditions could create duplicate pending requests
- Property test revealed this gap

### After the Constraint
- Database enforces the rule at the lowest level
- Impossible to create duplicate pending requests
- Application code check still provides better error messages
- Property test now passes with 100 iterations

## Testing
The constraint is validated by property-based test:
- **Test**: `tests/deletion-request-creation-properties.test.ts`
- **Property 19**: Verifies at most one pending request per asset
- **Runs**: 100 iterations with random data
- **Status**: ✅ Passing

## Application Impact
- The `submitDeletionRequest()` action already checks for duplicates
- Users will see a friendly error message before hitting the database constraint
- The constraint acts as a safety net for edge cases and direct database operations
- No changes needed to application code

## Rollback
If needed, the constraint can be removed with:
```sql
DROP INDEX IF EXISTS public.idx_one_pending_per_asset;
```

However, this would remove an important data integrity guarantee.
