import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { createClient } from '@supabase/supabase-js';

// Feature: asset-manager-app, Property 16: Asset creation round-trip
// Feature: asset-manager-app, Property 17: Asset ownership tracking

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

describe('Asset Creation Properties', () => {
  beforeAll(async () => {
    // Create test user
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: `test-asset-user-${Date.now()}@example.com`,
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
   * Property 16: Asset creation round-trip
   * For any valid asset data (name, category, date purchased, cost, department),
   * creating an asset should result in being able to retrieve all the same field values from the database
   * Validates: Requirements 6.1
   */
  it('Property 16: asset creation round-trip preserves all fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
          cost: fc.double({ min: 0.01, max: 1000000, noNaN: true }),
          // Generate dates in the past (last 10 years)
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
            .select()
            .single();

          expect(createError).toBeNull();
          expect(asset).toBeDefined();

          if (asset) {
            createdAssetIds.push(asset.id);

            // Retrieve the asset (round-trip)
            const { data: retrievedAsset, error: retrieveError } = await supabase
              .from('assets')
              .select('*')
              .eq('id', asset.id)
              .single();

            expect(retrieveError).toBeNull();
            expect(retrievedAsset).toBeDefined();

            // Verify all fields match
            expect(retrievedAsset?.name).toBe(assetName);
            expect(retrievedAsset?.category_id).toBe(testCategoryId);
            expect(retrievedAsset?.department_id).toBe(testDepartmentId);
            expect(retrievedAsset?.date_purchased).toBe(datePurchased);
            // Compare costs with tolerance for floating point
            expect(Math.abs(Number(retrievedAsset?.cost) - cost)).toBeLessThan(0.01);
            expect(retrievedAsset?.created_by).toBe(testUserId);
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 300000);

  /**
   * Property 17: Asset ownership tracking
   * For any asset created by a user, the asset's created_by field should match the creating user's identifier
   * Validates: Requirements 6.2
   */
  it('Property 17: asset ownership is correctly tracked', async () => {
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

          // Create asset with test user
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
            .select()
            .single();

          expect(createError).toBeNull();
          expect(asset).toBeDefined();

          if (asset) {
            createdAssetIds.push(asset.id);

            // Verify ownership
            expect(asset.created_by).toBe(testUserId);

            // Verify ownership persists on retrieval
            const { data: retrievedAsset } = await supabase
              .from('assets')
              .select('*')
              .eq('id', asset.id)
              .single();

            expect(retrievedAsset?.created_by).toBe(testUserId);
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 300000);
});
