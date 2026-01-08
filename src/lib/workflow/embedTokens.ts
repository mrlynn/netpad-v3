/**
 * Workflow Embed Token Management
 *
 * Functions for generating and validating execution tokens for workflow embedding.
 * Works in both Node.js (server) and browser (client) environments.
 */

/**
 * Generate random bytes (works in both Node.js and browser)
 */
function getRandomBytes(length: number): Uint8Array {
  // Browser environment
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return array;
  }
  
  // Node.js environment
  if (typeof require !== 'undefined') {
    const { randomBytes } = require('crypto');
    return randomBytes(length);
  }
  
  // Fallback (shouldn't happen, but just in case)
  const array = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return array;
}

/**
 * Convert bytes to base64url string
 */
function bytesToBase64Url(bytes: Uint8Array): string {
  // Convert to base64
  let base64: string;
  
  if (typeof Buffer !== 'undefined') {
    // Node.js
    base64 = Buffer.from(bytes).toString('base64');
  } else {
    // Browser - convert Uint8Array to base64 manually
    const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
    base64 = btoa(binary);
  }
  
  // Convert to base64url (URL-safe)
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, ''); // Remove padding
}

/**
 * Generate a new execution token
 * Format: wf_exec_{random}
 * Example: wf_exec_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
 * 
 * Works in both Node.js and browser environments.
 */
export function generateExecutionToken(): string {
  const prefix = 'wf_exec_';
  const randomBytes = getRandomBytes(24);
  const randomPart = bytesToBase64Url(randomBytes);
  return `${prefix}${randomPart}`;
}

/**
 * Hash an execution token for secure storage
 * Works in both Node.js and browser environments.
 */
export async function hashExecutionToken(token: string): Promise<string> {
  // Browser environment - use Web Crypto API
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }
  
  // Node.js environment
  if (typeof require !== 'undefined') {
    const { createHash } = require('crypto');
    return createHash('sha256').update(token).digest('hex');
  }
  
  // Fallback (shouldn't happen)
  throw new Error('Unable to hash token: no crypto implementation available');
}

/**
 * Extract the prefix from a token for display
 */
export function getTokenPrefix(token: string): string {
  // Return first 16 chars (e.g., "wf_exec_a1b2c3d4")
  return token.substring(0, 16);
}
