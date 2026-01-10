#!/usr/bin/env python3
"""
Script to test and update Supabase GitHub secrets
"""

import requests
import json
import sys
import os

# Configuration
SUPABASE_URL = "https://superbag.eventbalance.ru/a73e88c7ef6a2ca735abc52404257a9f"
GITHUB_TOKEN = "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"
REPO = "vankiselev/eventbalance"

def test_service_key(service_key):
    """Test if a service key works with the Supabase instance"""
    print(f"\n🔍 Testing service key: {service_key[:20]}...")

    # Test 1: Basic API access
    print("  Test 1: Basic API access...")
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}"
        }
    )

    if response.status_code in [200, 404]:
        print(f"  ✅ Basic API access works (HTTP {response.status_code})")
    else:
        print(f"  ❌ Basic API access failed (HTTP {response.status_code})")
        print(f"  Response: {response.text}")
        return False

    # Test 2: execute_migration function
    print("  Test 2: Testing execute_migration function...")
    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/execute_migration",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json"
        },
        json={"sql_query": "SELECT 1"}
    )

    if response.status_code == 200:
        print(f"  ✅ execute_migration function works!")
        print(f"  Response: {response.text}")
        return True
    else:
        print(f"  ❌ execute_migration function failed (HTTP {response.status_code})")
        print(f"  Response: {response.text}")
        return False

def update_github_secret(name, value):
    """Update a GitHub secret using the API"""
    from base64 import b64encode
    from nacl import encoding, public

    # Get the repository's public key
    response = requests.get(
        f"https://api.github.com/repos/{REPO}/actions/secrets/public-key",
        headers={
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json"
        }
    )

    if response.status_code != 200:
        print(f"❌ Failed to get public key: {response.status_code}")
        return False

    public_key_data = response.json()
    public_key = public.PublicKey(public_key_data["key"].encode("utf-8"), encoding.Base64Encoder())

    # Encrypt the secret value
    sealed_box = public.SealedBox(public_key)
    encrypted = sealed_box.encrypt(value.encode("utf-8"))
    encrypted_value = b64encode(encrypted).decode("utf-8")

    # Update the secret
    response = requests.put(
        f"https://api.github.com/repos/{REPO}/actions/secrets/{name}",
        headers={
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json"
        },
        json={
            "encrypted_value": encrypted_value,
            "key_id": public_key_data["key_id"]
        }
    )

    if response.status_code in [201, 204]:
        print(f"✅ Secret {name} updated successfully!")
        return True
    else:
        print(f"❌ Failed to update secret {name}: {response.status_code}")
        print(f"Response: {response.text}")
        return False

def main():
    print("=" * 60)
    print("Supabase GitHub Secrets Fixer")
    print("=" * 60)

    # Check current URL
    print(f"\n📍 Supabase URL: {SUPABASE_URL}")

    # Prompt for service key
    print("\n" + "=" * 60)
    print("You need to provide your Supabase SERVICE ROLE KEY")
    print("=" * 60)
    print("\nWhere to find it:")
    print("  1. Self-hosted Supabase: Check your docker-compose.yml or .env file")
    print("     Look for: ANON_KEY or SERVICE_ROLE_KEY")
    print("  2. Supabase Dashboard: Settings > API > service_role key")
    print("  3. Generate new JWT at: https://supabase.com/docs/guides/hosting/overview#api-keys")
    print("\nThe key should look like:")
    print("  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
    print()

    service_key = input("Enter your SERVICE ROLE KEY: ").strip()

    if not service_key:
        print("❌ No service key provided")
        sys.exit(1)

    # Test the service key
    if not test_service_key(service_key):
        print("\n❌ Service key test failed!")
        print("\nPossible issues:")
        print("  1. Wrong service key (doesn't match JWT_SECRET)")
        print("  2. execute_migration function not created in database")
        print("  3. Network/firewall issues")
        sys.exit(1)

    print("\n✅ Service key works!")

    # Ask if user wants to update GitHub secrets
    print("\n" + "=" * 60)
    update = input("Update GitHub secrets? (yes/no): ").strip().lower()

    if update != "yes":
        print("Skipping GitHub secrets update")
        print("\nTo update manually, run:")
        print(f'  gh secret set SUPABASE_URL --body "{SUPABASE_URL}" --repo {REPO}')
        print(f'  gh secret set SUPABASE_SERVICE_KEY --body "YOUR_KEY" --repo {REPO}')
        sys.exit(0)

    # Install PyNaCl if needed
    try:
        import nacl
    except ImportError:
        print("\n📦 Installing PyNaCl for secret encryption...")
        os.system("pip3 install PyNaCl")
        import nacl

    # Update secrets
    print("\n📝 Updating GitHub secrets...")
    update_github_secret("SUPABASE_URL", SUPABASE_URL)
    update_github_secret("SUPABASE_SERVICE_KEY", service_key)

    print("\n" + "=" * 60)
    print("🎉 All done!")
    print("=" * 60)
    print("\nNext steps:")
    print("  1. Go to: https://github.com/vankiselev/eventbalance/actions")
    print("  2. Manually trigger the 'Deploy to Self-Hosted Supabase' workflow")
    print("  3. Check the logs to verify it works")

if __name__ == "__main__":
    main()
