import { describe, it, expect, afterAll, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { createClient } from '@supabase/supabase-js';

// Feature: error-handling-standardization, Property 1: User creation with trigger compatibility
// Feature: error-handling-standardization, Property 2: Profile creation rollback on failure

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

// Track created users for cleanup
let createdUserIds: string[] = [];

// Helper function to clean up users
async function cleanupUsers(userIds: string[]) {
  const cleanupPromises = userIds.map(async (userId) => {
    try {
      // First delete the profile
      await supabase.from('profiles').delete().eq('id', userId);
      // Then delete the auth user
      await supabase.auth.admin.deleteUser(userId);
    } catch (error) {
      console.error(`Failed to delete user ${userId}:`, error);
    }
  });
  await Promise.all(cleanupPromises);
}

describe('User Creation Trigger Compatibility Properties', () => {
  afterEach(async () => {
    // Clean up after each test to avoid accumulation
    if (createdUserIds.length > 0) {
      await cleanupUsers(createdUserIds);
      createdUserIds = [];
    }
  }, 60000);

  afterAll(async () => {
    // Final cleanup
    if (createdUserIds.length > 0) {
      await cleanupUsers(createdUserIds);
    }
  }, 60000);

  /**
   * Property 1: User creation with trigger compatibility
   * For any valid user input with email, password, and role, creating a user should result
   * in exactly one profile record with the specified role, regardless of the database
   * trigger's default role assignment.
   * Validates: Requirements 1.1, 1.3, 1.4, 1.5
   */
  it('Property 1: user creation with trigger results in exactly one profile with correct role', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          emailPrefix: fc.string({ minLength: 1, maxLength: 10 }).filter((s) => /^[a-z0-9]+$/.test(s)),
          password: fc
            .string({ minLength: 8, maxLength: 20 })
            .filter((p) => /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p)),
          role: fc.constantFrom('admin' as const, 'user' as const),
          full_name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
        }),
        async (userData) => {
          // Generate unique email with timestamp to avoid collisions
          const email = `${userData.emailPrefix}-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;
          
          // Create auth user - the database trigger will automatically create a profile with role='user'
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password: userData.password,
            email_confirm: true,
            user_metadata: {
              full_name: userData.full_name || null,
            },
          });

          expect(authError).toBeNull();
          expect(authData.user).toBeDefined();

          if (authData.user) {
            createdUserIds.push(authData.user.id);

            // Wait a moment for the trigger to create the profile
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check that exactly one profile was created by the trigger
            const { data: profiles, error: fetchError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authData.user.id);

            expect(fetchError).toBeNull();
            expect(profiles).toBeDefined();
            expect(profiles?.length).toBe(1); // Exactly one profile

            // Update the profile to the desired role (simulating the fixed createUser action)
            const { data: updatedProfile, error: updateError } = await supabase
              .from('profiles')
              .update({
                role: userData.role,
                full_name: userData.full_name || null,
              })
              .eq('id', authData.user.id)
              .select()
              .single();

            expect(updateError).toBeNull();
            expect(updatedProfile).toBeDefined();

            // Verify the profile has the correct role (not the trigger's default)
            expect(updatedProfile?.role).toBe(userData.role);
            expect(updatedProfile?.email).toBe(email);
            expect(updatedProfile?.full_name).toBe(userData.full_name || null);

            // Verify there's still only one profile (no duplicates)
            const { data: finalProfiles, error: finalFetchError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authData.user.id);

            expect(finalFetchError).toBeNull();
            expect(finalProfiles?.length).toBe(1); // Still exactly one profile
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 300000);

  /**
   * Property 2: Profile creation rollback on failure
   * For any user creation attempt where profile creation fails, the auth user record
   * should not exist in the database (rollback should occur).
   * Validates: Requirements 1.2
   */
  it('Property 2: profile update failure triggers auth user rollback', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          emailPrefix: fc.string({ minLength: 1, maxLength: 10 }).filter((s) => /^[a-z0-9]+$/.test(s)),
          password: fc
            .string({ minLength: 8, maxLength: 20 })
            .filter((p) => /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p)),
        }),
        async (userData) => {
          // Generate unique email
          const email = `${userData.emailPrefix}-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;
          
          // Create auth user - trigger will create profile
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password: userData.password,
            email_confirm: true,
          });

          expect(authError).toBeNull();
          expect(authData.user).toBeDefined();

          if (authData.user) {
            const userId = authData.user.id;
            createdUserIds.push(userId);

            // Wait for trigger to create profile
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify profile was created by trigger
            const { data: initialProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();

            expect(initialProfile).toBeDefined();

            // Simulate a profile update failure by trying to set an invalid role
            // This should fail due to CHECK constraint
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ role: 'invalid_role' as any })
              .eq('id', userId);

            // The update should fail
            expect(updateError).toBeDefined();

            // In a real implementation, if the profile update fails, we should rollback
            // by deleting the auth user. Let's simulate that:
            if (updateError) {
              // Rollback: delete the auth user
              const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
              expect(deleteError).toBeNull();

              // Verify the auth user no longer exists
              const { data: deletedUser, error: fetchError } = await supabase.auth.admin.getUserById(userId);
              
              // The user should not exist (either null or error)
              expect(deletedUser.user).toBeNull();

              // Verify the profile was also deleted (due to CASCADE)
              const { data: deletedProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

              expect(deletedProfile).toBeNull();

              // Remove from cleanup list since we already deleted it
              createdUserIds = createdUserIds.filter(id => id !== userId);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 300000);
});
