import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/auth';
import { getMyAssets } from '@/app/actions/assets';
import { UserDashboardClient } from './user-dashboard-client';

export const dynamic = 'force-dynamic';

export default async function UserDashboard() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'user') {
    redirect('/admin');
  }

  const result = await getMyAssets();

  if (!result.success) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-800">
            {result.error.message || 'Failed to load assets'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <UserDashboardClient 
      initialAssets={result.data}
      userName={user.full_name || user.email}
    />
  );
}
