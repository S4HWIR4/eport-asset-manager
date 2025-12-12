/**
 * Warranty Notification System
 * Centralized toast notifications and feedback for warranty operations
 */

import { toast } from 'sonner';

export interface WarrantyNotificationOptions {
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  description?: string;
}

export const WarrantyNotifications = {
  success: {
    registrationSuccess: (warrantyId: number, options?: WarrantyNotificationOptions) => {
      toast.success('Warranty registered successfully!', {
        description: options?.description || `Registration ID: ${warrantyId}. Your asset is now covered under warranty.`,
        duration: options?.duration || 5000,
        action: options?.action,
      });
    },

    statusCheckSuccess: (status: string, options?: WarrantyNotificationOptions) => {
      toast.success('Warranty status updated', {
        description: options?.description || `Current status: ${status}`,
        duration: options?.duration || 3000,
        action: options?.action,
      });
    },

    connectionRestored: (options?: WarrantyNotificationOptions) => {
      toast.success('Connection restored', {
        description: options?.description || 'Warranty services are now available.',
        duration: options?.duration || 3000,
        action: options?.action,
      });
    },
  },

  error: {
    registrationFailed: (reason: string, options?: WarrantyNotificationOptions) => {
      toast.error('Warranty registration failed', {
        description: options?.description || reason,
        duration: options?.duration || 6000,
        action: options?.action,
      });
    },

    networkError: (options?: WarrantyNotificationOptions) => {
      toast.error('Connection error', {
        description: options?.description || 'Unable to connect to warranty services. Please check your internet connection.',
        duration: options?.duration || 8000,
        action: options?.action,
      });
    },

    validationError: (field: string, message: string, options?: WarrantyNotificationOptions) => {
      toast.error(`Invalid ${field}`, {
        description: options?.description || message,
        duration: options?.duration || 5000,
        action: options?.action,
      });
    },

    apiError: (message: string, options?: WarrantyNotificationOptions) => {
      toast.error('Service error', {
        description: options?.description || message,
        duration: options?.duration || 6000,
        action: options?.action,
      });
    },

    authenticationError: (options?: WarrantyNotificationOptions) => {
      toast.error('Authentication required', {
        description: options?.description || 'Please log in to access warranty services.',
        duration: options?.duration || 5000,
        action: options?.action,
      });
    },
  },

  warning: {
    dataOutOfSync: (options?: WarrantyNotificationOptions) => {
      toast.warning('Data may be outdated', {
        description: options?.description || 'Warranty information may not be current. Refresh to get latest data.',
        duration: options?.duration || 6000,
        action: options?.action || {
          label: 'Refresh',
          onClick: () => window.location.reload(),
        },
      });
    },

    offlineMode: (options?: WarrantyNotificationOptions) => {
      toast.warning('Working offline', {
        description: options?.description || 'Some warranty features may be limited while offline.',
        duration: options?.duration || 6000,
        action: options?.action,
      });
    },
  },

  info: {
    processing: (operation: string, options?: WarrantyNotificationOptions) => {
      return toast.loading(`Processing ${operation}...`, {
        description: options?.description || 'Please wait while we complete your request.',
        duration: options?.duration || Infinity,
      });
    },

    alreadyRegistered: (warrantyId: number, options?: WarrantyNotificationOptions) => {
      toast.info('Warranty already registered', {
        description: options?.description || `This asset is already registered with ID: ${warrantyId}`,
        duration: options?.duration || 4000,
        action: options?.action,
      });
    },
  },
};

export const WarrantyConfirmations = {
  confirmRegistration: (
    assetName: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    const confirmed = window.confirm(
      `Are you sure you want to register warranty for "${assetName}"?`
    );
    
    if (confirmed) {
      onConfirm();
    } else if (onCancel) {
      onCancel();
    }
  },
};