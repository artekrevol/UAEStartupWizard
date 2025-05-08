#!/bin/bash

# Script to manage Docker operations for UAE Business Setup Assistant

set -e

operation=$1

if [ -z "$operation" ]; then
  echo "Please specify an operation to perform."
  echo "Usage: ./scripts/docker-ops.sh [up|down|logs|build]"
  exit 1
fi

case $operation in
  up)
    echo "Starting all Docker containers..."
    docker-compose up -d
    echo "Containers started successfully. Use './scripts/docker-ops.sh logs' to view logs."
    ;;
  down)
    echo "Stopping all Docker containers..."
    docker-compose down
    echo "Containers stopped successfully."
    ;;
  logs)
    echo "Viewing logs from all containers..."
    docker-compose logs -f
    ;;
  build)
    echo "Building all Docker images..."
    docker-compose build
    echo "Images built successfully."
    ;;
  *)
    echo "Invalid operation: $operation"
    echo "Available operations: up, down, logs, build"
    exit 1
    ;;
esac
