FROM node:20-slim

WORKDIR /app

# Copy shared libraries and dependencies
COPY shared /app/shared
COPY package*.json ./

# Copy service-specific files
COPY services/document-service /app/services/document-service

# Install dependencies
RUN npm ci

# Create uploads directory
RUN mkdir -p /app/services/document-service/uploads

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3002

# Expose the service port
EXPOSE 3002

# Run the service
CMD ["node", "services/document-service/index.js"]
