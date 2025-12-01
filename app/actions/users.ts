'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from './auth';
import type { ActionResult } from './auth';
import type { CreateUserInput, Profile } from '@/types/database';

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Requirements: minimum 8 characters, at least one uppercase, one lowercase, one number
 */
function isValidPassword(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

/**
 * Create a new user (admin only)
 */
export async function createUser(
  input: CreateUserInput
): Promise<ActionResult<Profile>> {
  try {
    const currentUser = await getCurrentUser();

    // Check if current user is admin
    if (!currentUser || currentUser.role !== 'admin') {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Only administrators can create users',
        },
      };
    }

    // Validate email
    if (!input.email || !isValidEmail(input.email)) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email address',
          field: 'email',
        },
      };
    }

    // Validate password
    if (!input.password || !isValidPassword(input.password)) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message:
            'Password must be at least 8 characters and contain uppercase, lowercase, and numbers',
          field: 'password',
        },
      };
    }

    // Validate role
    if (!input.role || (input.role !== 'admin' && input.role !== 'user')) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Role must be either "admin" or "user"',
          field: 'role',
        },
      };
    }

    // Use admin client for user creation (bypasses RLS)
    const adminClient = createAdminClient();

    // Check if email already exists
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('email')
      .eq('email', input.email)
      .single();

    if (existingProfile) {
      return {
        success: false,
        error: {
          code: 'DUPLICATE_EMAIL',
          message: 'A user with this email already exists',
          field: 'email',
        },
      };
    }

    // Create auth user using admin API
    // The database trigger will automatically create a profile with role='user'
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: input.full_name || null,
      },
    });

    if (authError || !authData.user) {
      return {
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: authError?.message || 'Failed to create user',
        },
      };
    }

    // Wait a moment for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 100));

    // Update the profile role if it's different from the default 'user'
    // The trigger creates the profile with role='user', so we need to update it if admin role is requested
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .update({
        role: input.role,
        full_name: input.full_name || null,
      })
      .eq('id', authData.user.id)
      .select()
      .single();

    if (profileError || !profile) {
      // Rollback: delete the auth user if profile update fails
      await adminClient.auth.admin.deleteUser(authData.user.id);
      
      return {
        success: false,
        error: {
          code: 'PROFILE_ERROR',
          message: 'Failed to create user profile',
        },
      };
    }

    // Create audit log entry
    const supabase = await createClient();
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        action: 'user_created',
        entity_type: 'user',
        entity_id: profile.id,
        entity_data: {
          email: profile.email,
          role: profile.role,
          full_name: profile.full_name,
        },
        performed_by: currentUser.id,
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
      // Don't fail the operation if audit logging fails
    }

    revalidatePath('/admin/users');
    revalidatePath('/admin');

    return {
      success: true,
      data: profile,
    };
  } catch (error) {
    console.error('Create user error:', error);
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
 * Get all users (admin only)
 */
export async function getUsers(): Promise<ActionResult<Profile[]>> {
  try {
    const currentUser = await getCurrentUser();

    // Check if current user is admin
    if (!currentUser || currentUser.role !== 'admin') {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Only administrators can view all users',
        },
      };
    }

    const supabase = await createClient();

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch users',
        },
      };
    }

    return {
      success: true,
      data: profiles || [],
    };
  } catch (error) {
    console.error('Get users error:', error);
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
 * Update a user (admin only)
 */
export async function updateUser(
  userId: string,
  input: Partial<CreateUserInput>
): Promise<ActionResult<Profile>> {
  try {
    const currentUser = await getCurrentUser();

    // Check if current user is admin
    if (!currentUser || currentUser.role !== 'admin') {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Only administrators can update users',
        },
      };
    }

    // Validate email if provided
    if (input.email && !isValidEmail(input.email)) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email address',
          field: 'email',
        },
      };
    }

    // Validate role if provided
    if (input.role && input.role !== 'admin' && input.role !== 'user') {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Role must be either "admin" or "user"',
          field: 'role',
        },
      };
    }

    const adminClient = createAdminClient();

    // Check if user exists
    const { data: existingProfile, error: fetchError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !existingProfile) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      };
    }

    // Check if email is being changed and if it's already in use
    if (input.email && input.email !== existingProfile.email) {
      const { data: duplicateProfile } = await adminClient
        .from('profiles')
        .select('id, email')
        .eq('email', input.email)
        .neq('id', userId)
        .single();

      if (duplicateProfile) {
        return {
          success: false,
          error: {
            code: 'DUPLICATE_EMAIL',
            message: 'A user with this email already exists',
            field: 'email',
          },
        };
      }

      // Update auth user email
      const { error: authError } = await adminClient.auth.admin.updateUserById(
        userId,
        { email: input.email }
      );

      if (authError) {
        return {
          success: false,
          error: {
            code: 'AUTH_ERROR',
            message: 'Failed to update user email',
          },
        };
      }
    }

    // Update password if provided
    if (input.password) {
      if (!isValidPassword(input.password)) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message:
              'Password must be at least 8 characters and contain uppercase, lowercase, and numbers',
            field: 'password',
          },
        };
      }

      const { error: passwordError } = await adminClient.auth.admin.updateUserById(
        userId,
        { password: input.password }
      );

      if (passwordError) {
        return {
          success: false,
          error: {
            code: 'AUTH_ERROR',
            message: 'Failed to update user password',
          },
        };
      }
    }

    // Update profile
    const updateData: any = {};
    if (input.email) updateData.email = input.email;
    if (input.role) updateData.role = input.role;
    if (input.full_name !== undefined) updateData.full_name = input.full_name || null;

    const { data: profile, error: updateError } = await adminClient
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (updateError || !profile) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update user profile',
        },
      };
    }

    // Create audit log entry
    const supabase = await createClient();
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        action: 'user_updated',
        entity_type: 'user',
        entity_id: userId,
        entity_data: {
          email: profile.email,
          role: profile.role,
          full_name: profile.full_name,
          changes: updateData,
        },
        performed_by: currentUser.id,
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
      // Don't fail the operation if audit logging fails
    }

    revalidatePath('/admin/users');
    revalidatePath('/admin');

    return {
      success: true,
      data: profile,
    };
  } catch (error) {
    console.error('Update user error:', error);
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
 * Delete a user (admin only)
 */
export async function deleteUser(userId: string): Promise<ActionResult<void>> {
  try {
    const currentUser = await getCurrentUser();

    // Check if current user is admin
    if (!currentUser || currentUser.role !== 'admin') {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Only administrators can delete users',
        },
      };
    }

    // Prevent deleting yourself
    if (currentUser.id === userId) {
      return {
        success: false,
        error: {
          code: 'INVALID_OPERATION',
          message: 'You cannot delete your own account',
        },
      };
    }

    const adminClient = createAdminClient();

    // Check if user exists
    const { data: user, error: fetchError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      };
    }

    // Create audit log entry before deletion
    const supabase = await createClient();
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        action: 'user_deleted',
        entity_type: 'user',
        entity_id: userId,
        entity_data: {
          email: user.email,
          role: user.role,
          full_name: user.full_name,
        },
        performed_by: currentUser.id,
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
      // Don't fail the operation if audit logging fails
    }

    // Delete auth user (this will cascade delete the profile due to ON DELETE CASCADE)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      return {
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Failed to delete user',
        },
      };
    }

    revalidatePath('/admin/users');
    revalidatePath('/admin');

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error('Delete user error:', error);
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
      },
    };
  }
}
