import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { test } from '@fast-check/vitest';
import * as fc from 'fast-check';
import {
  createServiceClient,
  createAuthenticatedClient,
  createTestUser,
  cleanupTestData,
} from './helpers/supabase-test-client';

/**
 * Feature: asset-manager-app, Property 21: User asset isolation
 * Feature: asset-manager-app, Property 14: Admin views all assets
 * Validates: Requirements 7.1, 7.5, 5.3
 */

describe('RLS Policies - Property-Based Tests', () => {
  const testUsers: Array<{ id: string; email: string; password: string; role: 'admin' | 'user' }> = [];
  const testCategories: string[] = [];
  const testDepartments: string[] = [];
  const testAssets: string[] = [];

  beforeAll(async () => {
    const serviceClient = createServiceClient();

    // Create test category
    const { data: category, error: catError } = await serviceClient
      .from('categories')
      .insert({ name: `test-category-${Date.now()}` })
      .select()
      .single();

    if (catError || !category) {
      throw new Error(`Failed to create test category: ${catError?.message}`);
    }
    testCategories.push(category.id);

    // Create test department
    const { data: department, error: deptError } = await serviceClient
      .from('departments')
      .insert({ name: `test-department-${Date.now()}` })
      .select()
      .single();

    if (deptError || !department) {
      throw new Error(`Failed to create test department: ${deptError?.message}`);
    }
    testDepartments.push(department.id);
  });

  afterAll(async () => {
    await cleanupTestData(
      testUsers.map(u => u.id),
      testCategories,
      testDepartments,
      testAssets
    );
  });

  /**
   * Property 21: User asset isolation
   * For any user viewing their asset list (with or without filters), 
   * all returned assets should have been created by that user
   */
  test.prop([
    fc.integer({ min: 2, max: 2 }), // Number of users (reduced to avoid rate limiting)
    fc.integer({ min: 1, max: 2 }), // Assets per user
  ], { numRuns: 3 })(
    'Property 21: User asset isolation - users only see their own assets',
    async (numUsers, assetsPerUser) => {
      const serviceClient = createServiceClient();
      const createdUsers: typeof testUsers = [];
      const createdAssets: string[] = [];
      const authenticatedClients = new Map<string, any>();

      try {
        // Create multiple test users
        for (let i = 0; i < numUsers; i++) {
          const email = `test-user-${Date.now()}-${i}-${Math.random()}@example.com`;
          const password = `TestPass123!${i}`;
          const user = await createTestUser(email, password, 'user');
          createdUsers.push({ ...user, password, role: 'user' });
          testUsers.push({ ...user, password, role: 'user' });
          
          // Longer delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Authenticate all users once and cache clients
        for (const user of createdUsers) {
          const userClient = await createAuthenticatedClient(user.id, user.email, user.password);
          authenticatedClients.set(user.id, userClient);
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Each user creates assets using cached client
        for (const user of createdUsers) {
          const userClient = authenticatedClients.get(user.id);

          for (let j = 0; j < assetsPerUser; j++) {
            const { data: asset, error } = await userClient
              .from('assets')
              .insert({
                name: `Asset ${j} for ${user.email}`,
                category_id: testCategories[0],
                department_id: testDepartments[0],
                date_purchased: '2024-01-01',
                cost: 100 + j,
                created_by: user.id,
              })
              .select()
              .single();

            if (error || !asset) {
              throw new Error(`Failed to create asset: ${error?.message}`);
            }
            createdAssets.push(asset.id);
            testAssets.push(asset.id);
          }
        }

        // Verify each user only sees their own assets using cached client
        for (const user of createdUsers) {
          const userClient = authenticatedClients.get(user.id);

          const { data: userAssets, error } = await userClient
            .from('assets')
            .select('*');

          if (error) {
            throw new Error(`Failed to fetch assets: ${error.message}`);
          }

          // All returned assets should belong to this user
          expect(userAssets).toBeDefined();
          expect(userAssets!.length).toBe(assetsPerUser);
          
          for (const asset of userAssets!) {
            expect(asset.created_by).toBe(user.id);
          }
        }
      } finally {
        // Cleanup created assets
        if (createdAssets.length > 0) {
          await serviceClient.from('assets').delete().in('id', createdAssets);
        }
      }
    }
  );

  /**
   * Property 14: Admin views all assets
   * For any set of assets created by different users, 
   * an admin viewing the asset list should see all assets regardless of creator
   */
  test.prop([
    fc.integer({ min: 2, max: 2 }), // Number of regular users (reduced to avoid rate limiting)
    fc.integer({ min: 1, max: 2 }), // Assets per user
  ], { numRuns: 3 })(
    'Property 14: Admin views all assets - admins see all assets regardless of creator',
    async (numUsers, assetsPerUser) => {
      const serviceClient = createServiceClient();
      const createdUsers: typeof testUsers = [];
      const createdAssets: string[] = [];
      const authenticatedClients = new Map<string, any>();
      let adminUser: typeof testUsers[0] | null = null;

      try {
        // Create admin user
        const adminEmail = `test-admin-${Date.now()}-${Math.random()}@example.com`;
        const adminPassword = `AdminPass123!`;
        const admin = await createTestUser(adminEmail, adminPassword, 'admin');
        adminUser = { ...admin, password: adminPassword, role: 'admin' };
        testUsers.push(adminUser);
        await new Promise(resolve => setTimeout(resolve, 500));

        // Create multiple regular users
        for (let i = 0; i < numUsers; i++) {
          const email = `test-user-${Date.now()}-${i}-${Math.random()}@example.com`;
          const password = `TestPass123!${i}`;
          const user = await createTestUser(email, password, 'user');
          createdUsers.push({ ...user, password, role: 'user' });
          testUsers.push({ ...user, password, role: 'user' });
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Authenticate all users once and cache clients
        const adminClient = await createAuthenticatedClient(adminUser.id, adminUser.email, adminUser.password);
        authenticatedClients.set(adminUser.id, adminClient);
        await new Promise(resolve => setTimeout(resolve, 500));

        for (const user of createdUsers) {
          const userClient = await createAuthenticatedClient(user.id, user.email, user.password);
          authenticatedClients.set(user.id, userClient);
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Each user creates assets using cached client
        for (const user of createdUsers) {
          const userClient = authenticatedClients.get(user.id);

          for (let j = 0; j < assetsPerUser; j++) {
            const { data: asset, error } = await userClient
              .from('assets')
              .insert({
                name: `Asset ${j} for ${user.email}`,
                category_id: testCategories[0],
                department_id: testDepartments[0],
                date_purchased: '2024-01-01',
                cost: 100 + j,
                created_by: user.id,
              })
              .select()
              .single();

            if (error || !asset) {
              throw new Error(`Failed to create asset: ${error?.message}`);
            }
            createdAssets.push(asset.id);
            testAssets.push(asset.id);
          }
        }

        // Admin should see all assets using cached client
        const { data: adminAssets, error } = await adminClient
          .from('assets')
          .select('*')
          .in('id', createdAssets);

        if (error) {
          throw new Error(`Failed to fetch assets as admin: ${error.message}`);
        }

        // Admin should see all created assets
        expect(adminAssets).toBeDefined();
        expect(adminAssets!.length).toBe(numUsers * assetsPerUser);

        // Verify assets belong to different users
        const uniqueCreators = new Set(adminAssets!.map(a => a.created_by));
        expect(uniqueCreators.size).toBe(numUsers);
      } finally {
        // Cleanup created assets
        if (createdAssets.length > 0) {
          await serviceClient.from('assets').delete().in('id', createdAssets);
        }
      }
    }
  );
});
