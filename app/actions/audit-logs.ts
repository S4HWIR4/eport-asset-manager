'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from './auth';
import type { ActionResult } from './auth';
import type { AuditLog } from '@/types/database';

export interface AuditLogWithPerformer extends AuditLog {
  performer?: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get audit logs with optional filtering (admin only)
 */
export async function getAuditLogs(
  filters: AuditLogFilters = {}
): Promise<ActionResult<{ logs: AuditLogWithPerformer[]; total: number }>> {
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

    // Build query
    let query = supabase
      .from('audit_logs')
      .select(
        `
        *,
        performer:profiles!audit_logs_performed_by_fkey(id, email, full_name)
      `,
        { count: 'exact' }
      );

    // Apply filters
    if (filters.userId) {
      query = query.eq('performed_by', filters.userId);
    }

    if (filters.action) {
      query = query.eq('action', filters.action);
    }

    if (filters.entityType) {
      query = query.eq('entity_type', filters.entityType);
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters.endDate) {
      // Add one day to include the entire end date
      const endDate = new Date(filters.endDate);
      endDate.setDate(endDate.getDate() + 1);
      query = query.lt('created_at', endDate.toISOString());
    }

    // Apply pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: logs, error, count } = await query;

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
      data: {
        logs: logs || [],
        total: count || 0,
      },
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
 * Get audit logs for a specific entity
 * Admins can view all entity logs, users can only view logs for their own assets
 */
export async function getEntityAuditLogs(
  entityId: string
): Promise<ActionResult<AuditLogWithPerformer[]>> {
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

    // If user is not admin, verify they own the asset
    if (currentUser.role !== 'admin') {
      const { data: asset, error: assetError } = await supabase
        .from('assets')
        .select('created_by')
        .eq('id', entityId)
        .single();

      if (assetError || !asset) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Asset not found',
          },
        };
      }

      if (asset.created_by !== currentUser.id) {
        return {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You do not have permission to view this audit log',
          },
        };
      }
    }

    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select(
        `
        *,
        performer:profiles!audit_logs_performed_by_fkey(id, email, full_name)
      `
      )
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get entity audit logs error:', error);
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
    console.error('Get entity audit logs error:', error);
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
 * Get all users for filter dropdown (admin only)
 */
export async function getUsersForFilter(): Promise<
  ActionResult<{ id: string; email: string; full_name: string | null }[]>
> {
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
          message: 'Only administrators can view users',
        },
      };
    }

    const supabase = await createClient();

    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .order('email');

    if (error) {
      console.error('Get users for filter error:', error);
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
      data: users || [],
    };
  } catch (error) {
    console.error('Get users for filter error:', error);
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
      },
    };
  }
}
