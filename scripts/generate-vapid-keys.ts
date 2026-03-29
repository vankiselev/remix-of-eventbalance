/**
 * VAPID Keys Generator Script (web-push only)
 *
 * Run:
 * npx tsx scripts/generate-vapid-keys.ts
 */

import webpush from 'web-push';

const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;

function sanitize(value: string): string {
  return String(value ?? '')
    .trim()
    .replace(/[\s\n\r"']/g, '')
    .replace(/=+$/g, '');
}

function mask(value: string): string {
  if (!value) return '***';
  return value.length < 12 ? '***' : `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function assertBase64url(label: string, value: string): void {
  if (!BASE64URL_RE.test(value)) {
    throw new Error(`${label} is not valid base64url`);
  }
}

function generateVapidKeys() {
  try {
    const { publicKey, privateKey } = webpush.generateVAPIDKeys();

    const cleanedPublicKey = sanitize(publicKey);
    const cleanedPrivateKey = sanitize(privateKey);

    assertBase64url('VAPID_PUBLIC_KEY', cleanedPublicKey);
    assertBase64url('VAPID_PRIVATE_KEY', cleanedPrivateKey);

    console.log('\n✅ VAPID Keys generated successfully (web-push)!\n');
    console.log('📋 Public Key (add to .env as VITE_VAPID_PUBLIC_KEY):');
    console.log(cleanedPublicKey);
    console.log('\n🔒 Private Key (add to system_secrets / runtime secrets as VAPID_PRIVATE_KEY):');
    console.log(cleanedPrivateKey);
    console.log(`\n🔎 Masked preview: public=${mask(cleanedPublicKey)}, private=${mask(cleanedPrivateKey)}\n`);
    console.log('⚠️  Keep the private key secret! Never commit it to version control.\n');
  } catch (error) {
    console.error('❌ Error generating VAPID keys:', error);
  }
}

generateVapidKeys();
