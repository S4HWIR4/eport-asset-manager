'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; field?: string; details?: Record<string, string> } };

/**
 * Sign in with email and password
 */
export async function signIn(
  email: string,
  password: string
): Promise<ActionResult<{ role: string }>> {
  try {
    const supabase = await createClient();

    // Attempt to sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return {
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Invalid email or password',
        },
      };
    }

    if (!authData.user) {
      return {
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication failed',
        },
      };
    }

    // Get user profile to determine role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      return {
        success: false,
        error: {
          code: 'PROFILE_ERROR',
          message: 'User profile not found',
        },
      };
    }

    revalidatePath('/', 'layout');

    return {
      success: true,
      data: { role: profile.role },
    };
  } catch (error) {
    console.error('Sign in error:', error);
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
      },
    };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        error: {
          code: 'SIGNOUT_ERROR',
          message: error.message,
        },
      };
    }

    revalidatePath('/', 'layout');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Sign out error:', error);
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
      },
    };
  }
}

/**
 * Get the current authenticated user with their profile
 */
export async function getCurrentUser() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return null;
    }

    return {
      id: user.id,
      email: user.email!,
      role: profile.role,
      full_name: profile.full_name,
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}
