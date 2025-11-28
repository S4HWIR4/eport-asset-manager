# Asset Manager Application

A modern web application for tracking and managing organizational assets with role-based access control.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL via Supabase
- **Deployment**: Vercel
- **Testing**: Vitest (unit), fast-check (property-based)

## Features

- Role-based access control (Admin and User roles)
- Asset creation and management
- Category and department organization
- User management (Admin only)
- Asset deletion with audit logging (Admin only)
- Responsive design for mobile and desktop

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project
- Git installed

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd asset-manager
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.local.example` to `.env.local`
   - Fill in your Supabase credentials:
     - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
     - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/                    # Next.js App Router pages
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── lib/                  # Utility functions
├── types/                # TypeScript type definitions
├── public/               # Static assets
└── .kiro/specs/         # Project specifications
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Deployment

This application is designed to be deployed on Vercel with automatic deployments from GitHub.

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy!

## License

MIT
