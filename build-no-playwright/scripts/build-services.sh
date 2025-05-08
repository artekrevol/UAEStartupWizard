#!/bin/bash

# Build script for microservices

set -e

echo "Building UAE Business Setup Assistant Microservices"

# Compile TypeScript files
echo "Compiling TypeScript files..."
npx tsc -p tsconfig.json

# Create distribution directory
echo "Creating distribution directory..."
mkdir -p dist/shared
mkdir -p dist/services/api-gateway
mkdir -p dist/services/user-service
mkdir -p dist/services/document-service
mkdir -p dist/services/freezone-service
mkdir -p dist/services/ai-research-service
mkdir -p dist/services/scraper-service

# Copy compiled files
echo "Copying compiled files..."
cp -R build/shared/* dist/shared/
cp -R build/services/api-gateway/* dist/services/api-gateway/
cp -R build/services/user-service/* dist/services/user-service/
cp -R build/services/document-service/* dist/services/document-service/
cp -R build/services/freezone-service/* dist/services/freezone-service/
cp -R build/services/ai-research-service/* dist/services/ai-research-service/
cp -R build/services/scraper-service/* dist/services/scraper-service/

# Build Docker images
echo "Building Docker images..."
docker-compose build

echo "Build completed successfully!"
