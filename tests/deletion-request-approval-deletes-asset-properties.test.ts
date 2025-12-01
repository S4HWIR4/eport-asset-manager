import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { createClient } from '@supabase/supabase-js';

// Feature: asset-deletion-workflow, Property 8: Approval triggers asset deletion

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

describe('Deletion Request Approval Deletes Asset Properties', () => {
  beforeAll(async () => {
    // Create test user (regular user)
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: `test-approval-user-${Date.now()}@example.com`,
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

    // Create test admin user
    const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
      email: `test-approval-admin-${Date.now()}@example.com`,
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
      email: adminData.user.email!,
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
   * Feature: asset-deletion-workflow, Property 8: Approval triggers asset deletion
   * Validates: Requirements 5.1
   */
  it('Property 8: For any pending deletion request, approving it should result in the associated asset being permanently deleted from the assets table', async () => {
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

          // Verify the asset exists before approval
          const { data: assetBeforeApproval, error: assetBeforeError } = await supabase
            .from('assets')
            .select('id')
            .eq('id', asset.id)
            .single();

          expect(assetBeforeError).toBeNull();
          expect(assetBeforeApproval).toBeTruthy();
          expect(assetBeforeApproval?.id).toBe(asset.id);

          // Create a pending deletion request
          const { data: deletionRequest, error: requestError } = await supabase
            .from('deletion_requests')
            .insert({
              asset_id: asset.id,
              asset_name: asset.name,
              asset_cost: asset.cost,
              requested_by: testUserId,
              requester_email: `test-approval-user-${Date.now()}@example.com`,
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

          // Approve the deletion request using the RPC function
          const { data: approvalResult, error: approvalError } = await supabase
            .rpc('approve_deletion_request', {
              p_request_id: deletionRequest.id,
              p_reviewer_id: testAdminId,
              p_reviewer_email: `test-approval-admin-${Date.now()}@example.com`,
              p_review_comment: reviewComment,
            });

          // The approval should succeed
          if (approvalError) {
            throw new Error(`Approval RPC error: ${approvalError.message}`);
          }
          expect(approvalResult).toBeTruthy();
          if (!approvalResult.success) {
            throw new Error(`Approval failed: ${approvalResult.error || 'Unknown error'}`);
          }
          expect(approvalResult.success).toBe(true);

          // Verify the asset has been deleted from the assets table
          const { data: assetAfterApproval, error: assetAfterError } = await supabase
            .from('assets')
            .select('id')
            .eq('id', asset.id)
            .maybeSingle();

          // The asset should no longer exist
          expect(assetAfterApproval).toBeNull();

          // Verify the deletion request status has been updated to approved
          const { data: updatedRequest, error: updatedRequestError } = await supabase
            .from('deletion_requests')
            .select('*')
            .eq('id', deletionRequest.id)
            .maybeSingle();

          if (updatedRequestError) {
            throw new Error(`Error fetching updated request: ${updatedRequestError.message}`);
          }
          
          if (!updatedRequest) {
            throw new Error(`Deletion request ${deletionRequest.id} not found after approval`);
          }

          expect(updatedRequest).toBeTruthy();
          expect(updatedRequest.status).toBe('approved');
          expect(updatedRequest.reviewed_by).toBe(testAdminId);
          expect(updatedRequest.review_comment).toBe(reviewComment);
          expect(updatedRequest.reviewed_at).toBeTruthy();

          // Remove the asset ID from cleanup array since it's already deleted
          createdAssetIds = createdAssetIds.filter(id => id !== asset.id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
