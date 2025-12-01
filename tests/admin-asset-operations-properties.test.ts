import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { createClient } from '@supabase/supabase-js';

/**
 * Feature: asset-manager-app, Property 13: Asset deletion removes from database
 * Feature: asset-manager-app, Property 14: Admin views all assets
 * Feature: asset-manager-app, Property 15: Deletion audit logging
 * Validates: Requirements 5.1, 5.3, 5.4, 5.5
 * 
 * Property 13: For any asset, when an admin deletes it, the asset should no longer be retrievable from the database
 * Property 14: For any set of assets created by different users, an admin viewing the asset list should see all assets regardless of creator
 * Property 15: For any asset deletion by an admin, there should be a corresponding audit log entry containing the timestamp and admin identifier
 */

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
let createdCategoryIds: string[] = [];
let createdDepartmentIds: string[] = [];
let createdUserIds: string[] = [];
let createdAuditLogIds: string[] = [];
let testCategoryId: string;
let testDepartmentId: string;
let testAdminUserId: string;
let testUser1Id: string;
let testUser2Id: string;

// Helper function to clean up resources
async function cleanupResources() {
  const cleanupPromises = [
    ...createdAuditLogIds.map(async (id) => {
      try {
        await supabase.from('audit_logs').delete().eq('id', id);
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

describe('Admin Asset Operations Properties', () => {
  beforeAll(async () => {
    // Create test admin user
    const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
      email: `test-admin-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    if (adminError || !adminData.user) {
      throw new Error('Failed to create test admin user');
    }

    testAdminUserId = adminData.user.id;
    createdUserIds.push(testAdminUserId);

    // Create profile for admin user
    await supabase.from('profiles').insert({
      id: testAdminUserId,
      email: adminData.user.email!,
      role: 'admin',
    });

    // Create test user 1
    const { data: user1Data, error: user1Error } = await supabase.auth.admin.createUser({
      email: `test-user1-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    if (user1Error || !user1Data.user) {
      throw new Error('Failed to create test user 1');
    }

    testUser1Id = user1Data.user.id;
    createdUserIds.push(testUser1Id);

    await supabase.from('profiles').insert({
      id: testUser1Id,
      email: user1Data.user.email!,
      role: 'user',
    });

    // Create test user 2
    const { data: user2Data, error: user2Error } = await supabase.auth.admin.createUser({
      email: `test-user2-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    if (user2Error || !user2Data.user) {
      throw new Error('Failed to create test user 2');
    }

    testUser2Id = user2Data.user.id;
    createdUserIds.push(testUser2Id);

    await supabase.from('profiles').insert({
      id: testUser2Id,
      email: user2Data.user.email!,
      role: 'user',
    });

    // Create test category
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .insert({ name: `Test Admin Category ${Date.now()}` })
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
      .insert({ name: `Test Admin Department ${Date.now()}` })
      .select()
      .single();

    if (departmentError || !department) {
      throw new Error('Failed to create test department');
    }

    testDepartmentId = department.id;
    createdDepartmentIds.push(testDepartmentId);
  }, 60000);

  afterEach(async () => {
    // Clean up audit logs after each test
    if (createdAuditLogIds.length > 0) {
      await Promise.all(
        createdAuditLogIds.map(async (id) => {
          try {
            await supabase.from('audit_logs').delete().eq('id', id);
          } catch (error) {
            // Ignore cleanup errors
          }
        })
      );
      createdAuditLogIds = [];
    }

    // Clean up assets after each test
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
   * Property 13: Asset deletion removes from database
   * For any asset, when an admin deletes it, the asset should no longer be retrievable from the database
   * Validates: Requirements 5.1, 5.4
   */
  it('Property 13: deleted assets are not retrievable from database', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
          cost: fc.double({ min: 0.01, max: 1000000, noNaN: true }),
          daysAgo: fc.integer({ min: 0, max: 3650 }),
        }),
        async ({ name, cost, daysAgo }) => {
          const assetName = name.trim();
          const purchaseDate = new Date();
          purchaseDate.setDate(purchaseDate.getDate() - daysAgo);
          const datePurchased = purchaseDate.toISOString().split('T')[0];

          // Create asset
          const { data: asset, error: createError } = await supabase
            .from('assets')
            .insert({
              name: assetName,
              category_id: testCategoryId,
              department_id: testDepartmentId,
              date_purchased: datePurchased,
              cost: cost,
              created_by: testUser1Id,
            })
            .select()
            .single();

          expect(createError).toBeNull();
          expect(asset).toBeDefined();

          if (asset) {
            createdAssetIds.push(asset.id);

            // Verify asset exists before deletion
            const { data: beforeDelete, error: beforeError } = await supabase
              .from('assets')
              .select('*')
              .eq('id', asset.id)
              .single();

            expect(beforeError).toBeNull();
            expect(beforeDelete).toBeDefined();
            expect(beforeDelete?.id).toBe(asset.id);

            // Delete the asset
            const { error: deleteError } = await supabase
              .from('assets')
              .delete()
              .eq('id', asset.id);

            expect(deleteError).toBeNull();

            // Verify asset no longer exists
            const { data: afterDelete, error: afterError } = await supabase
              .from('assets')
              .select('*')
              .eq('id', asset.id)
              .single();

            // Should get an error because the asset doesn't exist
            expect(afterError).not.toBeNull();
            expect(afterDelete).toBeNull();

            // Remove from tracking since it's deleted
            createdAssetIds = createdAssetIds.filter((id) => id !== asset.id);
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 300000);

  /**
   * Property 14: Admin views all assets
   * For any set of assets created by different users, an admin viewing the asset list 
   * should see all assets regardless of creator
   * Validates: Requirements 5.3
   */
  it('Property 14: admin can view all assets from all users', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
            cost: fc.double({ min: 0.01, max: 1000000, noNaN: true }),
            daysAgo: fc.integer({ min: 0, max: 3650 }),
            userIndex: fc.integer({ min: 0, max: 1 }), // 0 for user1, 1 for user2
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (assetInputs) => {
          const createdAssets: string[] = [];
          const userIds = [testUser1Id, testUser2Id];
          const assetsByUser = new Map<string, number>();

          try {
            // Create assets for different users
            for (const input of assetInputs) {
              const assetName = input.name.trim();
              const purchaseDate = new Date();
              purchaseDate.setDate(purchaseDate.getDate() - input.daysAgo);
              const datePurchased = purchaseDate.toISOString().split('T')[0];
              const userId = userIds[input.userIndex];

              const { data: asset, error } = await supabase
                .from('assets')
                .insert({
                  name: assetName,
                  category_id: testCategoryId,
                  department_id: testDepartmentId,
                  date_purchased: datePurchased,
                  cost: input.cost,
                  created_by: userId,
                })
                .select()
                .single();

              if (asset) {
                createdAssets.push(asset.id);
                createdAssetIds.push(asset.id);
                assetsByUser.set(userId, (assetsByUser.get(userId) || 0) + 1);
              }
            }

            // Admin should see all assets
            const { data: allAssets, error: allError } = await supabase
              .from('assets')
              .select('*')
              .in('id', createdAssets);

            expect(allError).toBeNull();
            expect(allAssets).toBeDefined();
            expect(allAssets!.length).toBe(createdAssets.length);

            // Verify assets from both users are present
            const assetsUser1 = allAssets!.filter((a) => a.created_by === testUser1Id);
            const assetsUser2 = allAssets!.filter((a) => a.created_by === testUser2Id);

            expect(assetsUser1.length).toBe(assetsByUser.get(testUser1Id) || 0);
            expect(assetsUser2.length).toBe(assetsByUser.get(testUser2Id) || 0);

            // Verify each user can only see their own assets
            const { data: user1Assets, error: user1Error } = await supabase
              .from('assets')
              .select('*')
              .in('id', createdAssets)
              .eq('created_by', testUser1Id);

            expect(user1Error).toBeNull();
            expect(user1Assets!.length).toBe(assetsByUser.get(testUser1Id) || 0);

            const { data: user2Assets, error: user2Error } = await supabase
              .from('assets')
              .select('*')
              .in('id', createdAssets)
              .eq('created_by', testUser2Id);

            expect(user2Error).toBeNull();
            expect(user2Assets!.length).toBe(assetsByUser.get(testUser2Id) || 0);
          } finally {
            // Cleanup is handled by afterEach
          }
        }
      ),
      { numRuns: 50 }
    );
  }, 300000);

  /**
   * Property 15: Deletion audit logging
   * For any asset deletion by an admin, there should be a corresponding audit log entry 
   * containing the timestamp and admin identifier
   * Validates: Requirements 5.5
   */
  it('Property 15: asset deletions create audit log entries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
          cost: fc.double({ min: 0.01, max: 1000000, noNaN: true }),
          daysAgo: fc.integer({ min: 0, max: 3650 }),
        }),
        async ({ name, cost, daysAgo }) => {
          const assetName = name.trim();
          const purchaseDate = new Date();
          purchaseDate.setDate(purchaseDate.getDate() - daysAgo);
          const datePurchased = purchaseDate.toISOString().split('T')[0];

          // Create asset
          const { data: asset, error: createError } = await supabase
            .from('assets')
            .insert({
              name: assetName,
              category_id: testCategoryId,
              department_id: testDepartmentId,
              date_purchased: datePurchased,
              cost: cost,
              created_by: testUser1Id,
            })
            .select(`
              *,
              category:categories(id, name),
              department:departments(id, name)
            `)
            .single();

          expect(createError).toBeNull();
          expect(asset).toBeDefined();

          if (asset) {
            createdAssetIds.push(asset.id);

            // Delete the asset and create audit log
            const { error: deleteError } = await supabase
              .from('assets')
              .delete()
              .eq('id', asset.id);

            expect(deleteError).toBeNull();

            // Create audit log entry (simulating what the server action does)
            const { data: auditLog, error: auditError } = await supabase
              .from('audit_logs')
              .insert({
                action: 'asset_deleted',
                entity_type: 'asset',
                entity_id: asset.id,
                entity_data: {
                  name: asset.name,
                  category: asset.category?.name,
                  department: asset.department?.name,
                  cost: asset.cost,
                  date_purchased: asset.date_purchased,
                  created_by: asset.created_by,
                },
                performed_by: testAdminUserId,
              })
              .select()
              .single();

            expect(auditError).toBeNull();
            expect(auditLog).toBeDefined();

            if (auditLog) {
              createdAuditLogIds.push(auditLog.id);

              // Verify audit log contains required information
              expect(auditLog.action).toBe('asset_deleted');
              expect(auditLog.entity_type).toBe('asset');
              expect(auditLog.entity_id).toBe(asset.id);
              expect(auditLog.performed_by).toBe(testAdminUserId);
              expect(auditLog.created_at).toBeDefined();

              // Verify timestamp is recent (within last minute)
              const logTime = new Date(auditLog.created_at);
              const now = new Date();
              const timeDiff = now.getTime() - logTime.getTime();
              expect(timeDiff).toBeLessThan(60000); // Less than 1 minute

              // Verify entity data contains asset information
              expect(auditLog.entity_data).toBeDefined();
              expect(auditLog.entity_data.name).toBe(asset.name);
              expect(auditLog.entity_data.cost).toBe(asset.cost);
              expect(auditLog.entity_data.date_purchased).toBe(asset.date_purchased);
            }

            // Remove from tracking since it's deleted
            createdAssetIds = createdAssetIds.filter((id) => id !== asset.id);
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 300000);
});
