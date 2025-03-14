#!/bin/bash

# Change to your project directory
cd /domeenid/www.komeh.tech/plastik/rekords

# Pull the latest changes from GitHub
git pull origin main

# Install dependencies
npm install --production

# Run database migrations
npx prisma migrate deploy

# Build the application
npm run build

# Restart the PM2 process
pm2 restart plastik