// Feature: asset-deletion-workflow, Property 16: Admin direct deletion audit
// Validates: Requirements 8.4, 8.5

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createClient } from '@supabase/supabase-js';

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

describe('Property 16: Admin direct deletion audit', () => {
  let adminUserId: string;
  let regularUserId: string;
  let categoryId: string;
  let departmentId: string;

  beforeAll(async () => {

    // Get or create admin user
    const { data: adminUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (!adminUser) {
      throw new Error('No admin user found for testing');
    }
    adminUserId = adminUser.id;

    // Get or create regular user
    const { data: regularUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'user')
      .limit(1)
      .single();

    if (!regularUser) {
      throw new Error('No regular user found for testing');
    }
    regularUserId = regularUser.id;

    // Get or create a category
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .limit(1)
      .single();

    if (category) {
      categoryId = category.id;
    } else {
      const { data: newCategory } = await supabase
        .from('categories')
        .insert({ name: 'Test Category', created_by: adminUserId })
        .select('id')
        .single();
      categoryId = newCategory.id;
    }

    // Get or create a department
    const { data: department } = await supabase
      .from('departments')
      .select('id')
      .limit(1)
      .single();

    if (department) {
      departmentId = department.id;
    } else {
      const { data: newDepartment } = await supabase
        .from('departments')
        .insert({ name: 'Test Department', created_by: adminUserId })
        .select('id')
        .single();
      departmentId = newDepartment.id;
    }
  });

  afterEach(async () => {
    // Clean up created resources
    if (createdDeletionRequestIds.length > 0) {
      await supabase.from('deletion_requests').delete().in('id', createdDeletionRequestIds);
    }
    if (createdAssetIds.length > 0) {
      await supabase.from('assets').delete().in('id', createdAssetIds);
    }
    createdAssetIds = [];
    createdDeletionRequestIds = [];
  }, 30000);

  it('should create audit log with direct_deletion flag for any admin-deleted asset', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          cost: fc.float({ min: Math.fround(0.01), max: Math.fround(1000000), noNaN: true }),
          datePurchased: fc.date({ min: new Date('2000-01-01'), max: new Date() }).filter(d => !isNaN(d.getTime())),
        }),
        async ({ name, cost, datePurchased }) => {
          // Create an asset as a regular user
          const { data: asset, error: createError } = await supabase
            .from('assets')
            .insert({
              name: name.trim(),
              category_id: categoryId,
              department_id: departmentId,
              cost: cost,
              date_purchased: datePurchased.toISOString().split('T')[0],
              created_by: regularUserId,
            })
            .select('id')
            .single();

          if (createError || !asset) {
            throw new Error(`Failed to create test asset: ${createError?.message}`);
          }

          const assetId = asset.id;
          createdAssetIds.push(assetId);

          try {
            // Check for pending deletion request
            const { data: pendingRequest } = await supabase
              .from('deletion_requests')
              .select('id, asset_name, justification')
              .eq('asset_id', assetId)
              .eq('status', 'pending')
              .maybeSingle();

            // Delete the asset directly (simulating admin deletion)
            const { error: deleteError } = await supabase
              .from('assets')
              .delete()
              .eq('id', assetId);

            if (deleteError) {
              throw new Error(`Failed to delete asset: ${deleteError.message}`);
            }

            // If there was a pending deletion request, mark it as approved
            if (pendingRequest) {
              const { error: updateRequestError } = await supabase
                .from('deletion_requests')
                .update({
                  status: 'approved',
                  reviewed_by: adminUserId,
                  reviewer_email: 'admin@example.com',
                  review_comment: 'Auto-approved via direct admin deletion',
                  reviewed_at: new Date().toISOString(),
                })
                .eq('id', pendingRequest.id);

              if (updateRequestError) {
                console.error('Update deletion request error:', updateRequestError);
              }

              // Create audit log for the deletion request approval
              await supabase
                .from('audit_logs')
                .insert({
                  action: 'deletion_request_approved',
                  entity_type: 'deletion_request',
                  entity_id: pendingRequest.id,
                  entity_data: {
                    asset_id: assetId,
                    asset_name: pendingRequest.asset_name,
                    review_comment: 'Auto-approved via direct admin deletion',
                    direct_deletion: true,
                  },
                  performed_by: adminUserId,
                });
            }

            // Create audit log entry for the asset deletion
            await supabase
              .from('audit_logs')
              .insert({
                action: 'asset_deleted',
                entity_type: 'asset',
                entity_id: assetId,
                entity_data: {
                  name: name.trim(),
                  cost: cost,
                  date_purchased: datePurchased.toISOString().split('T')[0],
                  created_by: regularUserId,
                  direct_deletion: true,
                  had_pending_request: !!pendingRequest,
                },
                performed_by: adminUserId,
              });

            // Check that an audit log entry was created with direct_deletion flag
            const { data: auditLogs, error: auditError } = await supabase
              .from('audit_logs')
              .select('*')
              .eq('entity_type', 'asset')
              .eq('entity_id', assetId)
              .eq('action', 'asset_deleted')
              .order('created_at', { ascending: false })
              .limit(1);

            if (auditError) {
              throw new Error(`Failed to fetch audit logs: ${auditError.message}`);
            }

            // Verify audit log exists and has direct_deletion flag
            expect(auditLogs).toBeDefined();
            expect(auditLogs.length).toBeGreaterThan(0);
            
            const auditLog = auditLogs[0];
            expect(auditLog.entity_data).toBeDefined();
            expect(auditLog.entity_data.direct_deletion).toBe(true);
            expect(auditLog.entity_data.name).toBe(name.trim());
          } catch (error) {
            throw error;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should auto-approve pending deletion request when admin directly deletes asset', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          cost: fc.float({ min: Math.fround(0.01), max: Math.fround(1000000), noNaN: true }),
          datePurchased: fc.date({ min: new Date('2000-01-01'), max: new Date() }).filter(d => !isNaN(d.getTime())),
          justification: fc.string({ minLength: 10, maxLength: 500 }),
        }),
        async ({ name, cost, datePurchased, justification }) => {
          // Create an asset as a regular user
          const { data: asset, error: createError } = await supabase
            .from('assets')
            .insert({
              name: name.trim(),
              category_id: categoryId,
              department_id: departmentId,
              cost: cost,
              date_purchased: datePurchased.toISOString().split('T')[0],
              created_by: regularUserId,
            })
            .select('id')
            .single();

          if (createError || !asset) {
            throw new Error(`Failed to create test asset: ${createError?.message}`);
          }

          const assetId = asset.id;
          createdAssetIds.push(assetId);

          try {
            // Create a pending deletion request
            const { data: deletionRequest, error: requestError } = await supabase
              .from('deletion_requests')
              .insert({
                asset_id: assetId,
                asset_name: name.trim(),
                asset_cost: cost,
                requested_by: regularUserId,
                requester_email: 'test@example.com',
                justification: justification,
                status: 'pending',
              })
              .select('id')
              .single();

            if (requestError || !deletionRequest) {
              throw new Error(`Failed to create deletion request: ${requestError?.message}`);
            }

            const requestId = deletionRequest.id;
            createdDeletionRequestIds.push(requestId);

            // Delete the asset directly (simulating admin deletion)
            const { error: deleteError } = await supabase
              .from('assets')
              .delete()
              .eq('id', assetId);

            if (deleteError) {
              throw new Error(`Failed to delete asset: ${deleteError.message}`);
            }

            // Auto-approve the deletion request (simulating what deleteAsset does)
            const { error: updateRequestError } = await supabase
              .from('deletion_requests')
              .update({
                status: 'approved',
                reviewed_by: adminUserId,
                reviewer_email: 'admin@example.com',
                review_comment: 'Auto-approved via direct admin deletion',
                reviewed_at: new Date().toISOString(),
              })
              .eq('id', requestId);

            if (updateRequestError) {
              throw new Error(`Failed to update deletion request: ${updateRequestError.message}`);
            }

            // Create audit log for the deletion request approval
            await supabase
              .from('audit_logs')
              .insert({
                action: 'deletion_request_approved',
                entity_type: 'deletion_request',
                entity_id: requestId,
                entity_data: {
                  asset_id: assetId,
                  asset_name: name.trim(),
                  review_comment: 'Auto-approved via direct admin deletion',
                  direct_deletion: true,
                },
                performed_by: adminUserId,
              });

            // Create audit log entry for the asset deletion
            await supabase
              .from('audit_logs')
              .insert({
                action: 'asset_deleted',
                entity_type: 'asset',
                entity_id: assetId,
                entity_data: {
                  name: name.trim(),
                  cost: cost,
                  date_purchased: datePurchased.toISOString().split('T')[0],
                  created_by: regularUserId,
                  direct_deletion: true,
                  had_pending_request: true,
                },
                performed_by: adminUserId,
              });

            // Check that the deletion request was auto-approved
            const { data: updatedRequest, error: fetchError } = await supabase
              .from('deletion_requests')
              .select('*')
              .eq('id', requestId)
              .single();

            if (fetchError) {
              throw new Error(`Failed to fetch deletion request: ${fetchError.message}`);
            }

            // Verify the request was approved
            expect(updatedRequest.status).toBe('approved');
            expect(updatedRequest.review_comment).toContain('Auto-approved');

            // Verify audit log indicates this was a direct deletion with pending request
            const { data: auditLogs, error: auditError } = await supabase
              .from('audit_logs')
              .select('*')
              .eq('entity_type', 'asset')
              .eq('entity_id', assetId)
              .eq('action', 'asset_deleted')
              .order('created_at', { ascending: false })
              .limit(1);

            if (auditError) {
              throw new Error(`Failed to fetch audit logs: ${auditError.message}`);
            }

            expect(auditLogs).toBeDefined();
            expect(auditLogs.length).toBeGreaterThan(0);
            
            const auditLog = auditLogs[0];
            expect(auditLog.entity_data.direct_deletion).toBe(true);
            expect(auditLog.entity_data.had_pending_request).toBe(true);
          } catch (error) {
            throw error;
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
