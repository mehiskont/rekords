/**
 * Test for MCP Supabase Tool
 * 
 * This script tests the MCP Supabase tool using real operations
 * against your Supabase database.
 */

import { supabaseMcpTool } from '../lib/mcp-tools';

async function testMcpSupabaseTool() {
  console.log('🧪 Testing MCP Supabase Tool...\n');

  // Test 1: Connection Test
  console.log('Test 1: Connection Test');
  const connectionResult = await supabaseMcpTool.handler({
    operation: 'test_connection'
  });
  console.log('Result:', JSON.stringify(connectionResult, null, 2));
  console.log('-----------------------------------\n');

  // Test 2: Create a test user
  console.log('Test 2: Create a test user');
  const timestamp = Date.now();
  const insertResult = await supabaseMcpTool.handler({
    operation: 'insert',
    table: 'users',
    data: {
      email: `test-user-${timestamp}@example.com`,
      name: 'MCP Test User',
      role: 'user',
      hashedPassword: '[REDACTED_PASSWORD_HASH]',
      needsProfile: true,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    },
    returnData: true
  });
  console.log('Result:', JSON.stringify(insertResult, null, 2));
  
  // Save the user ID for later tests
  const userId = insertResult.success && insertResult.data ? 
    insertResult.data[0]?.id : null;
  
  console.log('Created User ID:', userId);
  console.log('-----------------------------------\n');

  if (userId) {
    // Test 3: Query the user
    console.log('Test 3: Query the user');
    const queryResult = await supabaseMcpTool.handler({
      operation: 'query',
      table: 'users',
      filter: {
        id: userId
      }
    });
    console.log('Result:', JSON.stringify(queryResult, null, 2));
    console.log('-----------------------------------\n');

    // Test 4: Update the user
    console.log('Test 4: Update the user');
    const updateResult = await supabaseMcpTool.handler({
      operation: 'update',
      table: 'users',
      filter: {
        id: userId
      },
      data: {
        name: 'Updated MCP Test User',
        needsProfile: false
      },
      returnData: true
    });
    console.log('Result:', JSON.stringify(updateResult, null, 2));
    console.log('-----------------------------------\n');

    // Test 5: Delete the test user
    console.log('Test 5: Delete the test user');
    const deleteResult = await supabaseMcpTool.handler({
      operation: 'delete',
      table: 'users',
      filter: {
        id: userId
      },
      returnData: true
    });
    console.log('Result:', JSON.stringify(deleteResult, null, 2));
    console.log('-----------------------------------\n');
  }

  // Test 6: Advanced query with complex filter
  console.log('Test 6: List all users with role = user');
  const complexQueryResult = await supabaseMcpTool.handler({
    operation: 'query',
    table: 'users',
    filter: {
      role: 'user'
    },
    select: 'id, name, email, role, created',
    order: {
      column: 'created',
      ascending: false
    },
    limit: 5
  });
  console.log('Result:', JSON.stringify(complexQueryResult, null, 2));
  console.log('-----------------------------------\n');

  console.log('🎉 MCP Supabase Tool tests completed!');
}

// Run the tests
testMcpSupabaseTool().catch(error => {
  console.error('Error during tests:', error);
  process.exit(1);
});