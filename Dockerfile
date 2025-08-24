# FROM 23-alpine3.20

# COPY . /app/
# WORKDIR /app
# RUN npm run dev

# Stage 1: Build the Next.js app
FROM node:23-alpine AS builder

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package.json and lock files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the Next.js app
RUN pnpm run build

# Stage 2: Run the production app
FROM node:23-alpine AS runner


WORKDIR /app
ENV NODE_ENV=production


# Enable pnpm in runner as well!
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy built assets and necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

# Start the Next.js app
CMD ["pnpm", "start"]
