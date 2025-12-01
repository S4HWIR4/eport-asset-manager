import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DeletionRequestStatus } from '@/types/database';

interface DeletionRequestBadgeProps {
  status: DeletionRequestStatus;
  className?: string;
}

export function DeletionRequestBadge({ status, className }: DeletionRequestBadgeProps) {
  const variants = {
    pending: {
      label: 'Deletion Pending',
      color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800',
    },
    approved: {
      label: 'Deletion Approved',
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800',
    },
    rejected: {
      label: 'Deletion Rejected',
      color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-800',
    },
    cancelled: {
      label: 'Request Cancelled',
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-800',
    },
  };

  const variant = variants[status];

  return (
    <Badge className={cn(variant.color, 'text-xs', className)}>
      {variant.label}
    </Badge>
  );
}
