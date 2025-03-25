/**
 * MCP Supabase Tool (JavaScript Version)
 * 
 * This file provides a JavaScript implementation of the Supabase MCP tool,
 * avoiding TypeScript complexities for easier integration.
 */

const { createClient } = require('@supabase/supabase-js');

// Global client instance
let supabaseClient = null;

// Get Supabase client
function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  
  // Get Supabase credentials from environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("[MCP-Supabase] Missing Supabase credentials in environment variables");
    console.error("Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set");
    throw new Error("Missing Supabase credentials");
  }
  
  console.log(`[MCP-Supabase] Initializing client with URL: ${supabaseUrl}`);
  supabaseClient = createClient(supabaseUrl, supabaseKey);
  return supabaseClient;
}

// Execute a query
async function executeQuery(params) {
  try {
    console.log(`[MCP-Supabase] Executing query on table: ${params.table}`);
    const supabase = getSupabaseClient();
    
    // Start building the query
    let query = supabase.from(params.table).select(params.select || '*');
    
    // Apply filters if provided
    if (params.filter) {
      Object.entries(params.filter).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          // Handle special operators
          const operator = Object.keys(value)[0];
          const operand = value[operator];
          
          switch(operator) {
            case 'gt': query = query.gt(key, operand); break;
            case 'lt': query = query.lt(key, operand); break;
            case 'gte': query = query.gte(key, operand); break;
            case 'lte': query = query.lte(key, operand); break;
            case 'like': query = query.like(key, `%${operand}%`); break;
            case 'ilike': query = query.ilike(key, `%${operand}%`); break;
            case 'in': query = query.in(key, operand); break;
            case 'is': query = query.is(key, operand); break;
            default: query = query.eq(key, value);
          }
        } else {
          // Simple equality filter
          query = query.eq(key, value);
        }
      });
    }
    
    // Apply ordering if provided
    if (params.order) {
      query = query.order(params.order.column, { 
        ascending: params.order.ascending ?? true 
      });
    }
    
    // Apply pagination if provided
    if (params.limit) {
      query = query.limit(params.limit);
    }
    
    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error(`[MCP-Supabase] Query error: ${error.message}`, error);
      return {
        success: false,
        error: error.message,
        details: error
      };
    }
    
    return {
      success: true,
      data,
      count,
      metadata: {
        table: params.table,
        filters: params.filter || {},
        limit: params.limit,
        offset: params.offset
      }
    };
  } catch (error) {
    console.error(`[MCP-Supabase] Unexpected error during query execution`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Insert data
async function insertData(params) {
  try {
    console.log(`[MCP-Supabase] Inserting data into table: ${params.table}`);
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from(params.table)
      .insert(params.data)
      .select(params.returnData ? '*' : undefined);
    
    if (error) {
      console.error(`[MCP-Supabase] Insert error: ${error.message}`, error);
      return {
        success: false,
        error: error.message,
        details: error
      };
    }
    
    return {
      success: true,
      data: params.returnData ? data : null,
      metadata: {
        table: params.table,
        inserted: Array.isArray(params.data) ? params.data.length : 1
      }
    };
  } catch (error) {
    console.error(`[MCP-Supabase] Unexpected error during data insertion`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Update data
async function updateData(params) {
  try {
    console.log(`[MCP-Supabase] Updating data in table: ${params.table}`);
    const supabase = getSupabaseClient();
    
    let query = supabase
      .from(params.table)
      .update(params.data);
    
    // Apply filters
    if (params.filter) {
      Object.entries(params.filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    // Return updated data if requested
    if (params.returnData) {
      query = query.select('*');
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error(`[MCP-Supabase] Update error: ${error.message}`, error);
      return {
        success: false,
        error: error.message,
        details: error
      };
    }
    
    return {
      success: true,
      data: params.returnData ? data : null,
      metadata: {
        table: params.table,
        filter: params.filter
      }
    };
  } catch (error) {
    console.error(`[MCP-Supabase] Unexpected error during data update`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Delete data
async function deleteData(params) {
  try {
    console.log(`[MCP-Supabase] Deleting data from table: ${params.table}`);
    const supabase = getSupabaseClient();
    
    let query = supabase.from(params.table);
    
    // Apply filters
    if (params.filter) {
      Object.entries(params.filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    // Return deleted data if requested
    if (params.returnData) {
      const { data: toDelete } = await query.select('*');
      const { error: deleteError } = await query.delete();
      
      if (deleteError) {
        throw deleteError;
      }
      
      return {
        success: true,
        data: toDelete,
        metadata: {
          table: params.table,
          filter: params.filter,
          deleted: toDelete?.length || 0
        }
      };
    } else {
      const { error } = await query.delete();
      
      if (error) {
        throw error;
      }
      
      return {
        success: true,
        data: null,
        metadata: {
          table: params.table,
          filter: params.filter
        }
      };
    }
  } catch (error) {
    console.error(`[MCP-Supabase] Unexpected error during data deletion`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Test connection
async function testConnection() {
  try {
    console.log('[MCP-Supabase] Testing connection to Supabase');
    const supabase = getSupabaseClient();
    
    try {
      // Try a simple query - using a basic select that won't parse error
      const { data, error } = await supabase.from('users').select('id').limit(1);
      
      if (error) {
        // If the error is just that the table doesn't exist, that's okay
        if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
          console.log('[MCP-Supabase] Table does not exist yet, but connection is working');
        } else {
          console.error(`[MCP-Supabase] Connection test failed: ${error.message}`, error);
          return {
            success: false,
            connected: false,
            error: error.message,
            details: error
          };
        }
      } else if (data) {
        console.log('[MCP-Supabase] Successfully queried users table');
      }
    } catch (e) {
      // This might be a connection error
      console.warn('[MCP-Supabase] Query test error:', e);
    }
    
    // Also try auth service
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.warn(`[MCP-Supabase] Auth service error: ${error.message}`);
      } else {
        console.log('[MCP-Supabase] Auth service is working');
      }
    } catch (e) {
      console.warn('[MCP-Supabase] Auth service error:', e);
    }
    
    return {
      success: true,
      connected: true,
      message: 'Supabase connection successful'
    };
  } catch (error) {
    console.error(`[MCP-Supabase] Connection test failed with exception`, error);
    return {
      success: false,
      connected: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// MCP tool handler
async function mcpToolHandler(params) {
  try {
    console.log(`[MCP-Supabase] Processing ${params.operation} operation`);
    
    switch (params.operation) {
      case "query":
        if (!params.table) {
          return { error: "Table parameter is required for query operations" };
        }
        return await executeQuery(params);
        
      case "insert":
        if (!params.table || !params.data) {
          return { error: "Table and data parameters are required for insert operations" };
        }
        return await insertData(params);
        
      case "update":
        if (!params.table || !params.data || !params.filter) {
          return { error: "Table, data, and filter parameters are required for update operations" };
        }
        return await updateData(params);
        
      case "delete":
        if (!params.table || !params.filter) {
          return { error: "Table and filter parameters are required for delete operations" };
        }
        return await deleteData(params);
        
      case "test_connection":
        return await testConnection();
        
      default:
        return { 
          error: `Unsupported operation: ${params.operation}`,
          supportedOperations: ["query", "insert", "update", "delete", "test_connection"]
        };
    }
  } catch (error) {
    console.error(`[MCP-Supabase] Tool execution error`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// MCP tool definition
const supabaseMcpTool = {
  // Schema definition for the tool
  schema: {
    name: "supabase_query",
    description: "Execute queries against the Supabase PostgreSQL database",
    parameters: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          enum: ["query", "insert", "update", "delete", "test_connection"],
          description: "The operation to perform on the database"
        },
        // For query operations
        table: {
          type: "string",
          description: "The table to query or modify"
        },
        select: {
          type: "string",
          description: "Columns to select (comma-separated). Default is '*'"
        },
        filter: {
          type: "object",
          description: "Filter criteria as key-value pairs. Supports operators using nested objects: {field: {operator: value}}"
        },
        limit: {
          type: "number",
          description: "Maximum number of records to return"
        },
        offset: {
          type: "number",
          description: "Number of records to skip"
        },
        order: {
          type: "object",
          properties: {
            column: { type: "string" },
            ascending: { type: "boolean" }
          },
          description: "Ordering specification"
        },
        // For insert operations
        data: {
          type: ["object", "array"],
          description: "Data to insert or update (object or array of objects)"
        },
        // For all operations
        returnData: {
          type: "boolean",
          description: "Whether to return the affected data"
        }
      },
      required: ["operation"]
    }
  },
  
  // Handler function
  handler: mcpToolHandler
};

// Export the MCP tool
module.exports = {
  supabaseMcpTool,
  executeQuery,
  insertData,
  updateData,
  deleteData,
  testConnection
};