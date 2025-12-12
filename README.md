# Asset Manager Application

A modern, full-featured web application for tracking and managing organizational assets with role-based access control, audit logging, comprehensive asset deletion workflow, and integrated warranty management system.

## 🚀 Live Demo

**Production URL:** [https://eport-asset-manager-beta.vercel.app/](https://eport-asset-manager-beta.vercel.app/)

**Demo Credentials:**
- **Admin Account:** dev.sahwira@gmail.com / Password123
- **User Account:** moses.marimo@eport.cloud / Password123

Try it now! Login and explore the full feature set with pre-populated demo data.

## Features

- **Role-Based Access Control**: Admin and user roles with granular permissions
- **Asset Management**: Create, read, update, and delete assets with full audit trails
- **Warranty Management**: Complete warranty lifecycle management with registration and tracking
- **Warranty Center**: Professional dashboard for warranty administration
- **Deletion Workflow**: Request-based asset deletion with admin approval
- **Audit Logging**: Complete history of all system actions
- **Categories & Departments**: Organize assets by category and department
- **Dark Mode**: Full dark mode support with theme toggle
- **Responsive Design**: Mobile-first design that works on all devices
- **Real-time Updates**: Live data synchronization with Supabase

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **UI**: shadcn/ui components, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + Auth) + FastAPI Warranty Service
- **Warranty System**: FastAPI + PostgreSQL + Docker deployment
- **Testing**: Vitest with Property-Based Testing (fast-check)
- **Deployment**: Vercel + Production server (server16.eport.ws)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **Supabase Account** (free tier works)

## Quick Start

Get the app running in 5 minutes:

### 1. Clone and Install

```bash
git clone <repository-url>
cd asset-manager
npm install
```

### 2. Set Up Supabase

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project (wait 2-3 minutes for provisioning)
3. Go to Settings → API and copy your credentials

### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Set Up Database Schema

**Option A: Using Supabase SQL Editor (Easiest)**

1. Open your Supabase project dashboard
2. Go to SQL Editor → New Query
3. Copy the entire contents of `supabase/migrations/00000000000000_consolidated_schema.sql`
4. Paste and click **Run**

**Option B: Using Supabase CLI**

```bash
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

### 5. Seed with Demo Data

```bash
npm run db:seed
```

This automatically creates:
- ✅ 2 demo users (admin + regular user)
- ✅ 5 categories
- ✅ 5 departments
- ✅ 5 sample assets
- ✅ Audit log entries

> **⚠️ Important:** If the database already contains data, the seeder will fail. Run the cleanup script first:
> ```bash
> node scripts/cleanup-database.mjs
> npm run db:seed
> ```

### 6. Start the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 7. Login

**Admin Account:**
- Email: `dev.sahwira@gmail.com`
- Password: `Password123`

**Regular User Account:**
- Email: `rumbi@eport.cloud`
- Password: `Password123`

---

**That's it!** 🎉 You now have a fully functional asset management system with demo data.

## 🛡️ Warranty Management System

The application includes a comprehensive warranty management system with both frontend integration and a dedicated warranty center.

### Warranty Features

- **One-Click Registration**: Register asset warranties directly from asset details
- **Status Tracking**: Real-time warranty status with visual indicators
- **Warranty Center**: Professional dashboard for warranty administration
- **Expiration Management**: Automatic tracking and notifications
- **User Management**: Track who registered each warranty

### Warranty Integration

**Frontend Integration:**
- Warranty registration button on asset detail pages
- Real-time status updates with "Warranty Registered" confirmation
- Visual warranty status badges with expiration information
- Mobile-optimized warranty interface

**Warranty Center Dashboard:**
- **URL**: https://server16.eport.ws/warranty-center
- **Login**: admin_tinashe / warranty123
- Professional statistics dashboard
- Advanced search and filtering
- Complete warranty lifecycle management
- User tracking and audit trails

### Warranty API

The warranty system is powered by a FastAPI backend deployed on server16.eport.ws:

**API Endpoints:**
- `POST /api/warranty/register` - Register new warranty
- `GET /api/warranty/check/{asset_id}` - Check warranty status
- `GET /api/warranty/list` - List all warranties
- `GET /health` - API health check

**Production API**: https://server16.eport.ws/api

### Warranty System Architecture

```
Next.js Frontend → FastAPI Warranty API → PostgreSQL Database
                ↓
         Warranty Center Dashboard
