'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Loader2, 
  RefreshCw,
  Calendar,
  Shield
} from 'lucide-react';

import { toast } from 'sonner';
import { useAssetWarrantyStatus } from '@/lib/warranty-state';
import { calculateWarrantyExpiration, getExpirationColorTheme } from '@/lib/warranty-expiration';
// import { WarrantyNotifications } from '@/lib/warranty-notifications';

interface WarrantyStatusBadgeProps {
  assetId: string;
  className?: string;
  showDetails?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface WarrantyStatusData {
  registered: boolean;
  warranty_id?: number;
  registration_date?: string;
  status?: string;
  expiry_date?: string;
}

type WarrantyStatusType = 'active' | 'expired' | 'expiring_soon' | 'not_registered' | 'unknown';

export function WarrantyStatusBadge({
  assetId,
  className = '',
  showDetails = false,
  autoRefresh = false,
  refreshInterval = 300000, // 5 minutes default
}: WarrantyStatusBadgeProps) {
  // Use the warranty state management hook
  const { status, loading, error, fetchStatus, clearCache } = useAssetWarrantyStatus(assetId);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Determine warranty status type with expiration calculation
  const getStatusType = (statusData: WarrantyStatusData | null): WarrantyStatusType => {
    if (!statusData) return 'unknown';
    if (!statusData.registered) return 'not_registered';
    
    // If we have registration date, calculate expiration (default to 12 months)
    if (statusData.registration_date) {
      const expiration = calculateWarrantyExpiration(
        statusData.registration_date,
        12 // Default warranty period
      );
      return expiration.status;
    }
    
    // Fallback to provided status
    const status = statusData.status?.toLowerCase();
    if (status === 'expired') return 'expired';
    if (status === 'expiring_soon') return 'expiring_soon';
    if (status === 'active') return 'active';
    
    return 'unknown';
  };

  // Get status configuration with enhanced expiration info
  const getStatusConfig = (statusType: WarrantyStatusType) => {
    const colorTheme = getExpirationColorTheme(statusType);
    
    switch (statusType) {
      case 'active':
        return {
          label: 'Warranty Active',
          variant: 'secondary' as const,
          className: `${colorTheme.bg} ${colorTheme.text} ${colorTheme.border}`,
          icon: CheckCircle,
        };
      case 'expiring_soon':
        return {
          label: 'Expiring Soon',
          variant: 'secondary' as const,
          className: `${colorTheme.bg} ${colorTheme.text} ${colorTheme.border}`,
          icon: Clock,
        };
      case 'expired':
        return {
          label: 'Warranty Expired',
          variant: 'secondary' as const,
          className: `${colorTheme.bg} ${colorTheme.text} ${colorTheme.border}`,
          icon: XCircle,
        };
      case 'not_registered':
        return {
          label: 'Not Registered',
          variant: 'outline' as const,
          className: `${colorTheme.bg} ${colorTheme.text} ${colorTheme.border}`,
          icon: AlertTriangle,
        };
      default:
        return {
          label: 'Status Unknown',
          variant: 'outline' as const,
          className: `${colorTheme.bg} ${colorTheme.text} ${colorTheme.border}`,
          icon: AlertTriangle,
        };
    }
  };

  // Enhanced fetch with state management
  const fetchStatusWithFeedback = async (showLoadingState = true) => {
    try {
      await fetchStatus(!showLoadingState); // force refresh if not showing loading
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Warranty status check failed:', err);
      
      if (showLoadingState) {
        toast.error('Service error', {
          description: errorMessage,
          action: {
            label: 'Retry',
            onClick: () => handleRefresh(),
          },
        });
      }
    }
  };

  // Manual refresh
  const handleRefresh = () => {
    clearCache(); // Clear cache to force fresh data
    fetchStatusWithFeedback(true);
  };

  // Initial load with staggered delay to prevent API overload
  useEffect(() => {
    if (!status) {
      // Add a small random delay to stagger requests
      const delay = Math.random() * 1000; // 0-1 second delay
      const timer = setTimeout(() => {
        fetchStatusWithFeedback(true);
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [assetId]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      fetchStatusWithFeedback(false); // Silent refresh
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, assetId]);

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const statusType = getStatusType(status);
  const config = getStatusConfig(statusType);
  const IconComponent = config.icon;

  // Get expiration info if available (use default 12 months if period not provided)
  const expirationInfo = status?.registration_date
    ? calculateWarrantyExpiration(status.registration_date, 12) // Default to 12 months
    : null;

  if (loading && !status) {
    return (
      <Badge variant="outline" className={`${className} animate-pulse`}>
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        Checking...
      </Badge>
    );
  }

  if (error && !status) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
          <XCircle className="w-3 h-3 mr-1" />
          Check Failed
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
          className="h-6 px-2"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    );
  }

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant={config.variant} className={config.className}>
          <IconComponent className="w-3 h-3 mr-1" />
          {config.label}
          {status?.warranty_id && (
            <span className="ml-1 text-xs opacity-75">
              #{status.warranty_id}
            </span>
          )}
        </Badge>
        {(autoRefresh || error) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="h-6 px-2"
            title="Refresh warranty status"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
    );
  }

  // Detailed view
  return (
    <Card className={`p-3 sm:p-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 rounded-full bg-blue-100">
            <Shield className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={config.variant} className={config.className}>
                <IconComponent className="w-3 h-3 mr-1" />
                {config.label}
              </Badge>
              {status?.warranty_id && (
                <span className="text-sm text-muted-foreground">
                  ID: {status.warranty_id}
                </span>
              )}
            </div>
            
            {status?.registration_date && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="w-3 h-3" />
                Registered: {formatDate(status.registration_date)}
              </div>
            )}
            
            {expirationInfo && (
              <div className="text-sm text-muted-foreground mt-1">
                {expirationInfo.message}
              </div>
            )}
            
            {lastUpdated && (
              <div className="text-xs text-muted-foreground mt-1">
                Last checked: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
          className="h-8 px-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      {error && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          Error: {error}
        </div>
      )}
    </Card>
  );
}