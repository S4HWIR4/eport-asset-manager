import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/auth';
import { getMyAssets } from '@/app/actions/assets';
import { Card, CardContent } from '@/components/ui/card';
import { AssetsTableClient } from '../assets-table-client';
import { CreateAssetDialog } from '../create-asset-dialog';

export const dynamic = 'force-dynamic';

export default async function UserAssetsPage() {
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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">My Assets</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              View and manage all your assets
            </p>
          </div>
          <div className="flex gap-2">
            <CreateAssetDialog />
          </div>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <AssetsTableClient assets={result.data} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
