# MCP Supabase Tool Documentation

This tool allows Claude to interact with your Supabase PostgreSQL database through the Model Control Plane (MCP) interface. It provides a structured way to perform database operations like queries, insertions, updates, and deletions.

## Setup Instructions

1. **Environment Variables**:
   Make sure your `.env.local` file contains the following Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-ID].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-SUPABASE-ANON-KEY]
   ```
   
   Get your anon key from the Supabase dashboard - Project Settings > API > Project API keys.
   
   For production, use the database URLs with connection pooling:
   ```
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:6543/postgres?pgbouncer=true
   DIRECT_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres
   ```

2. **Installation**:
   The tool is already installed in the `/lib/mcp-tools/` directory.

3. **Testing**:
   Run the test script to verify the tool is working correctly:
   ```bash
   npx ts-node scripts/test-mcp-supabase.ts
   ```

## Tool Configuration for Claude

To configure this tool for use with Claude through MCP, you'll need to add it to your MCP tool configuration. The tool is named `supabase_query` and exposes several operations for interacting with your Supabase database.

## Usage Examples

Here are examples of how Claude can use this tool:

### 1. Query Operation

```
{
  "operation": "query",
  "table": "users",
  "select": "id, email, name",
  "filter": {
    "role": "admin"
  },
  "limit": 10,
  "offset": 0,
  "order": {
    "column": "created_at",
    "ascending": false
  }
}
```

### 2. Insert Operation

```
{
  "operation": "insert",
  "table": "records",
  "data": {
    "title": "New Vinyl Record",
    "artist": "Artist Name",
    "price": 29.99,
    "condition": "Mint"
  },
  "returnData": true
}
```

### 3. Update Operation

```
{
  "operation": "update",
  "table": "records",
  "filter": {
    "id": 123
  },
  "data": {
    "price": 24.99,
    "status": "on_sale"
  },
  "returnData": true
}
```

### 4. Delete Operation

```
{
  "operation": "delete",
  "table": "records",
  "filter": {
    "id": 123
  },
  "returnData": true
}
```

### 5. Test Connection

```
{
  "operation": "test_connection"
}
```

## Advanced Query Filters

The tool supports advanced filtering with operators:

```
"filter": {
  "price": { "gt": 20 },
  "title": { "ilike": "dark side" },
  "status": { "in": ["available", "pending"] },
  "created_at": { "gte": "2025-01-01" }
}
```

Supported operators:
- `gt`: Greater than
- `lt`: Less than
- `gte`: Greater than or equal
- `lte`: Less than or equal
- `like`: Pattern matching (case sensitive)
- `ilike`: Pattern matching (case insensitive)
- `in`: In a list of values
- `is`: Is a value (good for null checks)

## Security Considerations

This tool currently uses the Supabase anon key, which has limited permissions. For production use:

1. Ensure proper row-level security (RLS) policies are configured in Supabase
2. Consider implementing additional authentication for sensitive operations
3. Add rate limiting to prevent abuse
4. Log all operations for audit purposes

## Troubleshooting

If you encounter issues:

1. Check your Supabase credentials in the `.env.local` file
2. Verify that the specified tables exist in your Supabase project
3. Confirm that the Supabase anon key has sufficient permissions for the operations
4. Check the application logs for detailed error messages
5. Run the test script to validate the tool's functionality

## Future Enhancements

Planned future enhancements include:
- Support for Supabase storage operations
- Real-time subscription capabilities
- Full-text search integration
- Transaction support for multiple operations
- Batch processing for large datasets