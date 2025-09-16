# Multi-stage build for HA Wyoming Realtime Shim
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine AS runtime

# Install audio dependencies for HA OS
RUN apk add --no-cache \
    alsa-utils \
    pulseaudio \
    pulseaudio-utils \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Copy run script
COPY run.sh /
RUN chmod +x /run.sh

# Expose ports
EXPOSE 10600 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Run the application
CMD ["/run.sh"]
