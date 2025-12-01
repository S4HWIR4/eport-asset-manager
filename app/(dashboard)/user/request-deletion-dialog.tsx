'use client';

import { useState } from 'react';
import { submitDeletionRequest } from '@/app/actions/deletion-requests';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import type { Asset } from '@/types/database';

interface RequestDeletionDialogProps {
  asset: Asset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RequestDeletionDialog({
  asset,
  open,
  onOpenChange,
  onSuccess,
}: RequestDeletionDialogProps) {
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await submitDeletionRequest(asset.id, justification);

    if (result.success) {
      toast.success('Deletion request submitted successfully');
      onSuccess();
      onOpenChange(false);
      setJustification('');
    } else {
      toast.error(result.error.message);
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Request Asset Deletion</DialogTitle>
            <DialogDescription>
              Submit a request to delete this asset. An administrator will review your request.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-semibold">Asset:</span> {asset.name}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Cost:</span> {formatCurrency(Number(asset.cost))}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="justification">
                Reason for Deletion <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="justification"
                placeholder="Please explain why this asset should be deleted (minimum 10 characters)"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                required
                minLength={10}
                rows={4}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                {justification.length}/10 characters minimum
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || justification.length < 10}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
