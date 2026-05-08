# ---- Build stage ----
FROM node:25-alpine AS builder

WORKDIR /app

# Install build deps and cache node_modules by copying package files first
COPY package*.json ./
# use RUN npm ci --production=true --no-audit --no-fund for actual production (you need to have the package-lock.json file)
RUN npm install --no-audit --no-fund

# Copy source and build
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:25-alpine AS runner

# Create non-root user and minimal group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy only production files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
# Optionally if you need to rebuild/validate deps run npm install again otherwise just copy node_modules
# use RUN npm ci --production=true --no-audit --no-fund for actual production (you need to have the package-lock.json file)
# RUN npm install --no-audit --no-fund

# Drop to non-root user
USER appuser

ENV NODE_ENV=production
EXPOSE 8000

CMD ["node", "dist/server.js"]
