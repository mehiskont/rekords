# Supabase Integration Guide

This project has been configured to use Supabase for database and authentication services. Both local development and production environments use the same Supabase instance for consistency.

## Getting Started with Supabase

### Prerequisites

- Supabase project created in the Supabase dashboard
- Supabase API keys (available in your `.env.local` and `.env` files)

### Local Development

To start the development server with Supabase:

```bash
npm run dev:supabase
```

This command:
1. Tests the Supabase connection
2. Generates the latest Prisma client
3. Starts the Next.js development server

### Deployment

The production deployment script (`deploy.sh`) has been updated to use Supabase. The deployment will:

1. Pull the latest code
2. Install dependencies
3. Push schema changes to Supabase using `prisma db push`
4. Build the application
5. Restart the PM2 process

## MCP Integration

The Model Control Plane (MCP) integration allows Claude to interact with your Supabase database. The MCP tool provides these operations:

- `test_connection` - Test Supabase connection
- `query` - Query data with filtering, sorting, and pagination
- `insert` - Insert new records
- `update` - Update existing records
- `delete` - Delete records

To test the MCP tool, run:

```bash
npm run supabase:test-mcp
```

## Database Schema

The Supabase database schema is defined in `prisma/schema.supabase.prisma`. This schema is used for both local development and production environments.

To push schema changes to Supabase:

```bash
npm run supabase:schema
```

## Environment Configuration

The Supabase configuration is stored in:

- `.env.local` - Local development
- `.env` - Production environment
- `.env.supabase` - Shared Supabase configuration (reference only)

These files contain the necessary environment variables:

```
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[YOUR-PROJECT-ID].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR-ANON-KEY]"
```

## Troubleshooting

If you encounter connection issues:

1. Check your Supabase dashboard to ensure your project is up and running
2. Verify your API keys in the environment files
3. Check if your IP is allowed to access the Supabase project (if you're using IP restrictions)
4. Run the connection test: `npm run test:supabase`

For database schema issues, you can reset the database and push a fresh schema:

```bash
npm run supabase:schema -- --force-reset
```

**Warning:** This will delete all data in your database!

## Additional Resources

- [Supabase Documentation](https://supabase.io/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Model Control Plane Documentation](./MCP-SUPABASE-TOOL.md)