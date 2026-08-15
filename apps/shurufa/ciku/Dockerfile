# Build from the monorepo root:
# docker build -f apps/shurufa/ciku/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app

COPY apps/shurufa/ciku/package.json apps/shurufa/ciku/package-lock.json ./
RUN npm ci

COPY apps/shurufa/ciku ./
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY apps/shurufa/ciku/package.json apps/shurufa/ciku/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

EXPOSE 8080
CMD ["node", "dist/server.cjs"]
