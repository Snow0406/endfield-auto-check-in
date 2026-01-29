# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable pnpm

# Install dependencies
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Enable pnpm
RUN corepack enable pnpm

# Install production dependencies only
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Set environment
ENV NODE_ENV=production

# Run as non-root user
USER node

CMD ["node", "dist/index.js"]
