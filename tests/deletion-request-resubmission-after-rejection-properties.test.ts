import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { createClient } from '@supabase/supabase-js';

// Feature: asset-deletion-workflow, Property 13: Rejection allows resubmission

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
let testAdminId: string;
let testUserEmail: string;
let testAdminEmail: string;

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

describe('Deletion Request Resubmission After Rejection Properties', () => {
  beforeAll(async () => {
    // Create test user (regular user)
    testUserEmail = `test-resubmit-user-${Date.now()}@example.com`;
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: testUserEmail,
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
      email: testUserEmail,
      role: 'user',
    });

    // Create test admin user
    testAdminEmail = `test-resubmit-admin-${Date.now()}@example.com`;
    const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
      email: testAdminEmail,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    if (adminError || !adminData.user) {
      throw new Error('Failed to create test admin');
    }

    testAdminId = adminData.user.id;

    // Create profile for test admin
    await supabase.from('profiles').insert({
      id: testAdminId,
      email: testAdminEmail,
      role: 'admin',
    });

    // Create test category with unique name
    const categoryName = `Test Category Resubmission ${Date.now()}-${Math.random()}`;
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

    // Create test department with unique name
    const departmentName = `Test Department Resubmission ${Date.now()}-${Math.random()}`;
    const { data: department, error: departmentError } = await supabase
      .from('departments')
      .insert({ name: departmentName })
      .select()
      .single();

    if (departmentError || !department) {
      console.error('Department creation error:', departmentError);
      throw new Error(`Failed to create test department: ${departmentError?.message || 'Unknown error'}`);
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
    if (testAdminId) {
      await supabase.auth.admin.deleteUser(testAdminId);
    }
  });

  /**
   * Feature: asset-deletion-workflow, Property 13: Rejection allows resubmission
   * Validates: Requirements 6.5
   */
  it('Property 13: For any rejected deletion request, the user should be able to submit a new deletion request for the same asset', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          assetName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          assetCost: fc.double({ min: 0.01, max: 100000, noNaN: true }),
          firstJustification: fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length >= 10),
          secondJustification: fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length >= 10),
          rejectionReason: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
        }),
        async ({ assetName, assetCost, firstJustification, secondJustification, rejectionReason }) => {
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

          // Create a first deletion request with pending status
          const { data: firstRequest, error: firstRequestError } = await supabase
            .from('deletion_requests')
            .insert({
              asset_id: asset.id,
              asset_name: asset.name,
              asset_cost: asset.cost,
              requested_by: testUserId,
              requester_email: testUserEmail,
              justification: firstJustification,
              status: 'pending',
            })
            .select()
            .single();

          if (firstRequestError || !firstRequest) {
            throw new Error('Failed to create first deletion request');
          }

          createdDeletionRequestIds.push(firstRequest.id);

          // Verify the first deletion request was created with pending status
          expect(firstRequest.status).toBe('pending');
          expect(firstRequest.asset_id).toBe(asset.id);

          // Reject the first deletion request
          const { error: rejectError } = await supabase
            .from('deletion_requests')
            .update({
              status: 'rejected',
              reviewed_by: testAdminId,
              reviewer_email: testAdminEmail,
              review_comment: rejectionReason,
              reviewed_at: new Date().toISOString(),
            })
            .eq('id', firstRequest.id);

          if (rejectError) {
            throw new Error(`Rejection error: ${rejectError.message}`);
          }

          // Verify the first request is now rejected
          const { data: rejectedRequest, error: fetchRejectedError } = await supabase
            .from('deletion_requests')
            .select('*')
            .eq('id', firstRequest.id)
            .single();

          if (fetchRejectedError) {
            throw new Error(`Error fetching rejected request: ${fetchRejectedError.message}`);
          }

          expect(rejectedRequest).toBeTruthy();
          expect(rejectedRequest.status).toBe('rejected');
          expect(rejectedRequest.reviewed_by).toBe(testAdminId);
          expect(rejectedRequest.review_comment).toBe(rejectionReason);

          // Verify the asset still exists (rejection preserves asset)
          const { data: assetAfterRejection, error: assetAfterError } = await supabase
            .from('assets')
            .select('id')
            .eq('id', asset.id)
            .single();

          if (assetAfterError) {
            throw new Error(`Error fetching asset after rejection: ${assetAfterError.message}`);
          }

          expect(assetAfterRejection).toBeTruthy();
          expect(assetAfterRejection.id).toBe(asset.id);

          // Property 13: Now attempt to submit a NEW deletion request for the same asset
          const { data: secondRequest, error: secondRequestError } = await supabase
            .from('deletion_requests')
            .insert({
              asset_id: asset.id,
              asset_name: asset.name,
              asset_cost: asset.cost,
              requested_by: testUserId,
              requester_email: testUserEmail,
              justification: secondJustification,
              status: 'pending',
            })
            .select()
            .single();

          // The second request should be created successfully
          // This validates that rejection allows resubmission
          expect(secondRequestError).toBeNull();
          expect(secondRequest).toBeTruthy();

          if (secondRequest) {
            createdDeletionRequestIds.push(secondRequest.id);

            // Verify the second request has correct data
            expect(secondRequest.asset_id).toBe(asset.id);
            expect(secondRequest.requested_by).toBe(testUserId);
            expect(secondRequest.justification).toBe(secondJustification);
            expect(secondRequest.status).toBe('pending');
            expect(secondRequest.reviewed_by).toBeNull();
            expect(secondRequest.review_comment).toBeNull();
            expect(secondRequest.reviewed_at).toBeNull();

            // Verify the second request is a different record from the first
            expect(secondRequest.id).not.toBe(firstRequest.id);
          }

          // Verify both requests exist in the database
          const { data: allRequests, error: allRequestsError } = await supabase
            .from('deletion_requests')
            .select('*')
            .eq('asset_id', asset.id)
            .order('created_at', { ascending: true });

          if (allRequestsError) {
            throw new Error(`Error fetching all requests: ${allRequestsError.message}`);
          }

          // Should have exactly 2 requests for this asset
          expect(allRequests).toHaveLength(2);

          // First request should be rejected
          expect(allRequests[0].id).toBe(firstRequest.id);
          expect(allRequests[0].status).toBe('rejected');

          // Second request should be pending
          expect(allRequests[1].id).toBe(secondRequest?.id);
          expect(allRequests[1].status).toBe('pending');

          // Property validated: After rejection, a new deletion request can be submitted for the same asset
        }
      ),
      { numRuns: 100 }
    );
  });
});
