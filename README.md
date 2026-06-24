# GyenBox 疆域盒子

Privacy-first cloud storage and file sync for the GSYEN ecosystem.

This repository starts Phase 1 of the GyenBox build: monorepo foundation, Prisma schema, Next.js App Router web app, S3-compatible storage helpers, NextAuth configuration, and Docker development services.

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS with shadcn-style local primitives
- Prisma + PostgreSQL
- NextAuth.js v5
- S3-compatible object storage, ready for MinIO, AWS S3, or Cloudflare R2
- Turborepo workspace

## Getting Started

```bash
npm install
cp .env.example .env
docker compose up -d postgres minio redis
npm run db:generate
npm run db:migrate
npm run dev
```

The web app lives in `apps/web` and runs on `http://localhost:3000` by default.

## Current Phase

Phase 1 - Foundation

- Monorepo scaffold
- Prisma schema and package boundary
- NextAuth.js configuration
- S3/MinIO presign helpers
- Docker Compose development environment
- Dashboard shell and core API contract scaffolding

## Security Defaults

- S3 credentials are server-only.
- API route handlers use Zod validation.
- File and folder mutation routes include ownership guard hooks.
- Storage keys are internal and should not be returned from public API responses.
- Upload acceptance is designed around quota reservation before object transfer.
