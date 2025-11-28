# Design Document

## Overview

The Asset Manager application will be built using Next.js 14+ with the App Router, creating a modern full-stack application with role-based asset management for separate Admin and User experiences. The UI will be built using shadcn/ui, a collection of re-usable components built with Radix UI and Tailwind CSS that provides accessible, customizable components.

The architecture follows a modern full-stack approach using Next.js 14+ with App Router, Server Components, and Server Actions for backend operations. Supabase provides PostgreSQL database hosting with built-in authentication and Row Level Security (RLS) for data access control. The application will be deployed on Vercel with automatic deployments triggered by GitHub commits.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│  (Next.js App Router, React Server Components, Tailwind)    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
│         (Server Actions, API Routes, Middleware)            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Data Access Layer                       │
│              (Supabase Client, Database Queries)            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                       Database Layer                         │
│         (Supabase PostgreSQL with Row Level Security)       │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend Framework**: Next.js 14+ (App Router)
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL via Supabase
- **ORM/Query Builder**: Supabase JavaScript client
- **Deployment**: Vercel
- **Version Control**: GitHub
- **Testing**: Vitest (unit), fast-check (property-based), Playwright (E2E)

### Key Architectural Decisions

1. **Server Components First**: Leverage React Server Components for data fetching to reduce client-side JavaScript and improve performance
2. **Server Actions**: Use Next.js Server Actions for mutations (create, update, delete operations) to simplify data flow
3. **Row Level Security**: Implement Supabase RLS policies to enforce data access rules at the database level
4. **Role-Based Access Control**: Store user roles in the database and check permissions in middleware and server components
5. **Optimistic UI Updates**: Use React's useOptimistic for immediate UI feedback on mutations

## Components and Interfaces

### Page Structure

```
/
├── (auth)/
│   ├── login/
│   └── signup/
├── (dashboard)/
│   ├── admin/
│   │   ├── page.tsx                 # Admin Dashboard
│   │   ├── users/
│   │   │   ├── page.tsx             # User Management
│   │   │   └── new/page.tsx         # Create User
│   │   ├── categories/
│   │   │   ├── page.tsx             # Category Management
│   │   │   └── new/page.tsx         # Create Category
│   │   ├── departments/
│   │   │   ├── page.tsx             # Department Management
│   │   │   └── new/page.tsx         # Create Department
│   │   └── assets/
│   │       └── page.tsx             # All Assets (Admin View)
│   └── user/
│       ├── page.tsx                 # User Dashboard
│       ├── assets/
│       │   ├── page.tsx             # My Assets
│       │   └── new/page.tsx         # Create Asset
│       └── profile/
│           └── page.tsx             # User Profile
└── api/
    └── webhooks/
```

### Core Components

#### Authentication Components
- `LoginForm`: Email/password login form
- `SignupForm`: User registration form (Admin only for creating users)
- `AuthProvider`: Context provider for authentication state

#### Dashboard Components
- `AdminDashboard`: Statistics cards and quick actions for admins
- `UserDashboard`: Asset summary and quick create for users
- `StatsCard`: Reusable card component for displaying metrics
- `DashboardLayout`: Shared layout with navigation sidebar

#### Asset Management Components
- `AssetList`: Table/grid view of assets with filtering and sorting
- `AssetCard`: Individual asset display card
- `AssetForm`: Form for creating/editing assets
- `AssetDeleteDialog`: Confirmation dialog for asset deletion

#### Admin Management Components
- `UserList`: Table of all users with role indicators
- `UserForm`: Form for creating new users
- `CategoryList`: List of asset categories with CRUD operations
- `CategoryForm`: Form for creating/editing categories
- `DepartmentList`: List of departments with CRUD operations
- `DepartmentForm`: Form for creating/editing departments

#### Shared Components
- `Navigation`: Role-aware navigation menu
- `Header`: Application header with user menu
- `EmptyState`: Display when no data exists
- `LoadingSpinner`: Loading indicator
- `ErrorBoundary`: Error handling wrapper

### Server Actions

