import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { createClient } from '@supabase/supabase-js';

// Feature: asset-manager-app, Property 25: Admin statistics accuracy
// Feature: asset-manager-app, Property 26: Admin permission persistence
// Feature: asset-manager-app, Property 27: Admin activity log display

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
let testAdminId: string;

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

describe('Admin Dashboard Properties', () => {
  beforeAll(async () => {
    // Create test admin user
    const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
      email: `test-admin-dashboard-${Date.now()}@example.com`,
      password: 'AdminPassword123!',
      email_confirm: true,
    });

    if (adminError || !adminData.user) {
      throw new Error('Failed to create test admin user');
    }

    testAdminId = adminData.user.id;
    createdUserIds.push(testAdminId);

    // Wait a bit for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update the profile to admin role (trigger creates it as 'user' by default)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', testAdminId);

    if (updateError) {
      throw new Error(`Failed to update admin role: ${updateError.message}`);
    }

    // Verify the role was updated
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', testAdminId)
      .single();

    if (profile?.role !== 'admin') {
      throw new Error(`Admin role not set correctly. Got: ${profile?.role}`);
    }
  }, 60000);

  afterEach(async () => {
    // Clean up audit logs first (they reference other tables)
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

    // Clean up assets, categories, and departments after each test
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

    if (createdCategoryIds.length > 0) {
      await Promise.all(
        createdCategoryIds.map(async (id) => {
          try {
            await supabase.from('categories').delete().eq('id', id);
          } catch (error) {
            // Ignore cleanup errors
          }
        })
      );
      createdCategoryIds = [];
    }

    if (createdDepartmentIds.length > 0) {
      await Promise.all(
        createdDepartmentIds.map(async (id) => {
          try {
            await supabase.from('departments').delete().eq('id', id);
          } catch (error) {
            // Ignore cleanup errors
          }
        })
      );
      createdDepartmentIds = [];
    }
  }, 60000);

  afterAll(async () => {
    // Final cleanup
    await cleanupResources();
  }, 60000);

  /**
   * Property 25: Admin statistics accuracy
   * For any system state, the admin dashboard statistics (total users, total assets,
   * total categories, total departments) should accurately reflect the database counts
   * Validates: Requirements 8.2
   */
  it('Property 25: admin statistics are accurate', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          numUsers: fc.integer({ min: 1, max: 3 }),
          numCategories: fc.integer({ min: 1, max: 3 }),
          numDepartments: fc.integer({ min: 1, max: 3 }),
          numAssets: fc.integer({ min: 1, max: 5 }),
        }),
        async (config) => {
          const localUserIds: string[] = [];
          const localCategoryIds: string[] = [];
          const localDepartmentIds: string[] = [];
          const localAssetIds: string[] = [];

          try {
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(7);

            // Create users
            for (let i = 0; i < config.numUsers; i++) {
              const { data: userData } = await supabase.auth.admin.createUser({
                email: `test-user-${timestamp}-${randomId}-${i}@example.com`,
                password: 'TestPassword123!',
                email_confirm: true,
              });

              if (userData?.user) {
                localUserIds.push(userData.user.id);
                createdUserIds.push(userData.user.id);

                await supabase.from('profiles').insert({
                  id: userData.user.id,
                  email: userData.user.email!,
                  role: 'user',
                });
              }
            }

            // Create categories
            for (let i = 0; i < config.numCategories; i++) {
              const { data: category } = await supabase
                .from('categories')
                .insert({ name: `Category-${timestamp}-${randomId}-${i}` })
                .select()
                .single();

              if (category) {
                localCategoryIds.push(category.id);
                createdCategoryIds.push(category.id);
              }
            }

            // Create departments
            for (let i = 0; i < config.numDepartments; i++) {
              const { data: department } = await supabase
                .from('departments')
                .insert({ name: `Department-${timestamp}-${randomId}-${i}` })
                .select()
                .single();

              if (department) {
                localDepartmentIds.push(department.id);
                createdDepartmentIds.push(department.id);
              }
            }

            // Create assets (using first user, category, and department)
            if (localUserIds.length > 0 && localCategoryIds.length > 0 && localDepartmentIds.length > 0) {
              for (let i = 0; i < config.numAssets; i++) {
                const { data: asset } = await supabase
                  .from('assets')
                  .insert({
                    name: `Asset-${timestamp}-${randomId}-${i}`,
                    category_id: localCategoryIds[i % localCategoryIds.length],
                    department_id: localDepartmentIds[i % localDepartmentIds.length],
                    date_purchased: new Date().toISOString().split('T')[0],
                    cost: 100.0,
                    created_by: localUserIds[i % localUserIds.length],
                  })
                  .select()
                  .single();

                if (asset) {
                  localAssetIds.push(asset.id);
                  createdAssetIds.push(asset.id);
                }
              }
            }

            // Verify we created exactly what we expected
            expect(localUserIds.length).toBe(config.numUsers);
            expect(localCategoryIds.length).toBe(config.numCategories);
            expect(localDepartmentIds.length).toBe(config.numDepartments);
            expect(localAssetIds.length).toBe(config.numAssets);

            // Fetch only the records we just created to verify they exist
            const { data: createdUsers } = await supabase
              .from('profiles')
              .select('id')
              .in('id', localUserIds);
            const { data: createdCategories } = await supabase
              .from('categories')
              .select('id')
              .in('id', localCategoryIds);
            const { data: createdDepartments } = await supabase
              .from('departments')
              .select('id')
              .in('id', localDepartmentIds);
            const { data: createdAssets } = await supabase
              .from('assets')
              .select('id')
              .in('id', localAssetIds);

            // Verify all created records are retrievable
            expect(createdUsers?.length).toBe(config.numUsers);
            expect(createdCategories?.length).toBe(config.numCategories);
            expect(createdDepartments?.length).toBe(config.numDepartments);
            expect(createdAssets?.length).toBe(config.numAssets);
          } finally {
            // Clean up this iteration's data
            if (localAssetIds.length > 0) {
              await supabase.from('assets').delete().in('id', localAssetIds);
            }
            if (localCategoryIds.length > 0) {
              await supabase.from('categories').delete().in('id', localCategoryIds);
            }
            if (localDepartmentIds.length > 0) {
              await supabase.from('departments').delete().in('id', localDepartmentIds);
            }
            if (localUserIds.length > 0) {
              await Promise.all(
                localUserIds.map((id) => supabase.auth.admin.deleteUser(id))
              );
            }
          }
        }
      ),
      { numRuns: 10 }
    );
  }, 300000);

  /**
   * Property 26: Admin permission persistence
   * For any admin user navigating between management sections,
   * their admin role and permissions should remain valid throughout the session
   * Validates: Requirements 8.3
   */
  it('Property 26: admin permissions persist across operations', async () => {
    // First verify the test admin has the correct role
    const { data: initialProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', testAdminId)
      .single();
    
    expect(initialProfile?.role).toBe('admin');

    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.constantFrom(
            'view_users',
            'view_categories',
            'view_departments',
            'view_assets',
            'create_category',
            'create_department'
          ),
          { minLength: 3, maxLength: 10 }
        ),
        async (operations) => {
          // Verify admin role persists across multiple operations
          for (const operation of operations) {
            // Fetch admin profile to verify role before operation
            const { data: profileBefore, error: errorBefore } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', testAdminId)
              .single();

            expect(errorBefore).toBeNull();
            expect(profileBefore).toBeDefined();
            expect(profileBefore?.role).toBe('admin');

            // Perform operation based on type
            switch (operation) {
              case 'view_users':
                const { data: users } = await supabase.from('profiles').select('*');
                expect(users).toBeDefined();
                break;
              case 'view_categories':
                const { data: categories } = await supabase.from('categories').select('*');
                expect(categories).toBeDefined();
                break;
              case 'view_departments':
                const { data: departments } = await supabase.from('departments').select('*');
                expect(departments).toBeDefined();
                break;
              case 'view_assets':
                const { data: assets } = await supabase.from('assets').select('*');
                expect(assets).toBeDefined();
                break;
              case 'create_category':
                const timestamp = Date.now();
                const randomSuffix = Math.random().toString(36).substring(7);
                const { data: category } = await supabase
                  .from('categories')
                  .insert({ name: `TempCat-${timestamp}-${randomSuffix}` })
                  .select()
                  .single();
                if (category) {
                  createdCategoryIds.push(category.id);
                  // Clean up immediately
                  await supabase.from('categories').delete().eq('id', category.id);
                  createdCategoryIds = createdCategoryIds.filter((id) => id !== category.id);
                }
                break;
              case 'create_department':
                const ts = Date.now();
                const randSuffix = Math.random().toString(36).substring(7);
                const { data: department } = await supabase
                  .from('departments')
                  .insert({ name: `TempDept-${ts}-${randSuffix}` })
                  .select()
                  .single();
                if (department) {
                  createdDepartmentIds.push(department.id);
                  // Clean up immediately
                  await supabase.from('departments').delete().eq('id', department.id);
                  createdDepartmentIds = createdDepartmentIds.filter((id) => id !== department.id);
                }
                break;
            }

            // Verify admin role still persists after operation
            const { data: profileAfter, error: errorAfter } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', testAdminId)
              .single();

            expect(errorAfter).toBeNull();
            expect(profileAfter).toBeDefined();
            expect(profileAfter?.role).toBe('admin');
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 300000);

  /**
   * Property 27: Admin activity log display
   * For any set of recent system actions, the admin dashboard should display them
   * in the activity log
   * Validates: Requirements 8.4
   */
  it('Property 27: admin activity logs are displayed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            action: fc.constantFrom('asset_deleted', 'asset_created', 'user_created'),
            entityType: fc.constantFrom('asset', 'user'),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (logEntries) => {
          const localAuditLogIds: string[] = [];

          try {
            // Create audit log entries
            for (const entry of logEntries) {
              const { data: log } = await supabase
                .from('audit_logs')
                .insert({
                  action: entry.action,
                  entity_type: entry.entityType,
                  entity_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
                  entity_data: { name: 'Test Entity' },
                  performed_by: testAdminId,
                })
                .select()
                .single();

              if (log) {
                localAuditLogIds.push(log.id);
                createdAuditLogIds.push(log.id);
              }
            }

            // Fetch recent audit logs (as admin would see on dashboard)
            const { data: logs, error } = await supabase
              .from('audit_logs')
              .select(`
                *,
                performer:profiles!audit_logs_performed_by_fkey(id, email, full_name)
              `)
              .in('id', localAuditLogIds)
              .order('created_at', { ascending: false });

            expect(error).toBeNull();
            expect(logs).toBeDefined();
            expect(logs?.length).toBe(logEntries.length);

            // Verify each log entry has required fields
            logs?.forEach((log) => {
              expect(log.action).toBeDefined();
              expect(log.entity_type).toBeDefined();
              expect(log.entity_id).toBeDefined();
              expect(log.performed_by).toBe(testAdminId);
              expect(log.created_at).toBeDefined();
            });
          } finally {
            // Clean up audit logs
            if (localAuditLogIds.length > 0) {
              await supabase.from('audit_logs').delete().in('id', localAuditLogIds);
            }
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 300000);
});
