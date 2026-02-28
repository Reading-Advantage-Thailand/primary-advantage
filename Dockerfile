# Stage 1: Install dependencies only
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies for build
RUN npm ci

# Stage 2: Build application
FROM deps AS builder
WORKDIR /app

# Copy dependencies from deps stage
# COPY --from=deps /app/node_modules ./node_modules # Not needed as we are using multi-stage build and node_modules is already in /app
COPY . .

# Set environment variables for build
ARG BETTER_AUTH_SECRET="9Lqgbu9RKImLlxBVoppjLdZjsSZaCugvGc7DYTeTei0="
ARG BETTER_AUTH_URL="http://localhost:3000"
ARG NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"

ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/mydb"
ENV NEXT_TELEMETRY_DISABLED=1
ENV BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
ENV BETTER_AUTH_URL=${BETTER_AUTH_URL}
ENV NEXT_PUBLIC_BETTER_AUTH_URL=${NEXT_PUBLIC_BETTER_AUTH_URL}

# Fix Memory issue during build
ENV NODE_OPTIONS="--max-old-space-size=8192"

# Generate Prisma client and run Next.js build
RUN npm run prisma:generate && npm run build

# Stage 3: Production runner
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl curl bash ca-certificates

# Add non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set environment variables for Next.js production
ENV NODE_ENV=production 
ENV NEXT_TELEMETRY_DISABLED=1
# Set host to 0.0.0.0 for Cloud Run
ENV HOSTNAME="0.0.0.0"
# Set port to 8080 for Cloud Run
ENV PORT=8080

# Copy necessary files from the builder stage
COPY --from=builder /app/public ./public

# Copy Prisma schema and generated client for runtime
COPY --from=builder /app/prisma ./prisma

# Copy standalone Next.js output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma generated client
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Copy data directory containing JSON prompt files
COPY --from=builder --chown=nextjs:nodejs /app/data ./data

# Switch to non-root user
USER nextjs

# Expose the port
EXPOSE 8080

# Start the Next.js application
CMD ["node", "server.js"]