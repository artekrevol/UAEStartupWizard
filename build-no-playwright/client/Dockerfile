FROM node:20-slim AS build

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Copy shared and other necessary files
COPY shared /app/shared
COPY vite.config.ts tsconfig.json ./
COPY client /app/client

# Install dependencies
RUN npm ci

# Build the client
RUN npm run build

# Production stage
FROM node:20-slim AS production

WORKDIR /app

# Copy built files and necessary dependencies
COPY --from=build /app/dist /app/dist
COPY --from=build /app/node_modules /app/node_modules
COPY package*.json ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "run", "start"]
