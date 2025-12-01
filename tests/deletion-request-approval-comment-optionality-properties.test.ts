import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { createClient } from '@supabase/supabase-js';

// Feature: asset-deletion-workflow, Property 10: Approval comment optionality

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

describe('Deletion Request Approval Comment Optionality Properties', () => {
  beforeAll(async () => {
    // Create test user (regular user)
    testUserEmail = `test-comment-user-${Date.now()}@example.com`;
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
    testAdminEmail = `test-comment-admin-${Date.now()}@example.com`;
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
   * Feature: asset-deletion-workflow, Property 10: Approval comment optionality
   * Validates: Requirements 5.3
   */
  it('Property 10: For any deletion request approval, the operation should succeed both with and without a review comment', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          assetName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          assetCost: fc.double({ min: 0.01, max: 100000, noNaN: true }),
          justification: fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length >= 10),
          hasComment: fc.boolean(),
          reviewComment: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
        }),
        async ({ assetName, assetCost, justification, hasComment, reviewComment }) => {
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

          // Approve the deletion request with or without a comment based on hasComment
          const commentToUse = hasComment ? reviewComment : null;
          
          const { data: approvalResult, error: approvalError } = await supabase
            .rpc('approve_deletion_request', {
              p_request_id: deletionRequest.id,
              p_reviewer_id: testAdminId,
              p_reviewer_email: testAdminEmail,
              p_review_comment: commentToUse,
            });

          // The approval should succeed regardless of whether a comment was provided
          if (approvalError) {
            throw new Error(`Approval RPC error: ${approvalError.message}`);
          }
          expect(approvalResult).toBeTruthy();
          if (!approvalResult.success) {
            throw new Error(`Approval failed: ${approvalResult.error || 'Unknown error'}`);
          }
          expect(approvalResult.success).toBe(true);

          // Verify the deletion request was approved
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

          // Verify the request status is approved
          expect(updatedRequest.status).toBe('approved');
          expect(updatedRequest.reviewed_by).toBe(testAdminId);
          expect(updatedRequest.reviewed_at).toBeTruthy();
          
          // Verify the comment matches what was provided (null if no comment, the comment if provided)
          if (hasComment) {
            expect(updatedRequest.review_comment).toBe(reviewComment);
          } else {
            expect(updatedRequest.review_comment).toBeNull();
          }

          // Verify the asset was deleted (as per Property 8)
          const { data: deletedAsset } = await supabase
            .from('assets')
            .select('id')
            .eq('id', asset.id)
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
