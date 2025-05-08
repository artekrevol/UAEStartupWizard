#!/bin/bash

# Script to start microservices for UAE Business Setup Assistant

set -e

service=$1

if [ -z "$service" ]; then
  echo "Please specify a service to start or 'all' to start all services."
  echo "Usage: ./scripts/start-services.sh [gateway|user|document|freezone|ai|scraper|all]"
  exit 1
fi

case $service in
  gateway)
    echo "Starting API Gateway..."
    npx tsx services/api-gateway/index.ts
    ;;
  user)
    echo "Starting User Service..."
    npx tsx services/user-service/index.ts
    ;;
  document)
    echo "Starting Document Service..."
    npx tsx services/document-service/index.ts
    ;;
  freezone)
    echo "Starting Freezone Service..."
    npx tsx services/freezone-service/index.ts
    ;;
  ai)
    echo "Starting AI Research Service..."
    npx tsx services/ai-research-service/index.ts
    ;;
  scraper)
    echo "Starting Scraper Service..."
    npx tsx services/scraper-service/index.ts
    ;;
  all)
    echo "Starting all services..."
    npx concurrently \
      "npx tsx services/api-gateway/index.ts" \
      "npx tsx services/user-service/index.ts" \
      "npx tsx services/document-service/index.ts" \
      "npx tsx services/freezone-service/index.ts" \
      "npx tsx services/ai-research-service/index.ts" \
      "npx tsx services/scraper-service/index.ts"
    ;;
  *)
    echo "Invalid service: $service"
    echo "Available services: gateway, user, document, freezone, ai, scraper, all"
    exit 1
    ;;
esac
