#!/usr/bin/env python3
"""
Extract auth schema from Supabase cloud instance for comparison
"""

import os
import sys
import requests
import json

# Supabase cloud credentials from .env.example
SUPABASE_URL = "https://wpxhmajdeunabximyfln.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweGhtYWpkZXVuYWJ4aW15ZmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MTM1MTEsImV4cCI6MjA3MTA4OTUxMX0.urAxl_XVwNggHZ1SuwlFFRzuRJSOHAHW038S57YDFzk"

def check_auth_schema():
    """
    Check auth schema structure using Supabase REST API
    """
    print("🔍 Checking Supabase Cloud Auth Schema")
    print("=" * 60)

    # Try to check if auth.users exists by querying it
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json"
    }

    # Check REST API
    print("\n📊 Testing REST API access...")
    response = requests.get(f"{SUPABASE_URL}/rest/v1/", headers=headers)
    print(f"Status: {response.status_code}")

    if response.status_code == 200:
        print("✅ REST API is accessible")
        # Try to list available tables
        print("\nAvailable endpoints:", response.text[:500])
    else:
        print(f"❌ REST API error: {response.text}")

    print("\n" + "=" * 60)
    print("\n⚠️  Note: Direct auth schema access requires database credentials.")
    print("The auth schema is standard Supabase and should be identical")
    print("on both cloud and self-hosted instances.")
    print("\nStandard auth tables include:")
    standard_tables = [
        "auth.users",
        "auth.sessions",
        "auth.refresh_tokens",
        "auth.identities",
        "auth.instances",
        "auth.audit_log_entries",
        "auth.mfa_factors",
        "auth.mfa_challenges",
        "auth.mfa_amr_claims",
        "auth.saml_providers",
        "auth.saml_relay_states",
        "auth.sso_providers",
        "auth.sso_domains",
        "auth.flow_state",
        "auth.one_time_tokens",
    ]

    for table in standard_tables:
        print(f"  ✓ {table}")

    print("\n✅ Auth schema is managed by Supabase Auth service")
    print("   and doesn't need to be created via migrations.")

if __name__ == "__main__":
    check_auth_schema()
