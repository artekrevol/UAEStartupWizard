FROM node:20-slim

WORKDIR /app

# Copy shared libraries and dependencies
COPY shared /app/shared
COPY package*.json ./

# Copy service-specific files
COPY services/ai-research-service /app/services/ai-research-service

# Install dependencies
RUN npm ci

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3004

# Expose the service port
EXPOSE 3004

# Run the service
CMD ["node", "services/ai-research-service/index.js"]
