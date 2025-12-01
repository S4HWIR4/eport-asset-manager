'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from './auth';
import type { ActionResult } from './auth';
import type { Category, CreateCategoryInput } from '@/types/database';

/**
 * Create a new category (admin only)
 */
export async function createCategory(
  input: CreateCategoryInput
): Promise<ActionResult<Category>> {
  try {
    const currentUser = await getCurrentUser();

    // Check if current user is admin
    if (!currentUser || currentUser.role !== 'admin') {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Only administrators can create categories',
        },
      };
    }

    // Validate name is not empty or whitespace only
    if (!input.name || input.name.trim().length === 0) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Category name cannot be empty',
          field: 'name',
        },
      };
    }

    const supabase = await createClient();

    // Check if category with same name already exists
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('name')
      .eq('name', input.name.trim())
      .single();

    if (existingCategory) {
      return {
        success: false,
        error: {
          code: 'DUPLICATE_NAME',
          message: 'A category with this name already exists',
          field: 'name',
        },
      };
    }

    // Create category
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .insert({
        name: input.name.trim(),
        created_by: currentUser.id,
      })
      .select()
      .single();

    if (categoryError || !category) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to create category',
        },
      };
    }

    // Create audit log entry
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        action: 'category_created',
        entity_type: 'category',
        entity_id: category.id,
        entity_data: {
          name: category.name,
        },
        performed_by: currentUser.id,
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
      // Don't fail the operation if audit logging fails
    }

    revalidatePath('/admin/categories');
    revalidatePath('/admin');

    return {
      success: true,
      data: category,
    };
  } catch (error) {
    console.error('Create category error:', error);
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
 * Get all categories
 */
export async function getCategories(): Promise<ActionResult<Category[]>> {
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

    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch categories',
        },
      };
    }

    return {
      success: true,
      data: categories || [],
    };
  } catch (error) {
    console.error('Get categories error:', error);
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
 * Update a category (admin only)
 */
export async function updateCategory(
  categoryId: string,
  input: CreateCategoryInput
): Promise<ActionResult<Category>> {
  try {
    const currentUser = await getCurrentUser();

    // Check if current user is admin
    if (!currentUser || currentUser.role !== 'admin') {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Only administrators can update categories',
        },
      };
    }

    // Validate name is not empty or whitespace only
    if (!input.name || input.name.trim().length === 0) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Category name cannot be empty',
          field: 'name',
        },
      };
    }

    const supabase = await createClient();

    // Check if category exists
    const { data: existingCategory, error: fetchError } = await supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (fetchError || !existingCategory) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Category not found',
        },
      };
    }

    // Check if another category with same name already exists
    const { data: duplicateCategory } = await supabase
      .from('categories')
      .select('id, name')
      .eq('name', input.name.trim())
      .neq('id', categoryId)
      .single();

    if (duplicateCategory) {
      return {
        success: false,
        error: {
          code: 'DUPLICATE_NAME',
          message: 'A category with this name already exists',
          field: 'name',
        },
      };
    }

    // Update category
    const { data: category, error: updateError } = await supabase
      .from('categories')
      .update({
        name: input.name.trim(),
      })
      .eq('id', categoryId)
      .select()
      .single();

    if (updateError || !category) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update category',
        },
      };
    }

    // Create audit log entry
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        action: 'category_updated',
        entity_type: 'category',
        entity_id: categoryId,
        entity_data: {
          name: category.name,
          old_name: existingCategory.name,
        },
        performed_by: currentUser.id,
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
      // Don't fail the operation if audit logging fails
    }

    revalidatePath('/admin/categories');
    revalidatePath('/admin');

    return {
      success: true,
      data: category,
    };
  } catch (error) {
    console.error('Update category error:', error);
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
 * Delete a category (admin only)
 */
export async function deleteCategory(categoryId: string): Promise<ActionResult<void>> {
  try {
    const currentUser = await getCurrentUser();

    // Check if current user is admin
    if (!currentUser || currentUser.role !== 'admin') {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Only administrators can delete categories',
        },
      };
    }

    const supabase = await createClient();

    // Check if category exists
    const { data: category, error: fetchError } = await supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (fetchError || !category) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Category not found',
        },
      };
    }

    // Check if category is being used by any assets
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id')
      .eq('category_id', categoryId)
      .limit(1);

    if (assetsError) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to check category usage',
        },
      };
    }

    if (assets && assets.length > 0) {
      return {
        success: false,
        error: {
          code: 'IN_USE',
          message: 'Cannot delete category that is assigned to assets',
        },
      };
    }

    // Delete category
    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (deleteError) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to delete category',
        },
      };
    }

    // Create audit log entry
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        action: 'category_deleted',
        entity_type: 'category',
        entity_id: categoryId,
        entity_data: {
          name: category.name,
        },
        performed_by: currentUser.id,
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
      // Don't fail the operation if audit logging fails
    }

    revalidatePath('/admin/categories');
    revalidatePath('/admin');

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error('Delete category error:', error);
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
      },
    };
  }
}
