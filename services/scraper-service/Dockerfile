FROM node:20-slim

WORKDIR /app

# Copy shared libraries and dependencies
COPY shared /app/shared
COPY package*.json ./

# Copy service-specific files
COPY services/scraper-service /app/services/scraper-service

# Install dependencies
RUN npm ci

# Additional dependencies for scraping
RUN apt-get update && apt-get install -y \
    chromium \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3005
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin/chromium

# Expose the service port
EXPOSE 3005

# Run the service
CMD ["node", "services/scraper-service/index.js"]
