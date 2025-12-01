# Implementation Plan

- [x] 1. Initialize Next.js project with shadcn/ui





  - Create new Next.js 14+ project with App Router using `npx create-next-app@latest`
  - Initialize shadcn/ui with `npx shadcn-ui@latest init`
  - Configure Tailwind CSS (included with shadcn/ui setup)
  - Install required shadcn/ui components: button, form, input, label, table, dialog, card, select, calendar, toast
  - Set up project structure (app directory, components, lib, types, etc.)
  - Set up GitHub repository
  - Configure initial environment variables for local development
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 2. Set up Supabase project and database schema





  - Create new Supabase project at supabase.com
  - Install Supabase client library: `npm install @supabase/supabase-js @supabase/ssr`
  - Create profiles table extending auth.users
  - Create categories table with unique name constraint
  - Create departments table with unique name constraint
  - Create assets table with foreign key relationships
  - Add indexes on frequently queried columns
  - Configure environment variables for Supabase connection (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
  - Create Supabase client utility functions for server and client components
  - _Requirements: 11.4, 11.5, 12.1, 12.5_

- [x] 3. Implement Row Level Security policies





  - Create RLS policy for profiles (users view own, admins view all)
  - Create RLS policies for categories (all read, admins write)
  - Create RLS policies for departments (all read, admins write)
  - Create RLS policies for assets (users view own, admins view all, admins delete)
  - Enable RLS on all tables
  - _Requirements: 7.1, 5.3, 8.5_



- [x] 3.1 Write property test for RLS policies


  - **Property 21: User asset isolation**
  - **Property 14: Admin views all assets**
  - **Validates: Requirements 7.1, 7.5, 5.3**

- [x] 4. Set up authentication and user management





  - Configure Supabase Auth in the application
  - Create user profile on signup with role assignment
  - Implement login page with email/password
  - Implement role-based redirect after login (admin vs user dashboard)
  - Create middleware for route protection based on role
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 4.1 Write property test for authentication


  - **Property 1: Role-based dashboard routing**
  - **Property 2: Authentication rejection for invalid credentials**
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [x] 4.2 Write property test for session management


  - **Property 3: Session expiration enforcement**
  - **Validates: Requirements 1.5**

- [x] 5. Create admin user management interface








  - Create admin users list page displaying all users with roles
  - Create user creation form with email, password, and role fields
  - Implement Server Action for creating users
  - Add email uniqueness validation
  - Add role validation (admin or user only)
  - Add password strength validation
  - Display validation errors in the form
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 5.1 Write property test for user creation




  - **Property 4: User creation round-trip**
  - **Property 6: Email uniqueness constraint**
  - **Validates: Requirements 2.1, 2.3**

- [x] 5.2 Write property test for user validation


  - **Property 5: Role validation**
  - **Property 7: User credential validation**
  - **Validates: Requirements 2.2, 2.4**

- [x] 5.3 Write property test for user list


  - **Property 8: Admin user list completeness**
  - **Validates: Requirements 2.5**

- [x] 6. Create category management interface





  - Create categories list page for admins
  - Create category creation form
  - Implement Server Action for creating categories
  - Add unique name constraint validation
  - Add non-empty name validation
  - Display all categories in the list
  - Make categories immediately available for asset assignment
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 6.1 Write property test for category operations


  - **Property 9: Entity creation round-trip (categories)**
  - **Property 10: Entity name uniqueness (categories)**
  - **Property 12: Non-empty name validation (categories)**
  - **Validates: Requirements 3.1, 3.2, 3.5**


- [-] 6.2 Write property test for category list

  - **Property 11: Entity list completeness (categories)**
  - **Validates: Requirements 3.3**

- [x] 7. Create department management interface





  - Create departments list page for admins
  - Create department creation form
  - Implement Server Action for creating departments
  - Add unique name constraint validation
  - Add non-empty name validation
  - Display all departments in the list
  - Make departments immediately available for asset assignment
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 7.1 Write property test for department operations


  - **Property 9: Entity creation round-trip (departments)**
  - **Property 10: Entity name uniqueness (departments)**
  - **Property 12: Non-empty name validation (departments)**
  - **Validates: Requirements 4.1, 4.2, 4.5**

- [x] 7.2 Write property test for department list


  - **Property 11: Entity list completeness (departments)**
  - **Validates: Requirements 4.3**

- [x] 8. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Create asset creation interface for users



  - Create asset creation form with all required fields (name, category, date purchased, cost, department)
  - Implement Server Action for creating assets
  - Add validation for required fields
  - Add validation for positive cost values
  - Add validation for past/present dates only
  - Associate asset with creating user automatically
  - Display validation errors in the form
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 9.1 Write property test for asset creation


  - **Property 16: Asset creation round-trip**
  - **Property 17: Asset ownership tracking**
  - **Validates: Requirements 6.1, 6.2**

- [x] 9.2 Write property test for asset validation


  - **Property 18: Asset required field validation**
  - **Property 19: Positive cost validation**
  - **Property 20: Past date validation**
  - **Validates: Requirements 6.3, 6.4, 6.5**

- [x] 10. Create user asset viewing interface



  - Create user assets list page showing only user's created assets
  - Display all asset fields (name, category, date purchased, cost, department)
  - Show empty state when user has no assets
  - Implement search and filtering (category, department)
  - Ensure filters only return user's own assets
  - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [x] 10.1 Write property test for user asset viewing


  - **Property 21: User asset isolation**
  - **Property 22: Asset display completeness**
  - **Validates: Requirements 7.1, 7.2, 7.5**

- [x] 11. Create admin asset management interface



  - Create admin assets list page showing all assets regardless of creator
  - Implement asset deletion functionality with confirmation dialog
  - Create Server Action for deleting assets (admin only)
  - Update asset list immediately after deletion
  - Add audit logging for asset deletions
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 11.1 Write property test for admin asset operations



  - **Property 13: Asset deletion removes from database**
  - **Property 14: Admin views all assets**
  - **Property 15: Deletion audit logging**
  - **Validates: Requirements 5.1, 5.3, 5.4, 5.5**

- [x] 12. Create user dashboard





  - Create user dashboard page with asset statistics (total count, total value)
  - Display user's created assets
  - Add quick action button to create new asset
  - Implement asset grouping by category and department
  - Show visual statistics (charts or cards)
  - _Requirements: 9.1, 9.2, 9.3, 9.5, 7.4_

- [x] 12.1 Write property test for user dashboard statistics


  - **Property 23: User asset statistics accuracy**
  - **Property 24: Asset grouping correctness**
  - **Validates: Requirements 7.4, 9.2, 9.3**

- [x] 13. Create admin dashboard





  - Create admin dashboard page with system-wide statistics (total users, assets, categories, departments)
  - Add navigation options for all management sections
  - Display recent activity or audit logs
  - Maintain admin context across navigation
  - Add quick action buttons for common tasks
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 13.1 Write property test for admin dashboard


  - **Property 25: Admin statistics accuracy**
  - **Property 26: Admin permission persistence**
  - **Property 27: Admin activity log display**
  - **Validates: Requirements 8.2, 8.3, 8.4**

- [x] 14. Implement authorization checks





  - Add middleware to verify admin role for admin routes
  - Add Server Action checks for admin-only operations
  - Implement access denial with error messages for regular users
  - Verify permissions before all management functions
  - _Requirements: 8.5, 9.4_

- [x] 14.1 Write property test for authorization


  - **Property 28: Admin-only access enforcement**
  - **Property 29: User access denial to admin functions**
  - **Validates: Requirements 8.5, 9.4**

- [x] 15. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Implement database referential integrity





  - Verify foreign key constraints are enforced for asset-category relationships
  - Verify foreign key constraints are enforced for asset-department relationships
  - Verify foreign key constraints are enforced for asset-user relationships
  - Test that invalid references are rejected
  - _Requirements: 12.2, 12.3, 12.4_

- [x] 16.1 Write property test for referential integrity


  - **Property 30: Referential integrity enforcement**
  - **Validates: Requirements 12.2, 12.3, 12.4**

- [x] 17. Implement responsive UI design





  - Apply Tailwind CSS responsive classes to all pages
  - Test mobile layout for all forms and lists
  - Implement responsive navigation (hamburger menu on mobile)
  - Ensure tables are scrollable on small screens
  - Test on multiple viewport sizes
  - _Requirements: 13.1, 13.2, 13.5_

- [x] 18. Implement form UX improvements





  - Add clear labels and placeholders to all form fields - use you@eport.cloud for email placeholders - use Tinashe Marufu for name placeholders - use appropriate items for other fields placeholders
  - Add a password reveal eye for password fields
  - Implement inline validation with immediate feedback
  - Add loading states for all async operations
  - Display success toast notifications and modal error
  - Implement optimistic UI updates where appropriate
  - _Requirements: 13.3, 13.4_

- [x] 19. Add innovative feature: Advanced search and filtering







  - Implement full-text search across asset names
  - Add multi-select filters for categories and departments
  - Add date range filtering for purchase dates
  - Add cost range filtering with min/max inputs
  - Ensure all filters respect user asset isolation

- [ ] 20. Add innovative feature: Asset analytics dashboard
  - Create charts for asset distribution by category (pie/bar chart)
  - Create trend analysis for asset purchases over time (line chart)
  - Create department-wise asset value breakdown
  - Add export functionality for reports (CSV)
  - Use a charting library (recharts or chart.js)

- [x] 21. Add innovative feature: Bulk operations






  - Implement CSV upload for bulk asset import
  - Add CSV parsing and validation
  - Implement bulk asset deletion for admins (with confirmation)
  - Add progress indicators for bulk operations
  - Display summary of successful/failed operations with modals

- [x] 22. Add innovative feature: Audit trail




  - Create audit_logs table for tracking changes
  - Implement logging for all create/update/delete operations
  - Display audit history on asset detail pages and under access control as a page
  - Show who made changes and when
  - Add filtering for audit logs by user, action type, date range

- [x] 23. Add innovative feature: Dark mode





  - Implement theme toggle component
  - Add dark mode styles using Tailwind dark: variants
  - Persist theme preference in localStorage
  - Apply theme on initial load
  - Ensure all components support both themes

- [ ] 24. Write integration tests
  - Test complete user flow: login → create asset → view asset
  - Test admin flow: create user → create category → view all assets
  - Test role-based access restrictions
  - Test database operations with real Supabase connection

- [ ] 25. Configure Vercel deployment
  - Connect GitHub repository to Vercel
  - Configure environment variables in Vercel dashboard
  - Set up automatic deployments from main branch
  - Configure preview deployments for pull requests
  - Verify deployment succeeds and app is accessible
  - _Requirements: 11.1, 11.2, 11.3_

- [ ] 26. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all features work in production environment
  - Test authentication flow in production
  - Verify database connections are working
  - Check that all environment variables are properly configured
