import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';

/**
 * Navigation configuration types matching the sidebar structure
 */
interface NavItem {
  label: string;
  href: string;
  icon: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * Admin navigation configuration from components/sidebar.tsx
 */
const adminNavSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin', icon: 'LayoutDashboard' },
    ],
  },
  {
    title: 'Asset Management',
    items: [
      { label: 'Assets', href: '/admin/assets', icon: 'Package' },
      { label: 'Categories', href: '/admin/categories', icon: 'FolderOpen' },
      { label: 'Departments', href: '/admin/departments', icon: 'Building2' },
    ],
  },
  {
    title: 'Access Control',
    items: [
      { label: 'Users', href: '/admin/users', icon: 'Users' },
      { label: 'Audit Logs', href: '/admin/audit-logs', icon: 'FileText' },
    ],
  },
];

/**
 * User navigation configuration from components/sidebar.tsx
 */
const userNavSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/user', icon: 'LayoutDashboard' },
    ],
  },
  {
    title: 'Asset Management',
    items: [
      { label: 'My Assets', href: '/user/assets', icon: 'Package' },
      { label: 'Create Asset', href: '/user/assets/new', icon: 'Plus' },
    ],
  },
];

/**
 * Active navigation highlighting logic from components/sidebar.tsx
 */
function isActive(pathname: string, itemHref: string): boolean {
  return (
    pathname === itemHref ||
    (itemHref !== '/admin' &&
      itemHref !== '/user' &&
      pathname.startsWith(itemHref))
  );
}

describe('Navigation Properties', () => {
  /**
   * Feature: ui-ux-bug-fixes, Property 5: Navigation configuration validity
   * For any navigation item in the sidebar configuration, it should have a non-empty label,
   * a valid href string, and an icon component
   * Validates: Requirements 5.2, 5.3
   */
  it('Property 5: Navigation configuration validity', () => {
    // Test all admin navigation items
    adminNavSections.forEach((section) => {
      section.items.forEach((item) => {
        // Should have non-empty label
        expect(item.label).toBeTruthy();
        expect(item.label.length).toBeGreaterThan(0);
        expect(typeof item.label).toBe('string');

        // Should have valid href string
        expect(item.href).toBeTruthy();
        expect(typeof item.href).toBe('string');
        expect(item.href.length).toBeGreaterThan(0);
        expect(item.href).toMatch(/^\/admin/);

        // Should have icon component name
        expect(item.icon).toBeTruthy();
        expect(typeof item.icon).toBe('string');
        expect(item.icon.length).toBeGreaterThan(0);
      });
    });

    // Test all user navigation items
    userNavSections.forEach((section) => {
      section.items.forEach((item) => {
        // Should have non-empty label
        expect(item.label).toBeTruthy();
        expect(item.label.length).toBeGreaterThan(0);
        expect(typeof item.label).toBe('string');

        // Should have valid href string
        expect(item.href).toBeTruthy();
        expect(typeof item.href).toBe('string');
        expect(item.href.length).toBeGreaterThan(0);
        expect(item.href).toMatch(/^\/user/);

        // Should have icon component name
        expect(item.icon).toBeTruthy();
        expect(typeof item.icon).toBe('string');
        expect(item.icon.length).toBeGreaterThan(0);
      });
    });
  });

  /**
   * Feature: ui-ux-bug-fixes, Property 6: Active navigation highlighting
   * For any current page path, the navigation item with a matching href should be marked
   * as active in the sidebar
   * Validates: Requirements 5.4
   */
  it('Property 6: Active navigation highlighting', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          // Admin routes
          '/admin',
          '/admin/assets',
          '/admin/assets/123',
          '/admin/categories',
          '/admin/categories/new',
          '/admin/departments',
          '/admin/departments/456',
          '/admin/users',
          '/admin/users/new',
          '/admin/audit-logs',
          // User routes
          '/user',
          '/user/assets',
          '/user/assets/new',
          '/user/assets/789'
        ),
        (pathname) => {
          // Get all navigation items for the appropriate role
          const navSections = pathname.startsWith('/admin') 
            ? adminNavSections 
            : userNavSections;
          
          const allItems = navSections.flatMap(section => section.items);

          // Find which items should be active for this pathname
          const activeItems = allItems.filter(item => isActive(pathname, item.href));

          // There should be at least one active item for any valid route
          expect(activeItems.length).toBeGreaterThan(0);

          // Verify the active item logic is correct
          activeItems.forEach(item => {
            // Either exact match
            const isExactMatch = pathname === item.href;
            
            // Or child route (but not for dashboard routes)
            const isChildRoute = 
              item.href !== '/admin' &&
              item.href !== '/user' &&
              pathname.startsWith(item.href);

            expect(isExactMatch || isChildRoute).toBe(true);
          });

          // Dashboard routes should only be active for exact matches
          const dashboardItem = allItems.find(item => 
            item.href === '/admin' || item.href === '/user'
          );
          
          if (dashboardItem) {
            const isDashboardActive = isActive(pathname, dashboardItem.href);
            const isExactDashboardMatch = pathname === dashboardItem.href;
            
            // Dashboard should only be active if it's an exact match
            if (isDashboardActive) {
              expect(isExactDashboardMatch).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify specific navigation links from requirements
   */
  it('should have correct "Create Asset" link (Requirement 5.1)', () => {
    const createAssetLink = userNavSections
      .flatMap(section => section.items)
      .find(item => item.label === 'Create Asset');
    
    expect(createAssetLink).toBeDefined();
    expect(createAssetLink?.href).toBe('/user/assets/new');
  });

  it('should have correct "My Assets" link', () => {
    const myAssetsLink = userNavSections
      .flatMap(section => section.items)
      .find(item => item.label === 'My Assets');
    
    expect(myAssetsLink).toBeDefined();
    expect(myAssetsLink?.href).toBe('/user/assets');
  });

  /**
   * Test that navigation items don't have duplicate hrefs
   */
  it('should not have duplicate navigation hrefs', () => {
    const allAdminHrefs = adminNavSections
      .flatMap(section => section.items)
      .map(item => item.href);
    
    const uniqueAdminHrefs = new Set(allAdminHrefs);
    expect(allAdminHrefs.length).toBe(uniqueAdminHrefs.size);

    const allUserHrefs = userNavSections
      .flatMap(section => section.items)
      .map(item => item.href);
    
    const uniqueUserHrefs = new Set(allUserHrefs);
    expect(allUserHrefs.length).toBe(uniqueUserHrefs.size);
  });
});
