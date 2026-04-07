# Sanity Log Debug

Operational dashboard for uploading, processing, and visualizing Sanity CMS API request logs. Upload CSV/NDJSON log exports, then explore performance metrics, error rates, and endpoint distributions through interactive charts and filterable tables.

## Features

- **Log Upload & Processing** — Drag-and-drop CSV/NDJSON files with chunked uploads (up to 10GB), background processing via Workflow.dev, and real-time progress tracking
- **Analytics Dashboard** — KPI cards, time-series charts, status/endpoint/method distributions, latency histograms, and slowest requests table
- **Filtering & Exploration** — Filter by date range, HTTP status, endpoint, method, and domain with URL-synced state
- **Pipeline Monitoring** — Track processing jobs with status, record counts, error tracking, and retry capabilities
- **Multi-user Auth** — GitHub OAuth via Better Auth with role-based access control (admin/user)
- **Admin Panel** — User management and system-wide statistics

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19, React Compiler) |
| Styling | Tailwind CSS 4, shadcn/ui (Radix primitives) |
| Database | PostgreSQL (Neon serverless) via Drizzle ORM |
| Auth | Better Auth (GitHub OAuth) |
| Storage | Cloudflare R2 (S3-compatible) |
| Background Jobs | Workflow.dev |
| Charts | Recharts |
| State | TanStack Query, nuqs (URL state) |
| Validation | Zod |
| Testing | Vitest, MSW |
| Linting | Biome |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database ([Neon](https://neon.tech) recommended)
- Cloudflare R2 bucket
- GitHub OAuth app

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=sanity-logs

# Auth
BETTER_AUTH_SECRET=       # 32+ character secret
BETTER_AUTH_URL=http://localhost:3000
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

### Setup

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:push` | Push schema to database |
| `npm run test` | Run all tests |
| `npm run test:unit` | Unit tests only |
| `npm run test:coverage` | Tests with coverage report |
| `npm run lint` | Lint with Biome |
| `npm run lint:fix` | Auto-fix lint issues |

## Architecture

```
src/
├── app/
│   ├── (auth)/login/        # Login page
│   ├── (dashboard)/         # Authenticated pages
│   │   ├── analytics/       # Charts & metrics
│   │   ├── sources/         # File upload & management
│   │   ├── pipeline/        # Processing job monitoring
│   │   └── admin/           # User management (admin only)
│   └── api/                 # Route handlers
│       ├── auth/            # Better Auth endpoints
│       ├── files/           # File CRUD & retry
│       ├── uploads/         # Chunked upload flow
│       ├── logs/            # Query & aggregations
│       ├── processing/      # Pipeline status
│       └── admin/           # Admin endpoints
├── components/              # UI components (shadcn/ui based)
├── lib/
│   ├── api/                 # Error handling, auth middleware
│   ├── db/                  # Drizzle schema & client
│   ├── r2/                  # R2 storage client
│   └── query-keys.ts        # TanStack Query key factory
└── workflow/                # Background processing jobs
```

### Upload & Processing Pipeline

1. Client initiates chunked upload → server creates R2 multipart upload with presigned URLs
2. Chunks upload in parallel → server tracks progress in PostgreSQL
3. On completion → Workflow.dev triggers background processing
4. Log records parsed (NDJSON/CSV) in parallel batches → inserted into PostgreSQL
5. R2 file cleaned up after successful processing

## Deployment

Optimized for [Vercel](https://vercel.com) with the `withWorkflow` wrapper in `next.config.ts` for background job support.
