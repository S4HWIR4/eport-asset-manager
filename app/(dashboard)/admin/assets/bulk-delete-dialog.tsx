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
import { Trash2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { deleteAsset } from '@/app/actions/assets';
import type { Asset } from '@/types/database';

interface DeleteResult {
  success: boolean;
  assetId: string;
  assetName: string;
  error?: string;
}

interface DeleteSummary {
  total: number;
  successful: number;
  failed: number;
  results: DeleteResult[];
}

export function BulkDeleteDialog({
  selectedAssets,
  onSuccess,
  onClearSelection,
}: {
  selectedAssets: Asset[];
  onSuccess: () => void;
  onClearSelection: () => void;
}) {
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

    for (let i = 0; i < selectedAssets.length; i++) {
      const asset = selectedAssets[i];
      setProgress(Math.round(((i + 1) / selectedAssets.length) * 100));

      try {
        const result = await deleteAsset(asset.id);

        if (result.success) {
          results.push({
            success: true,
            assetId: asset.id,
            assetName: asset.name,
          });
          successful++;
        } else {
          results.push({
            success: false,
            assetId: asset.id,
            assetName: asset.name,
            error: result.error.message,
          });
          failed++;
        }
      } catch (error: any) {
        results.push({
          success: false,
          assetId: asset.id,
          assetName: asset.name,
          error: error.message || 'Unknown error',
        });
        failed++;
      }
    }

    setSummary({
      total: selectedAssets.length,
      successful,
      failed,
      results,
    });

    if (successful > 0) {
      toast.success(`Successfully deleted ${successful} asset(s)`);
      onClearSelection();
      
      // Hard refresh to show updated assets
      window.location.reload();
    }

    if (failed > 0) {
      toast.error(`Failed to delete ${failed} asset(s)`);
    }

    setIsDeleting(false);
    setProgress(0);
  };

  const handleClose = () => {
    setOpen(false);
    setSummary(null);
    setProgress(0);
  };

  if (selectedAssets.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="min-h-[44px] min-w-[44px]">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Selected ({selectedAssets.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <DialogTitle>Bulk Delete Assets</DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to delete {selectedAssets.length} asset(s)? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {!summary && !isDeleting && (
            <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-3">
              <p className="text-sm font-medium">Assets to be deleted:</p>
              {selectedAssets.map((asset) => (
                <div key={asset.id} className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-red-600" />
                  <span className="font-medium">{asset.name}</span>
                  <span className="text-muted-foreground">
                    ({asset.category?.name} - {asset.department?.name})
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Progress */}
          {isDeleting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Deleting assets...</span>
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
                          <span className="font-medium">{result.assetName}:</span>{' '}
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
            className="min-h-[44px]"
          >
            {summary ? 'Close' : 'Cancel'}
          </Button>
          {!summary && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="min-h-[44px]"
            >
              {isDeleting ? 'Deleting...' : `Delete ${selectedAssets.length} Asset(s)`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
