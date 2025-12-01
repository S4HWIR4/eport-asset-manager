'use client';

import { useState } from 'react';
import { approveDeletionRequest, rejectDeletionRequest } from '@/app/actions/deletion-requests';
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
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import type { DeletionRequest } from '@/types/database';

interface ReviewDeletionRequestDialogProps {
  request: DeletionRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ReviewDeletionRequestDialog({
  request,
  open,
  onOpenChange,
  onSuccess,
}: ReviewDeletionRequestDialogProps) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    setIsSubmitting(true);
    const result = await approveDeletionRequest(request.id, reviewComment || undefined);

    if (result.success) {
      toast.success('Deletion request approved and asset deleted');
      onSuccess();
      onOpenChange(false);
      resetState();
    } else {
      toast.error(result.error.message);
    }

    setIsSubmitting(false);
  };

  const handleReject = async () => {
    if (!reviewComment.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setIsSubmitting(true);
    const result = await rejectDeletionRequest(request.id, reviewComment);

    if (result.success) {
      toast.success('Deletion request rejected');
      onSuccess();
      onOpenChange(false);
      resetState();
    } else {
      toast.error(result.error.message);
    }

    setIsSubmitting(false);
  };

  const resetState = () => {
    setAction(null);
    setReviewComment('');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) {
      resetState();
    }
    onOpenChange(open);
  };

  // Calculate how long the request has been pending
  const pendingDays = Math.floor(
    (new Date().getTime() - new Date(request.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Deletion Request</DialogTitle>
          <DialogDescription>
            Review the details and decide whether to approve or reject this deletion request
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Asset Information */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Asset Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Asset Name</p>
                <p className="text-sm font-semibold">{request.asset_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cost</p>
                <p className="text-sm font-semibold">{formatCurrency(request.asset_cost)}</p>
              </div>
            </div>
          </div>

          {/* Request Information */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Request Details</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Requested By</p>
                <p className="text-sm">{request.requester_email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Submitted</p>
                <p className="text-sm">
                  {new Date(request.created_at).toLocaleString()}
                  {pendingDays > 0 && (
                    <span className={pendingDays > 7 ? 'text-amber-600 dark:text-amber-400 ml-2' : 'ml-2'}>
                      ({pendingDays} {pendingDays === 1 ? 'day' : 'days'} ago)
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Justification</p>
                <div className="mt-1 p-3 bg-muted rounded-md">
                  <p className="text-sm">{request.justification}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Review Comment */}
          {action && (
            <div className="space-y-2">
              <Label htmlFor="reviewComment">
                {action === 'reject' ? 'Rejection Reason' : 'Comment (Optional)'}
                {action === 'reject' && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                id="reviewComment"
                placeholder={
                  action === 'reject'
                    ? 'Explain why this request is being rejected'
                    : 'Add any comments about this decision'
                }
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                required={action === 'reject'}
                rows={3}
                disabled={isSubmitting}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          {!action ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Close
              </Button>
              {request.status === 'pending' && (
                <>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setAction('reject')}
                  >
                    Reject
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setAction('approve')}
                  >
                    Approve
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAction(null);
                  setReviewComment('');
                }}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                type="button"
                variant={action === 'reject' ? 'destructive' : 'default'}
                onClick={action === 'reject' ? handleReject : handleApprove}
                disabled={isSubmitting || (action === 'reject' && !reviewComment.trim())}
              >
                {isSubmitting
                  ? 'Processing...'
                  : action === 'reject'
                  ? 'Confirm Rejection'
                  : 'Confirm Approval'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
