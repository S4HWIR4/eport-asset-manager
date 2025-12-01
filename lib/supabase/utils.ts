import { createClient as createServerClient } from './server';
import type { Profile, UserRole } from '@/types/database';

/**
 * Gets the current authenticated user's profile
 * Returns null if not authenticated
 */
export async function getCurrentUserProfile(): Promise<Profile | null> {
  const supabase = await createServerClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}

/**
 * Checks if the current user has admin role
 */
export async function isAdmin(): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  return profile?.role === 'admin';
}

/**
 * Checks if the current user has a specific role
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  return profile?.role === role;
}

/**
 * Gets the current user's ID
 * Returns null if not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createServerClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}
