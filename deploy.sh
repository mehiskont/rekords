#!/bin/bash

# Log deployment start
echo "Deployment started: $(date)"

# Set error handling to stop on any error
set -e

# Change to your project directory
cd /data03/virt136643/domeenid/www.komeh.tech/plastik/rekords

# Pull the latest changes from GitHub
echo "Pulling latest code..."
git pull origin main

# Install dependencies
echo "Installing dependencies..."
npm install --production

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Build the application
echo "Building application..."
npm run build

# Restart the PM2 process
echo "Restarting application..."
pm2 restart plastik

echo "Deployment completed: $(date)"