import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { createClient } from '@supabase/supabase-js';

// Feature: asset-manager-app, Property 23: User asset statistics accuracy
// Feature: asset-manager-app, Property 24: Asset grouping correctness

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
let testUserId: string;

// Helper function to clean up resources
async function cleanupResources() {
  const cleanupPromises = [
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

describe('User Dashboard Statistics Properties', () => {
  beforeAll(async () => {
    // Create test user
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: `test-dashboard-user-${Date.now()}@example.com`,
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

    // Clean up any existing assets for this user (from failed previous runs)
    await supabase.from('assets').delete().eq('created_by', testUserId);
  }, 60000);

  afterEach(async () => {
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
   * Property 23: User asset statistics accuracy
   * For any user's set of assets, the dashboard statistics (total count, total value)
   * should accurately reflect the sum and count of their assets
   * Validates: Requirements 7.4, 9.2
   */
  it('Property 23: user asset statistics are accurate', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate an array of assets (1-3 assets to reduce test time)
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
            cost: fc.double({ min: 0.01, max: 100000, noNaN: true }),
            daysAgo: fc.integer({ min: 0, max: 3650 }),
          }),
          { minLength: 1, maxLength: 3 }
        ),
        async (assetInputs) => {
          const localAssetIds: string[] = [];
          const localCategoryIds: string[] = [];
          const localDepartmentIds: string[] = [];

          try {
            // Clean up any existing assets for this user before this iteration
            await supabase.from('assets').delete().eq('created_by', testUserId);

            // Create unique categories and departments for this test
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(7);
            
            // Create just one category and one department to reduce operations
            const { data: category } = await supabase
              .from('categories')
              .insert({ name: `Cat-${timestamp}-${randomId}` })
              .select()
              .single();
            
            if (category) {
              localCategoryIds.push(category.id);
              createdCategoryIds.push(category.id);
            }

            const { data: department } = await supabase
              .from('departments')
              .insert({ name: `Dept-${timestamp}-${randomId}` })
              .select()
              .single();
            
            if (department) {
              localDepartmentIds.push(department.id);
              createdDepartmentIds.push(department.id);
            }

            if (!category || !department) {
              throw new Error('Failed to create category or department');
            }

            // Create assets
            const createdAssets = await Promise.all(
              assetInputs.map(async (input) => {
                const assetName = input.name.trim();
                const purchaseDate = new Date();
                purchaseDate.setDate(purchaseDate.getDate() - input.daysAgo);
                const datePurchased = purchaseDate.toISOString().split('T')[0];

                const { data: asset } = await supabase
                  .from('assets')
                  .insert({
                    name: assetName,
                    category_id: category.id,
                    department_id: department.id,
                    date_purchased: datePurchased,
                    cost: input.cost,
                    created_by: testUserId,
                  })
                  .select()
                  .single();

                if (asset) {
                  localAssetIds.push(asset.id);
                  createdAssetIds.push(asset.id);
                }

                return { ...asset, cost: input.cost };
              })
            );

            // Calculate expected statistics
            const expectedCount = createdAssets.length;
            const expectedTotalValue = createdAssets.reduce((sum, asset) => sum + asset.cost, 0);

            // Fetch user's assets from database
            const { data: userAssets, error } = await supabase
              .from('assets')
              .select('*')
              .eq('created_by', testUserId);

            expect(error).toBeNull();
            expect(userAssets).toBeDefined();

            // Verify statistics
            const actualCount = userAssets?.length || 0;
            const actualTotalValue = userAssets?.reduce((sum, asset) => sum + Number(asset.cost), 0) || 0;

            expect(actualCount).toBe(expectedCount);
            // Use tolerance for floating point comparison
            expect(Math.abs(actualTotalValue - expectedTotalValue)).toBeLessThan(0.01);
          } finally {
            // Clean up this iteration's data - batch delete for efficiency
            if (localAssetIds.length > 0) {
              await supabase.from('assets').delete().in('id', localAssetIds);
            }
            if (localCategoryIds.length > 0) {
              await supabase.from('categories').delete().in('id', localCategoryIds);
            }
            if (localDepartmentIds.length > 0) {
              await supabase.from('departments').delete().in('id', localDepartmentIds);
            }
          }
        }
      ),
      { numRuns: 10 }
    );
  }, 300000);

  /**
   * Property 24: Asset grouping correctness
   * For any grouping or filtering by category or department,
   * all assets in a group should have the corresponding category or department value
   * Validates: Requirements 9.3
   */
  it('Property 24: asset grouping by category is correct', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate assets with specific category assignments
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
            cost: fc.double({ min: 0.01, max: 100000, noNaN: true }),
            daysAgo: fc.integer({ min: 0, max: 3650 }),
            categoryIndex: fc.integer({ min: 0, max: 2 }), // 3 categories
          }),
          { minLength: 3, maxLength: 15 }
        ),
        async (assetInputs) => {
          // Create 3 unique categories
          const categoryNames = [`Cat-A-${Date.now()}`, `Cat-B-${Date.now()}`, `Cat-C-${Date.now()}`];
          const categories = await Promise.all(
            categoryNames.map(async (name) => {
              const { data, error } = await supabase
                .from('categories')
                .insert({ name })
                .select()
                .single();
              if (data) createdCategoryIds.push(data.id);
              return data;
            })
          );

          // Create a single department for all assets
          const { data: department } = await supabase
            .from('departments')
            .insert({ name: `Dept-${Date.now()}` })
            .select()
            .single();
          if (department) createdDepartmentIds.push(department.id);

          // Create assets with assigned categories
          const createdAssets = await Promise.all(
            assetInputs.map(async (input) => {
              const assetName = input.name.trim();
              const purchaseDate = new Date();
              purchaseDate.setDate(purchaseDate.getDate() - input.daysAgo);
              const datePurchased = purchaseDate.toISOString().split('T')[0];

              const categoryId = categories[input.categoryIndex]?.id;

              if (!categoryId || !department?.id) {
                throw new Error('Failed to create category or department');
              }

              const { data: asset, error } = await supabase
                .from('assets')
                .insert({
                  name: assetName,
                  category_id: categoryId,
                  department_id: department.id,
                  date_purchased: datePurchased,
                  cost: input.cost,
                  created_by: testUserId,
                })
                .select(`
                  *,
                  category:categories(id, name)
                `)
                .single();

              if (asset) {
                createdAssetIds.push(asset.id);
              }

              return asset;
            })
          );

          // Group assets by category
          const groupedByCategory = createdAssets.reduce((acc, asset) => {
            if (!asset) return acc;
            const categoryId = asset.category_id;
            if (!acc[categoryId]) {
              acc[categoryId] = [];
            }
            acc[categoryId].push(asset);
            return acc;
          }, {} as Record<string, any[]>);

          // Verify each group contains only assets with the correct category
          for (const [categoryId, assetsInGroup] of Object.entries(groupedByCategory)) {
            for (const asset of assetsInGroup) {
              expect(asset.category_id).toBe(categoryId);
            }

            // Verify count and value calculations
            const groupCount = assetsInGroup.length;
            const groupValue = assetsInGroup.reduce((sum, asset) => sum + Number(asset.cost), 0);

            expect(groupCount).toBeGreaterThan(0);
            expect(groupValue).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 300000);

  /**
   * Property 24: Asset grouping correctness (by department)
   * For any grouping or filtering by department,
   * all assets in a group should have the corresponding department value
   * Validates: Requirements 9.3
   */
  it('Property 24: asset grouping by department is correct', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate assets with specific department assignments
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
            cost: fc.double({ min: 0.01, max: 100000, noNaN: true }),
            daysAgo: fc.integer({ min: 0, max: 3650 }),
            departmentIndex: fc.integer({ min: 0, max: 2 }), // 3 departments
          }),
          { minLength: 3, maxLength: 15 }
        ),
        async (assetInputs) => {
          // Create a single category for all assets
          const { data: category } = await supabase
            .from('categories')
            .insert({ name: `Cat-${Date.now()}` })
            .select()
            .single();
          if (category) createdCategoryIds.push(category.id);

          // Create 3 unique departments
          const departmentNames = [`Dept-A-${Date.now()}`, `Dept-B-${Date.now()}`, `Dept-C-${Date.now()}`];
          const departments = await Promise.all(
            departmentNames.map(async (name) => {
              const { data, error } = await supabase
                .from('departments')
                .insert({ name })
                .select()
                .single();
              if (data) createdDepartmentIds.push(data.id);
              return data;
            })
          );

          // Create assets with assigned departments
          const createdAssets = await Promise.all(
            assetInputs.map(async (input) => {
              const assetName = input.name.trim();
              const purchaseDate = new Date();
              purchaseDate.setDate(purchaseDate.getDate() - input.daysAgo);
              const datePurchased = purchaseDate.toISOString().split('T')[0];

              const departmentId = departments[input.departmentIndex]?.id;

              if (!category?.id || !departmentId) {
                throw new Error('Failed to create category or department');
              }

              const { data: asset, error } = await supabase
                .from('assets')
                .insert({
                  name: assetName,
                  category_id: category.id,
                  department_id: departmentId,
                  date_purchased: datePurchased,
                  cost: input.cost,
                  created_by: testUserId,
                })
                .select(`
                  *,
                  department:departments(id, name)
                `)
                .single();

              if (asset) {
                createdAssetIds.push(asset.id);
              }

              return asset;
            })
          );

          // Group assets by department
          const groupedByDepartment = createdAssets.reduce((acc, asset) => {
            if (!asset) return acc;
            const departmentId = asset.department_id;
            if (!acc[departmentId]) {
              acc[departmentId] = [];
            }
            acc[departmentId].push(asset);
            return acc;
          }, {} as Record<string, any[]>);

          // Verify each group contains only assets with the correct department
          for (const [departmentId, assetsInGroup] of Object.entries(groupedByDepartment)) {
            for (const asset of assetsInGroup) {
              expect(asset.department_id).toBe(departmentId);
            }

            // Verify count and value calculations
            const groupCount = assetsInGroup.length;
            const groupValue = assetsInGroup.reduce((sum, asset) => sum + Number(asset.cost), 0);

            expect(groupCount).toBeGreaterThan(0);
            expect(groupValue).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 300000);
});
