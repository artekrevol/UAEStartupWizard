FROM node:20-slim

WORKDIR /app

# Copy shared libraries and dependencies
COPY shared /app/shared
COPY package*.json ./

# Copy service-specific files
COPY services/api-gateway /app/services/api-gateway

# Install dependencies
RUN npm ci

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose the service port
EXPOSE 5000

# Run the service
CMD ["node", "services/api-gateway/index.js"]
