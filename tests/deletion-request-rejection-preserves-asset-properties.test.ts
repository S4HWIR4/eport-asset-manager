import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { createClient } from '@supabase/supabase-js';

// Feature: asset-deletion-workflow, Property 11: Rejection preserves asset

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

describe('Deletion Request Rejection Preserves Asset Properties', () => {
  beforeAll(async () => {
    // Create test user (regular user)
    testUserEmail = `test-reject-user-${Date.now()}@example.com`;
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
    testAdminEmail = `test-reject-admin-${Date.now()}@example.com`;
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
    if (testAdminId) {
      await supabase.auth.admin.deleteUser(testAdminId);
    }
  });

  /**
   * Feature: asset-deletion-workflow, Property 11: Rejection preserves asset
   * Validates: Requirements 6.1
   */
  it('Property 11: For any pending deletion request, rejecting it should leave the associated asset unchanged in the assets table', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          assetName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          assetCost: fc.double({ min: 0.01, max: 100000, noNaN: true }),
          justification: fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length >= 10),
          rejectionReason: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
        }),
        async ({ assetName, assetCost, justification, rejectionReason }) => {
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

          // Store the original asset data for comparison
          const originalAssetId = asset.id;
          const originalAssetName = asset.name;
          const originalAssetCost = asset.cost;
          const originalAssetCategoryId = asset.category_id;
          const originalAssetDepartmentId = asset.department_id;
          const originalAssetDatePurchased = asset.date_purchased;
          const originalAssetCreatedBy = asset.created_by;

          // Create a pending deletion request
          const { data: deletionRequest, error: requestError } = await supabase
            .from('deletion_requests')
            .insert({
              asset_id: asset.id,
              asset_name: asset.name,
              asset_cost: asset.cost,
              requested_by: testUserId,
              requester_email: testUserEmail,
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
          expect(deletionRequest.asset_id).toBe(asset.id);

          // Reject the deletion request
          const { error: rejectError } = await supabase
            .from('deletion_requests')
            .update({
              status: 'rejected',
              reviewed_by: testAdminId,
              reviewer_email: testAdminEmail,
              review_comment: rejectionReason,
              reviewed_at: new Date().toISOString(),
            })
            .eq('id', deletionRequest.id);

          if (rejectError) {
            throw new Error(`Rejection error: ${rejectError.message}`);
          }

          // Verify the asset still exists in the assets table
          const { data: assetAfterRejection, error: assetAfterError } = await supabase
            .from('assets')
            .select('*')
            .eq('id', originalAssetId)
            .single();

          if (assetAfterError) {
            throw new Error(`Error fetching asset after rejection: ${assetAfterError.message}`);
          }

          // The asset should still exist
          expect(assetAfterRejection).toBeTruthy();
          expect(assetAfterRejection).not.toBeNull();

          // Verify all asset data is unchanged
          expect(assetAfterRejection.id).toBe(originalAssetId);
          expect(assetAfterRejection.name).toBe(originalAssetName);
          expect(assetAfterRejection.cost).toBe(originalAssetCost);
          expect(assetAfterRejection.category_id).toBe(originalAssetCategoryId);
          expect(assetAfterRejection.department_id).toBe(originalAssetDepartmentId);
          expect(assetAfterRejection.date_purchased).toBe(originalAssetDatePurchased);
          expect(assetAfterRejection.created_by).toBe(originalAssetCreatedBy);

          // Verify the deletion request status has been updated to rejected
          const { data: updatedRequest, error: updatedRequestError } = await supabase
            .from('deletion_requests')
            .select('*')
            .eq('id', deletionRequest.id)
            .single();

          if (updatedRequestError) {
            throw new Error(`Error fetching updated request: ${updatedRequestError.message}`);
          }

          expect(updatedRequest).toBeTruthy();
          expect(updatedRequest.status).toBe('rejected');
          expect(updatedRequest.reviewed_by).toBe(testAdminId);
          expect(updatedRequest.review_comment).toBe(rejectionReason);
          expect(updatedRequest.reviewed_at).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  });
});
