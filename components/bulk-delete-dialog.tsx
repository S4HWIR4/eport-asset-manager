'use client';

import { useState } from 'react';
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
import { Trash2, AlertTriangle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface DeleteResult {
  success: boolean;
  itemId: string;
  itemName: string;
  error?: string;
}

interface DeleteSummary {
  total: number;
  successful: number;
  failed: number;
  results: DeleteResult[];
}

interface BulkDeleteDialogProps<T> {
  selectedItems: T[];
  onSuccess: () => void;
  onClearSelection: () => void;
  deleteFunction: (id: string) => Promise<{ success: boolean; error?: { message: string } }>;
  getItemId: (item: T) => string;
  getItemName: (item: T) => string;
  getItemDescription?: (item: T) => string;
  entityName: string;
  entityNamePlural: string;
}

export function BulkDeleteDialog<T>({
  selectedItems,
  onSuccess,
  onClearSelection,
  deleteFunction,
  getItemId,
  getItemName,
  getItemDescription,
  entityName,
  entityNamePlural,
}: BulkDeleteDialogProps<T>) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<DeleteSummary | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setProgress(0);
    setSummary(null);

    const results: DeleteResult[] = [];
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      const itemId = getItemId(item);
      const itemName = getItemName(item);
      
      setProgress(Math.round(((i + 1) / selectedItems.length) * 100));

      try {
        const result = await deleteFunction(itemId);

        if (result.success) {
          results.push({
            success: true,
            itemId,
            itemName,
          });
          successful++;
        } else {
          results.push({
            success: false,
            itemId,
            itemName,
            error: result.error?.message || 'Unknown error',
          });
          failed++;
        }
      } catch (error: any) {
        results.push({
          success: false,
          itemId,
          itemName,
          error: error.message || 'Unknown error',
        });
        failed++;
      }
    }

    setSummary({
      total: selectedItems.length,
      successful,
      failed,
      results,
    });

    if (successful > 0) {
      toast.success(`Successfully deleted ${successful} ${successful === 1 ? entityName : entityNamePlural}`);
      onClearSelection();
      
      // Hard refresh to show updated data
      window.location.reload();
    }

    if (failed > 0) {
      toast.error(`Failed to delete ${failed} ${failed === 1 ? entityName : entityNamePlural}`);
    }

    setIsDeleting(false);
    setProgress(0);
  };

  const handleClose = () => {
    setOpen(false);
    setSummary(null);
    setProgress(0);
  };

  if (selectedItems.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Selected ({selectedItems.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <DialogTitle>Bulk Delete {entityNamePlural}</DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to delete {selectedItems.length} {selectedItems.length === 1 ? entityName : entityNamePlural}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {!summary && !isDeleting && (
            <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-3">
              <p className="text-sm font-medium">{entityNamePlural} to be deleted:</p>
              {selectedItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-red-600" />
                  <span className="font-medium">{getItemName(item)}</span>
                  {getItemDescription && (
                    <span className="text-muted-foreground">
                      ({getItemDescription(item)})
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Progress */}
          {isDeleting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Deleting {entityNamePlural.toLowerCase()}...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Summary */}
          {summary && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 border rounded-lg text-center">
                  <p className="text-2xl font-bold">{summary.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="p-3 border rounded-lg text-center bg-green-50">
                  <p className="text-2xl font-bold text-green-600">{summary.successful}</p>
                  <p className="text-xs text-muted-foreground">Deleted</p>
                </div>
                <div className="p-3 border rounded-lg text-center bg-red-50">
                  <p className="text-2xl font-bold text-red-600">{summary.failed}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>

              {summary.failed > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-3">
                  <p className="text-sm font-medium">Failed Deletions:</p>
                  {summary.results
                    .filter(r => !r.success)
                    .map((result, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium">{result.itemName}:</span>{' '}
                          <span className="text-muted-foreground">{result.error}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            {summary ? 'Close' : 'Cancel'}
          </Button>
          {!summary && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : `Delete ${selectedItems.length} ${selectedItems.length === 1 ? entityName : entityNamePlural}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
