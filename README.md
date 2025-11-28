# Asset Manager Application

A modern web application for tracking and managing organizational assets with role-based access control.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Documentation

Detailed documentation is available in the `.kiro/specs/asset-manager-app/` directory:

- [Requirements](/.kiro/specs/asset-manager-app/requirements.md) - Feature requirements and acceptance criteria
- [Design](/.kiro/specs/asset-manager-app/design.md) - Architecture and design decisions
- [Tasks](/.kiro/specs/asset-manager-app/tasks.md) - Implementation task list
- [Setup Guide](/.kiro/specs/asset-manager-app/SETUP.md) - Detailed setup instructions

## Tech Stack

- Next.js 14+ (App Router)
- shadcn/ui + Tailwind CSS
- Supabase (Auth + PostgreSQL)
- TypeScript

## License

MIT
