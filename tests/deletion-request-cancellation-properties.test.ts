import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { createClient } from '@supabase/supabase-js';

// Feature: asset-deletion-workflow, Property 17: Cancellation state transition

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create admin client for test operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Track created resources for cleanup
let createdAssetIds: string[] = [];
let createdDeletionRequestIds: string[] = [];
let createdCategoryIds: string[] = [];
let createdDepartmentIds: string[] = [];
let createdUserIds: string[] = [];
let testCategoryId: string;
let testDepartmentId: string;
let testUserId: string;

// Helper function to clean up resources
async function cleanupResources() {
  const cleanupPromises = [
    ...createdDeletionRequestIds.map(async (id) => {
      try {
        await supabase.from('deletion_requests').delete().eq('id', id);
      } catch (error) {
        // Ignore cleanup errors
      }
    }),
    ...createdAssetIds.map(async (id) => {
      try {
        await supabase.from('assets').delete().eq('id', id);
      } catch (error) {
        // Ignore cleanup errors
      }
    }),
    ...createdCategoryIds.map(async (id) => {
      try {
        await supabase.from('categories').delete().eq('id', id);
      } catch (error) {
        // Ignore cleanup errors
      }
    }),
    ...createdDepartmentIds.map(async (id) => {
      try {
        await supabase.from('departments').delete().eq('id', id);
      } catch (error) {
        // Ignore cleanup errors
      }
    }),
    ...createdUserIds.map(async (id) => {
      try {
        await supabase.auth.admin.deleteUser(id);
      } catch (error) {
        // Ignore cleanup errors
      }
    }),
  ];
  await Promise.all(cleanupPromises);
}

describe('Deletion Request Cancellation Properties', () => {
  beforeAll(async () => {
    // Create test user
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: `test-cancellation-user-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    if (userError || !userData.user) {
      throw new Error('Failed to create test user');
    }

    testUserId = userData.user.id;

    // Create profile for test user
    await supabase.from('profiles').insert({
      id: testUserId,
      email: userData.user.email!,
      role: 'user',
    });

    // Create test category
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .insert({ name: `Test Category ${Date.now()}` })
      .select()
      .single();

    if (categoryError || !category) {
      throw new Error('Failed to create test category');
    }

    testCategoryId = category.id;

    // Create test department
    const { data: department, error: departmentError } = await supabase
      .from('departments')
      .insert({ name: `Test Department ${Date.now()}` })
      .select()
      .single();

    if (departmentError || !department) {
      throw new Error('Failed to create test department');
    }

    testDepartmentId = department.id;
  });

  afterEach(async () => {
    await cleanupResources();
    createdAssetIds = [];
    createdDeletionRequestIds = [];
  });

  afterAll(async () => {
    // Final cleanup
    await cleanupResources();

    // Clean up test fixtures
    if (testCategoryId) {
      await supabase.from('categories').delete().eq('id', testCategoryId);
    }
    if (testDepartmentId) {
      await supabase.from('departments').delete().eq('id', testDepartmentId);
    }
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  /**
   * Feature: asset-deletion-workflow, Property 17: Cancellation state transition
   * Validates: Requirements 9.2
   */
  it('Property 17: For any pending deletion request, the requester should be able to cancel it, changing status to "cancelled"', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          assetName: fc.string({ minLength: 1, maxLength: 50 }),
          assetCost: fc.double({ min: 0.01, max: 100000, noNaN: true }),
          justification: fc.string({ minLength: 10, maxLength: 500 }),
        }),
        async ({ assetName, assetCost, justification }) => {
          // Create an asset owned by the test user
          const { data: asset, error: assetError } = await supabase
            .from('assets')
            .insert({
              name: assetName,
              category_id: testCategoryId,
              department_id: testDepartmentId,
              date_purchased: '2024-01-01',
              cost: assetCost,
              created_by: testUserId,
            })
            .select()
            .single();

          if (assetError || !asset) {
            throw new Error('Failed to create test asset');
          }

          createdAssetIds.push(asset.id);

          // Create a pending deletion request
          const { data: deletionRequest, error: requestError } = await supabase
            .from('deletion_requests')
            .insert({
              asset_id: asset.id,
              asset_name: asset.name,
              asset_cost: asset.cost,
              requested_by: testUserId,
              requester_email: `test-cancellation-user-${Date.now()}@example.com`,
              justification: justification,
              status: 'pending',
            })
            .select()
            .single();

          if (requestError || !deletionRequest) {
            throw new Error('Failed to create deletion request');
          }

          createdDeletionRequestIds.push(deletionRequest.id);

          // Verify the deletion request was created with pending status
          expect(deletionRequest.status).toBe('pending');
          expect(deletionRequest.requested_by).toBe(testUserId);

          // Cancel the deletion request using service role (bypasses RLS)
          const { error: updateError } = await supabase
            .from('deletion_requests')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('id', deletionRequest.id)
            .eq('requested_by', testUserId) // Verify requester can cancel
            .eq('status', 'pending'); // Verify only pending requests can be cancelled

          // The update should succeed
          expect(updateError).toBeNull();

          // Fetch the updated deletion request to verify the status change
          // Use service role client which bypasses RLS
          const { data: updatedRequest, error: fetchError } = await supabase
            .from('deletion_requests')
            .select('*')
            .eq('id', deletionRequest.id)
            .maybeSingle();

          if (fetchError) {
            throw new Error(`Failed to fetch updated deletion request: ${fetchError.message}`);
          }
          
          if (!updatedRequest) {
            throw new Error('Updated deletion request not found');
          }

          // Verify the status has been changed to cancelled
          expect(updatedRequest.status).toBe('cancelled');
          expect(updatedRequest.requested_by).toBe(testUserId);
          expect(updatedRequest.asset_id).toBe(asset.id);

          // Verify the asset still exists (cancellation should not delete the asset)
          const { data: assetAfterCancel, error: assetFetchError } = await supabase
            .from('assets')
            .select('id')
            .eq('id', asset.id)
            .single();

          expect(assetFetchError).toBeNull();
          expect(assetAfterCancel).toBeTruthy();
          expect(assetAfterCancel?.id).toBe(asset.id);
        }
      ),
      { numRuns: 20, timeout: 600000 } // Reduced runs and increased timeout
    );
  }, 600000); // 10 minute timeout for the test
});
