FROM node:20-slim

WORKDIR /app

# Copy shared libraries and dependencies
COPY shared /app/shared
COPY package*.json ./

# Copy service-specific files
COPY services/freezone-service /app/services/freezone-service

# Install dependencies
RUN npm ci

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3003

# Expose the service port
EXPOSE 3003

# Run the service
CMD ["node", "services/freezone-service/index.js"]
