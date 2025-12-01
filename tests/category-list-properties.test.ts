import { describe, it, expect, afterAll, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { createClient } from '@supabase/supabase-js';

// Feature: asset-manager-app, Property 11: Entity list completeness (categories)

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

// Track created categories for cleanup
let createdCategoryIds: string[] = [];

// Helper function to clean up categories
async function cleanupCategories(categoryIds: string[]) {
  const cleanupPromises = categoryIds.map(async (categoryId) => {
    try {
      await supabase.from('categories').delete().eq('id', categoryId);
    } catch (error) {
      console.error(`Failed to delete category ${categoryId}:`, error);
    }
  });
  await Promise.all(cleanupPromises);
}

describe('Category List Properties', () => {
  afterEach(async () => {
    // Clean up after each test to avoid accumulation
    if (createdCategoryIds.length > 0) {
      await cleanupCategories(createdCategoryIds);
      createdCategoryIds = [];
    }
  }, 60000);

  afterAll(async () => {
    // Final cleanup
    if (createdCategoryIds.length > 0) {
      await cleanupCategories(createdCategoryIds);
    }
  }, 60000);

  /**
   * Property 11: Entity list completeness (categories)
   * For any set of entities (categories) in the database, the management interface
   * should display all of them
   * Validates: Requirements 3.3
   */
  it('Property 11: all categories are displayed in the list', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
          { minLength: 1, maxLength: 10 }
        ),
        async (categoryNames) => {
          const createdCategories: Array<{ id: string; name: string }> = [];

          // Create all categories with unique names
          for (const name of categoryNames) {
            const uniqueName = `${name.trim()}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            
            const { data: category, error: createError } = await supabase
              .from('categories')
              .insert({ name: uniqueName })
              .select()
              .single();

            if (createError || !category) {
              continue;
            }

            createdCategoryIds.push(category.id);
            createdCategories.push({
              id: category.id,
              name: uniqueName,
            });
          }

          // Retrieve all categories (as the management interface would)
          const { data: allCategories, error: fetchError } = await supabase
            .from('categories')
            .select('*')
            .in('id', createdCategories.map((c) => c.id));

          expect(fetchError).toBeNull();
          expect(allCategories).toBeDefined();

          // Verify all created categories are in the list
          expect(allCategories?.length).toBe(createdCategories.length);

          for (const createdCategory of createdCategories) {
            const foundCategory = allCategories?.find((c) => c.id === createdCategory.id);
            expect(foundCategory).toBeDefined();
            expect(foundCategory?.name).toBe(createdCategory.name);
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 300000);
});
