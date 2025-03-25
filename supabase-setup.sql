-- Basic setup for MCP testing

-- Create test table for MCP tool testing
CREATE TABLE IF NOT EXISTS mcp_test (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert some test data
INSERT INTO mcp_test (name, description) 
VALUES 
  ('Test Item 1', 'This is the first test item'),
  ('Test Item 2', 'This is the second test item'),
  ('Test Item 3', 'This is the third test item')
ON CONFLICT (id) DO NOTHING;

-- Create a function for MCP tests
CREATE OR REPLACE FUNCTION ping() 
RETURNS TEXT AS $$
BEGIN
  RETURN 'pong';
END;
$$ LANGUAGE plpgsql;