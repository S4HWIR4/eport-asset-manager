'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from './auth';
import type { ActionResult } from './auth';
import type { DeletionRequest, DeletionRequestStatus, DeletionRequestStats } from '@/types/database';

/**
 * Submit a deletion request for an asset
 */
export async function submitDeletionRequest(
  assetId: string,
  justification: string
): Promise<ActionResult<DeletionRequest>> {
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

    // Validate justification length
    if (!justification || justification.trim().length < 10) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Justification must be at least 10 characters',
          field: 'justification',
        },
      };
    }

    const supabase = await createClient();

    // Get asset and verify ownership
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('id, name, cost, created_by')
      .eq('id', assetId)
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

    // Verify user is asset owner
    if (asset.created_by !== currentUser.id) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'You can only request deletion of assets you created',
        },
      };
    }

    // Check for existing pending request
    const { data: existingRequest } = await supabase
      .from('deletion_requests')
      .select('id')
      .eq('asset_id', assetId)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'This asset already has a pending deletion request',
        },
      };
    }

    // Create deletion request
    const { data: deletionRequest, error: createError } = await supabase
      .from('deletion_requests')
      .insert({
        asset_id: assetId,
        asset_name: asset.name,
        asset_cost: asset.cost,
        requested_by: currentUser.id,
        requester_email: currentUser.email,
        justification: justification.trim(),
        status: 'pending',
      })
      .select()
      .single();

    if (createError || !deletionRequest) {
      console.error('Deletion request creation error:', createError);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to create deletion request',
        },
      };
    }

    // Create audit log entry
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        action: 'deletion_request_submitted',
        entity_type: 'deletion_request',
        entity_id: deletionRequest.id,
        entity_data: {
          asset_id: assetId,
          asset_name: asset.name,
          justification: justification.trim(),
        },
        performed_by: currentUser.id,
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
      // Don't fail the operation if audit logging fails
    }

    revalidatePath('/user');
    revalidatePath('/admin/deletion-requests');

    return {
      success: true,
      data: deletionRequest,
    };
  } catch (error) {
    console.error('Submit deletion request error:', error);
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
 * Cancel a pending deletion request
 */
export async function cancelDeletionRequest(
  requestId: string
): Promise<ActionResult<void>> {
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

    // Get the deletion request
    const { data: request, error: fetchError } = await supabase
      .from('deletion_requests')
      .select('id, asset_id, asset_name, requested_by, status')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Deletion request not found',
        },
      };
    }

    // Verify user is the requester
    if (request.requested_by !== currentUser.id) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'You can only cancel your own deletion requests',
        },
      };
    }

    // Verify request is pending
    if (request.status !== 'pending') {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Only pending requests can be cancelled',
        },
      };
    }

    // Update request status to cancelled
    const { error: updateError } = await supabase
      .from('deletion_requests')
      .update({ status: 'cancelled' })
      .eq('id', requestId);

    if (updateError) {
      console.error('Cancel deletion request error:', updateError);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to cancel deletion request',
        },
      };
    }

    // Create audit log entry
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        action: 'deletion_request_cancelled',
        entity_type: 'deletion_request',
        entity_id: requestId,
        entity_data: {
          asset_id: request.asset_id,
          asset_name: request.asset_name,
        },
        performed_by: currentUser.id,
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
      // Don't fail the operation if audit logging fails
    }

    revalidatePath('/user');
    revalidatePath('/admin/deletion-requests');

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error('Cancel deletion request error:', error);
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
 * Get deletion request for a specific asset
 */
