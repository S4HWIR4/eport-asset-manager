import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables for testing');
}

/**
 * Create a Supabase client with service role key for testing
 * This bypasses RLS for setup/teardown operations
 */
export function createServiceClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a Supabase client authenticated as a specific user
 * This respects RLS policies
 */
export async function createAuthenticatedClient(
  userId: string,
  email: string,
  password: string
): Promise<SupabaseClient> {
  const client = createClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const { error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(`Failed to authenticate test user: ${error.message}`);
  }

  return client;
}

/**
 * Create a test user with the service client
 */
export async function createTestUser(
  email: string,
  password: string,
  role: 'admin' | 'user'
): Promise<{ id: string; email: string }> {
  const serviceClient = createServiceClient();

  // Create auth user
  const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    throw new Error(`Failed to create test user: ${authError?.message}`);
  }

  // Update profile role
  const { error: profileError } = await serviceClient
    .from('profiles')
    .update({ role })
    .eq('id', authData.user.id);

  if (profileError) {
    throw new Error(`Failed to update test user role: ${profileError.message}`);
  }

  return { id: authData.user.id, email: authData.user.email! };
}

/**
 * Delete a test user
 */
export async function deleteTestUser(userId: string): Promise<void> {
  const serviceClient = createServiceClient();
  
  await serviceClient.auth.admin.deleteUser(userId);
}

/**
 * Clean up test data
 */
export async function cleanupTestData(
  userIds: string[],
  categoryIds: string[] = [],
  departmentIds: string[] = [],
  assetIds: string[] = []
): Promise<void> {
  const serviceClient = createServiceClient();

  // Delete assets first (due to foreign keys)
  if (assetIds.length > 0) {
    await serviceClient.from('assets').delete().in('id', assetIds);
  }

  // Delete categories and departments
  if (categoryIds.length > 0) {
    await serviceClient.from('categories').delete().in('id', categoryIds);
  }
  if (departmentIds.length > 0) {
    await serviceClient.from('departments').delete().in('id', departmentIds);
  }

  // Delete users
  for (const userId of userIds) {
    await deleteTestUser(userId);
  }
}
