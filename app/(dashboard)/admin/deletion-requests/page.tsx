'use client';

import { useState, useEffect } from 'react';
import { getAllDeletionRequests } from '@/app/actions/deletion-requests';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TableSkeleton } from '@/components/table-skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { DeletionRequestsTable } from './deletion-requests-table';
import { ReviewDeletionRequestDialog } from './review-deletion-request-dialog';
import { DeletionRequestStats } from './deletion-request-stats';
import type { DeletionRequest } from '@/types/database';

function ErrorDialog({
  error,
  open,
  onOpenChange,
  onRetry,
}: {
  error: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <DialogTitle>Error Loading Deletion Requests</DialogTitle>
          </div>
          <DialogDescription>
            There was a problem loading the deletion requests data.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-md bg-red-50 dark:bg-red-950 p-4 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onRetry();
            }}
          >
            Retry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DeletionRequestsPage() {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DeletionRequest | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    const result = await getAllDeletionRequests();

    if (result.success) {
      setRequests(result.data.requests);
    } else {
      setError(result.error.message);
      setErrorDialogOpen(true);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReview = (request: DeletionRequest) => {
    setSelectedRequest(request);
    setReviewDialogOpen(true);
  };

  const handleReviewSuccess = () => {
    loadData(); // Refresh the data after successful review
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Deletion Requests
          </h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">
            Review and manage asset deletion requests
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="mb-6">
          <DeletionRequestStats />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Deletion Requests</CardTitle>
            <CardDescription>
              Review pending deletion requests and view request history
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton columns={6} rows={10} />
            ) : (
              <DeletionRequestsTable requests={requests} onReview={handleReview} />
            )}
          </CardContent>
        </Card>
      </div>

      {error && (
        <ErrorDialog
          error={error}
          open={errorDialogOpen}
          onOpenChange={setErrorDialogOpen}
          onRetry={loadData}
        />
      )}

      {selectedRequest && (
        <ReviewDeletionRequestDialog
          request={selectedRequest}
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          onSuccess={handleReviewSuccess}
        />
      )}
    </div>
  );
}
