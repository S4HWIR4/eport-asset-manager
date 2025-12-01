# Asset Manager - Complete Setup Guide

This guide will walk you through setting up the Asset Manager application from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Supabase Configuration](#supabase-configuration)
4. [Database Setup](#database-setup)
5. [Running the Application](#running-the-application)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
   ```bash
   node --version  # Should be 18.x or higher
   ```

2. **npm** (v9 or higher)
   ```bash
   npm --version  # Should be 9.x or higher
   ```

3. **Git**
   ```bash
   git --version
   ```

### Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up for a free account
3. Create a new project
4. Wait for the project to finish provisioning (2-3 minutes)

## Initial Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd asset-manager

# Install dependencies
npm install
```

### 2. Environment Configuration

```bash
# Copy the example environment file
cp .env.local.example .env.local
```

Edit `.env.local` with your text editor:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Supabase Configuration

### Finding Your Credentials

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click on **Settings** (gear icon) in the sidebar
4. Click on **API** in the settings menu

You'll find:
- **Project URL**: Copy this to `NEXT_PUBLIC_SUPABASE_URL`
- **anon/public key**: Copy this to `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role key**: Copy this to `SUPABASE_SERVICE_ROLE_KEY`

### Important Security Notes

⚠️ **Never commit `.env.local` to version control**
⚠️ **Never expose the service_role key in client-side code**
⚠️ **The service_role key bypasses Row Level Security - use with caution**

## Database Setup

### Option 1: Using the Consolidated Migration (Recommended)

This is the easiest and most reliable method.

#### Using Supabase SQL Editor

1. Go to your Supabase Dashboard
2. Click on **SQL Editor** in the sidebar
3. Click **New Query**
4. Open `supabase/migrations/00000000000000_consolidated_schema.sql`
5. Copy the entire contents
6. Paste into the SQL Editor
7. Click **Run** (or press Ctrl/Cmd + Enter)

The migration will:
- ✅ Drop any existing tables and policies (safe to run multiple times)
- ✅ Create all tables with proper relationships
- ✅ Set up Row Level Security policies
- ✅ Create necessary functions and triggers
- ✅ Add all required indexes

#### Using Supabase CLI (Alternative)

If you have the Supabase CLI installed:

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push the migration
supabase db push
```

### Option 2: Using Individual Migrations (Legacy)

If you prefer to run migrations individually:

```bash
# Run each migration in order
npm run db:setup
npm run db:apply-rls
# ... etc
```

**Note**: The consolidated migration is preferred as it's idempotent and handles all dependencies correctly.

## Seeding the Database

After the database schema is set up, seed it with initial data:

```bash
npm run db:seed
```

This creates:

### Default Users
- **Admin User**: dev.sahwira@gmail.com (Password: Password123)
- **Regular User**: rumbi@eport.cloud (Password: Password123)

### Categories (5)
- Computer Equipment
- Office Furniture
- Vehicles
- Software Licenses
- Network Equipment

### Departments (5)
- IT Department
- Human Resources
- Finance
- Operations
- Marketing

### Sample Assets (5)
- 3 assets created by admin user
- 2 assets created by regular user

**Note**: The seeder is idempotent and intelligent:
- Creates users in Supabase Auth if they don't exist
- Uses existing users if they're already created
- Won't create duplicate categories, departments, or assets
- Safe to run multiple times

## Running the Application

### Development Mode

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
# Build the application
npm run build

# Start the production server
npm start
```

## Verification

### 1. Check Database Setup

```bash
npm run db:verify
```

This will verify:
- ✅ All tables exist
- ✅ RLS is enabled
- ✅ Policies are in place
- ✅ Functions are created

### 2. Test Login

1. Navigate to [http://localhost:3000](http://localhost:3000)
2. You should see the login page
3. Login with:
   - Email: `dev.sahwira@gmail.com`
   - Password: `Password123`
4. You should be redirected to the admin dashboard

### 3. Verify Seeded Data

After logging in:

1. **Check Categories**:
   - Go to Admin → Categories
   - You should see 5 categories

2. **Check Departments**:
   - Go to Admin → Departments
   - You should see 5 departments

3. **Create a Test Asset**:
   - Go to Admin → Assets
   - Click "Create Asset"
   - Fill in the form
   - Verify it appears in the list

## Troubleshooting

### Issue: "Invalid API Key"

**Solution**:
1. Double-check your `.env.local` file
2. Ensure there are no extra spaces or quotes
3. Verify the keys are correct in Supabase Dashboard
4. Restart the development server

### Issue: "Failed to fetch"

**Solution**:
1. Check that your Supabase project is active
2. Verify the project URL is correct
3. Check your internet connection
4. Look for CORS errors in browser console

### Issue: Migration Fails

**Solution**:
1. The consolidated migration is idempotent - run it again
2. Check Supabase logs for specific errors:
   - Go to Dashboard → Logs → Postgres Logs
3. Ensure you're using the service_role key for migrations
4. Try running the SQL directly in the SQL Editor

### Issue: Can't Login

**Solution**:
1. Verify the user exists:
   - Go to Dashboard → Authentication → Users
2. Check the user's email is confirmed
3. Verify the profile was created:
   - Go to Dashboard → Table Editor → profiles
4. Ensure the role is set to 'admin'

### Issue: "Permission Denied" Errors

**Solution**:
1. Check that RLS policies are properly set up
2. Verify the user's role in the profiles table
3. Check browser console for specific policy errors
4. Review the RLS policies in the consolidated migration

### Issue: Seeder Fails

**Solution**:
1. **Ensure the database schema is set up first** - Run the migration before seeding
2. **Check environment variables** - Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
3. **Check Supabase Auth is enabled** - Go to Dashboard → Authentication → Providers
4. **Review error message** - The seeder provides detailed error messages
5. **Check Supabase logs** - Dashboard → Logs → Postgres Logs for specific errors

**Common Issues:**
- "Failed to create user in Auth" → Check that email confirmations are disabled for development
- "Failed to create profile" → Ensure the profiles table exists (run migration first)
- "Failed to create categories" → Check that the categories table exists

## Next Steps

After successful setup:

1. **Change Default Password**:
   - Login as admin
   - Go to your profile
   - Change the password from the default

2. **Create Additional Users**:
   ```bash
   npm run db:create-admin
   ```

3. **Explore the Application**:
   - Create assets
   - Test the deletion workflow
   - Review audit logs
   - Try the dark mode toggle

4. **Run Tests**:
   ```bash
   npm test
   ```

5. **Deploy to Production**:
   - See README.md for deployment instructions

## Additional Resources

- **Main README**: [README.md](./README.md)
- **Database Schema**: [supabase/migrations/00000000000000_consolidated_schema.sql](./supabase/migrations/00000000000000_consolidated_schema.sql)
- **Supabase Documentation**: [https://supabase.com/docs](https://supabase.com/docs)
- **Next.js Documentation**: [https://nextjs.org/docs](https://nextjs.org/docs)

## Getting Help

If you encounter issues not covered in this guide:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review Supabase logs in the dashboard
3. Check browser console for errors
4. Open an issue on GitHub with:
   - Error message
   - Steps to reproduce
   - Environment details (OS, Node version, etc.)

## Summary Checklist

- [ ] Node.js 18+ installed
- [ ] Supabase project created
- [ ] Repository cloned
- [ ] Dependencies installed (`npm install`)
- [ ] `.env.local` configured with Supabase credentials
- [ ] Database schema created (consolidated migration)
- [ ] Database seeded (`npm run db:seed`)
- [ ] Development server running (`npm run dev`)
- [ ] Successfully logged in as admin
- [ ] Verified categories and departments exist
- [ ] Created a test asset

Once all items are checked, you're ready to start developing! 🎉
