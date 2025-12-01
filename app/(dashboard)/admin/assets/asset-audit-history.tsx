'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getEntityAuditLogs } from '@/app/actions/audit-logs';
import type { AuditLogWithPerformer } from '@/app/actions/audit-logs';
import { AlertCircle, Clock, ChevronDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const ACTION_LABELS: Record<string, string> = {
  asset_created: 'Created',
  asset_updated: 'Updated',
  asset_deleted: 'Deleted',
};

const ACTION_COLORS: Record<string, string> = {
  asset_created: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  asset_updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  asset_deleted: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function AssetAuditHistory({ assetId }: { assetId: string }) {
  const [logs, setLogs] = useState<AuditLogWithPerformer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      setError(null);

      const result = await getEntityAuditLogs(assetId);

      if (result.success) {
        setLogs(result.data);
      } else {
        setError(result.error.message);
      }

      setIsLoading(false);
    };

    fetchLogs();
  }, [assetId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No audit history available</p>
      </div>
    );
  }

  // Show only 2 logs initially, or all if showAll is true
  const displayedLogs = showAll ? logs : logs.slice(0, 2);
  const hasMore = logs.length > 2;

  return (
    <div className="space-y-3">
      {displayedLogs.map((log) => (
        <div
          key={log.id}
          className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/50"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={ACTION_COLORS[log.action] || 'bg-muted text-muted-foreground'}>
                {ACTION_LABELS[log.action] || log.action}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {format(new Date(log.created_at), 'PPp')}
              </span>
            </div>
            <p className="text-sm">
              <span className="font-medium">
                {log.performer?.full_name || log.performer?.email || 'Unknown'}
              </span>
              {log.action === 'asset_created' && ' created this asset'}
              {log.action === 'asset_updated' && ' updated this asset'}
              {log.action === 'asset_deleted' && ' deleted this asset'}
            </p>
            {log.entity_data && log.action === 'asset_updated' && (
              <div className="mt-2 text-xs text-muted-foreground space-y-1">
                {log.entity_data.old_name && log.entity_data.name !== log.entity_data.old_name && (
                  <p>Name: {log.entity_data.old_name} → {log.entity_data.name}</p>
                )}
                {log.entity_data.old_category_name && log.entity_data.category_name !== log.entity_data.old_category_name && (
                  <p>Category: {log.entity_data.old_category_name} → {log.entity_data.category_name}</p>
                )}
                {log.entity_data.old_department_name && log.entity_data.department_name !== log.entity_data.old_department_name && (
                  <p>Department: {log.entity_data.old_department_name} → {log.entity_data.department_name}</p>
                )}
                {log.entity_data.old_cost && log.entity_data.cost !== log.entity_data.old_cost && (
                  <p>Cost: {formatCurrency(Number(log.entity_data.old_cost))} → {formatCurrency(Number(log.entity_data.cost))}</p>
                )}
                {log.entity_data.old_date_purchased && log.entity_data.date_purchased !== log.entity_data.old_date_purchased && (
                  <p>Purchase Date: {log.entity_data.old_date_purchased} → {log.entity_data.date_purchased}</p>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
      
      {hasMore && !showAll && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(true)}
          className="w-full"
        >
          <ChevronDown className="mr-2 h-4 w-4" />
          Show {logs.length - 2} more {logs.length - 2 === 1 ? 'change' : 'changes'}
        </Button>
      )}
      
      {showAll && hasMore && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(false)}
          className="w-full"
        >
          Show less
        </Button>
      )}
    </div>
  );
}
