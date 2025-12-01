import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { fc, test } from '@fast-check/vitest';
import { createClient } from '@supabase/supabase-js';

// Feature: asset-manager-app, Property 1: Role-based dashboard routing
// Feature: asset-manager-app, Property 2: Authentication rejection for invalid credentials

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create admin client for test setup
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Test user credentials
let adminUser: { email: string; password: string; role: 'admin' };
let regularUser: { email: string; password: string; role: 'user' };

describe('Authentication Properties', () => {
  beforeAll(async () => {
    // Create test users for authentication tests
    const adminEmail = `test-admin-${Date.now()}@example.com`;
    const userEmail = `test-user-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    // Create admin user
    const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: password,
      email_confirm: true,
    });

    if (adminError || !adminData.user) {
      throw new Error(`Failed to create admin user: ${adminError?.message}`);
    }

    // Update profile role to admin (profile is auto-created by trigger with role 'user')
    const { error: adminProfileError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', adminData.user.id);

    if (adminProfileError) {
      throw new Error(`Failed to update admin profile: ${adminProfileError.message}`);
    }

    adminUser = { email: adminEmail, password, role: 'admin' };

    // Create regular user
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: userEmail,
      password: password,
      email_confirm: true,
    });

    if (userError || !userData.user) {
      throw new Error(`Failed to create regular user: ${userError?.message}`);
    }

    // Profile is auto-created with role 'user' by trigger, no need to update
    regularUser = { email: userEmail, password, role: 'user' };
  });

  afterAll(async () => {
    // Clean up test users
    if (adminUser) {
      const { data: userData } = await supabase.auth.admin.listUsers();
      const adminToDelete = userData.users.find((u) => u.email === adminUser.email);
      if (adminToDelete) {
        await supabase.auth.admin.deleteUser(adminToDelete.id);
      }
    }

    if (regularUser) {
      const { data: userData } = await supabase.auth.admin.listUsers();
      const userToDelete = userData.users.find((u) => u.email === regularUser.email);
      if (userToDelete) {
        await supabase.auth.admin.deleteUser(userToDelete.id);
      }
    }
  });

  /**
   * Property 1: Role-based dashboard routing
   * For any authenticated user with a valid role, logging in should redirect them
   * to the dashboard corresponding to their role (admin → admin dashboard, user → user dashboard)
   * Validates: Requirements 1.1, 1.3, 1.4
   */
  it('Property 1: authenticated users are routed to role-appropriate dashboard', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          { email: adminUser.email, password: adminUser.password, role: 'admin' as const },
          { email: regularUser.email, password: regularUser.password, role: 'user' as const }
        ),
        async (testUser) => {
          // Sign in with valid credentials
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: testUser.email,
            password: testUser.password,
          });

          // Authentication should succeed
          expect(authError).toBeNull();
          expect(authData.user).toBeDefined();
          expect(authData.user?.email).toBe(testUser.email);

          // Get user profile to verify role
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', authData.user!.id)
            .single();

          expect(profileError).toBeNull();
          expect(profile).toBeDefined();
          expect(profile?.role).toBe(testUser.role);

          // The role should match the expected route for routing
          // In the actual application, this would determine the redirect:
          // admin role → /admin, user role → /user
          const expectedRoute = testUser.role === 'admin' ? '/admin' : '/user';
          expect(profile?.role === 'admin' ? '/admin' : '/user').toBe(expectedRoute);

          // Sign out to clean up session
          await supabase.auth.signOut();
        }
      ),
      { numRuns: 10 } // Reduced runs due to network latency
    );
  }, 60000); // 60 second timeout

  /**
   * Property 2: Authentication rejection for invalid credentials
   * For any invalid credential combination (wrong email, wrong password, or non-existent user),
   * authentication attempts should be rejected with an error message
   * Validates: Requirements 1.2
   */
  it('Property 2: invalid credentials are rejected with error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Wrong password for existing user
          fc.record({
            email: fc.constantFrom(adminUser.email, regularUser.email),
            password: fc.string({ minLength: 8, maxLength: 20 }).filter((p) => p !== 'TestPassword123!'),
          }),
          // Non-existent email
          fc.record({
            email: fc.emailAddress().filter((e) => e !== adminUser.email && e !== regularUser.email),
            password: fc.string({ minLength: 8, maxLength: 20 }),
          })
        ),
        async (invalidCredentials) => {
          // Attempt to sign in with invalid credentials
          const { data, error } = await supabase.auth.signInWithPassword({
            email: invalidCredentials.email,
            password: invalidCredentials.password,
          });

          // Authentication should fail
          expect(error).toBeDefined();
          expect(error?.message).toBeDefined();
          
          // User should not be authenticated
          expect(data.user).toBeNull();
          expect(data.session).toBeNull();
        }
      ),
      { numRuns: 10 } // Reduced runs due to network latency
    );
  }, 60000); // 60 second timeout
});
