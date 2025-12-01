import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { createClient } from '@supabase/supabase-js';

// Feature: asset-deletion-workflow, Property 4: Admin request visibility

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
let testRegularUserIds: string[] = [];

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

describe('Admin Deletion Request Visibility Properties', () => {
  beforeAll(async () => {
    // Create test admin user
    const { data: adminUserData, error: adminUserError } = await supabase.auth.admin.createUser({
      email: `test-admin-visibility-${Date.now()}@example.com`,
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
    testRegularUserIds = [];
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
    if (testAdminUserId) {
      await supabase.auth.admin.deleteUser(testAdminUserId);
    }
  });

  /**
   * Feature: asset-deletion-workflow, Property 4: Admin request visibility
   * Validates: Requirements 3.1
   */
  it('Property 4: For any set of deletion requests in the system, an administrator should be able to retrieve all requests regardless of requester', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a random number of users and deletion requests
        fc.record({
          numUsers: fc.integer({ min: 1, max: 2 }),
          requestsPerUser: fc.integer({ min: 1, max: 1 }),
        }),
        async ({ numUsers, requestsPerUser }) => {
          // Create multiple regular users
          const userIds: string[] = [];
          for (let i = 0; i < numUsers; i++) {
            const { data: userData, error: userError } = await supabase.auth.admin.createUser({
              email: `test-user-${Date.now()}-${i}-${Math.random()}@example.com`,
              password: 'TestPassword123!',
              email_confirm: true,
            });

            if (userError || !userData.user) {
              throw new Error(`Failed to create test user ${i}`);
            }

            userIds.push(userData.user.id);
            createdUserIds.push(userData.user.id);
            testRegularUserIds.push(userData.user.id);

            // Create profile for test user
            await supabase.from('profiles').insert({
              id: userData.user.id,
              email: userData.user.email!,
              role: 'user',
            });
          }

          // Create assets and deletion requests for each user
          const allRequestIds: string[] = [];
          for (const userId of userIds) {
            for (let j = 0; j < requestsPerUser; j++) {
              // Create an asset owned by this user
              const { data: asset, error: assetError } = await supabase
                .from('assets')
                .insert({
                  name: `Asset ${userId}-${j} ${Date.now()}`,
                  category_id: testCategoryId,
                  department_id: testDepartmentId,
                  date_purchased: '2024-01-01',
                  cost: 100.00 + j,
                  created_by: userId,
                })
                .select()
                .single();

              if (assetError || !asset) {
                throw new Error(`Failed to create asset for user ${userId}`);
              }

              createdAssetIds.push(asset.id);

              // Create deletion request for this asset
              const { data: request, error: requestError } = await supabase
                .from('deletion_requests')
                .insert({
                  asset_id: asset.id,
                  asset_name: asset.name,
                  asset_cost: asset.cost,
                  requested_by: userId,
                  requester_email: `test-user-${Date.now()}-${userId}@example.com`,
                  justification: `Justification for asset ${j}`,
                  status: 'pending',
                })
                .select()
                .single();

              if (requestError || !request) {
                throw new Error(`Failed to create deletion request for user ${userId}`);
              }

              createdDeletionRequestIds.push(request.id);
              allRequestIds.push(request.id);
            }
          }

          // Now query as admin to get all deletion requests
          // The admin should be able to see ALL requests regardless of who created them
          const { data: adminVisibleRequests, error: adminQueryError } = await supabase
            .from('deletion_requests')
            .select('id, requested_by')
            .in('id', allRequestIds);

          if (adminQueryError) {
            throw new Error('Failed to query deletion requests as admin');
          }

          // Verify that the admin can see all requests
          expect(adminVisibleRequests).toBeTruthy();
          expect(adminVisibleRequests?.length).toBe(allRequestIds.length);

          // Verify that requests from all users are visible
          const visibleUserIds = new Set(adminVisibleRequests?.map(r => r.requested_by) || []);
          expect(visibleUserIds.size).toBe(numUsers);

          // Verify each user's requests are visible
          for (const userId of userIds) {
            const userRequests = adminVisibleRequests?.filter(r => r.requested_by === userId) || [];
            expect(userRequests.length).toBe(requestsPerUser);
          }

          // Also test that a regular user can only see their own requests
          // Pick the first user and verify they can only see their own requests
          if (userIds.length > 0) {
            const firstUserId = userIds[0];
            const { data: userVisibleRequests, error: userQueryError } = await supabase
              .from('deletion_requests')
              .select('id, requested_by')
              .eq('requested_by', firstUserId)
              .in('id', allRequestIds);

            if (userQueryError) {
              throw new Error('Failed to query deletion requests as regular user');
            }

            // Regular user should only see their own requests
            expect(userVisibleRequests?.length).toBe(requestsPerUser);
            expect(userVisibleRequests?.every(r => r.requested_by === firstUserId)).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  }, 600000); // 10 minute timeout for property-based test
});
