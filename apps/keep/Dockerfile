# Build from the monorepo root: docker build -f apps/keep/Dockerfile .
FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/keep/package.json apps/keep/package.json
COPY packages/db/package.json packages/db/package.json
RUN npm install

FROM base AS builder
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
COPY --from=deps /app/node_modules ./node_modules
# npm keeps dependencies that conflict across workspaces (Keep uses Next 16
# while the web app remains on Next 14) inside the workspace directories.
# Preserve those directories for the isolated Keep build.
COPY --from=deps /app/apps/keep/node_modules ./apps/keep/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY . .
RUN npm run db:generate
RUN npm run build -- --filter=@gyenbox/keep

# A one-off Cloud Run Job builds this target to apply Prisma migrations through
# the same Cloud SQL socket configuration as the production service.
FROM builder AS migration
CMD ["npx", "prisma", "migrate", "deploy", "--schema", "packages/db/prisma/schema.prisma"]

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/apps/keep/.next/standalone ./
COPY --from=builder /app/apps/keep/.next/static ./apps/keep/.next/static
COPY --from=builder /app/apps/keep/public ./apps/keep/public
EXPOSE 3000
CMD ["node", "apps/keep/server.js"]
