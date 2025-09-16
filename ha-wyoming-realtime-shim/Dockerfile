# Single-stage build for HA Wyoming Realtime Shim
FROM node:18-alpine

# Install audio and build dependencies for HA OS
RUN apk add --no-cache \
    alsa-utils \
    pulseaudio \
    pulseaudio-utils \
    curl \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev for TypeScript compilation)
RUN npm install && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build TypeScript to JavaScript
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

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
