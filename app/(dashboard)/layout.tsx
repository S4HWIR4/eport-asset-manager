import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/auth';
import { DashboardLayoutClient } from '@/components/dashboard-layout-client';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <DashboardLayoutClient
      userRole={user.role}
      userEmail={user.email}
      userName={user.full_name}
    >
      {children}
    </DashboardLayoutClient>
  );
}
