'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateAssetDialog } from './create-asset-dialog';
import { formatCurrency, formatCurrencyCompact, formatDate } from '@/lib/utils';
import { getMyDeletionRequests } from '@/app/actions/deletion-requests';
import type { Asset } from '@/types/database';

export function UserDashboardClient({ 
  initialAssets,
  userName 
}: { 
  initialAssets: Asset[];
  userName: string;
}) {
  const assets = initialAssets;
  const [pendingDeletionCount, setPendingDeletionCount] = useState(0);
  const [loadingDeletionRequests, setLoadingDeletionRequests] = useState(true);

  // Fetch pending deletion requests count
  useEffect(() => {
    const fetchDeletionRequests = async () => {
      setLoadingDeletionRequests(true);
      const result = await getMyDeletionRequests();
      
      if (result.success) {
        const pendingCount = result.data.filter(req => req.status === 'pending').length;
        setPendingDeletionCount(pendingCount);
      }
      
      setLoadingDeletionRequests(false);
    };

    fetchDeletionRequests();
  }, []);

  // Calculate stats from current assets
  const totalValue = assets.reduce((sum, asset) => sum + Number(asset.cost), 0);

  // Get recent assets (last 5)
  const recentAssets = assets
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Group assets by category
  const byCategory = assets.reduce((acc, asset) => {
    const categoryName = asset.category?.name || 'Uncategorized';
    if (!acc[categoryName]) {
      acc[categoryName] = { count: 0, value: 0 };
    }
    acc[categoryName].count += 1;
    acc[categoryName].value += Number(asset.cost);
    return acc;
  }, {} as Record<string, { count: number; value: number }>);

  // Group assets by department
  const byDepartment = assets.reduce((acc, asset) => {
    const departmentName = asset.department?.name || 'Unassigned';
    if (!acc[departmentName]) {
      acc[departmentName] = { count: 0, value: 0 };
    }
    acc[departmentName].count += 1;
    acc[departmentName].value += Number(asset.cost);
    return acc;
  }, {} as Record<string, { count: number; value: number }>);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">My Dashboard</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">
            Welcome back, {userName}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>My Assets</CardTitle>
              <CardDescription>Total assets tracked</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{assets.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total assets</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Value</CardTitle>
              <CardDescription>Combined value of all assets</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold truncate" title={formatCurrency(totalValue)}>
                {formatCurrencyCompact(totalValue)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total cost</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending Deletions</CardTitle>
              <CardDescription>Awaiting admin review</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingDeletionRequests ? (
                <p className="text-2xl font-bold text-muted-foreground">...</p>
              ) : (
                <>
                  <p className="text-2xl font-bold">{pendingDeletionCount}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {pendingDeletionCount === 1 ? 'Request pending' : 'Requests pending'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <CreateAssetDialog />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Assets by Category</CardTitle>
              <CardDescription>Distribution across categories</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(byCategory).length === 0 ? (
                <p className="text-sm text-muted-foreground">No assets yet</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(byCategory)
                    .sort(([, a], [, b]) => b.value - a.value)
                    .map(([category, stats]) => (
                      <div key={category} className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{category}</p>
                          <p className="text-xs text-muted-foreground">
                            {stats.count} {stats.count === 1 ? 'asset' : 'assets'}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold" title={formatCurrency(stats.value)}>
                            {formatCurrencyCompact(stats.value)}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assets by Department</CardTitle>
              <CardDescription>Distribution across departments</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(byDepartment).length === 0 ? (
                <p className="text-sm text-muted-foreground">No assets yet</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(byDepartment)
                    .sort(([, a], [, b]) => b.value - a.value)
                    .map(([department, stats]) => (
                      <div key={department} className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{department}</p>
                          <p className="text-xs text-muted-foreground">
                            {stats.count} {stats.count === 1 ? 'asset' : 'assets'}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold" title={formatCurrency(stats.value)}>
                            {formatCurrencyCompact(stats.value)}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Assets Preview */}
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Recent Assets</CardTitle>
              <CardDescription>Your 5 most recently created assets</CardDescription>
            </div>
            <Link href="/user/assets">
              <Button variant="outline" size="sm">
                View All Assets
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentAssets.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  No assets yet. Create your first asset to get started.
                </p>
                <CreateAssetDialog />
              </div>
            ) : (
              <div className="space-y-4">
                {recentAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{asset.name}</p>
                      <div className="flex flex-wrap gap-2 mt-1 text-sm text-muted-foreground">
                        <span className="truncate max-w-[120px]">{asset.category?.name || 'Uncategorized'}</span>
                        <span>•</span>
                        <span className="truncate max-w-[120px]">{asset.department?.name || 'Unassigned'}</span>
                        <span>•</span>
                        <span className="whitespace-nowrap">{formatDate(asset.date_purchased)}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold whitespace-nowrap" title={formatCurrency(Number(asset.cost))}>
                        {formatCurrencyCompact(Number(asset.cost))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
