'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from './auth';
import type { ActionResult } from './auth';
import type { Asset, CreateAssetInput } from '@/types/database';

/**
 * Create a new asset
 */
export async function createAsset(
  input: CreateAssetInput
): Promise<ActionResult<Asset>> {
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

    // Validate required fields
    const errors: Record<string, string> = {};

    if (!input.name || input.name.trim().length === 0) {
      errors.name = 'Asset name is required';
    }

    if (!input.category_id) {
      errors.category_id = 'Category is required';
    }

    if (!input.department_id) {
      errors.department_id = 'Department is required';
    }

    if (!input.date_purchased) {
      errors.date_purchased = 'Purchase date is required';
    }

    if (input.cost === undefined || input.cost === null) {
      errors.cost = 'Cost is required';
    }

    // Validate positive cost
    if (input.cost !== undefined && input.cost !== null && input.cost <= 0) {
      errors.cost = 'Cost must be a positive value';
    }

    // Validate past/present date only
    if (input.date_purchased) {
      const purchaseDate = new Date(input.date_purchased);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      
      if (purchaseDate > today) {
        errors.date_purchased = 'Purchase date cannot be in the future';
      }
    }

    if (Object.keys(errors).length > 0) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please fix the validation errors',
          field: Object.keys(errors)[0],
          details: errors,
        },
      };
    }

    const supabase = await createClient();

    // Verify category exists
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('id', input.category_id)
      .single();

    if (!category) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid category selected',
          field: 'category_id',
        },
      };
    }

    // Verify department exists
    const { data: department } = await supabase
      .from('departments')
      .select('id')
      .eq('id', input.department_id)
      .single();

    if (!department) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid department selected',
          field: 'department_id',
        },
      };
    }

    // Create asset with current user as creator
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .insert({
        name: input.name.trim(),
        category_id: input.category_id,
        department_id: input.department_id,
        date_purchased: input.date_purchased,
        cost: input.cost,
        created_by: currentUser.id,
      })
      .select()
      .single();

    if (assetError || !asset) {
      console.error('Asset creation error:', assetError);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to create asset',
        },
      };
    }

    // Create audit log entry
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        action: 'asset_created',
        entity_type: 'asset',
        entity_id: asset.id,
        entity_data: {
          name: asset.name,
          category_id: asset.category_id,
          department_id: asset.department_id,
          cost: asset.cost,
          date_purchased: asset.date_purchased,
        },
        performed_by: currentUser.id,
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
      // Don't fail the operation if audit logging fails
    }

    revalidatePath('/user');
    revalidatePath('/admin/assets');
    revalidatePath('/admin');

    return {
      success: true,
      data: asset,
    };
  } catch (error) {
    console.error('Create asset error:', error);
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
 * Get assets for the current user
 */
export async function getMyAssets(): Promise<ActionResult<Asset[]>> {
  try {
    const currentUser = await getCurrentUser();

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

    const { data: assets, error } = await supabase
      .from('assets')
      .select(`
        *,
        category:categories(id, name),
        department:departments(id, name),
        updater:profiles!assets_updated_by_fkey(id, email, full_name)
      `)
      .eq('created_by', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get my assets error:', error);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch assets',
        },
      };
    }

    return {
      success: true,
      data: assets || [],
    };
  } catch (error) {
    console.error('Get my assets error:', error);
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
 * Get all assets (admin only)
 */
export async function getAllAssets(): Promise<ActionResult<Asset[]>> {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      };
    }

    if (currentUser.role !== 'admin') {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Only administrators can view all assets',
        },
      };
    }

    const supabase = await createClient();

    const { data: assets, error } = await supabase
      .from('assets')
      .select(`
        *,
        category:categories(id, name),
        department:departments(id, name),
        creator:profiles!assets_created_by_fkey(id, email, full_name),
        updater:profiles!assets_updated_by_fkey(id, email, full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get all assets error:', error);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch assets',
        },
      };
    }

    return {
      success: true,
      data: assets || [],
    };
  } catch (error) {
    console.error('Get all assets error:', error);
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
 * Update an asset
 */
export async function updateAsset(
  assetId: string,
  input: CreateAssetInput
): Promise<ActionResult<Asset>> {
  try {
    const currentUser = await getCurrentUser();

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

    // Check if asset exists and user has permission
    const { data: existingAsset, error: fetchError } = await supabase
      .from('assets')
      .select('*')
      .eq('id', assetId)
      .single();

    if (fetchError || !existingAsset) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Asset not found',
        },
      };
    }

    // Check permissions: users can only edit their own assets, admins can edit any
    if (currentUser.role !== 'admin' && existingAsset.created_by !== currentUser.id) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'You do not have permission to edit this asset',
        },
      };
    }

    // Validate required fields
    const errors: Record<string, string> = {};

    if (!input.name || input.name.trim().length === 0) {
      errors.name = 'Asset name is required';
    }

    if (!input.category_id) {
      errors.category_id = 'Category is required';
    }

    if (!input.department_id) {
      errors.department_id = 'Department is required';
    }

    if (!input.date_purchased) {
      errors.date_purchased = 'Purchase date is required';
    }

    if (input.cost === undefined || input.cost === null) {
      errors.cost = 'Cost is required';
    }

    // Validate positive cost
    if (input.cost !== undefined && input.cost !== null && input.cost <= 0) {
      errors.cost = 'Cost must be a positive value';
    }

    // Validate past/present date only
    if (input.date_purchased) {
      const purchaseDate = new Date(input.date_purchased);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      if (purchaseDate > today) {
        errors.date_purchased = 'Purchase date cannot be in the future';
      }
    }

    if (Object.keys(errors).length > 0) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please fix the validation errors',
          field: Object.keys(errors)[0],
          details: errors,
        },
      };
    }

    // Verify category exists
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('id', input.category_id)
      .single();

    if (!category) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid category selected',
          field: 'category_id',
        },
      };
    }

    // Verify department exists
    const { data: department } = await supabase
      .from('departments')
      .select('id')
      .eq('id', input.department_id)
      .single();

    if (!department) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid department selected',
          field: 'department_id',
        },
      };
    }

    // Get category and department names for audit logging
    const { data: oldCategory } = await supabase
      .from('categories')
      .select('name')
      .eq('id', existingAsset.category_id)
      .single();

    const { data: oldDepartment } = await supabase
      .from('departments')
      .select('name')
      .eq('id', existingAsset.department_id)
      .single();

    const { data: newCategory } = await supabase
      .from('categories')
      .select('name')
      .eq('id', input.category_id)
      .single();

    const { data: newDepartment } = await supabase
      .from('departments')
      .select('name')
      .eq('id', input.department_id)
      .single();

    // Update asset
    const { data: asset, error: updateError } = await supabase
      .from('assets')
      .update({
        name: input.name.trim(),
        category_id: input.category_id,
        department_id: input.department_id,
        date_purchased: input.date_purchased,
        cost: input.cost,
        updated_by: currentUser.id,
      })
      .eq('id', assetId)
      .select()
      .single();

    if (updateError || !asset) {
      console.error('Asset update error:', updateError);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update asset',
        },
      };
    }

    // Create audit log entry with all changes
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        action: 'asset_updated',
        entity_type: 'asset',
        entity_id: assetId,
        entity_data: {
          name: asset.name,
          category_id: asset.category_id,
          category_name: newCategory?.name,
          department_id: asset.department_id,
          department_name: newDepartment?.name,
          cost: asset.cost,
          date_purchased: asset.date_purchased,
          old_name: existingAsset.name,
          old_category_id: existingAsset.category_id,
          old_category_name: oldCategory?.name,
          old_department_id: existingAsset.department_id,
          old_department_name: oldDepartment?.name,
          old_cost: existingAsset.cost,
          old_date_purchased: existingAsset.date_purchased,
        },
        performed_by: currentUser.id,
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
      // Don't fail the operation if audit logging fails
    }

    revalidatePath('/user');
    revalidatePath('/admin/assets');
    revalidatePath('/admin');

    return {
      success: true,
      data: asset,
    };
  } catch (error) {
    console.error('Update asset error:', error);
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
 * Get admin statistics
 */
export async function getAdminStats(): Promise<ActionResult<{
  totalUsers: number;
  totalAssets: number;
  totalCategories: number;
  totalDepartments: number;
}>> {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      };
    }

    if (currentUser.role !== 'admin') {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Only administrators can view system statistics',
        },
      };
    }

    const supabase = await createClient();

    // Get counts for all entities
    const [usersResult, assetsResult, categoriesResult, departmentsResult] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('assets').select('id', { count: 'exact', head: true }),
      supabase.from('categories').select('id', { count: 'exact', head: true }),
      supabase.from('departments').select('id', { count: 'exact', head: true }),
    ]);

    if (usersResult.error || assetsResult.error || categoriesResult.error || departmentsResult.error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch statistics',
        },
      };
    }

    return {
      success: true,
      data: {
        totalUsers: usersResult.count || 0,
        totalAssets: assetsResult.count || 0,
        totalCategories: categoriesResult.count || 0,
        totalDepartments: departmentsResult.count || 0,
      },
    };
  } catch (error) {
    console.error('Get admin stats error:', error);
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
 * Get recent audit logs (admin only)
 */
export async function getRecentAuditLogs(limit: number = 10): Promise<ActionResult<any[]>> {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      };
    }

    if (currentUser.role !== 'admin') {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Only administrators can view audit logs',
        },
      };
    }

    const supabase = await createClient();

    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        performer:profiles!audit_logs_performed_by_fkey(id, email, full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Get audit logs error:', error);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch audit logs',
        },
      };
    }

    return {
      success: true,
      data: logs || [],
    };
  } catch (error) {
    console.error('Get audit logs error:', error);
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
 * Bulk import assets from CSV data
 */
export async function bulkImportAssets(input: {
  name: string;
  category: string;
  department: string;
  date_purchased: string;
  cost: number;
}): Promise<ActionResult<Asset>> {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      };
    }

    if (currentUser.role !== 'admin') {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Only administrators can bulk import assets',
        },
      };
    }

    const supabase = await createClient();

    // Find or create category
    let categoryId: string;
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .ilike('name', input.category)
      .single();

    if (existingCategory) {
      categoryId = existingCategory.id;
    } else {
      const { data: newCategory, error: categoryError } = await supabase
        .from('categories')
        .insert({ name: input.category, created_by: currentUser.id })
        .select('id')
        .single();

      if (categoryError || !newCategory) {
        return {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: `Failed to create category: ${input.category}`,
          },
        };
      }
      categoryId = newCategory.id;
    }

    // Find or create department
    let departmentId: string;
    const { data: existingDepartment } = await supabase
      .from('departments')
      .select('id')
      .ilike('name', input.department)
      .single();

    if (existingDepartment) {
      departmentId = existingDepartment.id;
    } else {
      const { data: newDepartment, error: departmentError } = await supabase
        .from('departments')
        .insert({ name: input.department, created_by: currentUser.id })
        .select('id')
        .single();

      if (departmentError || !newDepartment) {
        return {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: `Failed to create department: ${input.department}`,
          },
        };
      }
      departmentId = newDepartment.id;
    }

    // Create asset
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .insert({
        name: input.name.trim(),
        category_id: categoryId,
        department_id: departmentId,
        date_purchased: input.date_purchased,
        cost: input.cost,
        created_by: currentUser.id,
      })
      .select()
      .single();

    if (assetError || !asset) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to create asset',
        },
      };
    }

    // Create audit log entry
    await supabase.from('audit_logs').insert({
      action: 'asset_created',
      entity_type: 'asset',
      entity_id: asset.id,
      entity_data: {
        name: asset.name,
        category_id: asset.category_id,
        department_id: asset.department_id,
        cost: asset.cost,
        date_purchased: asset.date_purchased,
        bulk_import: true,
      },
      performed_by: currentUser.id,
    });

    return {
      success: true,
      data: asset,
    };
  } catch (error) {
    console.error('Bulk import asset error:', error);
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
 * Delete an asset (admin only)
 * This is a direct deletion that bypasses the deletion request workflow.
 * If a pending deletion request exists for this asset, it will be automatically approved.
 */
export async function deleteAsset(assetId: string): Promise<ActionResult<void>> {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      };
    }

    if (currentUser.role !== 'admin') {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Only administrators can delete assets',
        },
      };
    }

    const supabase = await createClient();

    // First, get the asset data for audit logging
    const { data: asset, error: fetchError } = await supabase
      .from('assets')
      .select('*')
      .eq('id', assetId)
      .single();

    if (fetchError || !asset) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Asset not found',
        },
      };
    }

    // Get category and department names separately for audit log
    const { data: category } = await supabase
      .from('categories')
      .select('name')
      .eq('id', asset.category_id)
      .single();

    const { data: department } = await supabase
      .from('departments')
      .select('name')
      .eq('id', asset.department_id)
      .single();

    const { data: creator } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', asset.created_by)
      .single();

    // Check for pending deletion request
    const { data: pendingRequest } = await supabase
      .from('deletion_requests')
      .select('id, asset_name, justification')
      .eq('asset_id', assetId)
      .eq('status', 'pending')
      .maybeSingle();

    // Delete the asset
    const { error: deleteError } = await supabase
      .from('assets')
      .delete()
      .eq('id', assetId);

    if (deleteError) {
      console.error('Delete asset error:', deleteError);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to delete asset',
        },
      };
    }

    // If there was a pending deletion request, mark it as approved
    if (pendingRequest) {
      const { error: updateRequestError } = await supabase
        .from('deletion_requests')
        .update({
          status: 'approved',
          reviewed_by: currentUser.id,
          reviewer_email: currentUser.email,
          review_comment: 'Auto-approved via direct admin deletion',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', pendingRequest.id);

      if (updateRequestError) {
        console.error('Update deletion request error:', updateRequestError);
        // Don't fail the operation if this fails
      }

      // Create audit log for the deletion request approval
      const { error: requestAuditError } = await supabase
        .from('audit_logs')
        .insert({
          action: 'deletion_request_approved',
          entity_type: 'deletion_request',
          entity_id: pendingRequest.id,
          entity_data: {
            asset_id: assetId,
            asset_name: pendingRequest.asset_name,
            review_comment: 'Auto-approved via direct admin deletion',
            direct_deletion: true,
          },
          performed_by: currentUser.id,
        });

      if (requestAuditError) {
        console.error('Deletion request audit log error:', requestAuditError);
        // Don't fail the operation if audit logging fails
      }
    }

    // Create audit log entry for the asset deletion
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        action: 'asset_deleted',
        entity_type: 'asset',
        entity_id: assetId,
        entity_data: {
          name: asset.name,
          category: category?.name,
          department: department?.name,
          cost: asset.cost,
          date_purchased: asset.date_purchased,
          created_by: asset.created_by,
          creator_email: creator?.email,
          direct_deletion: true, // Flag to indicate this was a direct admin deletion
          had_pending_request: !!pendingRequest, // Indicate if there was a pending request
        },
        performed_by: currentUser.id,
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
      // Don't fail the operation if audit logging fails
    }

    revalidatePath('/admin/assets');
    revalidatePath('/admin/deletion-requests');
    revalidatePath('/admin');

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error('Delete asset error:', error);
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
      },
    };
  }
}
