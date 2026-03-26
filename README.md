# SafeMeet 🛡️

Trustless P2P Escrow for Real-World Trades

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.0-black.svg)](https://www.fastify.io/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.0-2D3748.svg)](https://www.prisma.io/)

## Architecture

SafeMeet is built as a **Turborepo monorepo** with:

- **Frontend**: Next.js 16 with TypeScript, RainbowKit, and Tailwind CSS
- **Backend**: Fastify 5 with Zod validation, Prisma ORM, and JWT authentication
- **Shared**: Type-safe Zod schemas shared between frontend and backend
- **Database**: PostgreSQL with Prisma
- **Deployment**: Vercel (both frontend and backend)

```
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Fastify backend
├── packages/
│   └── shared/       # Shared Zod schemas and types
├── turbo.json        # Turborepo pipeline
└── package.json      # Root workspace config
```

## Quick Start

### Prerequisites

- Node.js 20+ 
- PostgreSQL 14+ (or use Vercel Postgres)
- npm 10+

### 1. Clone and Install

```bash
git clone <repository-url>
cd safe-meet
npm install
```

### 2. Environment Setup

Create environment files:

**Backend (`apps/api/.env`)**:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/safemeet"
JWT_SECRET="your-super-secret-jwt-key-minimum-32-chars"
QR_SECRET="different-secret-for-signing-qr-codes"
FRONTEND_URL="http://localhost:3000"
PORT=4000
NODE_ENV="development"
```

**Frontend (`apps/web/.env.local`)**:
```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your-walletconnect-project-id"
```

Get a WalletConnect Project ID at [cloud.walletconnect.com](https://cloud.walletconnect.com)

### 3. Database Setup

```bash
# Generate Prisma client
cd apps/api
npx prisma generate

# Push schema to database (development)
npx prisma db push

# Or create a migration (production)
npx prisma migrate dev --name init

# Seed database (optional)
# npx prisma db seed
```

### 4. Run Development Servers

```bash
# Run both frontend and backend
cd ../..
npm run dev

# Or run individually
npm run dev:web  # Frontend only
npm run dev:api  # Backend only
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- API Health Check: http://localhost:4000/health

## Project Structure

### Frontend (`apps/web/`)

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Home page
│   ├── dashboard/         # Dashboard page
│   ├── create/            # Create pact flow
│   ├── escrow/            # Escrow pages
│   ├── history/           # Transaction history
│   ├── profile/           # Public profile
│   ├── settings/          # User settings
│   ├── error.tsx          # Error boundary
│   ├── loading.tsx        # Loading state
│   └── layout.tsx         # Root layout
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── providers.tsx      # App providers (Wagmi, RainbowKit)
│   ├── page-frame.tsx     # Layout wrapper
│   ├── side-nav.tsx       # Sidebar navigation
│   ├── top-nav.tsx        # Top navigation
│   └── status-badge.tsx   # Status component
├── hooks/
│   ├── usePacts.ts        # Pact data hooks
│   ├── useDashboard.ts    # Dashboard data
│   ├── useSettings.ts     # Settings data
│   └── useProfile.ts      # Profile data
├── lib/
│   ├── api/               # API client and endpoints
│   ├── utils.ts           # Utility functions
│   └── types.ts           # Type exports
├── store/
│   └── pact-creation.ts   # Zustand store
└── types/
    ├── ethereum.d.ts      # EIP-1193 types
    └── html5-qrcode.d.ts  # QR scanner types
```

### Backend (`apps/api/`)

```
src/
├── index.ts               # Fastify server setup
├── serverless.ts          # Vercel serverless handler
├── plugins/
│   └── auth.ts            # JWT authentication plugin
├── routes/
│   ├── auth.ts            # SIWE authentication
│   ├── pacts.ts           # Pact CRUD operations
│   ├── dashboard.ts       # Dashboard stats
│   ├── profile.ts         # Profile management
│   └── sessions.ts        # Session management
├── lib/
│   ├── prisma.ts          # Prisma client singleton
│   └── mappers.ts         # DB to domain mappers
└── prisma/
    └── schema.prisma      # Database schema
```

### Shared Package (`packages/shared/`)

```
src/
├── schemas.ts             # All Zod schemas
├── types.ts               # Derived TypeScript types
└── index.ts               # Public API barrel
```

## Security Features

✅ **Authentication**: JWT-based auth with SIWE (Sign-In with Ethereum)  
✅ **Authorization**: Resource ownership checks on all state-changing routes  
✅ **Rate Limiting**: 100 req/min general, 5 req/min for QR generation  
✅ **Input Validation**: Zod schemas for all inputs (runtime + compile-time)  
✅ **CORS**: Configured per environment  
✅ **Helmet**: Security headers (CSP in production)  
✅ **QR Signing**: Cryptographically signed QR payloads  
✅ **Type Safety**: Strict TypeScript with noUncheckedIndexedAccess  

## API Endpoints

### Authentication
- `GET /api/auth/nonce` - Get SIWE nonce
- `POST /api/auth/verify` - Verify signature and get JWT
- `POST /api/auth/logout` - Revoke session (requires auth)

### Pacts
- `GET /api/pacts` - List pacts (filter by wallet, type, status)
- `GET /api/pacts/history` - Paginated history
- `GET /api/pacts/:id` - Get single pact
- `POST /api/pacts` - Create new pact (requires auth)
- `PATCH /api/pacts/:id/status` - Update status (requires auth + ownership)
- `PATCH /api/pacts/:id/proof` - Submit proof (requires auth + creator)
- `POST /api/pacts/:id/qr` - Generate QR code (requires auth + ownership)
- `POST /api/pacts/verify-qr` - Verify QR and complete (requires auth + counterparty)

### Dashboard
- `GET /api/dashboard/stats?wallet=` - Get dashboard stats

### Profile
- `GET /api/profile/:wallet` - Get profile
- `PATCH /api/profile/:wallet` - Update profile (requires auth + own profile only)

### Sessions
- `GET /api/sessions` - List sessions (requires auth)
- `DELETE /api/sessions/:id` - Revoke session (requires auth)

## Deployment

### Vercel (Recommended)

1. **Create Projects**:
   - Create two projects in Vercel dashboard
   - Link `apps/web` to one project (frontend)
   - Link `apps/api` to another project (backend)

2. **Set Environment Variables**:

   **API Project**:
   ```
   DATABASE_URL=your-postgres-url
   JWT_SECRET=your-jwt-secret
   QR_SECRET=your-qr-secret
   FRONTEND_URL=https://your-frontend.vercel.app
   NODE_ENV=production
   ```

   **Web Project**:
   ```
   NEXT_PUBLIC_API_URL=https://your-api.vercel.app
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id
   ```

3. **Deploy**:
   ```bash
   # Frontend
   cd apps/web
   vercel --prod

   # Backend
   cd apps/api
   vercel --prod
   ```

### Database on Vercel

Use Vercel Postgres or Neon:

```bash
# Install Vercel Postgres integration
npm install @vercel/postgres

# Update schema.prisma
# datasource db {
#   provider = "postgresql"
#   url      = env("POSTGRES_PRISMA_URL")
#   directUrl = env("POSTGRES_URL_NON_POOLING")
# }
```

## Development Commands

```bash
# Build all packages and apps
npm run build

# Type check all packages
npm run typecheck

# Run linting
npm run lint

# Database operations
cd apps/api
npx prisma studio          # Open Prisma Studio
npx prisma migrate dev     # Create migration
npx prisma migrate deploy  # Deploy migrations
npx prisma db push         # Push schema (dev only)

# Clean build artifacts
npm run clean
```

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Component library
- **RainbowKit** - Wallet connection
- **Wagmi/Viem** - Ethereum interactions
- **React Query** - Server state management
- **Zustand** - Client state management
- **Framer Motion** - Animations
- **Sonner** - Toast notifications

### Backend
- **Fastify 5** - High-performance web framework
- **Zod** - Schema validation
- **Prisma** - Database ORM
- **JWT** - Authentication tokens
- **@fastify/rate-limit** - Rate limiting
- **@fastify/helmet** - Security headers
- **@fastify/cors** - CORS handling
- **QRCode** - QR code generation

### Shared
- **Zod** - Shared schemas between frontend and backend
- **TypeScript** - Type inference from schemas

### Infrastructure
- **PostgreSQL** - Primary database
- **Turborepo** - Monorepo management
- **Vercel** - Hosting platform

## Architecture Decisions

### Why Turborepo?
- Single repository for frontend and backend
- Shared types and schemas
- Coordinated deployments
- Remote caching for faster builds

### Why Zod?
- Single source of truth for validation
- Type inference (no manual TypeScript types)
- Runtime validation in backend
- Type safety in frontend

### Why Fastify over Express?
- Better performance
- Built-in TypeScript support
- Zod type provider for automatic validation
- Plugin architecture

### Why Prisma?
- Type-safe database queries
- Automatic migrations
- Great developer experience
- Excellent PostgreSQL support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and type checking
5. Submit a pull request

## Security Considerations

⚠️ **Before Production**:
- [ ] Replace placeholder signature verification in `auth.ts` with real crypto
- [ ] Set strong secrets for JWT and QR signing
- [ ] Enable strict CORS origins (not wildcard)
- [ ] Configure CSP headers properly
- [ ] Add audit logging
- [ ] Set up monitoring and alerting
- [ ] Run security audit: `npm audit`

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please use the GitHub issue tracker.

---

Built with ❤️ for the Ethereum ecosystem
