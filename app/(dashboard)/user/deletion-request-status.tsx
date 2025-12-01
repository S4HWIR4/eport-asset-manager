'use client';

import { useState } from 'react';
import { cancelDeletionRequest } from '@/app/actions/deletion-requests';
import { Button } from '@/components/ui/button';
import { DeletionRequestBadge } from '@/components/deletion-request-badge';
import { toast } from 'sonner';
import type { DeletionRequest } from '@/types/database';

interface DeletionRequestStatusProps {
  request: DeletionRequest;
  onCancel?: () => void;
}

export function DeletionRequestStatus({ request, onCancel }: DeletionRequestStatusProps) {
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancel = async () => {
    setIsCancelling(true);

    const result = await cancelDeletionRequest(request.id);

    if (result.success) {
      toast.success('Deletion request cancelled successfully');
      onCancel?.();
    } else {
      toast.error(result.error.message);
    }

    setIsCancelling(false);
  };

  return (
    <div className="space-y-4 p-4 border rounded-md bg-muted/30">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Deletion Request</h3>
        <DeletionRequestBadge status={request.status} />
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Justification</p>
          <div className="mt-1 p-3 bg-background rounded-md border">
            <p className="text-sm">{request.justification}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Submitted</p>
            <p className="text-sm">{new Date(request.created_at).toLocaleString()}</p>
          </div>

          {request.reviewed_at && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Reviewed</p>
              <p className="text-sm">{new Date(request.reviewed_at).toLocaleString()}</p>
            </div>
          )}
        </div>

        {request.review_comment && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {request.status === 'approved' ? 'Approval Comment' : 'Rejection Reason'}
            </p>
            <div className="mt-1 p-3 bg-background rounded-md border">
              <p className="text-sm">{request.review_comment}</p>
            </div>
          </div>
        )}

        {request.reviewer_email && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Reviewed By</p>
            <p className="text-sm">{request.reviewer_email}</p>
          </div>
        )}

        {request.status === 'pending' && (
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Request'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
