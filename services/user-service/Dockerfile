FROM node:20-slim

WORKDIR /app

# Copy shared libraries and dependencies
COPY shared /app/shared
COPY package*.json ./

# Copy service-specific files
COPY services/user-service /app/services/user-service

# Install dependencies
RUN npm ci

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Expose the service port
EXPOSE 3001

# Run the service
CMD ["node", "services/user-service/index.js"]