```typescript
// app/actions/auth.ts
export async function signIn(email: string, password: string)
export async function signOut()
export async function getCurrentUser()

// app/actions/users.ts
export async function createUser(data: CreateUserInput)
export async function getUsers()
export async function updateUserRole(userId: string, role: UserRole)

// app/actions/categories.ts
export async function createCategory(name: string)
export async function getCategories()
export async function deleteCategory(id: string)

// app/actions/departments.ts
export async function createDepartment(name: string)
export async function getDepartments()
export async function deleteDepartment(id: string)

// app/actions/assets.ts
export async function createAsset(data: CreateAssetInput)
export async function getMyAssets()
export async function getAllAssets() // Admin only
export async function deleteAsset(id: string) // Admin only
export async function getAssetStats(userId?: string)
```

### Middleware

```typescript
// middleware.ts
// - Check authentication status
// - Verify user role for protected routes
// - Redirect unauthorized users
// - Set security headers
```

## Data Models

### Database Schema

```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Departments table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Assets table
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  date_purchased DATE NOT NULL,
  cost DECIMAL(12, 2) NOT NULL CHECK (cost >= 0),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_assets_created_by ON public.assets(created_by);
CREATE INDEX idx_assets_category_id ON public.assets(category_id);
CREATE INDEX idx_assets_department_id ON public.assets(department_id);
CREATE INDEX idx_assets_date_purchased ON public.assets(date_purchased);
```

### Row Level Security Policies

```sql
-- Profiles: Users can read their own profile, admins can read all
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Categories: All authenticated users can read, only admins can modify
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view categories"
  ON public.categories FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert categories"
  ON public.categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Departments: All authenticated users can read, only admins can modify
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view departments"
  ON public.departments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert departments"
  ON public.departments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Assets: Users can view their own, admins can view all
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assets"
  ON public.assets FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Admins can view all assets"
  ON public.assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can create assets"
  ON public.assets FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can delete any asset"
  ON public.assets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### TypeScript Types

```typescript
// types/database.ts
export type UserRole = 'admin' | 'user';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
  created_by: string | null;
}

export interface Department {
  id: string;
  name: string;
  created_at: string;
  created_by: string | null;
}

export interface Asset {
  id: string;
  name: string;
  category_id: string;
  department_id: string;
  date_purchased: string;
  cost: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined data
  category?: Category;
  department?: Department;
  creator?: Profile;
}

