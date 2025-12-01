import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { createClient } from '@supabase/supabase-js';

// Feature: asset-deletion-workflow, Property 9: Approval preserves request record

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

describe('Deletion Request Approval Preserves Record Properties', () => {
  beforeAll(async () => {
    // Create test user (regular user)
    testUserEmail = `test-preserve-user-${Date.now()}@example.com`;
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
    testAdminEmail = `test-preserve-admin-${Date.now()}@example.com`;
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
   * Feature: asset-deletion-workflow, Property 9: Approval preserves request record
   * Validates: Requirements 5.5
   */
  it('Property 9: For any approved deletion request, the request record should remain in the deletion_requests table with status approved', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          assetName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          assetCost: fc.double({ min: 0.01, max: 100000, noNaN: true }),
          justification: fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length >= 10),
          reviewComment: fc.option(fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0), { nil: null }),
        }),
        async ({ assetName, assetCost, justification, reviewComment }) => {
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

          // Store the original request data for comparison
          const originalRequestId = deletionRequest.id;
          const originalAssetId = deletionRequest.asset_id;
          const originalAssetName = deletionRequest.asset_name;
          const originalAssetCost = deletionRequest.asset_cost;
          const originalRequestedBy = deletionRequest.requested_by;
          const originalJustification = deletionRequest.justification;

          // Approve the deletion request using the RPC function
          const { data: approvalResult, error: approvalError } = await supabase
            .rpc('approve_deletion_request', {
              p_request_id: deletionRequest.id,
              p_reviewer_id: testAdminId,
              p_reviewer_email: testAdminEmail,
              p_review_comment: reviewComment,
            });

          // The approval should succeed
          if (approvalError) {
            throw new Error(`Approval RPC error: ${JSON.stringify(approvalError, null, 2)}`);
          }
          if (!approvalResult) {
            throw new Error(`Approval result is null or undefined. Error: ${JSON.stringify(approvalError, null, 2)}`);
          }
          if (!approvalResult.success) {
            throw new Error(`Approval failed: ${approvalResult.error || 'Unknown error'}. Full result: ${JSON.stringify(approvalResult, null, 2)}`);
          }
          expect(approvalResult.success).toBe(true);

          // Verify the deletion request record still exists in the database
          const { data: preservedRequest, error: preservedRequestError } = await supabase
            .from('deletion_requests')
            .select('*')
            .eq('id', originalRequestId)
            .maybeSingle();

          if (preservedRequestError) {
            throw new Error(`Error fetching preserved request: ${preservedRequestError.message}`);
          }

          // The deletion request record should still exist
          expect(preservedRequest).toBeTruthy();
          expect(preservedRequest).not.toBeNull();

          // Verify the request has been updated to approved status
          expect(preservedRequest.status).toBe('approved');

          // Verify all original request data is preserved
          expect(preservedRequest.id).toBe(originalRequestId);
          // Note: asset_id will be NULL after asset deletion due to SET NULL foreign key constraint
          expect(preservedRequest.asset_id).toBeNull();
          // But the denormalized asset data should be preserved
          expect(preservedRequest.asset_name).toBe(originalAssetName);
          expect(preservedRequest.asset_cost).toBe(originalAssetCost);
          expect(preservedRequest.requested_by).toBe(originalRequestedBy);
          expect(preservedRequest.justification).toBe(originalJustification);

          // Verify review information has been added
          if (!preservedRequest.reviewed_by) {
            throw new Error(`reviewed_by is null. Full record: ${JSON.stringify(preservedRequest, null, 2)}`);
          }
          expect(preservedRequest.reviewed_by).toBe(testAdminId);
          expect(preservedRequest.review_comment).toBe(reviewComment);
          expect(preservedRequest.reviewed_at).toBeTruthy();
          expect(preservedRequest.reviewed_at).not.toBeNull();

          // Verify the asset has been deleted (as per Property 8)
          const { data: deletedAsset } = await supabase
            .from('assets')
            .select('id')
            .eq('id', originalAssetId)
            .maybeSingle();

          expect(deletedAsset).toBeNull();

          // Remove the asset ID from cleanup array since it's already deleted
          createdAssetIds = createdAssetIds.filter(id => id !== asset.id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
