import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/auth';
import { UserForm } from './user-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function NewUserPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'admin') {
    redirect('/user');
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Create New User</h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">Add a new user to the system</p>
          </div>
          <Link href="/admin/users">
            <Button variant="outline">← Back</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Details</CardTitle>
            <CardDescription>
              Enter the user's information and assign their role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
