'use client';

import { useEffect, useState } from 'react';
import { getDeletionRequestStats } from '@/app/actions/deletion-requests';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';
import type { DeletionRequestStats } from '@/types/database';

export function DeletionRequestStats() {
  const [stats, setStats] = useState<DeletionRequestStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      setError(null);

      const result = await getDeletionRequestStats();

      if (result.success) {
        setStats(result.data);
      } else {
        setError(result.error.message);
      }

      setIsLoading(false);
    };

    loadStats();
  }, []);

  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">Failed to load statistics: {error || 'Unknown error'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasOldPendingRequests = stats.oldest_pending_days > 7;

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
      {/* Pending Count */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
          <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
          <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="text-2xl font-bold">{stats.pending_count}</div>
          <p className="text-xs text-muted-foreground">
            Awaiting review
          </p>
        </CardContent>
      </Card>

      {/* Approved Last 30 Days */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
          <CardTitle className="text-sm font-medium">Approved (30d)</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="text-2xl font-bold">{stats.approved_last_30_days}</div>
          <p className="text-xs text-muted-foreground">
            Last 30 days
          </p>
        </CardContent>
      </Card>

      {/* Rejected Last 30 Days */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
          <CardTitle className="text-sm font-medium">Rejected (30d)</CardTitle>
          <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="text-2xl font-bold">{stats.rejected_last_30_days}</div>
          <p className="text-xs text-muted-foreground">
            Last 30 days
          </p>
        </CardContent>
      </Card>

      {/* Average Review Time */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
          <CardTitle className="text-sm font-medium">Avg Review Time</CardTitle>
          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="text-2xl font-bold">
            {stats.average_review_time_hours.toFixed(1)}h
          </div>
          <p className="text-xs text-muted-foreground">
            Average time to review
          </p>
        </CardContent>
      </Card>

      {/* Oldest Pending */}
      <Card className={hasOldPendingRequests ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950' : ''}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
          <CardTitle className="text-sm font-medium">Oldest Pending</CardTitle>
          {hasOldPendingRequests ? (
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          ) : (
            <Clock className="h-4 w-4 text-muted-foreground" />
          )}
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className={`text-2xl font-bold ${hasOldPendingRequests ? 'text-amber-700 dark:text-amber-300' : ''}`}>
            {stats.oldest_pending_days.toFixed(1)}d
          </div>
          <p className={`text-xs ${hasOldPendingRequests ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
            {hasOldPendingRequests ? 'Requires attention' : 'Days pending'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
