'use server';

import { getCurrentUser } from './auth';
import type { ActionResult } from './auth';
import { getWarrantyApiClient, WarrantyApiError } from '@/lib/warranty-api-client';

export interface WarrantyRegistration {
  id: number;
  asset_id: string;
  asset_name: string;
  user_email: string;
  user_name?: string;
  registration_date: string;
  status: string;
  warranty_period_months: number;
  notes?: string;
}

export interface WarrantyCreateInput {
  asset_id: string;
  asset_name: string;
  user_email: string;
  user_name?: string;
  warranty_period_months?: number;
  notes?: string;
}

/**
 * Register an asset for warranty
 */
export async function registerAssetWarranty(
  input: WarrantyCreateInput
): Promise<ActionResult<{ warranty_id: number; registration_date: string }>> {
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

    // Validate required fields
    if (!input.asset_id || !input.asset_name) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Asset ID and name are required',
        },
      };
    }

    // Prepare warranty registration data
    const warrantyData = {
      asset_id: input.asset_id,
      asset_name: input.asset_name,
      user_email: input.user_email || currentUser.email,
      user_name: input.user_name || currentUser.full_name,
      warranty_period_months: input.warranty_period_months || 12,
      notes: input.notes,
    };

    // Use centralized API client
    const apiClient = getWarrantyApiClient();
    const result = await apiClient.registerWarranty(warrantyData);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Warranty registration error:', error);
    
    if (error instanceof WarrantyApiError) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      };
    }

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
 * Check warranty status for an asset
 */
export async function checkWarrantyStatus(
  assetId: string
): Promise<ActionResult<{ registered: boolean; warranty_id?: number; registration_date?: string; status?: string }>> {
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

    // Use centralized API client
    const apiClient = getWarrantyApiClient();
    const result = await apiClient.checkWarrantyStatus(assetId);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Warranty status check error:', error);
    
    if (error instanceof WarrantyApiError) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
      },
    };
  }
}

