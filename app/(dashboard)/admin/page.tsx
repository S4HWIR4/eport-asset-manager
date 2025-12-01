import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/auth';
import { getAdminStats, getRecentAuditLogs } from '@/app/actions/assets';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, FolderOpen, Building2, Package, Activity } from 'lucide-react';

async function AdminStats() {
  const result = await getAdminStats();

  if (!result.success) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Error</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600">{result.error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = result.data;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
      <Card>
        <CardHeader className="pb-3">
          <CardDescription>Total Users</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold text-gray-900 dark:text-white">{stats.totalUsers}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardDescription>Total Assets</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold text-gray-900 dark:text-white">{stats.totalAssets}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardDescription>Categories</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold text-gray-900 dark:text-white">{stats.totalCategories}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardDescription>Departments</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold text-gray-900 dark:text-white">{stats.totalDepartments}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatsLoadingSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-9 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function RecentActivity() {
  const result = await getRecentAuditLogs(4);

  if (!result.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>System audit logs</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{result.error.message}</p>
        </CardContent>
      </Card>
    );
  }

  const logs = result.data;

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest system actions and changes</CardDescription>
          </div>
          <Link href="/admin/audit-logs">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity</p>
        ) : (
          <div className="space-y-4">
            {logs.map((log: any) => (
              <div key={log.id} className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0">
                <div className="flex-1">
                  <p className="text-sm font-medium">{formatAction(log.action)}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.entity_type} • {log.performer?.email || 'Unknown user'}
                  </p>
                  {log.entity_data?.name && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {log.entity_data.name}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{formatDate(log.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityLoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-20" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start justify-between border-b pb-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function AdminDashboard() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'admin') {
    redirect('/user');
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">
            Welcome back, {user.full_name || user.email}
          </p>
        </div>

        {/* Statistics Cards */}
        <Suspense fallback={<StatsLoadingSkeleton />}>
          <AdminStats />
        </Suspense>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your system resources</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Link href="/admin/users">
                <Button variant="outline" className="w-full h-20 text-base">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="w-6 h-6" />
                    <span>User Management</span>
                  </div>
                </Button>
              </Link>
              <Link href="/admin/categories">
                <Button variant="outline" className="w-full h-20 text-base">
                  <div className="flex flex-col items-center gap-2">
                    <FolderOpen className="w-6 h-6" />
                    <span>Categories</span>
                  </div>
                </Button>
              </Link>
              <Link href="/admin/departments">
                <Button variant="outline" className="w-full h-20 text-base">
                  <div className="flex flex-col items-center gap-2">
                    <Building2 className="w-6 h-6" />
                    <span>Departments</span>
                  </div>
                </Button>
              </Link>
              <Link href="/admin/assets">
                <Button variant="outline" className="w-full h-20 text-base">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="w-6 h-6" />
                    <span>All Assets</span>
                  </div>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Suspense fallback={<ActivityLoadingSkeleton />}>
          <RecentActivity />
        </Suspense>
      </div>
    </div>
  );
}