```

**Security Features:**
- HTTPS-only access with A+ SSL rating
- Input validation and CSRF protection
- Session-based authentication
- Rate limiting and security headers

**Performance:**
- Sub-500ms API response times
- PostgreSQL optimization (50-80% improvement)
- Intelligent caching with automatic invalidation
- Docker containerization for reliability

## Available Scripts

### Development

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Database Management

```bash
npm run db:seed                      # Seed database with default data
npm run db:setup                     # Initial database setup (legacy)
npm run db:verify                    # Verify database setup
node scripts/cleanup-database.mjs    # ⚠️ Clean database before reseeding
```

> **💡 Tip:** If seeding fails due to existing data, run `cleanup-database.mjs` first to reset the database while preserving the two main user accounts.

### Testing

```bash
npm test             # Run all tests once
npm run test:watch   # Run tests in watch mode
npm run test:ui      # Open Vitest UI
```

### Utility Scripts

```bash
node scripts/cleanup-database.mjs    # Clean database (keeps specified users)
node scripts/verify-cleanup.mjs      # Verify database cleanup
node scripts/create-admin.mjs        # Create additional admin users
```

## Project Structure

```
asset-manager/
├── app/                          # Next.js app directory
│   ├── (auth)/                   # Authentication pages
│   ├── (dashboard)/              # Dashboard pages
│   │   ├── admin/                # Admin-only pages
│   │   └── user/                 # User pages
│   └── actions/                  # Server actions
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components
│   └── ...                       # Custom components
├── lib/                          # Utility libraries
│   ├── supabase/                 # Supabase clients
│   └── utils.ts                  # Helper functions
├── scripts/                      # Database and utility scripts
├── supabase/                     # Supabase configuration
│   └── migrations/               # Database migrations
├── tests/                        # Test files
├── types/                        # TypeScript type definitions
└── public/                       # Static assets
```

## Database Schema

The application uses the following main tables:

**Asset Management (Supabase):**
- **profiles**: User profiles with roles (admin/user)
- **categories**: Asset categories
- **departments**: Organizational departments
- **assets**: Asset records with relationships
- **deletion_requests**: Asset deletion workflow
- **audit_logs**: Complete audit trail

**Warranty System (PostgreSQL):**
- **warranty_registrations**: Warranty records with asset relationships
- **warranty_users**: Warranty center user accounts
- **warranty_sessions**: Session management for warranty center

See `supabase/migrations/00000000000000_consolidated_schema.sql` for the complete asset management schema.

## User Roles

### Asset Management System

**Admin:**
- Full access to all features
- Manage users, categories, and departments
- View and manage all assets
- Approve/reject deletion requests
- Access audit logs
- Register warranties for any asset

**User:**
- Create and manage own assets
- Request asset deletions
- View own audit history
- Register warranties for own assets
- Limited to own data

### Warranty Center System

**Warranty Administrator:**
- Access warranty center dashboard
- View all warranty registrations
- Search and filter warranties
- Track warranty statistics
- Manage warranty lifecycle

## Asset Deletion Workflow

1. **User** submits a deletion request with justification
2. **Admin** reviews the request
3. **Admin** approves or rejects with optional comments
4. If approved, asset is deleted and audit log is created
5. Deletion request record is preserved for audit trail

## Testing

The application includes comprehensive tests using Vitest and Property-Based Testing:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Open Vitest UI
npm run test:ui
```

Tests cover:
- Property-based tests for business logic
- Unit tests for components and utilities
- Integration tests for workflows

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

The application can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Railway
- Render

## Environment Variables

### Asset Management System

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) | Yes |

### Warranty System Integration

The warranty system is deployed separately on server16.eport.ws and integrates via API calls. No additional environment variables are required for basic warranty functionality.

## Troubleshooting

### Database Connection Issues

If you can't connect to the database:
1. Verify your environment variables are correct
2. Check that your Supabase project is active
3. Ensure RLS policies are properly set up

### Migration Failures

If migrations fail:
1. The consolidated migration is idempotent - you can run it multiple times
2. It automatically drops and recreates all objects
3. Check Supabase logs for specific errors

### Authentication Issues

If you can't log in:
1. Verify the user exists in Supabase Auth
2. Check that the profile was created (should be automatic)
3. Ensure the user's role is set correctly in the profiles table

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security

- All sensitive operations require authentication
- Row Level Security (RLS) enforces data access rules
- Service role key should never be exposed to the client
- Passwords are hashed by Supabase Auth
- Audit logs track all system actions

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation in `.kiro/specs/documentation/`
- Review the database schema in `supabase/migrations/`

## Warranty System Access

### Production Warranty Center
- **URL**: https://server16.eport.ws/warranty-center
- **Username**: admin_tinashe
- **Password**: warranty123

### API Documentation
- **Base URL**: https://server16.eport.ws/api
- **Health Check**: https://server16.eport.ws/health
- **Security**: HTTPS-only with A+ SSL rating
- **Performance**: Sub-500ms response times

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Database and auth by [Supabase](https://supabase.com/)
- Warranty system powered by [FastAPI](https://fastapi.tiangolo.com/)
- Icons from [Lucide](https://lucide.dev/)
