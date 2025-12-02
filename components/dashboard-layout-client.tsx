'use client';

import { Sidebar } from '@/components/sidebar';
import type { UserRole } from '@/types/database';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { getPendingDeletionRequestsCount } from '@/app/actions/deletion-requests';

interface DashboardLayoutClientProps {
  userRole: UserRole;
  userEmail: string;
  userName?: string | null;
  children: React.ReactNode;
}

export function DashboardLayoutClient({
  userRole,
  userEmail,
  userName,
  children,
}: DashboardLayoutClientProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [pendingCount, setPendingCount] = useState<number | undefined>(undefined);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Only fetch pending count for admin users
    if (userRole === 'admin') {
      const fetchPendingCount = async () => {
        const result = await getPendingDeletionRequestsCount();
        if (result.success) {
          setPendingCount(result.data);
        }
      };

      fetchPendingCount();

      // Refresh count every 30 seconds
      const interval = setInterval(fetchPendingCount, 30000);

      return () => clearInterval(interval);
    }
  }, [userRole]);

  if (!isMounted) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userRole={userRole}
        userEmail={userEmail}
        userName={userName}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        pendingDeletionRequestsCount={pendingCount}
      />

      {/* Main content */}
      <main
        className={cn(
          'flex-1 overflow-y-auto bg-gray-50 dark:bg-background transition-all duration-300',
          // Desktop: account for sidebar width
          isCollapsed ? 'lg:ml-20' : 'lg:ml-64',
          // Mobile: full width, account for fixed header with padding
          'w-full pt-14 lg:pt-0'
        )}
      >
        {/* Content wrapper with proper mobile spacing */}
        <div className="min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
