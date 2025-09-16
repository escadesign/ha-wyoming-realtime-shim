# Use Home Assistant base image
ARG BUILD_FROM
FROM $BUILD_FROM

# Install Node.js and audio dependencies for HA OS
RUN apk add --no-cache \
    nodejs \
    npm \
    alsa-utils \
    pulseaudio \
    pulseaudio-utils \
    curl \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package.json ./
COPY tsconfig.json ./

# Install dependencies (without package-lock.json to avoid cached speaker)
RUN npm install && npm cache clean --force

# Install TypeScript globally for building
RUN npm install -g typescript

# Copy source code
COPY src/ ./src/

# Build TypeScript to JavaScript
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Copy run script
COPY run.sh /run.sh
RUN chmod +x /run.sh
