/**
 * Warranty Theme Configuration
 * Centralized styling and theme constants for warranty features
 */

export const warrantyTheme = {
  colors: {
    primary: 'hsl(var(--primary))',
    secondary: 'hsl(var(--secondary))',
    success: 'hsl(142, 76%, 36%)', // Green for active warranties
    warning: 'hsl(38, 92%, 50%)', // Yellow for expiring soon
    danger: 'hsl(0, 84%, 60%)', // Red for expired warranties
    muted: 'hsl(var(--muted))',
  },
  
  status: {
    active: {
      bg: 'bg-green-100 dark:bg-green-900/20',
      text: 'text-green-800 dark:text-green-200',
      border: 'border-green-200 dark:border-green-800',
      icon: 'text-green-600 dark:text-green-400',
    },
    expiring_soon: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/20',
      text: 'text-yellow-800 dark:text-yellow-200',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: 'text-yellow-600 dark:text-yellow-400',
    },
    expired: {
      bg: 'bg-red-100 dark:bg-red-900/20',
      text: 'text-red-800 dark:text-red-200',
      border: 'border-red-200 dark:border-red-800',
      icon: 'text-red-600 dark:text-red-400',
    },
    not_registered: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-600 dark:text-gray-400',
      border: 'border-gray-300 dark:border-gray-600',
      icon: 'text-gray-500 dark:text-gray-500',
    },
  },
  
  animations: {
    fadeIn: 'animate-in fade-in-0 duration-200',
    slideIn: 'animate-in slide-in-from-bottom-2 duration-300',
    spin: 'animate-spin',
    pulse: 'animate-pulse',
  },
  
  spacing: {
    xs: 'p-2',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  },
  
  shadows: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    warranty: 'shadow-lg shadow-blue-500/10 dark:shadow-blue-500/5',
  },
  
  borders: {
    warranty: 'border-l-4 border-l-blue-500',
    success: 'border-l-4 border-l-green-500',
    warning: 'border-l-4 border-l-yellow-500',
    danger: 'border-l-4 border-l-red-500',
  },
} as const;

export type WarrantyStatus = 'active' | 'expiring_soon' | 'expired' | 'not_registered';

/**
 * Get status-specific styling classes
 */
export function getStatusClasses(status: WarrantyStatus) {
  return warrantyTheme.status[status] || warrantyTheme.status.not_registered;
}

/**
 * Get warranty card styling classes
 */
export function getWarrantyCardClasses(status?: WarrantyStatus) {
  const baseClasses = 'transition-all duration-200 hover:shadow-md';
  
  if (!status) {
    return `${baseClasses} ${warrantyTheme.borders.warranty}`;
  }
  
  switch (status) {
    case 'active':
      return `${baseClasses} ${warrantyTheme.borders.success}`;
    case 'expiring_soon':
      return `${baseClasses} ${warrantyTheme.borders.warning}`;
    case 'expired':
      return `${baseClasses} ${warrantyTheme.borders.danger}`;
    default:
      return `${baseClasses} ${warrantyTheme.borders.warranty}`;
  }
}

/**
 * Get loading state classes
 */
export function getLoadingClasses() {
  return `${warrantyTheme.animations.pulse} opacity-70`;
}

/**
 * Get success animation classes
 */
export function getSuccessClasses() {
  return `${warrantyTheme.animations.fadeIn} ${warrantyTheme.status.active.bg} ${warrantyTheme.status.active.text}`;
}