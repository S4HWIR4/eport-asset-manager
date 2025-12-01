'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from './auth';
import type { ActionResult } from './auth';
import type { Department, CreateDepartmentInput } from '@/types/database';

/**
 * Create a new department (admin only)
 */
export async function createDepartment(
  input: CreateDepartmentInput
): Promise<ActionResult<Department>> {
  try {
    const currentUser = await getCurrentUser();

    // Check if current user is admin
    if (!currentUser || currentUser.role !== 'admin') {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Only administrators can create departments',
        },
      };
    }

    // Validate name is not empty or whitespace only
    if (!input.name || input.name.trim().length === 0) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Department name cannot be empty',
          field: 'name',
        },
      };
    }

    const supabase = await createClient();

    // Check if department with same name already exists
    const { data: existingDepartment } = await supabase
      .from('departments')
      .select('name')
      .eq('name', input.name.trim())
      .single();

    if (existingDepartment) {
      return {
        success: false,
        error: {
          code: 'DUPLICATE_NAME',
          message: 'A department with this name already exists',
          field: 'name',
        },
      };
    }

    // Create department
    const { data: department, error: departmentError } = await supabase
      .from('departments')
      .insert({
        name: input.name.trim(),
        created_by: currentUser.id,
      })
      .select()
      .single();

    if (departmentError || !department) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to create department',
        },
      };
    }

    // Create audit log entry
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        action: 'department_created',
        entity_type: 'department',
        entity_id: department.id,
        entity_data: {
          name: department.name,
        },
        performed_by: currentUser.id,
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
      // Don't fail the operation if audit logging fails
    }

    revalidatePath('/admin/departments');
    revalidatePath('/admin');

    return {
      success: true,
      data: department,
    };
  } catch (error) {
    console.error('Create department error:', error);
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
 * Get all departments
 */
export async function getDepartments(): Promise<ActionResult<Department[]>> {
  try {
    const currentUser = await getCurrentUser();

    // Check if user is authenticated
    if (!currentUser) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      };
    }

    const supabase = await createClient();

    const { data: departments, error } = await supabase
      .from('departments')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch departments',
        },
      };
    }

    return {
      success: true,
      data: departments || [],
    };
  } catch (error) {
    console.error('Get departments error:', error);
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
 * Update a department (admin only)
 */
export async function updateDepartment(
  departmentId: string,
  input: CreateDepartmentInput
): Promise<ActionResult<Department>> {
  try {
    const currentUser = await getCurrentUser();

    // Check if current user is admin
    if (!currentUser || currentUser.role !== 'admin') {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Only administrators can update departments',
        },
      };
    }

    // Validate name is not empty or whitespace only
    if (!input.name || input.name.trim().length === 0) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Department name cannot be empty',
          field: 'name',
        },
      };
    }

    const supabase = await createClient();

    // Check if department exists
    const { data: existingDepartment, error: fetchError } = await supabase
      .from('departments')
      .select('*')
      .eq('id', departmentId)
      .single();

    if (fetchError || !existingDepartment) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Department not found',
        },
      };
    }

    // Check if another department with same name already exists
    const { data: duplicateDepartment } = await supabase
      .from('departments')
      .select('id, name')
      .eq('name', input.name.trim())
      .neq('id', departmentId)
      .single();

    if (duplicateDepartment) {
      return {
        success: false,
        error: {
          code: 'DUPLICATE_NAME',
          message: 'A department with this name already exists',
          field: 'name',
        },
      };
    }

    // Update department
    const { data: department, error: updateError } = await supabase
      .from('departments')
      .update({
        name: input.name.trim(),
      })
      .eq('id', departmentId)
      .select()
      .single();

    if (updateError || !department) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update department',
        },
      };
    }

    // Create audit log entry
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        action: 'department_updated',
        entity_type: 'department',
        entity_id: departmentId,
        entity_data: {
          name: department.name,
          old_name: existingDepartment.name,
        },
        performed_by: currentUser.id,
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
      // Don't fail the operation if audit logging fails
    }

    revalidatePath('/admin/departments');
    revalidatePath('/admin');

    return {
      success: true,
      data: department,
    };
  } catch (error) {
    console.error('Update department error:', error);
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
 * Delete a department (admin only)
 */
export async function deleteDepartment(departmentId: string): Promise<ActionResult<void>> {
  try {
    const currentUser = await getCurrentUser();

    // Check if current user is admin
    if (!currentUser || currentUser.role !== 'admin') {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Only administrators can delete departments',
        },
      };
    }

    const supabase = await createClient();

    // Check if department exists
    const { data: department, error: fetchError } = await supabase
      .from('departments')
      .select('*')
      .eq('id', departmentId)
      .single();

    if (fetchError || !department) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Department not found',
        },
      };
    }

    // Check if department is being used by any assets
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id')
      .eq('department_id', departmentId)
      .limit(1);

    if (assetsError) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to check department usage',
        },
      };
    }

    if (assets && assets.length > 0) {
      return {
        success: false,
        error: {
          code: 'IN_USE',
          message: 'Cannot delete department that is assigned to assets',
        },
      };
    }

    // Delete department
    const { error: deleteError } = await supabase
      .from('departments')
      .delete()
      .eq('id', departmentId);

    if (deleteError) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to delete department',
        },
      };
    }

    // Create audit log entry
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        action: 'department_deleted',
        entity_type: 'department',
        entity_id: departmentId,
        entity_data: {
          name: department.name,
        },
        performed_by: currentUser.id,
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
      // Don't fail the operation if audit logging fails
    }

    revalidatePath('/admin/departments');
    revalidatePath('/admin');

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error('Delete department error:', error);
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
      },
    };
  }
}