export async function getDeletionRequestForAsset(
  assetId: string
): Promise<ActionResult<DeletionRequest | null>> {
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

    // Get the most recent deletion request for the asset
    const { data: request, error: fetchError } = await supabase
      .from('deletion_requests')
      .select('*')
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('Get deletion request error:', fetchError);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch deletion request',
        },
      };
    }

    return {
      success: true,
      data: request,
    };
  } catch (error) {
    console.error('Get deletion request error:', error);
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
 * Get deletion requests for the current user
 */
export async function getMyDeletionRequests(): Promise<ActionResult<DeletionRequest[]>> {
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

    // Get all deletion requests for the current user with asset details
    const { data: requests, error: fetchError } = await supabase
      .from('deletion_requests')
      .select(`
        *,
        asset:assets(id, name, category_id, department_id, cost, date_purchased)
      `)
      .eq('requested_by', currentUser.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Get my deletion requests error:', fetchError);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch deletion requests',
        },
      };
    }

    return {
      success: true,
      data: requests || [],
    };
  } catch (error) {
    console.error('Get my deletion requests error:', error);
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
 * Get all deletion requests (admin only)
 */
export async function getAllDeletionRequests(
  status?: DeletionRequestStatus,
  page: number = 1,
  pageSize: number = 10
): Promise<ActionResult<{ requests: DeletionRequest[]; total: number; page: number; pageSize: number; totalPages: number }>> {
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
          message: 'Only administrators can view all deletion requests',
        },
      };
    }

    const supabase = await createClient();

    // Build base query for count
    let countQuery = supabase
      .from('deletion_requests')
      .select('*', { count: 'exact', head: true });

    // Apply status filter to count query if provided
    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    // Get total count
    const { count: total, error: countError } = await countQuery;

    if (countError) {
      console.error('Get deletion requests count error:', countError);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch deletion requests count',
        },
      };
    }

    // Calculate pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const totalPages = Math.ceil((total || 0) / pageSize);

    // Build query for data
    let query = supabase
      .from('deletion_requests')
      .select(`
        *,
        requester:profiles!deletion_requests_requested_by_fkey(id, email, full_name),
        reviewer:profiles!deletion_requests_reviewed_by_fkey(id, email, full_name)
      `)
      .order('created_at', { ascending: false })
      .range(from, to);

    // Apply status filter if provided
    if (status) {
      query = query.eq('status', status);
    }

    const { data: requests, error: fetchError } = await query;

    if (fetchError) {
      console.error('Get all deletion requests error:', fetchError);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch deletion requests',
        },
      };
    }

    return {
      success: true,
      data: {
        requests: requests || [],
        total: total || 0,
        page,
        pageSize,
        totalPages,
      },
    };
  } catch (error) {
    console.error('Get all deletion requests error:', error);
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
 * Approve a deletion request (admin only)
 */
export async function approveDeletionRequest(
  requestId: string,
  reviewComment?: string
): Promise<ActionResult<void>> {
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
          message: 'Only administrators can approve deletion requests',
        },
      };
    }

    const supabase = await createClient();

    // Use RPC function for transactional approval
    // This ensures atomicity: either both the asset deletion and request update succeed, or both fail
    const { data: result, error: rpcError } = await supabase
      .rpc('approve_deletion_request', {
        p_request_id: requestId,
        p_reviewer_id: currentUser.id,
        p_reviewer_email: currentUser.email,
        p_review_comment: reviewComment || null,
      });

    if (rpcError) {
      console.error('Approve deletion request RPC error:', rpcError);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to approve deletion request',
        },
      };
    }

    // Check the result from the RPC function
    if (!result || !result.success) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: result?.error || 'Failed to approve deletion request',
        },
      };
    }

    revalidatePath('/user');
    revalidatePath('/admin/assets');
    revalidatePath('/admin/deletion-requests');
    revalidatePath('/admin');

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error('Approve deletion request error:', error);
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
 * Reject a deletion request (admin only)
 */
