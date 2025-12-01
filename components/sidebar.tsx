'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { signOut } from '@/app/actions/auth';
import { useState } from 'react';
import type { UserRole } from '@/types/database';
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Building2,
  Package,
  Plus,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SidebarProps {
  userRole: UserRole;
  userEmail: string;
  userName?: string | null;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  pendingDeletionRequestsCount?: number;
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const getAdminNavSections = (pendingCount?: number): NavSection[] => [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Asset Management',
    items: [
      { label: 'Assets', href: '/admin/assets', icon: Package },
      { label: 'Categories', href: '/admin/categories', icon: FolderOpen },
      { label: 'Departments', href: '/admin/departments', icon: Building2 },
      { label: 'Deletion Requests', href: '/admin/deletion-requests', icon: Trash2, badge: pendingCount },
    ],
  },
  {
    title: 'Access Control',
    items: [
      { label: 'Users', href: '/admin/users', icon: Users },
      { label: 'Audit Logs', href: '/admin/audit-logs', icon: FileText },
    ],
  },
];

const userNavSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/user', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Asset Management',
    items: [
      { label: 'My Assets', href: '/user/assets', icon: Package },
    ],
  },
];

export function Sidebar({
  userRole,
  userEmail,
  userName,
  isCollapsed,
  setIsCollapsed,
  pendingDeletionRequestsCount,
}: SidebarProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const navSections = userRole === 'admin' ? getAdminNavSections(pendingDeletionRequestsCount) : userNavSections;

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-card border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-20 h-6">
            <Image
              src="/eport-logo.webp"
              alt="ePort Logo"
              fill
              className="object-contain object-left"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Asset Manager</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium w-fit">
              {userRole === 'admin' ? 'Admin' : 'User'}
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6 dark:text-gray-100" />
          ) : (
            <Menu className="w-6 h-6 dark:text-gray-100" />
          )}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen bg-white dark:bg-card border-r border-gray-200 dark:border-gray-700 transition-all duration-300',
          'lg:translate-x-0',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          isCollapsed ? 'lg:w-20' : 'lg:w-64',
          'w-64'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className={cn(
            'p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between',
            isCollapsed && 'lg:p-4 lg:justify-center'
          )}>
            <div className={cn('flex flex-col gap-2', isCollapsed && 'lg:hidden')}>
              <div className="relative w-full max-w-[180px] h-10">
                <Image
                  src="/eport-logo.webp"
                  alt="ePort Logo"
                  fill
                  className="object-contain object-left"
                />
              </div>
              <div className="flex flex-col gap-1">
                <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Asset Manager</h1>
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium w-fit">
                  {userRole === 'admin' ? 'Admin' : 'User'}
                </span>
              </div>
            </div>
            {/* Collapsed logo */}
            <div className={cn('hidden', isCollapsed && 'lg:flex lg:flex-col lg:items-center lg:gap-2')}>
              <div className="relative w-12 h-4">
                <Image
                  src="/eport-logo.webp"
                  alt="ePort Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xs">AM</span>
              </div>
            </div>
            {/* Desktop collapse toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:block p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          </div>

          {/* User info */}
          <div className={cn(
            'px-6 py-4 border-b border-gray-200 dark:border-gray-700',
            isCollapsed && 'lg:px-2 lg:py-3'
          )}>
            <div className={cn(isCollapsed && 'lg:hidden')}>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {userName || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userEmail}</p>
            </div>
            {/* Collapsed user avatar */}
            <div className={cn('hidden', isCollapsed && 'lg:flex lg:justify-center')}>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold text-sm">
                  {(userName || userEmail).charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <TooltipProvider delayDuration={300}>
            <nav className="flex-1 px-3 py-4 overflow-y-auto">
              <div className="space-y-6">
                {navSections.map((section, sectionIndex) => (
                <div key={section.title}>
                  {/* Section Header */}
                  <div className={cn(
                    'px-3 mb-2',
                    isCollapsed && 'lg:px-0 lg:mb-3'
                  )}>
                    <h3 className={cn(
                      'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider',
                      isCollapsed && 'lg:hidden'
                    )}>
                      {section.title}
                    </h3>
                    {/* Divider for collapsed state */}
                    <div className={cn(
                      'hidden',
                      isCollapsed && 'lg:block lg:h-px lg:bg-gray-200 dark:lg:bg-gray-700 lg:mx-2'
                    )} />
                  </div>

                  {/* Section Items */}
                  <ul className="space-y-1">
                    {section.items.map((item) => {
                      const isActive =
                        pathname === item.href ||
                        (item.href !== '/admin' &&
                          item.href !== '/user' &&
                          pathname.startsWith(item.href));
                      const Icon = item.icon;

                      const linkContent = (
                        <Link
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-primary/10 text-primary'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                            isCollapsed && 'lg:justify-center lg:px-2'
                          )}
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <span className={cn('flex items-center gap-2', isCollapsed && 'lg:hidden')}>
                            {item.label}
                            {item.badge !== undefined && item.badge > 0 && (
                              <Badge variant="destructive" className="ml-auto">
                                {item.badge}
                              </Badge>
                            )}
                          </span>
                        </Link>
                      );

                      return (
                        <li key={item.href} className="relative">
                          {isCollapsed ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                {linkContent}
                              </TooltipTrigger>
                              <TooltipContent side="right" className="hidden lg:block">
                                {item.label}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            linkContent
                          )}
                          {/* Badge for collapsed state */}
                          {isCollapsed && item.badge !== undefined && item.badge > 0 && (
                            <Badge variant="destructive" className="hidden lg:flex absolute -top-1 -right-1 h-5 w-5 p-0 text-[10px] items-center justify-center">
                              {item.badge > 99 ? '99+' : item.badge}
                            </Badge>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              </div>
            </nav>
          </TooltipProvider>

          {/* Theme toggle and Sign out button */}
          <div className={cn('p-4 border-t border-gray-200 dark:border-gray-700 space-y-2', isCollapsed && 'lg:p-2')}>
            <div className={cn('flex items-center', isCollapsed ? 'lg:justify-center' : 'justify-between')}>
              {!isCollapsed && (
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 lg:block hidden">Theme</span>
              )}
              <ThemeToggle />
            </div>
            <Button
              onClick={handleSignOut}
              disabled={isSigningOut}
              variant="outline"
              className={cn(
                'w-full justify-start gap-3',
                isCollapsed && 'lg:justify-center lg:px-2'
              )}
              title={isCollapsed ? 'Sign Out' : undefined}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className={cn(isCollapsed && 'lg:hidden')}>
                {isSigningOut ? 'Signing out...' : 'Sign Out'}
              </span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
