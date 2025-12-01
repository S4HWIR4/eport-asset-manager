import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { createClient } from '@supabase/supabase-js';

// Feature: asset-deletion-workflow, Property 6: Status filtering correctness

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
let testAdminUserId: string;
let testRegularUserId: string;

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

describe('Deletion Request Status Filtering Properties', () => {
  beforeAll(async () => {
    // Create test admin user
    const { data: adminUserData, error: adminUserError } = await supabase.auth.admin.createUser({
      email: `test-admin-filtering-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    if (adminUserError || !adminUserData.user) {
      throw new Error('Failed to create test admin user');
    }

    testAdminUserId = adminUserData.user.id;

    // Create profile for test admin user with admin role
    await supabase.from('profiles').insert({
      id: testAdminUserId,
      email: adminUserData.user.email!,
      role: 'admin',
    });

    // Create test regular user
    const { data: regularUserData, error: regularUserError } = await supabase.auth.admin.createUser({
      email: `test-user-filtering-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    if (regularUserError || !regularUserData.user) {
      throw new Error('Failed to create test regular user');
    }

    testRegularUserId = regularUserData.user.id;

    // Create profile for test regular user
    await supabase.from('profiles').insert({
      id: testRegularUserId,
      email: regularUserData.user.email!,
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
    createdUserIds = [];
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
    if (testRegularUserId) {
      await supabase.auth.admin.deleteUser(testRegularUserId);
    }
    if (testAdminUserId) {
      await supabase.auth.admin.deleteUser(testAdminUserId);
    }
  });

  /**
   * Feature: asset-deletion-workflow, Property 6: Status filtering correctness
   * Validates: Requirements 3.3
   */
  it('Property 6: For any status filter value, the returned deletion requests should only include requests matching that status', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a random distribution of deletion requests with different statuses
        fc.record({
          numPending: fc.integer({ min: 1, max: 2 }),
          numApproved: fc.integer({ min: 1, max: 2 }),
          numRejected: fc.integer({ min: 1, max: 2 }),
          numCancelled: fc.integer({ min: 1, max: 2 }),
        }),
        async ({ numPending, numApproved, numRejected, numCancelled }) => {
          const allRequestIds: string[] = [];
          const requestsByStatus: Record<string, string[]> = {
            pending: [],
            approved: [],
            rejected: [],
            cancelled: [],
          };

          // Helper function to create a deletion request with a specific status
          async function createRequestWithStatus(status: 'pending' | 'approved' | 'rejected' | 'cancelled') {
            // Create an asset
            const { data: asset, error: assetError } = await supabase
              .from('assets')
              .insert({
                name: `Asset ${status} ${Date.now()}-${Math.random()}`,
                category_id: testCategoryId,
                department_id: testDepartmentId,
                date_purchased: '2024-01-01',
                cost: 100.00,
                created_by: testRegularUserId,
              })
              .select()
              .single();

            if (assetError || !asset) {
              throw new Error(`Failed to create asset for ${status} request`);
            }

            createdAssetIds.push(asset.id);

            // Create deletion request with the specified status
            const requestData: any = {
              asset_id: asset.id,
              asset_name: asset.name,
              asset_cost: asset.cost,
              requested_by: testRegularUserId,
              requester_email: `test-user-filtering-${Date.now()}@example.com`,
              justification: `Justification for ${status} request`,
              status: status,
            };

            // For reviewed statuses, add reviewer information
            if (status === 'approved' || status === 'rejected') {
              requestData.reviewed_by = testAdminUserId;
              requestData.reviewer_email = `test-admin-filtering-${Date.now()}@example.com`;
              requestData.review_comment = `Review comment for ${status}`;
              requestData.reviewed_at = new Date().toISOString();
            }

            const { data: request, error: requestError } = await supabase
              .from('deletion_requests')
              .insert(requestData)
              .select()
              .single();

            if (requestError || !request) {
              throw new Error(`Failed to create ${status} deletion request`);
            }

            createdDeletionRequestIds.push(request.id);
            allRequestIds.push(request.id);
            requestsByStatus[status].push(request.id);

            // Note: We don't delete the asset for approved requests in this test
            // because the deletion_requests table has ON DELETE CASCADE,
            // which would remove the deletion request record when the asset is deleted.
            // In the real application, the asset is deleted as part of the approval process,
            // but for testing filtering, we need the deletion request records to persist.
          }

          // Create pending requests
          for (let i = 0; i < numPending; i++) {
            await createRequestWithStatus('pending');
          }

          // Create approved requests
          for (let i = 0; i < numApproved; i++) {
            await createRequestWithStatus('approved');
          }

          // Create rejected requests
          for (let i = 0; i < numRejected; i++) {
            await createRequestWithStatus('rejected');
          }

          // Create cancelled requests
          for (let i = 0; i < numCancelled; i++) {
            await createRequestWithStatus('cancelled');
          }

          // Test filtering by each status
          const statuses: Array<'pending' | 'approved' | 'rejected' | 'cancelled'> = ['pending', 'approved', 'rejected', 'cancelled'];

          for (const filterStatus of statuses) {
            // Query deletion requests filtered by status
            const { data: filteredRequests, error: queryError } = await supabase
              .from('deletion_requests')
              .select('id, status')
              .in('id', allRequestIds)
              .eq('status', filterStatus);

            if (queryError) {
              throw new Error(`Failed to query deletion requests with status ${filterStatus}: ${queryError.message}`);
            }

            // Verify all returned requests have the correct status
            expect(filteredRequests).toBeTruthy();
            
            if (filteredRequests && filteredRequests.length > 0) {
              expect(filteredRequests.every(r => r.status === filterStatus)).toBe(true);
            }

            // Verify the count matches the expected count
            const expectedCount = requestsByStatus[filterStatus].length;
            expect(filteredRequests?.length).toBe(expectedCount);

            // Verify all expected request IDs are present
            const returnedIds = new Set(filteredRequests?.map(r => r.id) || []);
            const expectedIds = new Set(requestsByStatus[filterStatus]);
            expect(returnedIds.size).toBe(expectedIds.size);
            
            for (const expectedId of expectedIds) {
              expect(returnedIds.has(expectedId)).toBe(true);
            }
          }

          // Also test querying without a status filter (should return all)
          const { data: allRequests, error: allQueryError } = await supabase
            .from('deletion_requests')
            .select('id, status')
            .in('id', allRequestIds);

          if (allQueryError) {
            throw new Error('Failed to query all deletion requests');
          }

          // Verify all requests are returned when no filter is applied
          expect(allRequests?.length).toBe(allRequestIds.length);

          // Verify the distribution of statuses matches what we created
          const statusCounts = {
            pending: allRequests?.filter(r => r.status === 'pending').length || 0,
            approved: allRequests?.filter(r => r.status === 'approved').length || 0,
            rejected: allRequests?.filter(r => r.status === 'rejected').length || 0,
            cancelled: allRequests?.filter(r => r.status === 'cancelled').length || 0,
          };

          expect(statusCounts.pending).toBe(numPending);
          expect(statusCounts.approved).toBe(numApproved);
          expect(statusCounts.rejected).toBe(numRejected);
          expect(statusCounts.cancelled).toBe(numCancelled);
        }
      ),
      { numRuns: 50 }
    );
  }, 600000); // 10 minute timeout for property-based test
});
