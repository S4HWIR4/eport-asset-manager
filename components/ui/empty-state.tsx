import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  message: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * EmptyState component with mobile-optimized formatting
 * 
 * Meets requirements:
 * - Centered content
 * - Mobile-appropriate font size (min 14px via text-sm)
 * - Adequate padding (py-12 = 48px vertical)
 */
export function EmptyState({ 
  message, 
  description, 
  action, 
  className 
}: EmptyStateProps) {
  return (
    <div className={cn('text-center py-12 px-4', className)}>
      <p className="text-sm text-muted-foreground mb-2">
        {message}
      </p>
      {description && (
        <p className="text-xs text-muted-foreground/80 mb-4">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
