import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/auth';
import { getAllAssets } from '@/app/actions/assets';
import { AdminAssetsClient } from './admin-assets-client';

export const dynamic = 'force-dynamic';

export default async function AdminAssetsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'admin') {
    redirect('/user');
  }

  const result = await getAllAssets();

  if (!result.success) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-md bg-red-50 p-4 border border-red-200">
            <p className="text-sm text-red-800">
              {result.error.message || 'Failed to load assets'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <AdminAssetsClient assets={result.data} currentUser={user} />;
}