/**
 * Warranty Expiration Tracking and Notifications
 * Handles warranty expiration calculations, notifications, and tracking
 */

import { differenceInDays, addMonths, isAfter, isBefore, format } from 'date-fns';
import type { WarrantyRegistration } from '@/app/actions/warranty';

export type ExpirationStatus = 'active' | 'expiring_soon' | 'expired' | 'not_registered' | 'unknown';

export interface ExpirationInfo {
  status: ExpirationStatus;
  daysRemaining: number;
  expiryDate: Date;
  isExpired: boolean;
  isExpiringSoon: boolean;
  warningLevel: 'none' | 'info' | 'warning' | 'critical';
  message: string;
}

export interface ExpirationNotification {
  id: string;
  assetId: string;
  assetName: string;
  warrantyId: number;
  status: ExpirationStatus;
  daysRemaining: number;
  expiryDate: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  actionRequired: boolean;
}

/**
 * Calculate warranty expiration information
 */
export function calculateWarrantyExpiration(
  registrationDate: string | Date,
  warrantyPeriodMonths: number
): ExpirationInfo {
  const startDate = new Date(registrationDate);
  const expiryDate = addMonths(startDate, warrantyPeriodMonths);
  const today = new Date();
  
  const daysRemaining = differenceInDays(expiryDate, today);
  const isExpired = isAfter(today, expiryDate);
  const isExpiringSoon = !isExpired && daysRemaining <= 30; // 30 days warning
  
  let status: ExpirationStatus;
  let warningLevel: 'none' | 'info' | 'warning' | 'critical';
  let message: string;
  
  if (isExpired) {
    status = 'expired';
    warningLevel = 'critical';
    message = `Warranty expired ${Math.abs(daysRemaining)} days ago`;
  } else if (daysRemaining <= 7) {
    status = 'expiring_soon';
    warningLevel = 'critical';
    message = `Warranty expires in ${daysRemaining} days`;
  } else if (daysRemaining <= 30) {
    status = 'expiring_soon';
    warningLevel = 'warning';
    message = `Warranty expires in ${daysRemaining} days`;
  } else if (daysRemaining <= 90) {
    status = 'active';
    warningLevel = 'info';
    message = `Warranty expires in ${daysRemaining} days`;
  } else {
    status = 'active';
    warningLevel = 'none';
    message = `Warranty active until ${format(expiryDate, 'MMM dd, yyyy')}`;
  }
  
  return {
    status,
    daysRemaining,
    expiryDate,
    isExpired,
    isExpiringSoon,
    warningLevel,
    message,
  };
}

/**
 * Get warranty status from registration data
 */
export function getWarrantyStatus(warranty: WarrantyRegistration): ExpirationInfo {
  return calculateWarrantyExpiration(
    warranty.registration_date,
    warranty.warranty_period_months
  );
}

/**
 * Generate expiration notifications for warranties
 */
export function generateExpirationNotifications(
  warranties: WarrantyRegistration[],
  options: {
    includeCritical?: boolean;
    includeWarning?: boolean;
    includeInfo?: boolean;
    daysAhead?: number;
  } = {}
): ExpirationNotification[] {
  const {
    includeCritical = true,
    includeWarning = true,
    includeInfo = false,
    daysAhead = 90,
  } = options;
  
  const notifications: ExpirationNotification[] = [];
  
  warranties.forEach((warranty) => {
    const expiration = getWarrantyStatus(warranty);
    
    // Skip if warranty is too far in the future
    if (expiration.daysRemaining > daysAhead && !expiration.isExpired) {
      return;
    }
    
    // Filter by warning level
    if (
      (expiration.warningLevel === 'critical' && !includeCritical) ||
      (expiration.warningLevel === 'warning' && !includeWarning) ||
      (expiration.warningLevel === 'info' && !includeInfo)
    ) {
      return;
    }
    
    let priority: 'low' | 'medium' | 'high' | 'critical';
    let actionRequired = false;
    
    if (expiration.isExpired) {
      priority = 'critical';
      actionRequired = true;
    } else if (expiration.daysRemaining <= 7) {
      priority = 'critical';
      actionRequired = true;
    } else if (expiration.daysRemaining <= 30) {
      priority = 'high';
      actionRequired = true;
    } else if (expiration.daysRemaining <= 90) {
      priority = 'medium';
      actionRequired = false;
    } else {
      priority = 'low';
      actionRequired = false;
    }
    
    notifications.push({
      id: `warranty_${warranty.id}_expiration`,
      assetId: warranty.asset_id,
      assetName: warranty.asset_name,
      warrantyId: warranty.id,
      status: expiration.status,
      daysRemaining: expiration.daysRemaining,
      expiryDate: expiration.expiryDate,
      priority,
      message: expiration.message,
      actionRequired,
    });
  });
  
  // Sort by priority and days remaining
  return notifications.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const aPriority = priorityOrder[a.priority];
    const bPriority = priorityOrder[b.priority];
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    return a.daysRemaining - b.daysRemaining;
  });
}

