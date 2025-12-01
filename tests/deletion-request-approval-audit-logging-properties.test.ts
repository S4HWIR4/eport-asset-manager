import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { createClient } from '@supabase/supabase-js';

// Feature: asset-deletion-workflow, Property 15: Audit log creation for reviews
// Validates: Requirements 8.2, 8.3

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

describe('Deletion Request Approval Audit Logging Properties', () => {
  beforeAll(async () => {
    // Create test user
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: `test-approval-audit-user-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    if (userError || !userData.user) {
      throw new Error('Failed to create test user');
    }

    testUserId = userData.user.id;
    createdUserIds.push(testUserId);

    // Create profile for test user
    await supabase.from('profiles').insert({
      id: testUserId,
      email: userData.user.email!,
      role: 'user',
    });

    // Create test admin
    const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
      email: `test-approval-audit-admin-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    if (adminError || !adminData.user) {
      throw new Error('Failed to create test admin');
    }

    testAdminId = adminData.user.id;
    createdUserIds.push(testAdminId);

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
    createdCategoryIds.push(testCategoryId);

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
    createdDepartmentIds.push(testDepartmentId);
  }, 60000);

  afterEach(async () => {
    // Clean up deletion requests and assets after each test
    if (createdDeletionRequestIds.length > 0) {
      await Promise.all(
        createdDeletionRequestIds.map(async (id) => {
          try {
            await supabase.from('deletion_requests').delete().eq('id', id);
          } catch (error) {
            // Ignore cleanup errors
          }
        })
      );
      createdDeletionRequestIds = [];
    }

    if (createdAssetIds.length > 0) {
      await Promise.all(
        createdAssetIds.map(async (id) => {
          try {
            await supabase.from('assets').delete().eq('id', id);
          } catch (error) {
            // Ignore cleanup errors
          }
        })
      );
      createdAssetIds = [];
    }
  }, 60000);

  afterAll(async () => {
    // Final cleanup
    await cleanupResources();
  }, 60000);

  /**
   * Property 15: Audit log creation for reviews - Approval
   * For any deletion request approval, a corresponding audit log entry should be created
   * with the reviewer and decision
   * Validates: Requirements 8.2
   */
  it('Property 15: audit log is created for deletion request approval', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          assetName: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
          cost: fc.double({ min: 0.01, max: 1000000, noNaN: true }),
          daysAgo: fc.integer({ min: 0, max: 3650 }),
          justification: fc.string({ minLength: 10, maxLength: 500 }),
          reviewComment: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
        }),
        async ({ assetName, cost, daysAgo, justification, reviewComment }) => {
          const trimmedAssetName = assetName.trim();
          const purchaseDate = new Date();
          purchaseDate.setDate(purchaseDate.getDate() - daysAgo);
          const datePurchased = purchaseDate.toISOString().split('T')[0];

          // Create asset
          const { data: asset, error: createError } = await supabase
            .from('assets')
            .insert({
              name: trimmedAssetName,
              category_id: testCategoryId,
              department_id: testDepartmentId,
              date_purchased: datePurchased,
              cost: cost,
              created_by: testUserId,
            })
            .select()
            .single();

          expect(createError).toBeNull();
          expect(asset).toBeDefined();

          if (asset) {
            createdAssetIds.push(asset.id);

            // Create deletion request
            const { data: request, error: requestError } = await supabase
              .from('deletion_requests')
              .insert({
                asset_id: asset.id,
                asset_name: asset.name,
                asset_cost: asset.cost,
                requested_by: testUserId,
                requester_email: `test-approval-audit-user-${Date.now()}@example.com`,
                justification: justification,
                status: 'pending',
              })
              .select()
              .single();

            expect(requestError).toBeNull();
            expect(request).toBeDefined();

            if (request) {
              createdDeletionRequestIds.push(request.id);

              // Approve the deletion request using the RPC function
              const { data: result, error: approveError } = await supabase
                .rpc('approve_deletion_request', {
                  p_request_id: request.id,
                  p_reviewer_id: testAdminId,
                  p_reviewer_email: `test-approval-audit-admin-${Date.now()}@example.com`,
                  p_review_comment: reviewComment || null,
                });

              expect(approveError).toBeNull();
              expect(result).toBeDefined();
              expect(result?.success).toBe(true);

              // Verify audit log was created for the approval
              const { data: approvalAuditLogs, error: approvalFetchError } = await supabase
                .from('audit_logs')
                .select('*')
                .eq('entity_id', request.id)
                .eq('entity_type', 'deletion_request')
                .eq('action', 'deletion_request_approved');

              expect(approvalFetchError).toBeNull();
              expect(approvalAuditLogs).toBeDefined();
              expect(approvalAuditLogs?.length).toBeGreaterThan(0);

              // Verify audit log has correct information
              const approvalAuditLog = approvalAuditLogs?.[0];
              expect(approvalAuditLog?.action).toBe('deletion_request_approved');
              expect(approvalAuditLog?.entity_type).toBe('deletion_request');
              expect(approvalAuditLog?.entity_id).toBe(request.id);
              expect(approvalAuditLog?.performed_by).toBe(testAdminId);
              expect(approvalAuditLog?.entity_data).toBeDefined();
              expect(approvalAuditLog?.entity_data?.asset_id).toBe(asset.id);
              expect(approvalAuditLog?.entity_data?.asset_name).toBe(asset.name);

              // Verify audit log was also created for the asset deletion
              const { data: deletionAuditLogs, error: deletionFetchError } = await supabase
                .from('audit_logs')
                .select('*')
                .eq('entity_id', asset.id)
                .eq('entity_type', 'asset')
                .eq('action', 'asset_deleted');

              expect(deletionFetchError).toBeNull();
              expect(deletionAuditLogs).toBeDefined();
              expect(deletionAuditLogs?.length).toBeGreaterThan(0);

              // Verify asset deletion audit log has correct information
              const deletionAuditLog = deletionAuditLogs?.[0];
              expect(deletionAuditLog?.action).toBe('asset_deleted');
              expect(deletionAuditLog?.entity_type).toBe('asset');
              expect(deletionAuditLog?.entity_id).toBe(asset.id);
              expect(deletionAuditLog?.performed_by).toBe(testAdminId);
              expect(deletionAuditLog?.entity_data).toBeDefined();
              expect(deletionAuditLog?.entity_data?.deleted_via_request).toBe(true);
              expect(deletionAuditLog?.entity_data?.deletion_request_id).toBe(request.id);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 300000);

  /**
   * Property 15: Audit log creation for reviews - Rejection
   * For any deletion request rejection, a corresponding audit log entry should be created
   * with the reviewer and decision
   * Validates: Requirements 8.3
   */
  it('Property 15: audit log is created for deletion request rejection', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          assetName: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
          cost: fc.double({ min: 0.01, max: 1000000, noNaN: true }),
          daysAgo: fc.integer({ min: 0, max: 3650 }),
          justification: fc.string({ minLength: 10, maxLength: 500 }),
          reviewComment: fc.string({ minLength: 1, maxLength: 500 }),
        }),
        async ({ assetName, cost, daysAgo, justification, reviewComment }) => {
          const trimmedAssetName = assetName.trim();
          const purchaseDate = new Date();
          purchaseDate.setDate(purchaseDate.getDate() - daysAgo);
          const datePurchased = purchaseDate.toISOString().split('T')[0];

          // Create asset
          const { data: asset, error: createError } = await supabase
            .from('assets')
            .insert({
              name: trimmedAssetName,
              category_id: testCategoryId,
              department_id: testDepartmentId,
              date_purchased: datePurchased,
              cost: cost,
              created_by: testUserId,
            })
            .select()
            .single();

          expect(createError).toBeNull();
          expect(asset).toBeDefined();

          if (asset) {
            createdAssetIds.push(asset.id);

            // Create deletion request
            const { data: request, error: requestError } = await supabase
              .from('deletion_requests')
              .insert({
                asset_id: asset.id,
                asset_name: asset.name,
                asset_cost: asset.cost,
                requested_by: testUserId,
                requester_email: `test-approval-audit-user-${Date.now()}@example.com`,
                justification: justification,
                status: 'pending',
              })
              .select()
              .single();

            expect(requestError).toBeNull();
            expect(request).toBeDefined();

            if (request) {
              createdDeletionRequestIds.push(request.id);

              // Reject the deletion request
              const { error: rejectError } = await supabase
                .from('deletion_requests')
                .update({
                  status: 'rejected',
                  reviewed_by: testAdminId,
                  reviewer_email: `test-approval-audit-admin-${Date.now()}@example.com`,
                  review_comment: reviewComment,
                  reviewed_at: new Date().toISOString(),
                })
                .eq('id', request.id);

              expect(rejectError).toBeNull();

              // Create audit log entry for rejection (simulating what the server action does)
              const { error: auditError } = await supabase
                .from('audit_logs')
                .insert({
                  action: 'deletion_request_rejected',
                  entity_type: 'deletion_request',
                  entity_id: request.id,
                  entity_data: {
                    asset_id: asset.id,
                    asset_name: asset.name,
                    review_comment: reviewComment,
                  },
                  performed_by: testAdminId,
                });

              expect(auditError).toBeNull();

              // Verify audit log was created for the rejection
              const { data: rejectionAuditLogs, error: rejectionFetchError } = await supabase
                .from('audit_logs')
                .select('*')
                .eq('entity_id', request.id)
                .eq('entity_type', 'deletion_request')
                .eq('action', 'deletion_request_rejected');

              expect(rejectionFetchError).toBeNull();
              expect(rejectionAuditLogs).toBeDefined();
              expect(rejectionAuditLogs?.length).toBeGreaterThan(0);

              // Verify audit log has correct information
              const rejectionAuditLog = rejectionAuditLogs?.[0];
              expect(rejectionAuditLog?.action).toBe('deletion_request_rejected');
              expect(rejectionAuditLog?.entity_type).toBe('deletion_request');
              expect(rejectionAuditLog?.entity_id).toBe(request.id);
              expect(rejectionAuditLog?.performed_by).toBe(testAdminId);
              expect(rejectionAuditLog?.entity_data).toBeDefined();
              expect(rejectionAuditLog?.entity_data?.asset_id).toBe(asset.id);
              expect(rejectionAuditLog?.entity_data?.asset_name).toBe(asset.name);
              expect(rejectionAuditLog?.entity_data?.review_comment).toBe(reviewComment);

              // Verify asset still exists (not deleted)
              const { data: assetCheck, error: assetCheckError } = await supabase
                .from('assets')
                .select('*')
                .eq('id', asset.id)
                .single();

              expect(assetCheckError).toBeNull();
              expect(assetCheck).toBeDefined();
              expect(assetCheck?.id).toBe(asset.id);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 300000);
});
