import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Simple logger function for testing
const log = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args)
};

// Type definitions for query parameters
type QueryParams = {
  table: string;
  select?: string;
  filter?: Record<string, any>;
  limit?: number;
  order?: { column: string; ascending?: boolean };
  offset?: number;
  join?: {
    table: string;
    field: string;
    foreignTable: string;
    foreignField: string;
  };
};

type InsertParams = {
  table: string;
  data: Record<string, any> | Record<string, any>[];
  returnData?: boolean;
};

type UpdateParams = {
  table: string;
  data: Record<string, any>;
  filter: Record<string, any>;
  returnData?: boolean;
};

type DeleteParams = {
  table: string;
  filter: Record<string, any>;
  returnData?: boolean;
};

// Supabase client singleton
let supabaseClient: SupabaseClient | null = null;

/**
 * Initialize Supabase client using environment variables
 */
function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) return supabaseClient;
  
  // Get Supabase URL and key from environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    log.error("Missing Supabase credentials in environment variables");
    throw new Error("Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  
  // The key is now hardcoded, so no need to check if it exists
  log.info('[MCP-Supabase] Using hardcoded API key for development');
  
  supabaseClient = createClient(supabaseUrl, supabaseKey);
  log.info(`[MCP-Supabase] Client initialized with URL: ${supabaseUrl}`);
  return supabaseClient;
}

/**
 * Execute a query against Supabase
 */
export async function executeQuery(params: QueryParams) {
  try {
    log.info(`[MCP-Supabase] Executing query on table: ${params.table}`);
    const supabase = getSupabaseClient();
    
    // Start building the query
    let query = supabase.from(params.table).select(params.select || '*');
    
    // Apply filters if provided
    if (params.filter) {
      Object.entries(params.filter).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          // Handle special operators like gt, lt, like, etc.
          const [operator, operand] = Object.entries(value)[0];
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
    
    // Apply joins if provided
    if (params.join) {
      // Modify the select statement for proper join
      const joinSelect = params.select || `*, ${params.join.table}(*)`;
      query = supabase.from(params.join.foreignTable).select(joinSelect);
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
      log.error(`[MCP-Supabase] Query error: ${error.message}`, error);
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
    log.error(`[MCP-Supabase] Unexpected error during query execution`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Insert data into a Supabase table
 */
export async function insertData(params: InsertParams) {
  try {
    log.info(`[MCP-Supabase] Inserting data into table: ${params.table}`);
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from(params.table)
      .insert(params.data)
      .select(params.returnData ? '*' : undefined);
    
    if (error) {
      log.error(`[MCP-Supabase] Insert error: ${error.message}`, error);
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
    log.error(`[MCP-Supabase] Unexpected error during data insertion`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Update data in a Supabase table
 */
export async function updateData(params: UpdateParams) {
  try {
    log.info(`[MCP-Supabase] Updating data in table: ${params.table}`);
    const supabase = getSupabaseClient();
    
    let query = supabase
      .from(params.table)
      .update(params.data);
    
    // Apply filters
    Object.entries(params.filter).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        // Handle special operators
        const [operator, operand] = Object.entries(value)[0];
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
    
    // Return updated data if requested
    if (params.returnData) {
      query = query.select('*');
    }
    
    const { data, error } = await query;
    
    if (error) {
      log.error(`[MCP-Supabase] Update error: ${error.message}`, error);
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
    log.error(`[MCP-Supabase] Unexpected error during data update`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Delete data from a Supabase table
 */
export async function deleteData(params: DeleteParams) {
  try {
    log.info(`[MCP-Supabase] Deleting data from table: ${params.table}`);
    const supabase = getSupabaseClient();
    
    let query = supabase
      .from(params.table);
    
    // Apply filters
    Object.entries(params.filter).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        // Handle special operators
        const [operator, operand] = Object.entries(value)[0];
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
    log.error(`[MCP-Supabase] Unexpected error during data deletion`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Test Supabase connection
 */
export async function testConnection() {
  try {
    log.info('[MCP-Supabase] Testing connection to Supabase');
    const supabase = getSupabaseClient();
    
    // Attempt a simple query to test connection
    const { data, error } = await supabase
      .from('users')  // Assuming 'users' table exists
      .select('count(*)')
      .limit(1);
    
    if (error) {
      log.error(`[MCP-Supabase] Connection test failed: ${error.message}`, error);
      return {
        success: false,
        connected: false,
        error: error.message,
        details: error
      };
    }
    
    return {
      success: true,
      connected: true,
      data
    };
  } catch (error) {
    log.error(`[MCP-Supabase] Connection test failed with exception`, error);
    return {
      success: false,
      connected: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}