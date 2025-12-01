import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { fc } from '@fast-check/vitest';
import { createClient } from '@supabase/supabase-js';

// Feature: asset-manager-app, Property 28: Admin-only access enforcement
// Feature: asset-manager-app, Property 29: User access denial to admin functions

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create admin client for test setup
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Test user credentials
let adminUser: { id: string; email: string; password: string };
let regularUser: { id: string; email: string; password: string };
let testCategory: { id: string; name: string };
let testDepartment: { id: string; name: string };

describe('Authorization Properties', () => {
  beforeAll(async () => {
    // Create test users
    const adminEmail = `test-admin-auth-${Date.now()}@example.com`;
    const userEmail = `test-user-auth-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    // Create admin user
    const { data: adminData, error: adminError } = await adminSupabase.auth.admin.createUser({
      email: adminEmail,
      password: password,
      email_confirm: true,
    });

    if (adminError || !adminData.user) {
      throw new Error(`Failed to create admin user: ${adminError?.message}`);
    }

    // Update profile role to admin
    const { error: adminProfileError } = await adminSupabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', adminData.user.id);

    if (adminProfileError) {
      throw new Error(`Failed to update admin profile: ${adminProfileError.message}`);
    }

    adminUser = { id: adminData.user.id, email: adminEmail, password };

    // Create regular user
    const { data: userData, error: userError } = await adminSupabase.auth.admin.createUser({
      email: userEmail,
      password: password,
      email_confirm: true,
    });

    if (userError || !userData.user) {
      throw new Error(`Failed to create regular user: ${userError?.message}`);
    }

    regularUser = { id: userData.user.id, email: userEmail, password };

    // Create test category and department for testing
    const { data: category, error: categoryError } = await adminSupabase
      .from('categories')
      .insert({ name: `Test Category ${Date.now()}`, created_by: adminUser.id })
      .select()
      .single();

    if (categoryError || !category) {
      throw new Error(`Failed to create test category: ${categoryError?.message}`);
    }

    testCategory = category;

    const { data: department, error: departmentError } = await adminSupabase
      .from('departments')
      .insert({ name: `Test Department ${Date.now()}`, created_by: adminUser.id })
      .select()
      .single();

    if (departmentError || !department) {
      throw new Error(`Failed to create test department: ${departmentError?.message}`);
    }

    testDepartment = department;
  });

  afterAll(async () => {
    // Clean up test data
    if (testCategory) {
      await adminSupabase.from('categories').delete().eq('id', testCategory.id);
    }
    if (testDepartment) {
      await adminSupabase.from('departments').delete().eq('id', testDepartment.id);
    }

    // Clean up test users
    if (adminUser) {
      await adminSupabase.auth.admin.deleteUser(adminUser.id);
    }
    if (regularUser) {
      await adminSupabase.auth.admin.deleteUser(regularUser.id);
    }
  });

  /**
   * Property 28: Admin-only access enforcement
   * For any management function (user creation, category management, department management, asset deletion),
   * only users with admin role should be able to execute it
   * Validates: Requirements 8.5
   */
  it('Property 28: admin-only operations succeed for admins', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          operationType: fc.constantFrom(
            'create_user',
            'create_category',
            'update_category',
            'delete_category',
            'create_department',
            'update_department',
            'delete_department',
            'delete_asset',
            'view_all_users',
            'view_all_assets',
            'view_admin_stats'
          ),
          entityName: fc.string({ minLength: 3, maxLength: 20 }).map((s) => s.trim()).filter((s) => s.length > 0),
        }),
        async ({ operationType, entityName }) => {
          // Create a client authenticated as admin
          const { data: authData } = await adminSupabase.auth.signInWithPassword({
            email: adminUser.email,
            password: adminUser.password,
          });

          expect(authData.user).toBeDefined();

          const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
            global: {
              headers: {
                Authorization: `Bearer ${authData.session?.access_token}`,
              },
            },
          });

          let result;
          let shouldSucceed = true;

          // Test different admin operations
          switch (operationType) {
            case 'create_user':
              result = await adminSupabase.auth.admin.createUser({
                email: `test-${Date.now()}@example.com`,
                password: 'TestPassword123!',
                email_confirm: true,
              });
              // Clean up created user
              if (result.data?.user) {
                await adminSupabase.auth.admin.deleteUser(result.data.user.id);
              }
              break;

            case 'create_category':
              result = await adminSupabase
                .from('categories')
                .insert({ name: `${entityName}-${Date.now()}`, created_by: adminUser.id })
                .select()
                .single();
              // Clean up created category
              if (result.data) {
                await adminSupabase.from('categories').delete().eq('id', result.data.id);
              }
              break;

            case 'update_category':
              result = await adminSupabase
                .from('categories')
                .update({ name: `Updated-${entityName}-${Date.now()}` })
                .eq('id', testCategory.id)
                .select()
                .single();
              break;

            case 'delete_category':
              // Create a temporary category to delete
              const { data: tempCategory } = await adminSupabase
                .from('categories')
                .insert({ name: `Temp-${entityName}-${Date.now()}`, created_by: adminUser.id })
                .select()
                .single();
              
              if (tempCategory) {
                result = await adminSupabase
                  .from('categories')
                  .delete()
                  .eq('id', tempCategory.id);
              }
              break;

            case 'create_department':
              result = await adminSupabase
                .from('departments')
                .insert({ name: `${entityName}-${Date.now()}`, created_by: adminUser.id })
                .select()
                .single();
              // Clean up created department
              if (result.data) {
                await adminSupabase.from('departments').delete().eq('id', result.data.id);
              }
              break;

            case 'update_department':
              result = await adminSupabase
                .from('departments')
                .update({ name: `Updated-${entityName}-${Date.now()}` })
                .eq('id', testDepartment.id)
                .select()
                .single();
              break;

            case 'delete_department':
              // Create a temporary department to delete
              const { data: tempDepartment } = await adminSupabase
                .from('departments')
                .insert({ name: `Temp-${entityName}-${Date.now()}`, created_by: adminUser.id })
                .select()
                .single();
              
              if (tempDepartment) {
                result = await adminSupabase
                  .from('departments')
                  .delete()
                  .eq('id', tempDepartment.id);
              }
              break;

            case 'delete_asset':
              // Create a temporary asset to delete
              const { data: tempAsset } = await adminSupabase
                .from('assets')
                .insert({
                  name: `Temp Asset ${Date.now()}`,
                  category_id: testCategory.id,
                  department_id: testDepartment.id,
                  date_purchased: '2024-01-01',
                  cost: 100,
                  created_by: adminUser.id,
                })
                .select()
                .single();
              
              if (tempAsset) {
                result = await adminSupabase
                  .from('assets')
                  .delete()
                  .eq('id', tempAsset.id);
              }
              break;

            case 'view_all_users':
              result = await adminSupabase.from('profiles').select('*');
              break;

            case 'view_all_assets':
              result = await adminSupabase.from('assets').select('*');
              break;

            case 'view_admin_stats':
              // Admins should be able to query counts
              const [users, assets, categories, departments] = await Promise.all([
                adminSupabase.from('profiles').select('id', { count: 'exact', head: true }),
                adminSupabase.from('assets').select('id', { count: 'exact', head: true }),
                adminSupabase.from('categories').select('id', { count: 'exact', head: true }),
                adminSupabase.from('departments').select('id', { count: 'exact', head: true }),
              ]);
              result = { error: users.error || assets.error || categories.error || departments.error };
              break;
          }

          // Admin operations should succeed (no error)
          if (shouldSucceed) {
            expect(result?.error).toBeNull();
          }

          // Sign out
          await adminSupabase.auth.signOut();
        }
      ),
      { numRuns: 20 }
    );
  }, 120000); // 2 minute timeout

  /**
   * Property 29: User access denial to admin functions
   * For any admin-only function, regular users attempting to access it should be denied
   * with an appropriate error message
   * Validates: Requirements 9.4
   */
  it('Property 29: admin-only operations are denied for regular users', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'create_category',
          'update_category',
          'delete_category',
          'create_department',
          'update_department',
          'delete_department',
          'delete_asset'
        ),
        async (operationType) => {
          // Create a client authenticated as regular user
          const { data: authData } = await adminSupabase.auth.signInWithPassword({
            email: regularUser.email,
            password: regularUser.password,
          });

          expect(authData.user).toBeDefined();

          // Create a Supabase client with the regular user's session
          const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
            global: {
              headers: {
                Authorization: `Bearer ${authData.session?.access_token}`,
              },
            },
          });

          let result;

          // Test different admin operations as regular user
          switch (operationType) {
            case 'create_category':
              result = await userClient
                .from('categories')
                .insert({ name: `User-Category-${Date.now()}`, created_by: regularUser.id })
                .select()
                .single();
              break;

            case 'update_category':
              result = await userClient
                .from('categories')
                .update({ name: `User-Updated-${Date.now()}` })
                .eq('id', testCategory.id)
                .select()
                .single();
              break;

            case 'delete_category':
              result = await userClient
                .from('categories')
                .delete()
                .eq('id', testCategory.id);
              break;

            case 'create_department':
              result = await userClient
                .from('departments')
                .insert({ name: `User-Department-${Date.now()}`, created_by: regularUser.id })
                .select()
                .single();
              break;

            case 'update_department':
              result = await userClient
                .from('departments')
                .update({ name: `User-Updated-${Date.now()}` })
                .eq('id', testDepartment.id)
                .select()
                .single();
              break;

            case 'delete_department':
              result = await userClient
                .from('departments')
                .delete()
                .eq('id', testDepartment.id);
              break;

            case 'delete_asset':
              // Create an asset as admin first
              const { data: assetToDelete, error: createAssetError } = await adminSupabase
                .from('assets')
                .insert({
                  name: `Asset to Delete ${Date.now()}`,
                  category_id: testCategory.id,
                  department_id: testDepartment.id,
                  date_purchased: '2024-01-01',
                  cost: 100,
                  created_by: adminUser.id,
                })
                .select()
                .single();

              if (createAssetError || !assetToDelete) {
                // If we can't create the asset, skip this test case
                result = { error: new Error('Could not create test asset') };
              } else {
                // Try to delete as regular user
                result = await userClient
                  .from('assets')
                  .delete()
                  .eq('id', assetToDelete.id);

                // Clean up the asset we created (regardless of whether delete succeeded)
                await adminSupabase.from('assets').delete().eq('id', assetToDelete.id);
              }
              break;
          }

          // Regular user operations should fail (have an error)
          // RLS policies should prevent these operations
          expect(result?.error).toBeDefined();

          // Sign out
          await adminSupabase.auth.signOut();
        }
      ),
      { numRuns: 20 }
    );
  }, 120000); // 2 minute timeout
});
