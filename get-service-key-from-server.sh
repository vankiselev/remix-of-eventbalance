#!/bin/bash

# Script to help retrieve the Supabase service_role key from your self-hosted server
# Run this ON YOUR SUPABASE SERVER (superbag.eventbalance.ru)

echo "🔍 Supabase Service Role Key Finder"
echo "=" echo ""

# Method 1: Check environment variables
echo "Method 1: Checking environment variables..."
if [ -n "$SERVICE_ROLE_KEY" ]; then
    echo "✅ Found SERVICE_ROLE_KEY in environment:"
    echo "$SERVICE_ROLE_KEY"
    exit 0
fi

# Method 2: Check docker-compose.yml
echo "Method 2: Checking docker-compose files..."
for file in docker-compose.yml docker-compose.yaml; do
    if [ -f "$file" ]; then
        echo "Checking $file..."
        SERVICE_KEY=$(grep -i "SERVICE.*ROLE.*KEY\|ANON_KEY\|JWT_SECRET" "$file" | head -5)
        if [ -n "$SERVICE_KEY" ]; then
            echo "✅ Found in $file:"
            echo "$SERVICE_KEY"
        fi
    fi
done

# Method 3: Check .env files
echo ""
echo "Method 3: Checking .env files..."
for file in .env .env.local .env.production supabase/.env; do
    if [ -f "$file" ]; then
        echo "Checking $file..."
        SERVICE_KEY=$(grep -i "SERVICE.*ROLE.*KEY\|JWT_SECRET" "$file")
        if [ -n "$SERVICE_KEY" ]; then
            echo "✅ Found in $file:"
            echo "$SERVICE_KEY"
        fi
    fi
done

# Method 4: Check Supabase CLI
echo ""
echo "Method 4: Trying Supabase CLI..."
if command -v supabase &> /dev/null; then
    echo "Running: supabase status"
    supabase status | grep -i "service_role\|anon"
fi

echo ""
echo "=" * 60
echo "If you found the key above, copy it and run:"
echo "  python3 fix-supabase-secrets.py"
echo ""
echo "Or update GitHub secrets manually:"
echo "  gh secret set SUPABASE_SERVICE_KEY --body \"YOUR_KEY\" --repo vankiselev/eventbalance"
