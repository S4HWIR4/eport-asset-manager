import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { createClient } from '@supabase/supabase-js';

// Feature: asset-deletion-workflow, Property 5: Request display completeness

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

describe('Deletion Request Display Completeness Properties', () => {
  beforeAll(async () => {
    // Create test user
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: `test-user-display-${Date.now()}@example.com`,
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
  });

  /**
   * Feature: asset-deletion-workflow, Property 5: Request display completeness
   * Validates: Requirements 3.2
   */
  it('Property 5: For any deletion request, the displayed information should include asset name, requester email, submission date, and justification', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random asset and deletion request data
        fc.record({
          assetName: fc.string({ minLength: 1, maxLength: 100 }),
          assetCost: fc.double({ min: 0.01, max: 999999.99, noNaN: true }),
          justification: fc.string({ minLength: 10, maxLength: 500 }),
        }),
        async ({ assetName, assetCost, justification }) => {
          // Create an asset
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
            throw new Error('Failed to create asset');
          }

          createdAssetIds.push(asset.id);

          // Get user email for the deletion request
          const { data: userData } = await supabase.auth.admin.getUserById(testUserId);
          const userEmail = userData.user?.email || '';

          // Create deletion request
          const { data: request, error: requestError } = await supabase
            .from('deletion_requests')
            .insert({
              asset_id: asset.id,
              asset_name: asset.name,
              asset_cost: asset.cost,
              requested_by: testUserId,
              requester_email: userEmail,
              justification: justification,
              status: 'pending',
            })
            .select()
            .single();

          if (requestError || !request) {
            throw new Error('Failed to create deletion request');
          }

          createdDeletionRequestIds.push(request.id);

          // Query the deletion request to verify all required fields are present
          const { data: retrievedRequest, error: queryError } = await supabase
            .from('deletion_requests')
            .select('asset_name, requester_email, created_at, justification')
            .eq('id', request.id)
            .single();

          if (queryError || !retrievedRequest) {
            throw new Error('Failed to retrieve deletion request');
          }

          // Verify all required fields are present and non-empty
          expect(retrievedRequest.asset_name).toBeTruthy();
          expect(retrievedRequest.asset_name).toBe(assetName);
          
          expect(retrievedRequest.requester_email).toBeTruthy();
          expect(retrievedRequest.requester_email).toBe(userEmail);
          
          expect(retrievedRequest.created_at).toBeTruthy();
          expect(new Date(retrievedRequest.created_at).getTime()).toBeGreaterThan(0);
          
          expect(retrievedRequest.justification).toBeTruthy();
          expect(retrievedRequest.justification).toBe(justification);

          // Verify that the fields contain the expected values
          expect(retrievedRequest).toMatchObject({
            asset_name: assetName,
            requester_email: userEmail,
            justification: justification,
          });
        }
      ),
      { numRuns: 100 }
    );
  }, 600000); // 10 minute timeout for property-based test
});
