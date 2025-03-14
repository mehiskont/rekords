# Plastik

## Environment Variables Setup

This project uses environment variables for configuration. Follow these guidelines for proper setup:

### Configuration Files

- `.env` - Production environment (deployed with the application)
- `.env.local` - Local development overrides (not committed to git)
- `.env.example` - Template showing all required variables

### Local Development

1. Use `.env.local` for all your local development settings
2. Any values not found in `.env.local` will fall back to `.env`
3. Never commit sensitive local credentials to any env file

### Production

1. Production settings should be in `.env`
2. Before deployment, ensure `.env` contains valid production credentials
3. Consider using environment variable injection from your hosting platform for sensitive values

### Environment Files Priority

Next.js loads environment variables in the following order:

1. `process.env`
2. `.env.$(NODE_ENV).local` (e.g. `.env.development.local`)
3. `.env.local` (except in test environment)
4. `.env.$(NODE_ENV)` (e.g. `.env.development`)
5. `.env`

### Public vs Server-Only Variables

- Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
- All other variables are only available on the server
- Never store secrets in `NEXT_PUBLIC_` variables

## Development

```bash
# Install dependencies
npm install

# Start local database and Redis
docker-compose up -d

# Run development server
npm run dev
```

## Redis Cache (Optional)

This application uses Redis for caching release information only (30 days TTL).

Redis is optional and can be enabled/disabled with environment variables:
- `REDIS_ENABLED`: Set to "false" to completely disable Redis
- `REDIS_URL`: Connection string for Redis instance

For production:
- Set `REDIS_URL` to your hosted Redis instance
- The application will work without Redis if it's unavailable or disabled

For best performance in production, Redis is recommended but not required.

## Deployment

```bash
# Build for production
npm run build

# Start production server
npm start
```

# github webhook start
pm2 start webhook-server.js