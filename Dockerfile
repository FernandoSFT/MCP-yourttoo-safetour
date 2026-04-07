FROM node:20-slim AS builder
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies (ignoring scripts)
RUN npm ci

# Copy source and config
COPY . .

# Build TypeScript
RUN npm run build

# Stage 2: Runner
FROM node:20-slim
WORKDIR /app

# Copy build artifacts and runtime dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port and start
EXPOSE 8080
CMD ["node", "dist/index.js"]
