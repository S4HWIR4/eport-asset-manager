import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { fc } from '@fast-check/vitest';
import { createServiceClient, createTestUser, cleanupTestData } from './helpers/supabase-test-client';

// Feature: asset-manager-app, Property 30: Referential integrity enforcement
// Validates: Requirements 12.2, 12.3, 12.4

const supabase = createServiceClient();

// Track created resources for cleanup
let createdAssetIds: string[] = [];
let createdCategoryIds: string[] = [];
let createdDepartmentIds: string[] = [];
let createdUserIds: string[] = [];
let testCategoryId: string;
let testDepartmentId: string;
let testUserId: string;

describe('Referential Integrity Properties', () => {
  beforeAll(async () => {
    // Create test user
    const testUser = await createTestUser(
      `test-ref-integrity-${Date.now()}@example.com`,
      'TestPassword123!',
      'user'
    );
    testUserId = testUser.id;
    createdUserIds.push(testUserId);

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

  afterAll(async () => {
    // Clean up all test data
    await cleanupTestData(
      createdUserIds,
      createdCategoryIds,
      createdDepartmentIds,
      createdAssetIds
    );
  }, 60000);

  /**
   * Property 30: Referential integrity enforcement
   * For any asset creation or update with an invalid foreign key reference
   * (non-existent category, department, or user), the operation should be rejected by the database
   * Validates: Requirements 12.2, 12.3, 12.4
   */
  it('Property 30: rejects assets with invalid category references', async () => {
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

          // Generate a random UUID that doesn't exist
          const invalidCategoryId = '00000000-0000-0000-0000-000000000000';

          // Attempt to create asset with invalid category_id
          const { data: asset, error } = await supabase
            .from('assets')
            .insert({
              name: assetName,
              category_id: invalidCategoryId,
              department_id: testDepartmentId,
              date_purchased: datePurchased,
              cost: cost,
              created_by: testUserId,
            })
            .select()
            .single();

          // Should fail due to foreign key constraint
          expect(error).not.toBeNull();
          expect(asset).toBeNull();
          
          // Verify error is related to foreign key constraint
          if (error) {
            expect(
              error.message.toLowerCase().includes('foreign key') ||
              error.message.toLowerCase().includes('violates') ||
              error.code === '23503' // PostgreSQL foreign key violation code
            ).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 300000);

  it('Property 30: rejects assets with invalid department references', async () => {
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

          // Generate a random UUID that doesn't exist
          const invalidDepartmentId = '00000000-0000-0000-0000-000000000001';

          // Attempt to create asset with invalid department_id
          const { data: asset, error } = await supabase
            .from('assets')
            .insert({
              name: assetName,
              category_id: testCategoryId,
              department_id: invalidDepartmentId,
              date_purchased: datePurchased,
              cost: cost,
              created_by: testUserId,
            })
            .select()
            .single();

          // Should fail due to foreign key constraint
          expect(error).not.toBeNull();
          expect(asset).toBeNull();
          
          // Verify error is related to foreign key constraint
          if (error) {
            expect(
              error.message.toLowerCase().includes('foreign key') ||
              error.message.toLowerCase().includes('violates') ||
              error.code === '23503' // PostgreSQL foreign key violation code
            ).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 300000);

  it('Property 30: rejects assets with invalid user references', async () => {
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

          // Generate a random UUID that doesn't exist
          const invalidUserId = '00000000-0000-0000-0000-000000000002';

          // Attempt to create asset with invalid created_by
          const { data: asset, error } = await supabase
            .from('assets')
            .insert({
              name: assetName,
              category_id: testCategoryId,
              department_id: testDepartmentId,
              date_purchased: datePurchased,
              cost: cost,
              created_by: invalidUserId,
            })
            .select()
            .single();

          // Should fail due to foreign key constraint
          expect(error).not.toBeNull();
          expect(asset).toBeNull();
          
          // Verify error is related to foreign key constraint
          if (error) {
            expect(
              error.message.toLowerCase().includes('foreign key') ||
              error.message.toLowerCase().includes('violates') ||
              error.code === '23503' // PostgreSQL foreign key violation code
            ).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 300000);

  it('Property 30: accepts assets with valid foreign key references', async () => {
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

          // Create asset with valid foreign keys
          const { data: asset, error } = await supabase
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

          // Should succeed with valid foreign keys
          expect(error).toBeNull();
          expect(asset).not.toBeNull();
          
          if (asset) {
            createdAssetIds.push(asset.id);
            
            // Verify the foreign keys are correctly stored
            expect(asset.category_id).toBe(testCategoryId);
            expect(asset.department_id).toBe(testDepartmentId);
            expect(asset.created_by).toBe(testUserId);
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 300000);

  it('Property 30: prevents deletion of referenced categories', async () => {
    // Create a temporary category
    const { data: tempCategory, error: categoryError } = await supabase
      .from('categories')
      .insert({ name: `Temp Category ${Date.now()}` })
      .select()
      .single();

    expect(categoryError).toBeNull();
    expect(tempCategory).not.toBeNull();

    if (tempCategory) {
      createdCategoryIds.push(tempCategory.id);

      // Create an asset that references this category
      const { data: asset, error: assetError } = await supabase
        .from('assets')
        .insert({
          name: 'Test Asset for Category Deletion',
          category_id: tempCategory.id,
          department_id: testDepartmentId,
          date_purchased: new Date().toISOString().split('T')[0],
          cost: 100.00,
          created_by: testUserId,
        })
        .select()
        .single();

      expect(assetError).toBeNull();
      expect(asset).not.toBeNull();

      if (asset) {
        createdAssetIds.push(asset.id);

        // Attempt to delete the category (should fail due to ON DELETE RESTRICT)
        const { error: deleteError } = await supabase
          .from('categories')
          .delete()
          .eq('id', tempCategory.id);

        // Should fail due to foreign key constraint
        expect(deleteError).not.toBeNull();
        
        if (deleteError) {
          expect(
            deleteError.message.toLowerCase().includes('foreign key') ||
            deleteError.message.toLowerCase().includes('violates') ||
            deleteError.message.toLowerCase().includes('still referenced') ||
            deleteError.code === '23503' // PostgreSQL foreign key violation code
          ).toBe(true);
        }

        // Clean up the asset first
        await supabase.from('assets').delete().eq('id', asset.id);
        
        // Now deletion should succeed
        const { error: deleteError2 } = await supabase
          .from('categories')
          .delete()
          .eq('id', tempCategory.id);

        expect(deleteError2).toBeNull();
      }
    }
  }, 60000);

  it('Property 30: prevents deletion of referenced departments', async () => {
    // Create a temporary department
    const { data: tempDepartment, error: departmentError } = await supabase
      .from('departments')
      .insert({ name: `Temp Department ${Date.now()}` })
      .select()
      .single();

    expect(departmentError).toBeNull();
    expect(tempDepartment).not.toBeNull();

    if (tempDepartment) {
      createdDepartmentIds.push(tempDepartment.id);

      // Create an asset that references this department
      const { data: asset, error: assetError } = await supabase
        .from('assets')
        .insert({
          name: 'Test Asset for Department Deletion',
          category_id: testCategoryId,
          department_id: tempDepartment.id,
          date_purchased: new Date().toISOString().split('T')[0],
          cost: 100.00,
          created_by: testUserId,
        })
        .select()
        .single();

      expect(assetError).toBeNull();
      expect(asset).not.toBeNull();

      if (asset) {
        createdAssetIds.push(asset.id);

        // Attempt to delete the department (should fail due to ON DELETE RESTRICT)
        const { error: deleteError } = await supabase
          .from('departments')
          .delete()
          .eq('id', tempDepartment.id);

        // Should fail due to foreign key constraint
        expect(deleteError).not.toBeNull();
        
        if (deleteError) {
          expect(
            deleteError.message.toLowerCase().includes('foreign key') ||
            deleteError.message.toLowerCase().includes('violates') ||
            deleteError.message.toLowerCase().includes('still referenced') ||
            deleteError.code === '23503' // PostgreSQL foreign key violation code
          ).toBe(true);
        }

        // Clean up the asset first
        await supabase.from('assets').delete().eq('id', asset.id);
        
        // Now deletion should succeed
        const { error: deleteError2 } = await supabase
          .from('departments')
          .delete()
          .eq('id', tempDepartment.id);

        expect(deleteError2).toBeNull();
      }
    }
  }, 60000);

  it('Property 30: cascades deletion when user is deleted', async () => {
    // Create a temporary user
    const tempUser = await createTestUser(
      `temp-user-${Date.now()}@example.com`,
      'TestPassword123!',
      'user'
    );
    createdUserIds.push(tempUser.id);

    // Create an asset owned by this user
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .insert({
        name: 'Test Asset for User Deletion',
        category_id: testCategoryId,
        department_id: testDepartmentId,
        date_purchased: new Date().toISOString().split('T')[0],
        cost: 100.00,
        created_by: tempUser.id,
      })
      .select()
      .single();

    expect(assetError).toBeNull();
    expect(asset).not.toBeNull();

    if (asset) {
      const assetId = asset.id;

      // Delete the user (should cascade to assets due to ON DELETE CASCADE)
      await supabase.auth.admin.deleteUser(tempUser.id);

      // Wait a moment for cascade to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify the asset was also deleted
      const { data: deletedAsset, error: fetchError } = await supabase
        .from('assets')
        .select('*')
        .eq('id', assetId)
        .single();

      // Asset should not exist anymore
      expect(deletedAsset).toBeNull();
      expect(fetchError).not.toBeNull();
    }
  }, 60000);
});
