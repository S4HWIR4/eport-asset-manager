'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  User, 
  Calendar, 
  Shield, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertCircle,
  MoreVertical,
  Eye
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { getWarrantyCardClasses, getStatusClasses } from '@/lib/warranty-theme';
import type { WarrantyRegistration } from '@/app/actions/warranty';
import { cn } from '@/lib/utils';

interface WarrantyCardProps {
  warranty: WarrantyRegistration;
  onViewDetails?: (warranty: WarrantyRegistration) => void;
  className?: string;
  compact?: boolean;
}

export function WarrantyCard({ 
  warranty, 
  onViewDetails, 
  className,
  compact = false 
}: WarrantyCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'expired':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'expiring_soon':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'default' as const;
      case 'expired':
        return 'destructive' as const;
      case 'expiring_soon':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  const statusClasses = getStatusClasses(warranty.status as any);

  if (compact) {
    return (
      <Card className={cn(getWarrantyCardClasses(warranty.status as any), className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <h3 className="font-semibold truncate">{warranty.asset_name}</h3>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="truncate">{warranty.user_email}</span>
                <span>•</span>
                <span>{format(new Date(warranty.registration_date), 'MMM dd')}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 ml-2">
              <div className="flex items-center gap-1">
                {getStatusIcon(warranty.status)}
                <Badge variant={getStatusBadgeVariant(warranty.status)} className="hidden sm:inline-flex">
                  {warranty.status.charAt(0).toUpperCase() + warranty.status.slice(1)}
                </Badge>
              </div>
              
              {onViewDetails && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewDetails(warranty)}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(getWarrantyCardClasses(warranty.status as any), className)}>
      <CardContent className="p-4 sm:p-6">
        {/* Mobile Layout */}
        <div className="block sm:hidden space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <h3 className="font-semibold truncate">{warranty.asset_name}</h3>
              </div>
              <p className="text-sm text-muted-foreground truncate">ID: {warranty.asset_id}</p>
            </div>
            
            <div className="flex items-center gap-1 ml-2">
              {getStatusIcon(warranty.status)}
              <Badge variant={getStatusBadgeVariant(warranty.status)}>
                {warranty.status.charAt(0).toUpperCase() + warranty.status.slice(1)}
              </Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <User className="w-3 h-3 text-muted-foreground" />
                <span className="font-medium">User</span>
              </div>
              <p className="truncate">{warranty.user_name || 'N/A'}</p>
              <p className="text-xs text-muted-foreground truncate">{warranty.user_email}</p>
            </div>
            
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                <span className="font-medium">Date</span>
              </div>
              <p>{format(new Date(warranty.registration_date), 'MMM dd, yyyy')}</p>
              <p className="text-xs text-muted-foreground">{warranty.warranty_period_months} months</p>
            </div>
          </div>
          
          {warranty.notes && (
            <div>
              <p className="text-sm font-medium mb-1">Notes</p>
              <p className="text-sm text-muted-foreground">{warranty.notes}</p>
            </div>
          )}
          
          <div className="flex items-center justify-between pt-2 border-t">
            <p className="text-xs text-muted-foreground">ID: #{warranty.id}</p>
            {onViewDetails && (
              <Button variant="outline" size="sm" onClick={() => onViewDetails(warranty)}>
                <Eye className="w-4 h-4 mr-1" />
                Details
              </Button>
            )}
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:block">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Asset</span>
              </div>
              <p className="font-semibold">{warranty.asset_name}</p>
              <p className="text-sm text-muted-foreground">ID: {warranty.asset_id}</p>
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Registered By</span>
              </div>
              <p className="font-medium">{warranty.user_name || 'N/A'}</p>
              <p className="text-sm text-muted-foreground">{warranty.user_email}</p>
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Registration Date</span>
              </div>
              <p className="font-medium">
                {format(new Date(warranty.registration_date), 'MMM dd, yyyy')}
              </p>
              <p className="text-sm text-muted-foreground">
                {warranty.warranty_period_months} months coverage
              </p>
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Status</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(warranty.status)}
                <Badge variant={getStatusBadgeVariant(warranty.status)}>
                  {warranty.status.charAt(0).toUpperCase() + warranty.status.slice(1)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-1">
                ID: #{warranty.id}
              </p>
              {warranty.notes && (
                <p className="text-sm text-muted-foreground">
                  {warranty.notes}
                </p>
              )}
            </div>
          </div>
          
          {onViewDetails && (
            <div className="flex justify-end mt-4 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={() => onViewDetails(warranty)}>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}