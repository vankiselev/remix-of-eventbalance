#!/bin/bash

# Test script to verify Supabase connection and service key

echo "🔍 Testing Supabase Connection"
echo "================================"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo "❌ No .env file found"
  echo ""
  echo "Please create a .env file with:"
  echo "SUPABASE_URL=http://your-supabase-url:54321"
  echo "SUPABASE_SERVICE_KEY=your-service-role-jwt-token"
  exit 1
fi

# Source the .env file
export $(cat .env | grep -v '^#' | xargs)

if [ -z "$SUPABASE_URL" ]; then
  echo "❌ SUPABASE_URL not set in .env"
  exit 1
fi

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "❌ SUPABASE_SERVICE_KEY not set in .env"
  exit 1
fi

echo "Testing with:"
echo "  URL: $SUPABASE_URL"
echo "  Key: ${SUPABASE_SERVICE_KEY:0:20}..."
echo ""

# Test 1: Basic API access
echo "Test 1: Testing basic API access..."
response=$(curl -s -w "\n%{http_code}" -X GET "$SUPABASE_URL/rest/v1/" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 404 ]; then
  echo "✅ Basic API access works (HTTP $http_code)"
else
  echo "❌ Basic API access failed (HTTP $http_code)"
  echo "Response: $body"
  exit 1
fi
echo ""

# Test 2: Check if execute_migration function exists
echo "Test 2: Testing execute_migration function..."
response=$(curl -s -w "\n%{http_code}" -X POST "$SUPABASE_URL/rest/v1/rpc/execute_migration" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sql_query": "SELECT 1"}')

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" -eq 200 ]; then
  echo "✅ execute_migration function works!"
  echo "Response: $body"
else
  echo "❌ execute_migration function failed (HTTP $http_code)"
  echo "Response: $body"
  echo ""
  echo "You need to create the function. Run this SQL in your database:"
  echo "----------------------------------------"
  cat << 'EOSQL'
CREATE OR REPLACE FUNCTION public.execute_migration(sql_query TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
  RETURN 'Success';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Error: ' || SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.execute_migration TO service_role;
GRANT EXECUTE ON FUNCTION public.execute_migration TO anon;
GRANT EXECUTE ON FUNCTION public.execute_migration TO authenticated;
EOSQL
  echo "----------------------------------------"
  exit 1
fi
echo ""

echo "🎉 All tests passed! Your configuration is correct."
echo ""
echo "To update GitHub secrets, run:"
echo "  gh secret set SUPABASE_URL --body \"$SUPABASE_URL\" --repo vankiselev/eventbalance"
echo "  gh secret set SUPABASE_SERVICE_KEY --body \"$SUPABASE_SERVICE_KEY\" --repo vankiselev/eventbalance"
