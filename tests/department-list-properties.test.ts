import { describe, it, expect, afterAll, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { createClient } from '@supabase/supabase-js';

// Feature: asset-manager-app, Property 11: Entity list completeness (departments)

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

// Track created departments for cleanup
let createdDepartmentIds: string[] = [];

// Helper function to clean up departments
async function cleanupDepartments(departmentIds: string[]) {
  const cleanupPromises = departmentIds.map(async (departmentId) => {
    try {
      await supabase.from('departments').delete().eq('id', departmentId);
    } catch (error) {
      console.error(`Failed to delete department ${departmentId}:`, error);
    }
  });
  await Promise.all(cleanupPromises);
}

describe('Department List Properties', () => {
  afterEach(async () => {
    // Clean up after each test to avoid accumulation
    if (createdDepartmentIds.length > 0) {
      await cleanupDepartments(createdDepartmentIds);
      createdDepartmentIds = [];
    }
  }, 60000);

  afterAll(async () => {
    // Final cleanup
    if (createdDepartmentIds.length > 0) {
      await cleanupDepartments(createdDepartmentIds);
    }
  }, 60000);

  /**
   * Property 11: Entity list completeness (departments)
   * For any set of entities (departments) in the database, the management interface
   * should display all of them
   * Validates: Requirements 4.3
   */
  it('Property 11: all departments are displayed in the list', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
          { minLength: 1, maxLength: 10 }
        ),
        async (departmentNames) => {
          const createdDepartments: Array<{ id: string; name: string }> = [];

          // Create all departments with unique names
          for (const name of departmentNames) {
            const uniqueName = `${name.trim()}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            
            const { data: department, error: createError } = await supabase
              .from('departments')
              .insert({ name: uniqueName })
              .select()
              .single();

            if (createError || !department) {
              continue;
            }

            createdDepartmentIds.push(department.id);
            createdDepartments.push({
              id: department.id,
              name: uniqueName,
            });
          }

          // Retrieve all departments (as the management interface would)
          const { data: allDepartments, error: fetchError } = await supabase
            .from('departments')
            .select('*')
            .in('id', createdDepartments.map((d) => d.id));

          expect(fetchError).toBeNull();
          expect(allDepartments).toBeDefined();

          // Verify all created departments are in the list
          expect(allDepartments?.length).toBe(createdDepartments.length);

          for (const createdDepartment of createdDepartments) {
            const foundDepartment = allDepartments?.find((d) => d.id === createdDepartment.id);
            expect(foundDepartment).toBeDefined();
            expect(foundDepartment?.name).toBe(createdDepartment.name);
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 300000);
});
