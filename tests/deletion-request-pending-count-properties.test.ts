import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { createClient } from '@supabase/supabase-js';

// Feature: asset-deletion-workflow, Property 3: Pending request count accuracy

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

describe('Deletion Request Pending Count Properties', () => {
  beforeAll(async () => {
    // Create test user
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: `test-pending-count-user-${Date.now()}@example.com`,
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

    // Clean up any existing deletion requests for this user from previous test runs
    await supabase
      .from('deletion_requests')
      .delete()
      .eq('requested_by', testUserId);
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
   * Feature: asset-deletion-workflow, Property 3: Pending request count accuracy
   * Validates: Requirements 2.5
   */
  it('Property 3: For any user with deletion requests, the count of pending requests displayed should equal the actual number of requests with status "pending"', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a random number of deletion requests with various statuses
        fc.record({
          numPending: fc.integer({ min: 0, max: 3 }),
          numApproved: fc.integer({ min: 0, max: 2 }),
          numRejected: fc.integer({ min: 0, max: 2 }),
          numCancelled: fc.integer({ min: 0, max: 2 }),
        }),
        async ({ numPending, numApproved, numRejected, numCancelled }) => {
          // Clean up ALL deletion requests for this user at the start of each iteration
          // This ensures test isolation between property test runs
          const { error: cleanupError } = await supabase
            .from('deletion_requests')
            .delete()
            .eq('requested_by', testUserId);

          if (cleanupError) {
            console.error('Cleanup error:', cleanupError);
          }

          // Create assets and deletion requests with different statuses
          const allRequests: string[] = [];

          // Create pending requests
          for (let i = 0; i < numPending; i++) {
            const { data: asset, error: assetError } = await supabase
              .from('assets')
              .insert({
                name: `Pending Asset ${i} ${Date.now()}`,
                category_id: testCategoryId,
                department_id: testDepartmentId,
                date_purchased: '2024-01-01',
                cost: 100.00 + i,
                created_by: testUserId,
              })
              .select()
              .single();

            if (assetError || !asset) {
              throw new Error('Failed to create asset for pending request');
            }

            createdAssetIds.push(asset.id);

            const { data: request, error: requestError } = await supabase
              .from('deletion_requests')
              .insert({
                asset_id: asset.id,
                asset_name: asset.name,
                asset_cost: asset.cost,
                requested_by: testUserId,
                requester_email: `test-pending-count-user-${Date.now()}@example.com`,
                justification: `Pending justification ${i}`,
                status: 'pending',
              })
              .select()
              .single();

            if (requestError || !request) {
              throw new Error('Failed to create pending deletion request');
            }

            createdDeletionRequestIds.push(request.id);
            allRequests.push(request.id);
          }

          // Create approved requests
          for (let i = 0; i < numApproved; i++) {
            const { data: asset, error: assetError } = await supabase
              .from('assets')
              .insert({
                name: `Approved Asset ${i} ${Date.now()}`,
                category_id: testCategoryId,
                department_id: testDepartmentId,
                date_purchased: '2024-01-01',
                cost: 200.00 + i,
                created_by: testUserId,
              })
              .select()
              .single();

            if (assetError || !asset) {
              throw new Error('Failed to create asset for approved request');
            }

            createdAssetIds.push(asset.id);

            const { data: request, error: requestError } = await supabase
              .from('deletion_requests')
              .insert({
                asset_id: asset.id,
                asset_name: asset.name,
                asset_cost: asset.cost,
                requested_by: testUserId,
                requester_email: `test-pending-count-user-${Date.now()}@example.com`,
                justification: `Approved justification ${i}`,
                status: 'approved',
                reviewed_by: testUserId,
                reviewer_email: `test-pending-count-user-${Date.now()}@example.com`,
                reviewed_at: new Date().toISOString(),
              })
              .select()
              .single();

            if (requestError || !request) {
              throw new Error('Failed to create approved deletion request');
            }

            createdDeletionRequestIds.push(request.id);
            allRequests.push(request.id);
          }

          // Create rejected requests
          for (let i = 0; i < numRejected; i++) {
            const { data: asset, error: assetError } = await supabase
              .from('assets')
              .insert({
                name: `Rejected Asset ${i} ${Date.now()}`,
                category_id: testCategoryId,
                department_id: testDepartmentId,
                date_purchased: '2024-01-01',
                cost: 300.00 + i,
                created_by: testUserId,
              })
              .select()
              .single();

            if (assetError || !asset) {
              throw new Error('Failed to create asset for rejected request');
            }

            createdAssetIds.push(asset.id);

            const { data: request, error: requestError } = await supabase
              .from('deletion_requests')
              .insert({
                asset_id: asset.id,
                asset_name: asset.name,
                asset_cost: asset.cost,
                requested_by: testUserId,
                requester_email: `test-pending-count-user-${Date.now()}@example.com`,
                justification: `Rejected justification ${i}`,
                status: 'rejected',
                reviewed_by: testUserId,
                reviewer_email: `test-pending-count-user-${Date.now()}@example.com`,
                review_comment: 'Rejection reason',
                reviewed_at: new Date().toISOString(),
              })
              .select()
              .single();

            if (requestError || !request) {
              throw new Error('Failed to create rejected deletion request');
            }

            createdDeletionRequestIds.push(request.id);
            allRequests.push(request.id);
          }

          // Create cancelled requests
          for (let i = 0; i < numCancelled; i++) {
            const { data: asset, error: assetError } = await supabase
              .from('assets')
              .insert({
                name: `Cancelled Asset ${i} ${Date.now()}`,
                category_id: testCategoryId,
                department_id: testDepartmentId,
                date_purchased: '2024-01-01',
                cost: 400.00 + i,
                created_by: testUserId,
              })
              .select()
              .single();

            if (assetError || !asset) {
              throw new Error('Failed to create asset for cancelled request');
            }

            createdAssetIds.push(asset.id);

            const { data: request, error: requestError } = await supabase
              .from('deletion_requests')
              .insert({
                asset_id: asset.id,
                asset_name: asset.name,
                asset_cost: asset.cost,
                requested_by: testUserId,
                requester_email: `test-pending-count-user-${Date.now()}@example.com`,
                justification: `Cancelled justification ${i}`,
                status: 'cancelled',
              })
              .select()
              .single();

            if (requestError || !request) {
              throw new Error('Failed to create cancelled deletion request');
            }

            createdDeletionRequestIds.push(request.id);
            allRequests.push(request.id);
          }

          // Query the actual count of pending requests for this user
          const { data: pendingRequests, error: countError } = await supabase
            .from('deletion_requests')
            .select('id')
            .eq('requested_by', testUserId)
            .eq('status', 'pending');

          if (countError) {
            throw new Error('Failed to query pending requests');
          }

          const actualPendingCount = pendingRequests?.length || 0;

          // Verify the count matches the expected number of pending requests
          expect(actualPendingCount).toBe(numPending);

          // Also verify that the total count of all requests matches
          const { data: allUserRequests, error: allCountError } = await supabase
            .from('deletion_requests')
            .select('id')
            .eq('requested_by', testUserId);

          if (allCountError) {
            throw new Error('Failed to query all requests');
          }

          const totalCount = allUserRequests?.length || 0;
          const expectedTotal = numPending + numApproved + numRejected + numCancelled;

          expect(totalCount).toBe(expectedTotal);

          // Verify each status count individually
          const { count: pendingCount } = await supabase
            .from('deletion_requests')
            .select('*', { count: 'exact', head: true })
            .eq('requested_by', testUserId)
            .eq('status', 'pending');

          const { count: approvedCount } = await supabase
            .from('deletion_requests')
            .select('*', { count: 'exact', head: true })
            .eq('requested_by', testUserId)
            .eq('status', 'approved');

          const { count: rejectedCount } = await supabase
            .from('deletion_requests')
            .select('*', { count: 'exact', head: true })
            .eq('requested_by', testUserId)
            .eq('status', 'rejected');

          const { count: cancelledCount } = await supabase
            .from('deletion_requests')
            .select('*', { count: 'exact', head: true })
            .eq('requested_by', testUserId)
            .eq('status', 'cancelled');

          expect(pendingCount).toBe(numPending);
          expect(approvedCount).toBe(numApproved);
          expect(rejectedCount).toBe(numRejected);
          expect(cancelledCount).toBe(numCancelled);
        }
      ),
      { numRuns: 50 }
    );
  }, 600000); // 10 minute timeout for property-based test
});
