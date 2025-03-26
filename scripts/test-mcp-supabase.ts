import dotenv from "dotenv";
import { supabaseMcpTool } from "../lib/mcp-tools";

// Load environment variables
dotenv.config({ path: ".env.local" });

async function testMcpSupabaseTool() {
  console.log("Testing Supabase MCP Tool...");
  
  // Test connection
  console.log("\n1. Testing connection:");
  const connectionResult = await supabaseMcpTool.handler({
    operation: "test_connection"
  });
  console.log(JSON.stringify(connectionResult, null, 2));

  if (!connectionResult.success) {
    console.error("Connection test failed. Aborting further tests.");
    return;
  }

  // Test query operation
  console.log("\n2. Testing query operation (list users):");
  const queryResult = await supabaseMcpTool.handler({
    operation: "query",
    table: "users",
    limit: 5
  });
  console.log(JSON.stringify(queryResult, null, 2));

  // Test filtered query
  console.log("\n3. Testing filtered query operation:");
  const filteredQueryResult = await supabaseMcpTool.handler({
    operation: "query",
    table: "records",
    filter: { 
      status: "available" 
    },
    limit: 3
  });
  console.log(JSON.stringify(filteredQueryResult, null, 2));

  // Test complex query with ordering
  console.log("\n4. Testing complex query with ordering:");
  const complexQueryResult = await supabaseMcpTool.handler({
    operation: "query",
    table: "records",
    select: "id, title, price, created_at",
    filter: { 
      price: { gt: 20 } 
    },
    order: {
      column: "created_at",
      ascending: false
    },
    limit: 5
  });
  console.log(JSON.stringify(complexQueryResult, null, 2));
  
  console.log("\nMCP Supabase Tool tests completed!");
}

// Run the tests  !
testMcpSupabaseTool().catch(error => {
  console.error("Error during tests:", error);
  process.exit(1);
});