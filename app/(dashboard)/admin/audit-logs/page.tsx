import { Suspense } from 'react';
import { getAuditLogs, getUsersForFilter } from '@/app/actions/audit-logs';
import { AuditLogsClient } from './audit-logs-client';
import { TableSkeleton } from '@/components/table-skeleton';

export const dynamic = 'force-dynamic';

export default async function AuditLogsPage() {
  const [logsResult, usersResult] = await Promise.all([
    getAuditLogs({ limit: 6 }),
    getUsersForFilter(),
  ]);

  if (!logsResult.success) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-800">
            {logsResult.error.message || 'Failed to load audit logs'}
          </p>
        </div>
      </div>
    );
  }

  const users = usersResult.success ? usersResult.data : [];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Audit Logs
          </h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">
            Track all system changes and user actions
          </p>
        </div>
      </div>

      <Suspense fallback={<TableSkeleton columns={6} rows={10} />}>
        <AuditLogsClient
          initialLogs={logsResult.data.logs}
          initialTotal={logsResult.data.total}
          users={users}
        />
      </Suspense>
    </div>
  );
}