export interface AssetStats {
  total_count: number;
  total_value: number;
  by_category: { category: string; count: number; value: number }[];
  by_department: { department: string; count: number; value: number }[];
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, I've identified several areas where properties can be consolidated:

**Consolidations:**
- Properties 3.1, 4.1 (category/department persistence) can be combined into a single "entity creation round-trip" property
- Properties 3.2, 4.2 (duplicate name prevention) can be combined into a single "unique name constraint" property
- Properties 3.5, 4.5 (empty name validation) can be combined into a single "non-empty name validation" property
- Properties 12.2, 12.3, 12.4 (foreign key constraints) can be combined into a single "referential integrity" property
- Properties 7.1, 7.5 (user asset filtering) where 7.5 is a more general case that includes 7.1

**Redundancies:**
- Property 3.4 and 4.4 (immediate availability) are implied by the round-trip properties 3.1 and 4.1
- Property 5.4 (UI update after deletion) is implied by property 5.1 (deletion removes from database)

### Core Properties

**Property 1: Role-based dashboard routing**
*For any* authenticated user with a valid role, logging in should redirect them to the dashboard corresponding to their role (admin → admin dashboard, user → user dashboard)
**Validates: Requirements 1.1, 1.3, 1.4**

**Property 2: Authentication rejection for invalid credentials**
*For any* invalid credential combination (wrong email, wrong password, or non-existent user), authentication attempts should be rejected with an error message
**Validates: Requirements 1.2**

**Property 3: Session expiration enforcement**
*For any* expired session, attempts to access protected resources should require re-authentication
**Validates: Requirements 1.5**

**Property 4: User creation round-trip**
*For any* valid user data (email, password, role), creating a user account should result in being able to retrieve the same user data from the database
**Validates: Requirements 2.1**

**Property 5: Role validation**
*For any* role value that is not 'admin' or 'user', user creation should be rejected with a validation error
**Validates: Requirements 2.2**

**Property 6: Email uniqueness constraint**
*For any* existing user email, attempting to create another user with the same email should be rejected with an error
**Validates: Requirements 2.3**

**Property 6: Email uniqueness constraint**
*For any* existing user email, attempting to create another user with the same email should be rejected with an error
**Validates: Requirements 2.3**

**Property 7: User credential validation**
*For any* invalid email format or password that doesn't meet security requirements, user creation should be rejected with validation errors
**Validates: Requirements 2.4**

**Property 8: Admin user list completeness**
*For any* set of users in the database, the admin user management interface should display all of them with their roles
**Validates: Requirements 2.5**

**Property 9: Entity creation round-trip**
*For any* valid entity name (category or department), creating the entity should result in being able to retrieve it from the database with the same name
**Validates: Requirements 3.1, 4.1**

**Property 10: Entity name uniqueness**
*For any* existing entity name within a type (category or department), attempting to create another entity of the same type with the same name should be rejected
**Validates: Requirements 3.2, 4.2**

**Property 11: Entity list completeness**
*For any* set of entities (categories or departments) in the database, the management interface should display all of them
**Validates: Requirements 3.3, 4.3**

**Property 12: Non-empty name validation**
*For any* string composed entirely of whitespace or empty string, entity creation (category or department) should be rejected with a validation error
**Validates: Requirements 3.5, 4.5**

**Property 13: Asset deletion removes from database**
*For any* asset, when an admin deletes it, the asset should no longer be retrievable from the database
**Validates: Requirements 5.1, 5.4**

**Property 14: Admin views all assets**
*For any* set of assets created by different users, an admin viewing the asset list should see all assets regardless of creator
**Validates: Requirements 5.3**

**Property 15: Deletion audit logging**
*For any* asset deletion by an admin, there should be a corresponding audit log entry containing the timestamp and admin identifier
**Validates: Requirements 5.5**

**Property 16: Asset creation round-trip**
*For any* valid asset data (name, category, date purchased, cost, department), creating an asset should result in being able to retrieve all the same field values from the database
**Validates: Requirements 6.1**

**Property 17: Asset ownership tracking**
*For any* asset created by a user, the asset's created_by field should match the creating user's identifier
**Validates: Requirements 6.2**

**Property 18: Asset required field validation**
*For any* asset data with one or more missing required fields (name, category, date purchased, cost, department), asset creation should be rejected with validation errors
**Validates: Requirements 6.3**

**Property 19: Positive cost validation**
*For any* non-positive numeric value or non-numeric value, asset creation should reject the cost field with a validation error
**Validates: Requirements 6.4**

**Property 20: Past date validation**
*For any* date in the future, asset creation should reject the purchase date with a validation error
**Validates: Requirements 6.5**

**Property 21: User asset isolation**
*For any* user viewing their asset list (with or without filters), all returned assets should have been created by that user
**Validates: Requirements 7.1, 7.5**

**Property 22: Asset display completeness**
*For any* asset displayed to a user, all required fields (name, category, date purchased, cost, department) should be present in the rendered output
**Validates: Requirements 7.2**

**Property 23: User asset statistics accuracy**
*For any* user's set of assets, the dashboard statistics (total count, total value) should accurately reflect the sum and count of their assets
**Validates: Requirements 7.4, 9.2**

**Property 24: Asset grouping correctness**
*For any* grouping or filtering by category or department, all assets in a group should have the corresponding category or department value
**Validates: Requirements 9.3**

**Property 25: Admin statistics accuracy**
*For any* system state, the admin dashboard statistics (total users, total assets, total categories, total departments) should accurately reflect the database counts
**Validates: Requirements 8.2**

**Property 26: Admin permission persistence**
*For any* admin user navigating between management sections, their admin role and permissions should remain valid throughout the session
**Validates: Requirements 8.3**

**Property 27: Admin activity log display**
*For any* set of recent system actions, the admin dashboard should display them in the activity log
**Validates: Requirements 8.4**

**Property 28: Admin-only access enforcement**
*For any* management function (user creation, category management, department management, asset deletion), only users with admin role should be able to execute it
**Validates: Requirements 8.5**

**Property 29: User access denial to admin functions**
*For any* admin-only function, regular users attempting to access it should be denied with an appropriate error message
**Validates: Requirements 9.4**

**Property 30: Referential integrity enforcement**
*For any* asset creation or update with an invalid foreign key reference (non-existent category, department, or user), the operation should be rejected by the database
**Validates: Requirements 12.2, 12.3, 12.4**

## Error Handling

### Error Categories

1. **Authentication Errors**
   - Invalid credentials
   - Expired sessions
   - Missing authentication tokens
   - Insufficient permissions

2. **Validation Errors**
   - Missing required fields
   - Invalid data formats (email, date, numeric)
   - Constraint violations (unique, foreign key)
   - Business rule violations (future dates, negative costs)

3. **Authorization Errors**
   - Role-based access violations
   - Resource ownership violations
   - Admin-only function access by regular users

4. **Database Errors**
   - Connection failures
   - Query timeouts
   - Constraint violations
   - Transaction failures

5. **External Service Errors**
   - Supabase API failures
   - Network timeouts
   - Rate limiting

### Error Handling Strategy

**Client-Side:**
- Form validation with immediate feedback
- Display user-friendly error messages
- Prevent invalid form submissions
- Show loading states during async operations
- Implement error boundaries for React components

**Server-Side:**
- Validate all inputs in Server Actions
- Use try-catch blocks for database operations
- Return structured error responses with codes and messages
- Log errors for debugging and monitoring
- Implement retry logic for transient failures

**Database-Level:**
- Enforce constraints (NOT NULL, UNIQUE, FOREIGN KEY, CHECK)
- Use Row Level Security for access control
- Implement database triggers for audit logging
- Use transactions for multi-step operations

### Error Response Format

```typescript
type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; field?: string } };
```

## Testing Strategy

### Unit Testing

The application will use **Vitest** as the testing framework for unit tests. Unit tests will focus on:

- **Utility Functions**: Date formatting, currency formatting, validation helpers
- **Form Validation Logic**: Email validation, password strength, date range validation
- **Data Transformation**: Converting database records to UI models
- **Business Logic**: Cost calculations, statistics aggregation
- **Component Logic**: State management, event handlers

Example unit tests:
- Verify email validation rejects invalid formats
- Verify cost formatting displays correct currency symbols
- Verify date validation rejects future dates
- Verify statistics calculations sum correctly

### Property-Based Testing

The application will use **fast-check** as the property-based testing library for JavaScript/TypeScript. Property-based tests will verify universal properties across many randomly generated inputs.

**Configuration**: Each property-based test will run a minimum of 100 iterations to ensure thorough coverage of the input space.

**Tagging Convention**: Each property-based test will include a comment tag in the format:
`// Feature: asset-manager-app, Property {number}: {property description}`

Property-based tests will cover:

1. **Authentication Properties**: Role-based routing, credential validation, session management
2. **CRUD Operations**: Round-trip properties for create/read operations
3. **Validation Properties**: Input validation across all forms
4. **Access Control Properties**: User isolation, admin-only access
5. **Data Integrity Properties**: Foreign key constraints, uniqueness constraints
6. **Calculation Properties**: Statistics accuracy, aggregations

Example property-based tests:
- For any valid user credentials with a role, authentication should route to the correct dashboard
- For any valid asset data, creating then retrieving should return the same data
- For any user, their asset list should only contain assets they created
- For any set of assets, the total value calculation should equal the sum of all costs

### Integration Testing

Integration tests will verify:
- Complete user flows (login → create asset → view asset)
- Database operations with real Supabase connection (using test database)
- Server Actions with authentication context
- API routes with middleware
- Row Level Security policies

### End-to-End Testing

E2E tests using **Playwright** will verify:
- Complete user journeys through the UI
- Admin workflows (create user → create category → view all assets)
- User workflows (login → create asset → view my assets)
- Role-based access restrictions
- Responsive design on different viewports

### Test Data Strategy

- **Unit Tests**: Use mock data and stubs
- **Property-Based Tests**: Use fast-check generators for random valid/invalid data
- **Integration Tests**: Use a test Supabase project with seeded data
- **E2E Tests**: Use database transactions that rollback after each test

## Deployment and DevOps

### Environment Setup

**Development:**
- Local Next.js development server
- Local Supabase instance or development project
- Environment variables in `.env.local`

**Staging:**
- Vercel preview deployments for pull requests
- Separate Supabase staging project
- Environment variables configured in Vercel

**Production:**
- Vercel production deployment from main branch
- Supabase production project
- Environment variables configured in Vercel

### Required Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application
NEXT_PUBLIC_APP_URL=your-app-url
```

### CI/CD Pipeline

1. **Code Push to GitHub**
   - Developer pushes code to feature branch
   - GitHub triggers Vercel preview deployment

2. **Automated Checks**
   - Run linting (ESLint)
   - Run type checking (TypeScript)
   - Run unit tests (Vitest)
   - Run property-based tests (fast-check)

3. **Pull Request Review**
   - Code review by team members
   - Preview deployment available for testing
   - All checks must pass

4. **Merge to Main**
   - Automatic deployment to production
   - Run full test suite
   - Database migrations applied automatically

### Database Migrations

- Use Supabase migrations for schema changes
- Store migration files in `supabase/migrations/`
- Apply migrations automatically on deployment
- Test migrations on staging before production

### Monitoring and Logging

- **Application Logs**: Vercel logs for server-side errors
- **Database Logs**: Supabase logs for query performance
- **Error Tracking**: Consider integrating Sentry for error monitoring
- **Analytics**: Track user actions and feature usage

## Security Considerations

### Authentication Security

- Use Supabase Auth with secure password hashing
- Implement rate limiting on login attempts
- Use HTTP-only cookies for session tokens
- Implement CSRF protection
- Require strong passwords (minimum length, complexity)

### Authorization Security

- Enforce Row Level Security at database level
- Verify user roles in middleware for route protection
- Check permissions in Server Actions before mutations
- Never trust client-side role checks alone

### Data Security

- Validate and sanitize all user inputs
- Use parameterized queries to prevent SQL injection
- Implement proper CORS policies
- Use HTTPS for all connections
- Store sensitive data encrypted at rest

### API Security

- Use environment variables for secrets
- Never expose service role keys to client
- Implement rate limiting on API routes
- Validate request origins
- Use secure headers (CSP, HSTS, X-Frame-Options)

## Performance Optimization

### Frontend Optimization

- Use React Server Components for data fetching
- Implement code splitting with dynamic imports
- Optimize images with Next.js Image component
- Use Suspense boundaries for loading states
- Implement virtual scrolling for large lists

### Backend Optimization

- Use database indexes on frequently queried columns
- Implement pagination for large datasets
- Cache frequently accessed data (categories, departments)
- Use database connection pooling
- Optimize SQL queries with proper joins

### Caching Strategy

- Cache static assets with long TTL
- Use SWR or React Query for client-side caching
- Implement stale-while-revalidate for data fetching
- Cache category and department lists
- Invalidate cache on mutations

## Innovative Features

To enhance the application beyond basic requirements:

1. **Asset Search and Filtering**
   - Full-text search across asset names
   - Multi-select filters for categories and departments
   - Date range filtering for purchase dates
   - Cost range filtering

2. **Asset Analytics Dashboard**
   - Visual charts for asset distribution by category
   - Trend analysis for asset purchases over time
   - Department-wise asset value breakdown
   - Export reports to CSV/PDF

3. **Bulk Operations**
   - Bulk asset import via CSV upload
   - Bulk asset deletion (admin only)
   - Bulk category assignment

4. **Asset History and Audit Trail**
   - Track all changes to assets (updates, deletions)
   - Display modification history
   - Show who made changes and when

5. **Notifications**
   - Email notifications for new user creation
   - Alerts for high-value asset additions
   - Depreciation reminders based on asset age

6. **Asset Depreciation Tracking**
   - Calculate asset depreciation over time
   - Display current asset value
   - Generate depreciation reports

7. **Dark Mode**
   - Toggle between light and dark themes
   - Persist user preference
   - Smooth theme transitions

8. **Mobile-First Design**
   - Optimized mobile navigation
   - Touch-friendly interactions
   - Responsive tables with horizontal scroll

## Future Enhancements

Potential features for future iterations:

- Multi-tenancy support for multiple organizations
- Asset maintenance scheduling and tracking
- Asset assignment to specific employees
- QR code generation for physical asset tracking
- Integration with accounting software
- Advanced reporting and business intelligence
- Asset lifecycle management (procurement to disposal)
- Document attachments for assets (receipts, warranties)
- Asset location tracking
- Approval workflows for asset creation/deletion
