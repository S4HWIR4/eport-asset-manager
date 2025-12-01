import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { createClient } from '@supabase/supabase-js';

// Feature: asset-deletion-workflow, Property 7: Date sorting correctness

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

describe('Deletion Request Date Sorting Properties', () => {
  beforeAll(async () => {
    // Create test admin user
    const { data: adminUserData, error: adminUserError } = await supabase.auth.admin.createUser({
      email: `test-admin-sorting-${Date.now()}@example.com`,
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
      email: `test-user-sorting-${Date.now()}@example.com`,
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

    // Create test category with unique name
    const categoryName = `Test Category Sorting ${Date.now()}-${Math.random()}`;
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .insert({ name: categoryName })
      .select()
      .single();

    if (categoryError || !category) {
      console.error('Category creation error:', categoryError);
      throw new Error(`Failed to create test category: ${categoryError?.message || 'Unknown error'}`);
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
   * Feature: asset-deletion-workflow, Property 7: Date sorting correctness
   * Validates: Requirements 3.4
   */
  it('Property 7: For any set of deletion requests, sorting by submission date should return requests in chronological order (newest or oldest first)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a random number of deletion requests
        fc.record({
          numRequests: fc.integer({ min: 2, max: 5 }),
        }),
        async ({ numRequests }) => {
          const requestsWithTimestamps: Array<{ id: string; created_at: Date }> = [];
          const localRequestIds: string[] = []; // Track IDs for this specific test iteration

          // Create deletion requests with deliberate time gaps
          for (let i = 0; i < numRequests; i++) {
            // Create an asset
            const { data: asset, error: assetError } = await supabase
              .from('assets')
              .insert({
                name: `Asset ${i} ${Date.now()}-${Math.random()}`,
                category_id: testCategoryId,
                department_id: testDepartmentId,
                date_purchased: '2024-01-01',
                cost: 100.00 + i,
                created_by: testRegularUserId,
              })
              .select()
              .single();

            if (assetError || !asset) {
              throw new Error(`Failed to create asset ${i}`);
            }

            createdAssetIds.push(asset.id);

            // Create deletion request
            const { data: request, error: requestError } = await supabase
              .from('deletion_requests')
              .insert({
                asset_id: asset.id,
                asset_name: asset.name,
                asset_cost: asset.cost,
                requested_by: testRegularUserId,
                requester_email: `test-user-sorting-${Date.now()}@example.com`,
                justification: `Justification for request ${i}`,
                status: 'pending',
              })
              .select()
              .single();

            if (requestError || !request) {
              throw new Error(`Failed to create deletion request ${i}`);
            }

            createdDeletionRequestIds.push(request.id);
            localRequestIds.push(request.id); // Track in local array
            requestsWithTimestamps.push({
              id: request.id,
              created_at: new Date(request.created_at),
            });

            // Add a small delay to ensure different timestamps
            // This is important for testing sorting
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          // Test sorting by created_at descending (newest first)
          const { data: descendingRequests, error: descError } = await supabase
            .from('deletion_requests')
            .select('id, created_at')
            .in('id', localRequestIds) // Use local array instead
            .order('created_at', { ascending: false });

          if (descError) {
            throw new Error('Failed to query deletion requests with descending sort');
          }

          expect(descendingRequests).toBeTruthy();
          
          // If we didn't get all requests, log for debugging
          if (descendingRequests?.length !== numRequests) {
            console.log(`Expected ${numRequests} requests, got ${descendingRequests?.length}`);
            console.log('Local IDs:', localRequestIds);
            console.log('Returned IDs:', descendingRequests?.map(r => r.id));
          }
          
          expect(descendingRequests?.length).toBe(numRequests);

          // Verify descending order (newest first)
          if (descendingRequests && descendingRequests.length > 1) {
            for (let i = 0; i < descendingRequests.length - 1; i++) {
              const current = new Date(descendingRequests[i].created_at);
              const next = new Date(descendingRequests[i + 1].created_at);
              
              // Current should be greater than or equal to next (newer or same time)
              expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
            }
          }

          // Test sorting by created_at ascending (oldest first)
          const { data: ascendingRequests, error: ascError } = await supabase
            .from('deletion_requests')
            .select('id, created_at')
            .in('id', localRequestIds) // Use local array instead
            .order('created_at', { ascending: true });

          if (ascError) {
            throw new Error('Failed to query deletion requests with ascending sort');
          }

          expect(ascendingRequests).toBeTruthy();
          expect(ascendingRequests?.length).toBe(numRequests);

          // Verify ascending order (oldest first)
          if (ascendingRequests && ascendingRequests.length > 1) {
            for (let i = 0; i < ascendingRequests.length - 1; i++) {
              const current = new Date(ascendingRequests[i].created_at);
              const next = new Date(ascendingRequests[i + 1].created_at);
              
              // Current should be less than or equal to next (older or same time)
              expect(current.getTime()).toBeLessThanOrEqual(next.getTime());
            }
          }

          // Verify that descending and ascending are reverse of each other
          const descendingIds = descendingRequests?.map(r => r.id) || [];
          const ascendingIds = ascendingRequests?.map(r => r.id) || [];
          const reversedDescending = [...descendingIds].reverse();

          expect(ascendingIds).toEqual(reversedDescending);

          // Verify all created requests are present in both sorted results
          const descendingIdSet = new Set(descendingIds);
          const ascendingIdSet = new Set(ascendingIds);

          for (const requestId of localRequestIds) {
            expect(descendingIdSet.has(requestId)).toBe(true);
            expect(ascendingIdSet.has(requestId)).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  }, 600000); // 10 minute timeout for property-based test
});
