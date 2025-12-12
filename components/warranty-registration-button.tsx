'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Shield, CheckCircle, Loader2, AlertCircle, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { registerAssetWarranty } from '@/app/actions/warranty';
import { useWarrantyStore, useAssetWarrantyStatus } from '@/lib/warranty-state';
import { validateWarrantyRegistration, sanitizeWarrantyInput, WarrantyBusinessValidation } from '@/lib/warranty-validation';
// import { WarrantyNotifications, WarrantyConfirmations } from '@/lib/warranty-notifications';
import type { Asset } from '@/types/database';

interface WarrantyRegistrationButtonProps {
  asset: Asset;
  currentUserEmail: string;
  currentUserName?: string;
}

interface ValidationErrors {
  warrantyPeriod?: string;
  notes?: string;
  general?: string;
}



export function WarrantyRegistrationButton({
  asset,
  currentUserEmail,
  currentUserName,
}: WarrantyRegistrationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [warrantyPeriod, setWarrantyPeriod] = useState(12);
  const [notes, setNotes] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isOnline, setIsOnline] = useState(true);
  
  // Use warranty state management
  const { status: warrantyStatus, loading: isCheckingStatus, fetchStatus } = useAssetWarrantyStatus(asset.id);
  const { addRegistration, optimisticRegisterAsset, revertOptimisticUpdate, registrations } = useWarrantyStore();
  
  // Check if asset is already registered in our local state (fallback check)
  const isRegisteredInState = Object.values(registrations).some(reg => reg.asset_id === asset.id);
  
  // Simple registration check - only use API status and local state
  const isAssetRegistered = () => {
    // Check API status first
    if (warrantyStatus?.registered === true) {
      return true;
    }
    
    // Check local state
    if (isRegisteredInState) {
      return true;
    }
    
    // Check if warranty status indicates active warranty (even if registered field is missing)
    if (warrantyStatus?.status === 'active' || warrantyStatus?.warranty_id) {
      return true;
    }
    
    return false;
  };

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Only fetch status if we don't have it yet
  useEffect(() => {
    // Only fetch if we don't have status yet and not currently loading
    if (!warrantyStatus && !isCheckingStatus) {
      const timer = setTimeout(() => {
        fetchStatus(true);
      }, 1500); // Longer delay to let status badge load first
      
      return () => clearTimeout(timer);
    }
  }, [asset.id, warrantyStatus, isCheckingStatus, fetchStatus]);

  // Enhanced form validation
  const validateForm = (): boolean => {
    // Prepare data for validation
    const formData = sanitizeWarrantyInput({
      asset_id: asset.id,
      asset_name: asset.name,
      user_email: currentUserEmail,
      user_name: currentUserName,
      warranty_period_months: warrantyPeriod,
      notes: notes,
    });
    
    // Validate form data
    const validation = validateWarrantyRegistration(formData);
    
    if (!validation.success) {
      // Map validation errors to UI field names
      const mappedErrors: ValidationErrors = {};
      Object.entries(validation.errors).forEach(([field, message]) => {
        switch (field) {
          case 'warranty_period_months':
            mappedErrors.warrantyPeriod = message;
            break;
          case 'notes':
            mappedErrors.notes = message;
            break;
          default:
            mappedErrors.general = message;
            break;
        }
      });
      setValidationErrors(mappedErrors);
      return false;
    }
    
    // Business logic validation
    const businessValidation = WarrantyBusinessValidation.validateRegistrationContext({
      asset,
      user: { email: currentUserEmail, full_name: currentUserName },
      warrantyPeriod,
    });
    
    if (!businessValidation.success) {
      // Map business validation errors to UI field names
      const mappedErrors: ValidationErrors = {};
      Object.entries(businessValidation.errors).forEach(([field, message]) => {
        switch (field) {
          case 'warranty_period':
            mappedErrors.warrantyPeriod = message;
            break;
          default:
            mappedErrors.general = message;
            break;
        }
      });
      setValidationErrors(mappedErrors);
      return false;
    }
    
    setValidationErrors({});
    return true;
  };

  // Check warranty status using state management
  const checkStatus = async (forceRefresh = false) => {
    if (warrantyStatus && !forceRefresh) return; // Already checked
    
    if (!isOnline) {
      setValidationErrors({ general: 'No internet connection. Please check your network and try again.' });
      return;
    }
    
    setValidationErrors({});
    
    try {
      await fetchStatus(forceRefresh);
    } catch (error) {
      console.error('Failed to check warranty status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast.warning('Data may be outdated', {
        description: `Unable to verify warranty status: ${errorMessage}. You can still proceed with registration.`,
        action: {
          label: 'Retry',
          onClick: () => handleRetryStatusCheck(),
        },
      });
      
      setValidationErrors({ 
        general: `Unable to verify warranty status: ${errorMessage}. You can still proceed with registration.` 
      });
    }
  };

  const handleRegister = async () => {
    // Check if asset is already registered (double-check before submission)
    if (isAssetRegistered()) {
      toast.error('Already registered', {
        description: 'This asset already has an active warranty registration.',
      });
      setIsOpen(false);
      return;
    }
    
    // Validate form before submission
    if (!validateForm()) {
      toast.error('Invalid form', {
        description: 'Please fix the validation errors before submitting',
      });
      return;
    }
    
    if (!isOnline) {
      toast.error('Connection error', {
        description: 'Unable to connect to warranty services. Please check your internet connection.',
      });
      return;
    }

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to register warranty for "${asset.name}"?`
    );
    
    if (confirmed) {
        setIsLoading(true);
        setValidationErrors({});
        
        // Optimistic update
        optimisticRegisterAsset(asset.id, asset.name);
        
        // Show processing notification
        toast.loading('Processing warranty registration...', {
          description: 'Please wait while we complete your request.',
        });
        
        try {
          const registrationData = sanitizeWarrantyInput({
            asset_id: asset.id,
            asset_name: asset.name,
            user_email: currentUserEmail,
            user_name: currentUserName,
            warranty_period_months: warrantyPeriod,
            notes: notes.trim() || undefined,
          });
          
          const result = await registerAssetWarranty(registrationData);

          // Dismiss processing toast
          toast.dismiss();

          if (result.success) {
            // Add to state management
            const newRegistration = {
              id: result.data.warranty_id,
              asset_id: asset.id,
              asset_name: asset.name,
              user_email: currentUserEmail,
              user_name: currentUserName,
              registration_date: result.data.registration_date,
              status: 'active',
              warranty_period_months: warrantyPeriod,
              notes: notes.trim() || undefined,
            };
            
            addRegistration(newRegistration);
            
            toast.success('Warranty registered successfully!', {
              description: `Asset "${asset.name}" is now covered under warranty. Registration ID: ${result.data.warranty_id}`,
              action: {
                label: 'View Details',
                onClick: () => {
                  // Could open warranty details view
                  console.log('View warranty details:', result.data.warranty_id);
                },
              },
            });
            
            setIsOpen(false);
            
            // Reset form
            setWarrantyPeriod(12);
            setNotes('');
          } else {
            // Revert optimistic update
            revertOptimisticUpdate(asset.id);
            
            const errorMessage = result.error.message || 'Failed to register warranty';
            
            // Handle specific error types
            if (result.error.code === 'UNAUTHORIZED') {
              toast.error('Authentication required', {
                description: 'Please log in to access warranty services.',
              });
            } else if (result.error.code === 'VALIDATION_ERROR') {
              toast.error('Invalid registration', {
                description: errorMessage,
              });
            } else {
              toast.error('Warranty registration failed', {
                description: errorMessage,
                action: {
                  label: 'Retry',
                  onClick: () => handleRegister(),
                },
              });
            }
            
            setValidationErrors({ general: errorMessage });
          }
        } catch (error) {
          // Revert optimistic update
          revertOptimisticUpdate(asset.id);
          
          // Dismiss processing toast
          toast.dismiss();
          
          const errorMessage = 'An unexpected error occurred during registration';
          toast.error('Warranty registration failed', {
            description: errorMessage,
            action: {
              label: 'Retry',
              onClick: () => handleRegister(),
            },
          });
          
          console.error('Warranty registration error:', error);
          setValidationErrors({ general: errorMessage });
        } finally {
          setIsLoading(false);
        }
      }
  };

  // Handle dialog open/close with status checking
  const handleOpenChange = (open: boolean) => {
    // Prevent opening if already registered
    if (open && isAssetRegistered()) {
      toast.info('Already registered', {
        description: 'This asset already has an active warranty registration.',
      });
      return;
    }
    
    setIsOpen(open);
    if (open) {
      checkStatus();
      setValidationErrors({});
    } else {
      // Reset form state when closing
      setValidationErrors({});
    }
  };

  // Handle warranty period change with validation
  const handleWarrantyPeriodChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setWarrantyPeriod(numValue);
    
    // Clear validation error when user starts typing
    if (validationErrors.warrantyPeriod) {
      setValidationErrors(prev => ({ ...prev, warrantyPeriod: undefined }));
    }
  };

  // Handle notes change with validation
  const handleNotesChange = (value: string) => {
    setNotes(value);
    
    // Clear validation error when user starts typing
    if (validationErrors.notes) {
      setValidationErrors(prev => ({ ...prev, notes: undefined }));
    }
  };

  // Retry status check
  const handleRetryStatusCheck = () => {
    checkStatus(true);
  };

  // Show loading state if we don't have status yet or still checking
  if (isCheckingStatus || (!warrantyStatus && !isRegisteredInState)) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Checking Status...
      </Button>
    );
  }

  // Show warranty registered badge if already registered (comprehensive check)
  if (isAssetRegistered()) {
    const registrationFromState = Object.values(registrations).find(reg => reg.asset_id === asset.id);
    const warrantyId = warrantyStatus?.warranty_id || registrationFromState?.id;
    
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
        <CheckCircle className="w-3 h-3 mr-1" />
        Warranty Registered
        {warrantyId && (
          <span className="ml-1 text-xs opacity-75">
            (ID: {warrantyId})
          </span>
        )}
      </Badge>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          disabled={!isOnline}
        >
          {isOnline ? (
            <Shield className="w-4 h-4" />
          ) : (
            <WifiOff className="w-4 h-4" />
          )}
          Register Warranty
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Register Asset Warranty
          </DialogTitle>
          <DialogDescription>
            Register this asset for warranty coverage. This will create a warranty record
            in the warranty management system with production API endpoints.
          </DialogDescription>
        </DialogHeader>
        
        {/* Network Status Indicator */}
        {!isOnline && (
          <Card className="border-orange-200 bg-orange-50 p-3">
            <div className="flex items-center gap-2 text-orange-800">
              <WifiOff className="h-4 w-4" />
              <span className="text-sm">
                No internet connection detected. Please check your network connection.
              </span>
            </div>
          </Card>
        )}
        
        {/* Status Check Loading */}
        {isCheckingStatus && (
          <Card className="border-blue-200 bg-blue-50 p-3">
            <div className="flex items-center gap-2 text-blue-800">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">
                Checking warranty status...
              </span>
            </div>
          </Card>
        )}
        
        {/* General Error Display */}
        {validationErrors.general && (
          <Card className="border-red-200 bg-red-50 p-3">
            <div className="flex items-center justify-between text-red-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{validationErrors.general}</span>
              </div>
              {validationErrors.general.includes('warranty status') && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRetryStatusCheck}
                  disabled={isCheckingStatus}
                >
                  Retry
                </Button>
              )}
            </div>
          </Card>
        )}
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="asset-name">Asset Name</Label>
            <Input
              id="asset-name"
              value={asset.name}
              disabled
              className="bg-muted"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="user-email">User Email</Label>
            <Input
              id="user-email"
              value={currentUserEmail}
              disabled
              className="bg-muted"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="warranty-period">
              Warranty Period (Months) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="warranty-period"
              type="number"
              min="1"
              max="60"
              value={warrantyPeriod}
              onChange={(e) => handleWarrantyPeriodChange(e.target.value)}
              className={validationErrors.warrantyPeriod ? 'border-red-500' : ''}
              disabled={isLoading}
            />
            {validationErrors.warrantyPeriod && (
              <p className="text-sm text-red-600">{validationErrors.warrantyPeriod}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Standard warranty period is 12 months. Range: 1-60 months.
            </p>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="notes">
              Notes (Optional)
              <span className="text-xs text-muted-foreground ml-2">
                {notes.length}/500 characters
              </span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Additional warranty information, special conditions, or installation notes..."
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              rows={3}
              maxLength={500}
              className={validationErrors.notes ? 'border-red-500' : ''}
              disabled={isLoading}
            />
            {validationErrors.notes && (
              <p className="text-sm text-red-600">{validationErrors.notes}</p>
            )}
          </div>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleRegister} 
            disabled={isLoading || !isOnline || isCheckingStatus}
            className="min-w-[140px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Register Warranty
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}