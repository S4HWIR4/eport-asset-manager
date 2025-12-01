import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { createClient } from '@supabase/supabase-js';

/**
 * Feature: asset-manager-app, Property 22: Asset display completeness
 * Validates: Requirements 7.2, 7.5
 * 
 * For any asset displayed to a user, all required fields 
 * (name, category, date purchased, cost, department) should be present in the rendered output
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
let testCategoryId: string;
let testDepartmentId: string;
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

describe('User Asset Viewing Properties', () => {
  beforeAll(async () => {
    // Create test user
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: `test-view-user-${Date.now()}@example.com`,
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

    // Create test category
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .insert({ name: `Test View Category ${Date.now()}` })
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
      .insert({ name: `Test View Department ${Date.now()}` })
      .select()
      .single();

    if (departmentError || !department) {
      throw new Error('Failed to create test department');
    }

    testDepartmentId = department.id;
    createdDepartmentIds.push(testDepartmentId);
  }, 60000);

  afterEach(async () => {
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
   * Property 22: Asset display completeness
   * For any asset displayed to a user, all required fields 
   * (name, category, date purchased, cost, department) should be present in the rendered output
   * Validates: Requirements 7.2
   */
  it('Property 22: all required asset fields are present when retrieved', async () => {
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
              created_by: testUserId,
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

            // Verify all required fields are present and non-null
            expect(asset.name).toBeDefined();
            expect(asset.name).toBe(assetName);
            expect(asset.name.length).toBeGreaterThan(0);

            expect(asset.category).toBeDefined();
            expect(asset.category).not.toBeNull();
            expect(asset.category?.name).toBeDefined();
            expect(asset.category?.name.length).toBeGreaterThan(0);

            expect(asset.department).toBeDefined();
            expect(asset.department).not.toBeNull();
            expect(asset.department?.name).toBeDefined();
            expect(asset.department?.name.length).toBeGreaterThan(0);

            expect(asset.date_purchased).toBeDefined();
            expect(asset.date_purchased).toBe(datePurchased);
            // Verify it's a valid date
            expect(new Date(asset.date_purchased).toString()).not.toBe('Invalid Date');

            expect(asset.cost).toBeDefined();
            expect(Number(asset.cost)).toBeGreaterThan(0);
            expect(Number.isNaN(Number(asset.cost))).toBe(false);

            // Verify the asset can be retrieved with all fields
            const { data: retrievedAsset, error: retrieveError } = await supabase
              .from('assets')
              .select(`
                *,
                category:categories(id, name),
                department:departments(id, name)
              `)
              .eq('id', asset.id)
              .single();

            expect(retrieveError).toBeNull();
            expect(retrievedAsset).toBeDefined();

            // Verify all fields are still present after retrieval
            expect(retrievedAsset?.name).toBeDefined();
            expect(retrievedAsset?.category).toBeDefined();
            expect(retrievedAsset?.category?.name).toBeDefined();
            expect(retrievedAsset?.department).toBeDefined();
            expect(retrievedAsset?.department?.name).toBeDefined();
            expect(retrievedAsset?.date_purchased).toBeDefined();
            expect(retrievedAsset?.cost).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 300000);

  /**
   * Additional test: Verify filtering preserves field completeness
   * When assets are filtered by category or department, all required fields should still be present
   */
  it('Property 22 (extended): filtered assets maintain field completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
            cost: fc.double({ min: 0.01, max: 1000000, noNaN: true }),
            daysAgo: fc.integer({ min: 0, max: 3650 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (assetInputs) => {
          const createdAssets: string[] = [];

          try {
            // Create multiple assets
            for (const input of assetInputs) {
              const assetName = input.name.trim();
              const purchaseDate = new Date();
              purchaseDate.setDate(purchaseDate.getDate() - input.daysAgo);
              const datePurchased = purchaseDate.toISOString().split('T')[0];

              const { data: asset, error } = await supabase
                .from('assets')
                .insert({
                  name: assetName,
                  category_id: testCategoryId,
                  department_id: testDepartmentId,
                  date_purchased: datePurchased,
                  cost: input.cost,
                  created_by: testUserId,
                })
                .select()
                .single();

              if (asset) {
                createdAssets.push(asset.id);
                createdAssetIds.push(asset.id);
              }
            }

            // Retrieve assets filtered by category with all fields
            const { data: categoryFilteredAssets, error: categoryError } = await supabase
              .from('assets')
              .select(`
                *,
                category:categories(id, name),
                department:departments(id, name)
              `)
              .eq('category_id', testCategoryId)
              .eq('created_by', testUserId);

            expect(categoryError).toBeNull();
            expect(categoryFilteredAssets).toBeDefined();
            expect(categoryFilteredAssets!.length).toBeGreaterThan(0);

            // Verify all filtered assets have complete fields
            for (const asset of categoryFilteredAssets!) {
              expect(asset.name).toBeDefined();
              expect(asset.category).toBeDefined();
              expect(asset.category?.name).toBeDefined();
              expect(asset.department).toBeDefined();
              expect(asset.department?.name).toBeDefined();
              expect(asset.date_purchased).toBeDefined();
              expect(asset.cost).toBeDefined();
            }

            // Retrieve assets filtered by department with all fields
            const { data: departmentFilteredAssets, error: departmentError } = await supabase
              .from('assets')
              .select(`
                *,
                category:categories(id, name),
                department:departments(id, name)
              `)
              .eq('department_id', testDepartmentId)
              .eq('created_by', testUserId);

            expect(departmentError).toBeNull();
            expect(departmentFilteredAssets).toBeDefined();
            expect(departmentFilteredAssets!.length).toBeGreaterThan(0);

            // Verify all filtered assets have complete fields
            for (const asset of departmentFilteredAssets!) {
              expect(asset.name).toBeDefined();
              expect(asset.category).toBeDefined();
              expect(asset.category?.name).toBeDefined();
              expect(asset.department).toBeDefined();
              expect(asset.department?.name).toBeDefined();
              expect(asset.date_purchased).toBeDefined();
              expect(asset.cost).toBeDefined();
            }
          } finally {
            // Cleanup is handled by afterEach
          }
        }
      ),
      { numRuns: 50 }
    );
  }, 300000);
});
