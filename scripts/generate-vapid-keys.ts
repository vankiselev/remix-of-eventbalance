/**
 * VAPID Keys Generator Script
 * 
 * Run this script to generate VAPID keys for Web Push notifications:
 * npx tsx scripts/generate-vapid-keys.ts
 * 
 * Or use online generator: https://www.stephane-quantin.com/en/tools/generators/vapid-keys
 */

async function generateVapidKeys() {
  try {
    // Check if running in Node.js environment with crypto
    const crypto = await import('crypto');
    
    // Generate ECDH key pair
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: {
        type: 'spki',
        format: 'der'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'der'
      }
    });
    
    // Convert to base64url format
    const publicKeyBase64 = publicKey.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    const privateKeyBase64 = privateKey.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    console.log('\n✅ VAPID Keys generated successfully!\n');
    console.log('📋 Public Key (add to .env as VITE_VAPID_PUBLIC_KEY):');
    console.log(publicKeyBase64);
    console.log('\n🔒 Private Key (add to Supabase Secrets as VAPID_PRIVATE_KEY):');
    console.log(privateKeyBase64);
    console.log('\n⚠️  Keep the private key secret! Never commit it to version control.\n');
    
  } catch (error) {
    console.error('❌ Error generating VAPID keys:', error);
    console.log('\n💡 Alternative: Use online generator at https://www.stephane-quantin.com/en/tools/generators/vapid-keys\n');
  }
}

generateVapidKeys();