export async function rejectDeletionRequest(
  requestId: string,
  reviewComment: string
): Promise<ActionResult<void>> {
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
          message: 'Only administrators can reject deletion requests',
        },
      };
    }

    // Validate rejection reason is provided
    if (!reviewComment || reviewComment.trim().length === 0) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'A reason must be provided when rejecting a request',
          field: 'reviewComment',
        },
      };
    }

    const supabase = await createClient();

    // Get the deletion request
    const { data: request, error: fetchError } = await supabase
      .from('deletion_requests')
      .select('id, asset_id, asset_name, status')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Deletion request not found',
        },
      };
    }

    // Verify request is pending
    if (request.status !== 'pending') {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Only pending requests can be rejected',
        },
      };
    }

    // Update deletion request status to rejected
    const { error: updateError } = await supabase
      .from('deletion_requests')
      .update({
        status: 'rejected',
        reviewed_by: currentUser.id,
        reviewer_email: currentUser.email,
        review_comment: reviewComment.trim(),
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Update deletion request error:', updateError);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to reject deletion request',
        },
      };
    }

    // Create audit log entry
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        action: 'deletion_request_rejected',
        entity_type: 'deletion_request',
        entity_id: requestId,
        entity_data: {
          asset_id: request.asset_id,
          asset_name: request.asset_name,
          review_comment: reviewComment.trim(),
        },
        performed_by: currentUser.id,
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
      // Don't fail the operation if audit logging fails
    }

    revalidatePath('/user');
    revalidatePath('/admin/deletion-requests');

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error('Reject deletion request error:', error);
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
 * Get deletion request statistics (admin only)
 */
export async function getDeletionRequestStats(): Promise<ActionResult<DeletionRequestStats>> {
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
          message: 'Only administrators can view deletion request statistics',
        },
      };
    }

    const supabase = await createClient();

    // Get pending count
    const { count: pendingCount, error: pendingError } = await supabase
      .from('deletion_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (pendingError) {
      console.error('Get pending count error:', pendingError);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch statistics',
        },
      };
    }

    // Get approved count in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: approvedCount, error: approvedError } = await supabase
      .from('deletion_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .gte('reviewed_at', thirtyDaysAgo.toISOString());

    if (approvedError) {
      console.error('Get approved count error:', approvedError);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch statistics',
        },
      };
    }

    // Get rejected count in last 30 days
    const { count: rejectedCount, error: rejectedError } = await supabase
      .from('deletion_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'rejected')
      .gte('reviewed_at', thirtyDaysAgo.toISOString());

    if (rejectedError) {
      console.error('Get rejected count error:', rejectedError);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch statistics',
        },
      };
    }

    // Get reviewed requests for average review time calculation
    const { data: reviewedRequests, error: reviewedError } = await supabase
      .from('deletion_requests')
      .select('created_at, reviewed_at')
      .in('status', ['approved', 'rejected'])
      .not('reviewed_at', 'is', null);

    if (reviewedError) {
      console.error('Get reviewed requests error:', reviewedError);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch statistics',
        },
      };
    }

    // Calculate average review time in hours
    let averageReviewTimeHours = 0;
    if (reviewedRequests && reviewedRequests.length > 0) {
      const totalHours = reviewedRequests.reduce((sum, request) => {
        const created = new Date(request.created_at);
        const reviewed = new Date(request.reviewed_at!);
        const hours = (reviewed.getTime() - created.getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);
      averageReviewTimeHours = totalHours / reviewedRequests.length;
    }

    // Get oldest pending request
    const { data: oldestPending, error: oldestError } = await supabase
      .from('deletion_requests')
      .select('created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (oldestError) {
      console.error('Get oldest pending error:', oldestError);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch statistics',
        },
      };
    }

    // Calculate oldest pending days
    let oldestPendingDays = 0;
    if (oldestPending) {
      const created = new Date(oldestPending.created_at);
      const now = new Date();
      oldestPendingDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    }

    const stats: DeletionRequestStats = {
      pending_count: pendingCount || 0,
      approved_last_30_days: approvedCount || 0,
      rejected_last_30_days: rejectedCount || 0,
      average_review_time_hours: Math.round(averageReviewTimeHours * 100) / 100,
      oldest_pending_days: Math.round(oldestPendingDays * 100) / 100,
    };

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    console.error('Get deletion request stats error:', error);
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
 * Get count of pending deletion requests (admin only)
 * Lightweight function for navigation badge
 */
export async function getPendingDeletionRequestsCount(): Promise<ActionResult<number>> {
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
          message: 'Only administrators can view deletion request counts',
        },
      };
    }

    const supabase = await createClient();

    const { count, error } = await supabase
      .from('deletion_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (error) {
      console.error('Get pending count error:', error);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch pending count',
        },
      };
    }

    return {
      success: true,
      data: count || 0,
    };
  } catch (error) {
    console.error('Get pending deletion requests count error:', error);
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
      },
    };
  }
}
