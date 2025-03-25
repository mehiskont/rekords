/**
 * Example MCP Supabase Tool Usage
 * 
 * This file demonstrates how to use the Supabase MCP tool in your MCP configuration.
 * Copy these examples when configuring Claude with custom MCP tools.
 */

// Example MCP Tool Definition
const supabaseQueryTool = {
  name: "supabase_query",
  description: "Execute database operations on the Supabase PostgreSQL database",
  schema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        enum: ["query", "insert", "update", "delete", "test_connection"],
        description: "The database operation to perform"
      },
      table: {
        type: "string",
        description: "The database table to query or modify"
      },
      select: {
        type: "string",
        description: "Columns to select (for query operations)"
      },
      filter: {
        type: "object",
        description: "Filter criteria for the operation"
      },
      limit: {
        type: "number",
        description: "Maximum number of records to return (for query operations)"
      },
      order: {
        type: "object",
        description: "Ordering specification (for query operations)"
      },
      data: {
        type: ["object", "array"],
        description: "Data to insert or update"
      },
      returnData: {
        type: "boolean",
        description: "Whether to return the affected data"
      }
    },
    required: ["operation"]
  }
};

// Example tool invocations for Claude

// 1. Test connection
const testConnectionExample = {
  operation: "test_connection"
};

// 2. Query all users (limit 5)
const queryUsersExample = {
  operation: "query",
  table: "users",
  limit: 5
};

// 3. Query users with filter
const queryFilteredUsersExample = {
  operation: "query",
  table: "users",
  filter: {
    role: "admin"
  },
  select: "id, name, email, role"
};

// 4. Insert a new record
const insertExample = {
  operation: "insert",
  table: "records",
  data: {
    title: "New Record",
    artist: "Example Artist",
    price: 29.99,
    status: "available"
  },
  returnData: true
};

// 5. Update a record
const updateExample = {
  operation: "update",
  table: "records",
  filter: {
    id: 123
  },
  data: {
    price: 24.99,
    status: "on_sale"
  },
  returnData: true
};

// 6. Delete a record
const deleteExample = {
  operation: "delete",
  table: "records",
  filter: {
    id: 123
  }
};

// 7. Complex query with advanced filter
const complexQueryExample = {
  operation: "query",
  table: "records",
  filter: {
    price: { gt: 20 },
    title: { ilike: "vinyl" },
    created_at: { gte: "2025-01-01" }
  },
  order: {
    column: "created_at",
    ascending: false
  },
  limit: 10
};

// Export examples for reference
module.exports = {
  supabaseQueryTool,
  examples: {
    testConnection: testConnectionExample,
    queryUsers: queryUsersExample,
    queryFilteredUsers: queryFilteredUsersExample,
    insert: insertExample,
    update: updateExample,
    delete: deleteExample,
    complexQuery: complexQueryExample
  }
};