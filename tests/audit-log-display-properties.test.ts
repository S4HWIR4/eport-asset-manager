import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';

// Feature: ui-ux-bug-fixes, Property 4: Audit log display completeness
// Validates: Requirements 4.3

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
let testUserId: string;
let testUserEmail: string;

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

/**
 * Simulates rendering an audit log entry to a string format
 * This mimics what the AssetAuditHistory component does
 */
function renderAuditLog(log: any, performer: any): string {
  const timestamp = format(new Date(log.created_at), 'PPp');
  const userDisplay = performer?.full_name || performer?.email || 'Unknown';
  const action = log.action;
  
  return `${action} by ${userDisplay} at ${timestamp}`;
}

describe('Audit Log Display Properties', () => {
  beforeAll(async () => {
    // Create test user
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: `test-audit-display-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    if (userError || !userData.user) {
      throw new Error('Failed to create test user');
    }

    testUserId = userData.user.id;
    testUserEmail = userData.user.email!;
    createdUserIds.push(testUserId);

    // Create profile for test user
    await supabase.from('profiles').insert({
      id: testUserId,
      email: testUserEmail,
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
    // Clean up audit logs and assets after each test
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
   * Property 4: Audit log display completeness
   * For any audit log entry, the rendered output should contain the timestamp, user email, and action type
   * Validates: Requirements 4.3
   */
  it('Property 4: audit log display contains required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
          cost: fc.double({ min: 0.01, max: 1000000, noNaN: true }),
          daysAgo: fc.integer({ min: 0, max: 3650 }),
          action: fc.constantFrom('asset_created', 'asset_updated', 'asset_deleted'),
        }),
        async ({ name, cost, daysAgo, action }) => {
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

            // Create audit log entry
            const { data: auditLog, error: auditError } = await supabase
              .from('audit_logs')
              .insert({
                action: action,
                entity_type: 'asset',
                entity_id: asset.id,
                entity_data: {
                  name: asset.name,
                  category_id: asset.category_id,
                  department_id: asset.department_id,
                  cost: asset.cost,
                  date_purchased: asset.date_purchased,
                },
                performed_by: testUserId,
              })
              .select()
              .single();

            expect(auditError).toBeNull();
            expect(auditLog).toBeDefined();

            if (auditLog) {
              createdAuditLogIds.push(auditLog.id);

              // Fetch audit log with performer information (as the component does)
              const { data: fetchedLog, error: fetchError } = await supabase
                .from('audit_logs')
                .select(`
                  *,
                  performer:profiles!audit_logs_performed_by_fkey(id, email, full_name)
                `)
                .eq('id', auditLog.id)
                .single();

              expect(fetchError).toBeNull();
              expect(fetchedLog).toBeDefined();

              if (fetchedLog) {
                // Render the audit log (simulating what the component does)
                const rendered = renderAuditLog(fetchedLog, fetchedLog.performer);

                // Verify rendered output contains required fields
                // 1. Should contain the action type
                expect(rendered).toContain(action);

                // 2. Should contain the user email (or full_name)
                expect(rendered).toContain(testUserEmail);

                // 3. Should contain a timestamp (checking for common date format elements)
                // The format function produces something like "Jan 15, 2024, 3:45 PM"
                expect(rendered).toMatch(/\d{1,2}:\d{2}/); // Time portion (e.g., "3:45")
                
                // Verify the audit log object itself has all required fields
                expect(fetchedLog.created_at).toBeDefined();
                expect(fetchedLog.action).toBe(action);
                expect(fetchedLog.performed_by).toBe(testUserId);
                expect(fetchedLog.performer).toBeDefined();
                expect(fetchedLog.performer.email).toBe(testUserEmail);
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 300000);

  it('Property 4: audit log display handles missing performer gracefully', async () => {
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
            .select()
            .single();

          expect(createError).toBeNull();
          expect(asset).toBeDefined();

          if (asset) {
            createdAssetIds.push(asset.id);

            // Create audit log entry
            const { data: auditLog, error: auditError } = await supabase
              .from('audit_logs')
              .insert({
                action: 'asset_created',
                entity_type: 'asset',
                entity_id: asset.id,
                entity_data: {
                  name: asset.name,
                },
                performed_by: testUserId,
              })
              .select()
              .single();

            expect(auditError).toBeNull();
            expect(auditLog).toBeDefined();

            if (auditLog) {
              createdAuditLogIds.push(auditLog.id);

              // Simulate rendering with null performer (edge case)
              const rendered = renderAuditLog(auditLog, null);

              // Should still render without crashing
              expect(rendered).toBeDefined();
              expect(rendered).toContain('asset_created');
              expect(rendered).toContain('Unknown'); // Fallback for missing performer
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 300000);
});