/**
 * Get warranty statistics for dashboard
 */
export function getWarrantyStatistics(warranties: WarrantyRegistration[]) {
  const stats = {
    total: warranties.length,
    active: 0,
    expiring_soon: 0,
    expired: 0,
    expiring_this_month: 0,
    expiring_next_month: 0,
    average_days_remaining: 0,
  };
  
  let totalDaysRemaining = 0;
  let activeWarranties = 0;
  
  warranties.forEach((warranty) => {
    const expiration = getWarrantyStatus(warranty);
    
    switch (expiration.status) {
      case 'active':
        stats.active++;
        break;
      case 'expiring_soon':
        stats.expiring_soon++;
        break;
      case 'expired':
        stats.expired++;
        break;
    }
    
    if (!expiration.isExpired) {
      activeWarranties++;
      totalDaysRemaining += expiration.daysRemaining;
      
      if (expiration.daysRemaining <= 30) {
        stats.expiring_this_month++;
      } else if (expiration.daysRemaining <= 60) {
        stats.expiring_next_month++;
      }
    }
  });
  
  stats.average_days_remaining = activeWarranties > 0 
    ? Math.round(totalDaysRemaining / activeWarranties)
    : 0;
  
  return stats;
}

/**
 * Filter warranties by expiration status
 */
export function filterWarrantiesByExpiration(
  warranties: WarrantyRegistration[],
  status: ExpirationStatus | 'all'
): WarrantyRegistration[] {
  if (status === 'all') {
    return warranties;
  }
  
  return warranties.filter((warranty) => {
    const expiration = getWarrantyStatus(warranty);
    return expiration.status === status;
  });
}

/**
 * Get upcoming warranty expirations
 */
export function getUpcomingExpirations(
  warranties: WarrantyRegistration[],
  daysAhead = 90
): WarrantyRegistration[] {
  return warranties
    .filter((warranty) => {
      const expiration = getWarrantyStatus(warranty);
      return !expiration.isExpired && expiration.daysRemaining <= daysAhead;
    })
    .sort((a, b) => {
      const aExpiration = getWarrantyStatus(a);
      const bExpiration = getWarrantyStatus(b);
      return aExpiration.daysRemaining - bExpiration.daysRemaining;
    });
}

/**
 * Check if warranty needs renewal
 */
export function needsRenewal(warranty: WarrantyRegistration): boolean {
  const expiration = getWarrantyStatus(warranty);
  return expiration.isExpired || expiration.daysRemaining <= 30;
}

/**
 * Format expiration date for display
 */
export function formatExpirationDate(
  registrationDate: string | Date,
  warrantyPeriodMonths: number
): string {
  const expiration = calculateWarrantyExpiration(registrationDate, warrantyPeriodMonths);
  return format(expiration.expiryDate, 'MMM dd, yyyy');
}

/**
 * Get expiration color theme
 */
export function getExpirationColorTheme(status: ExpirationStatus) {
  switch (status) {
    case 'active':
      return {
        bg: 'bg-green-100 dark:bg-green-900/20',
        text: 'text-green-800 dark:text-green-200',
        border: 'border-green-200 dark:border-green-800',
        icon: 'text-green-600 dark:text-green-400',
      };
    case 'expiring_soon':
      return {
        bg: 'bg-yellow-100 dark:bg-yellow-900/20',
        text: 'text-yellow-800 dark:text-yellow-200',
        border: 'border-yellow-200 dark:border-yellow-800',
        icon: 'text-yellow-600 dark:text-yellow-400',
      };
    case 'expired':
      return {
        bg: 'bg-red-100 dark:bg-red-900/20',
        text: 'text-red-800 dark:text-red-200',
        border: 'border-red-200 dark:border-red-800',
        icon: 'text-red-600 dark:text-red-400',
      };
    case 'not_registered':
      return {
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-600 dark:text-gray-400',
        border: 'border-gray-300 dark:border-gray-600',
        icon: 'text-gray-500 dark:text-gray-500',
      };
    default:
      return {
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-600 dark:text-gray-400',
        border: 'border-gray-300 dark:border-gray-600',
        icon: 'text-gray-500 dark:text-gray-500',
      };
  }
}