# Asset Manager Application

A modern, full-featured web application for tracking and managing organizational assets with role-based access control, audit logging, and a comprehensive asset deletion workflow.

## Features

- **Role-Based Access Control**: Admin and user roles with granular permissions
- **Asset Management**: Create, read, update, and delete assets with full audit trails
- **Deletion Workflow**: Request-based asset deletion with admin approval
- **Audit Logging**: Complete history of all system actions
- **Categories & Departments**: Organize assets by category and department
- **Dark Mode**: Full dark mode support with theme toggle
- **Responsive Design**: Mobile-first design that works on all devices
- **Real-time Updates**: Live data synchronization with Supabase

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **UI**: shadcn/ui components, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + Auth)
- **Testing**: Vitest with Property-Based Testing (fast-check)
- **Deployment**: Vercel-ready

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **Supabase Account** (free tier works)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd asset-manager
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase project details:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**Where to find these values:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy the Project URL, anon/public key, and service_role key

### 4. Set Up the Database

Run the consolidated migration to create all tables, functions, and policies:

```bash
# Option 1: Using Supabase CLI (recommended)
supabase db push

# Option 2: Manual SQL execution
# Copy the contents of supabase/migrations/00000000000000_consolidated_schema.sql
# and run it in the Supabase SQL Editor
```

### 5. Seed the Database

Seed the database with default data (admin user, categories, and departments):

```bash
npm run db:seed
```

This creates:
- **Admin User**: dev.sahwira@gmail.com (Password: Password123)
- **5 Categories**: Computer Equipment, Office Furniture, Vehicles, Software Licenses, Network Equipment
- **5 Departments**: IT Department, Human Resources, Finance, Operations, Marketing

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. Login

Use the default admin credentials:
- **Email**: dev.sahwira@gmail.com
- **Password**: Password123

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
npm run db:seed      # Seed database with default data
npm run db:setup     # Initial database setup (legacy)
npm run db:verify    # Verify database setup
```

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

- **profiles**: User profiles with roles (admin/user)
- **categories**: Asset categories
- **departments**: Organizational departments
- **assets**: Asset records with relationships
- **deletion_requests**: Asset deletion workflow
- **audit_logs**: Complete audit trail

See `supabase/migrations/00000000000000_consolidated_schema.sql` for the complete schema.

## User Roles

### Admin
- Full access to all features
- Manage users, categories, and departments
- View and manage all assets
- Approve/reject deletion requests
- Access audit logs

### User
- Create and manage own assets
- Request asset deletions
- View own audit history
- Limited to own data

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

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) | Yes |

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

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Database and auth by [Supabase](https://supabase.com/)
- Icons from [Lucide](https://lucide.dev/)
