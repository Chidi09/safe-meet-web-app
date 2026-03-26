# SafeMeet

Trustless peer-to-peer escrow for real-world trades and goal commitments on Base Sepolia.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.0-black.svg)](https://www.fastify.io/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.0-2D3748.svg)](https://www.prisma.io/)

## Overview

SafeMeet is a decentralized escrow protocol enabling secure, trustless transactions for:

- **In-person trades** — High-value items with QR-code verification
- **Goal commitments** — Self-enforced objectives with referee oversight

Built with modern web3 stack: Fastify backend, Next.js frontend, shared Zod schemas, and PostgreSQL database.

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- pnpm 9+

### Installation

```bash
# Clone and install
git clone https://github.com/Chidi09/safe-meet-web-app.git
cd safe-meet-web-app
pnpm install
```

### Environment Setup

**Backend (`apps/api/.env`)**:
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/safemeet"
JWT_SECRET="your-jwt-secret-min-32-chars"
QR_SECRET="your-qr-signing-secret"
FRONTEND_URL="http://localhost:3000"
PORT=4000
```

**Frontend (`apps/web/.env.local`)**:
```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your-walletconnect-id"
```

### Database Setup

```bash
cd apps/api
npx prisma migrate dev
```

### Run Development

```bash
# Run both frontend and backend
pnpm dev

# Or individually
pnpm dev:web  # Frontend: http://localhost:3000
pnpm dev:api  # Backend: http://localhost:4000
```

## Architecture

```
safe-meet/
├── apps/
│   ├── api/          # Fastify v5 + Prisma + JWT auth
│   └── web/          # Next.js 16 + RainbowKit + Tailwind
├── packages/
│   └── shared/       # Zod schemas shared across apps
├── turbo.json        # Turborepo pipeline
└── pnpm-workspace.yaml
```

### Tech Stack

**Backend**
- Fastify 5 with Zod type provider
- JWT authentication with SIWE (Sign-In with Ethereum)
- Prisma ORM with PostgreSQL
- Rate limiting & security headers
- QR code generation with cryptographic signing

**Frontend**
- Next.js 16 App Router
- RainbowKit + Wagmi for wallet connection
- React Query for server state
- Tailwind CSS + shadcn/ui
- TypeScript with strict mode

**Shared**
- Zod schemas for runtime validation
- Type inference for end-to-end type safety

## Security

- JWT-based authentication with SIWE
- Resource authorization on all state-changing routes
- Rate limiting (100 req/min general, 5 req/min for QR)
- Cryptographically signed QR payloads
- Input validation with Zod on all endpoints
- Helmet security headers in production

## API Endpoints

### Authentication
- `POST /api/auth/nonce` — Get SIWE nonce
- `POST /api/auth/verify` — Verify signature, receive JWT

### Pacts
- `GET /api/pacts` — List pacts (with filters)
- `POST /api/pacts` — Create new pact (auth required)
- `GET /api/pacts/:id` — Get pact details
- `PATCH /api/pacts/:id/status` — Update status (auth + ownership)
- `POST /api/pacts/:id/qr` — Generate QR code (auth + ownership)
- `POST /api/pacts/verify-qr` — Verify QR and complete (auth)

### Dashboard & Profile
- `GET /api/dashboard/stats?wallet=` — Dashboard statistics
- `GET /api/profile/:wallet` — Public profile
- `PATCH /api/profile/:wallet` — Update profile (auth + own only)

## Deployment

### Vercel (Recommended)

1. Create two Vercel projects:
   - Frontend: Connect `apps/web`
   - Backend: Connect `apps/api`

2. Set environment variables in Vercel dashboard

3. Deploy:
```bash
# Frontend
cd apps/web && vercel --prod

# Backend  
cd apps/api && vercel --prod
```

### Database

Use Vercel Postgres or any PostgreSQL provider:
```bash
# Generate and deploy migrations
npx prisma migrate deploy
```

## Scripts

```bash
pnpm build          # Build all packages and apps
pnpm typecheck      # Type check across monorepo
pnpm dev            # Run all dev servers
pnpm dev:web        # Frontend only
pnpm dev:api        # Backend only
```

## License

MIT

## Support

For issues and feature requests, please use GitHub Issues.

---

Built with ❤️ for the Ethereum ecosystem
