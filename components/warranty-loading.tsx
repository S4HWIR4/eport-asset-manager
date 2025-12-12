'use client';

import { Loader2, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { warrantyTheme } from '@/lib/warranty-theme';

interface WarrantyLoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'inline' | 'card' | 'overlay';
  className?: string;
}

export function WarrantyLoading({
  message = 'Loading warranty information...',
  size = 'md',
  variant = 'inline',
  className,
}: WarrantyLoadingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const LoadingContent = () => (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative">
        <Shield className={cn(sizeClasses[size], 'text-blue-600 opacity-20')} />
        <Loader2 className={cn(sizeClasses[size], 'absolute inset-0 text-blue-600', warrantyTheme.animations.spin)} />
      </div>
      <span className={cn(textSizeClasses[size], 'text-muted-foreground font-medium')}>
        {message}
      </span>
    </div>
  );

  if (variant === 'card') {
    return (
      <Card className={cn('border-blue-200 bg-blue-50/50 dark:bg-blue-950/20', className)}>
        <CardContent className="pt-6">
          <LoadingContent />
        </CardContent>
      </Card>
    );
  }

  if (variant === 'overlay') {
    return (
      <div className={cn(
        'absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10',
        className
      )}>
        <Card className="border-blue-200 bg-blue-50/90 dark:bg-blue-950/40">
          <CardContent className="pt-6">
            <LoadingContent />
          </CardContent>
        </Card>
      </div>
    );
  }

  return <LoadingContent />;
}

/**
 * Warranty skeleton loader for list items
 */
export function WarrantyListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className={cn('border-l-4 border-l-gray-200', warrantyTheme.animations.pulse)}>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                  <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Warranty status skeleton
 */
export function WarrantyStatusSkeleton() {
  return (
    <div className={cn('flex items-center gap-2', warrantyTheme.animations.pulse)}>
      <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
    </div>
  );
}