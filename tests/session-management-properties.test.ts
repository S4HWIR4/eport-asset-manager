import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { fc } from '@fast-check/vitest';
import { createClient } from '@supabase/supabase-js';

// Feature: asset-manager-app, Property 3: Session expiration enforcement

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

let testUser: { email: string; password: string; id: string };

describe('Session Management Properties', () => {
  beforeAll(async () => {
    // Create a test user for session management tests
    const userEmail = `test-session-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: userEmail,
      password: password,
      email_confirm: true,
    });

    if (userError || !userData.user) {
      throw new Error(`Failed to create test user: ${userError?.message}`);
    }

    testUser = { email: userEmail, password, id: userData.user.id };
  });

  afterAll(async () => {
    // Clean up test user
    if (testUser) {
      await supabase.auth.admin.deleteUser(testUser.id);
    }
  });

  /**
   * Property 3: Session expiration enforcement
   * For any expired session, attempts to access protected resources should require re-authentication
   * Validates: Requirements 1.5
   * 
   * Note: This test verifies that when a session is explicitly invalidated,
   * subsequent requests fail authentication. In a real-world scenario, sessions
   * would expire naturally after a timeout period.
   */
  it('Property 3: expired sessions require re-authentication', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(testUser),
        async (user) => {
          // Create a new client for this test iteration
          const testClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          });

          // Sign in to create a session
          const { data: signInData, error: signInError } = await testClient.auth.signInWithPassword({
            email: user.email,
            password: user.password,
          });

          expect(signInError).toBeNull();
          expect(signInData.session).toBeDefined();
          expect(signInData.user).toBeDefined();

          // Verify we can access protected resources with valid session
          const { data: profileBefore, error: profileBeforeError } = await testClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          expect(profileBeforeError).toBeNull();
          expect(profileBefore).toBeDefined();

          // Invalidate the session by signing out
          await testClient.auth.signOut();

          // Verify session is no longer valid
          const { data: sessionData } = await testClient.auth.getSession();
          expect(sessionData.session).toBeNull();

          // Attempt to access protected resources with expired session
          // This should fail because the session is no longer valid
          const { data: userData } = await testClient.auth.getUser();
          expect(userData.user).toBeNull();

          // Attempting to query protected data should also fail or return no results
          // due to RLS policies requiring authentication
          const { data: profileAfter, error: profileAfterError } = await testClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          // With no valid session, RLS should prevent access
          // The query may return null data or an error depending on RLS configuration
          expect(profileAfter === null || profileAfterError !== null).toBe(true);
        }
      ),
      { numRuns: 10 } // Reduced runs due to network latency
    );
  }, 60000); // 60 second timeout
});
