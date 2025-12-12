/**
 * Warranty Validation System
 * Comprehensive client-side validation for warranty operations
 */

import { z } from 'zod';

// Validation schemas
export const warrantyRegistrationSchema = z.object({
  asset_id: z.string()
    .min(1, 'Asset ID is required')
    .max(100, 'Asset ID must be less than 100 characters'),
  
  asset_name: z.string()
    .min(1, 'Asset name is required')
    .max(200, 'Asset name must be less than 200 characters')
    .regex(/^[a-zA-Z0-9\s\-_.,()]+$/, 'Asset name contains invalid characters'),
  
  user_email: z.string()
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters'),
  
  user_name: z.string()
    .max(100, 'User name must be less than 100 characters')
    .optional(),
  
  warranty_period_months: z.number()
    .int('Warranty period must be a whole number')
    .min(1, 'Warranty period must be at least 1 month')
    .max(120, 'Warranty period cannot exceed 120 months (10 years)')
    .default(12),
  
  notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional(),
});



export const assetIdSchema = z.string()
  .min(1, 'Asset ID is required')
  .max(100, 'Asset ID must be less than 100 characters');

// Validation result types
export interface ValidationResult {
  success: boolean;
  errors: Record<string, string>;
  data?: any;
}

export interface FieldValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate warranty registration data
 */
export function validateWarrantyRegistration(data: any): ValidationResult {
  try {
    const validatedData = warrantyRegistrationSchema.parse(data);
    return {
      success: true,
      errors: {},
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.issues.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return {
        success: false,
        errors,
      };
    }
    return {
      success: false,
      errors: { general: 'Validation failed' },
    };
  }
}



/**
 * Validate asset ID
 */
export function validateAssetId(assetId: string): FieldValidationResult {
  try {
    assetIdSchema.parse(assetId);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        error: error.issues[0]?.message || 'Invalid asset ID',
      };
    }
    return {
      isValid: false,
      error: 'Invalid asset ID',
    };
  }
}

/**
 * Validate individual field with real-time feedback
 */
export function validateField(fieldName: string, value: any, schema: z.ZodSchema): FieldValidationResult {
  try {
    schema.parse(value);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        error: error.issues[0]?.message || `Invalid ${fieldName}`,
      };
    }
    return {
      isValid: false,
      error: `Invalid ${fieldName}`,
    };
  }
}

/**
 * Real-time field validators for forms
 */
export const fieldValidators = {
  assetName: (value: string) => validateField('asset name', value, warrantyRegistrationSchema.shape.asset_name),
  userEmail: (value: string) => validateField('email', value, warrantyRegistrationSchema.shape.user_email),
  userName: (value: string) => validateField('user name', value, warrantyRegistrationSchema.shape.user_name || z.string()),
  warrantyPeriod: (value: number) => validateField('warranty period', value, warrantyRegistrationSchema.shape.warranty_period_months),
  notes: (value: string) => validateField('notes', value, warrantyRegistrationSchema.shape.notes || z.string()),

};

/**
 * Business logic validations
 */
export class WarrantyBusinessValidation {
  /**
   * Check if asset can be registered for warranty
   */
  static canRegisterAsset(asset: any): ValidationResult {
    const errors: Record<string, string> = {};
    
    if (!asset) {
      errors.asset = 'Asset information is required';
      return { success: false, errors };
    }
    
    if (!asset.id) {
      errors.asset_id = 'Asset must have a valid ID';
    }
    
    if (!asset.name) {
      errors.asset_name = 'Asset must have a name';
    }
    
    // Check if asset is too old (optional business rule)
    if (asset.date_purchased) {
      const purchaseDate = new Date(asset.date_purchased);
      const now = new Date();
      const daysSincePurchase = Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSincePurchase > 365 * 5) { // 5 years
        errors.asset_age = 'Asset is too old to register for warranty (purchased more than 5 years ago)';
      }
    }
    
    return {
      success: Object.keys(errors).length === 0,
      errors,
    };
  }
  
  /**
   * Validate warranty period based on asset type/cost
   */
  static validateWarrantyPeriod(warrantyMonths: number, asset?: any): ValidationResult {
    const errors: Record<string, string> = {};
    
    // Basic range validation
    if (warrantyMonths < 1 || warrantyMonths > 120) {
      errors.warranty_period = 'Warranty period must be between 1 and 120 months';
      return { success: false, errors };
    }
    
    // Business rules based on asset cost
    if (asset?.cost) {
      const cost = parseFloat(asset.cost);
      
      if (cost < 100 && warrantyMonths > 12) {
        errors.warranty_period = 'Low-cost assets (under $100) cannot have warranty periods longer than 12 months';
      } else if (cost >= 10000 && warrantyMonths < 12) {
        errors.warranty_period = 'High-value assets ($10,000+) should have warranty periods of at least 12 months';
      }
    }
    
    return {
      success: Object.keys(errors).length === 0,
      errors,
    };
  }
  
  /**
   * Check if user can register warranties
   */
  static canUserRegisterWarranty(user: any): ValidationResult {
    const errors: Record<string, string> = {};
    
    if (!user) {
      errors.user = 'User authentication required';
      return { success: false, errors };
    }
    
    if (!user.email) {
      errors.user_email = 'User must have a valid email address';
    }
    
    // Check if user email is verified (if applicable)
    if (user.email_verified === false) {
      errors.user_verification = 'Email address must be verified to register warranties';
    }
    
    return {
      success: Object.keys(errors).length === 0,
      errors,
    };
  }
  
  /**
   * Validate warranty registration context
   */
  static validateRegistrationContext(data: {
    asset: any;
    user: any;
    warrantyPeriod: number;
  }): ValidationResult {
    const errors: Record<string, string> = {};
    
    // Validate asset
    const assetValidation = this.canRegisterAsset(data.asset);
    if (!assetValidation.success) {
      Object.assign(errors, assetValidation.errors);
    }
    
    // Validate user
    const userValidation = this.canUserRegisterWarranty(data.user);
    if (!userValidation.success) {
      Object.assign(errors, userValidation.errors);
    }
    
    // Validate warranty period
    const periodValidation = this.validateWarrantyPeriod(data.warrantyPeriod, data.asset);
    if (!periodValidation.success) {
      Object.assign(errors, periodValidation.errors);
    }
    
    return {
      success: Object.keys(errors).length === 0,
      errors,
    };
  }
}

/**
 * Sanitize input data
 */
export function sanitizeWarrantyInput(data: any): any {
  return {
    asset_id: String(data.asset_id || '').trim(),
    asset_name: String(data.asset_name || '').trim(),
    user_email: String(data.user_email || '').trim().toLowerCase(),
    user_name: data.user_name ? String(data.user_name).trim() : undefined,
    warranty_period_months: parseInt(String(data.warranty_period_months || 12)),
    notes: data.notes ? String(data.notes).trim() : undefined,
  };
}

/**
 * Get user-friendly error messages
 */
export function getErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (error?.code) {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        return 'Please check your input and try again';
      case 'UNAUTHORIZED':
        return 'You are not authorized to perform this action';
      case 'NETWORK_ERROR':
        return 'Network connection error. Please check your internet connection';
      case 'API_ERROR':
        return 'Service temporarily unavailable. Please try again later';
      default:
        return 'An unexpected error occurred';
    }
  }
  
  return 'An unexpected error occurred';
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: Record<string, string>): string[] {
  return Object.entries(errors).map(([field, message]) => {
    const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return `${fieldName}: ${message}`;
  });
}