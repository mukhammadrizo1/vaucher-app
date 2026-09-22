# Multi-stage Dockerfile for NestJS Backend with Prisma
FROM node:20-slim AS builder

WORKDIR /app

# Install openssl for Prisma
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy package manifests and Prisma schema
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma/

# Install dependencies
RUN cd backend && npm ci

# Copy source code
COPY backend ./backend/

# Generate Prisma client and build NestJS
RUN cd backend && npm run build

# Production Runner Image
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install openssl for Prisma runtime
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy backend package manifests and Prisma schema
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Install production dependencies only
RUN npm ci --omit=dev && npx prisma generate

# Copy built application from builder stage
COPY --from=builder /app/backend/dist ./dist

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push && node dist/main.js"]
