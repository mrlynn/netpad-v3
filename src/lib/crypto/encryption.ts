/**
 * Encryption/Decryption Utilities
 *
 * Provides secure encryption for sensitive data like connection strings
 * Uses AES-256-GCM for authenticated encryption
 */

import crypto from 'crypto';

// Algorithm configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64;

/**
 * Get encryption key from environment
 * In production, this should be rotated regularly and stored securely
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
      'Generate a secure key with: openssl rand -hex 32'
    );
  }

  // Convert hex string to buffer
  if (key.length !== KEY_LENGTH * 2) {
    throw new Error(
      `ENCRYPTION_KEY must be ${KEY_LENGTH * 2} hex characters (${KEY_LENGTH} bytes). ` +
      `Current length: ${key.length}`
    );
  }

  return Buffer.from(key, 'hex');
}

/**
 * Encrypt a string value
 *
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format: iv:authTag:ciphertext (all hex-encoded)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty string');
  }

  try {
    const key = getEncryptionKey();

    // Generate random IV (initialization vector)
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt the data
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Combine IV, auth tag, and ciphertext
    // Format: iv:authTag:ciphertext (all hex-encoded)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext}`;
  } catch (error) {
    console.error('[Encryption] Error encrypting data:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt an encrypted string
 *
 * @param encrypted - The encrypted string (format: iv:authTag:ciphertext)
 * @returns Decrypted plaintext string
 */
export function decrypt(encrypted: string): string {
  if (!encrypted) {
    throw new Error('Cannot decrypt empty string');
  }

  try {
    const key = getEncryptionKey();

    // Parse the encrypted string
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted string format');
    }

    const [ivHex, authTagHex, ciphertext] = parts;

    // Convert from hex
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    // Validate lengths
    if (iv.length !== IV_LENGTH) {
      throw new Error('Invalid IV length');
    }
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error('Invalid auth tag length');
    }

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the data
    let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  } catch (error) {
    console.error('[Encryption] Error decrypting data:', error);
    throw new Error('Decryption failed - data may be corrupted or key may be incorrect');
  }
}

/**
 * Hash a value using SHA-256
 * Useful for generating deterministic IDs or checksums
 *
 * @param value - The value to hash
 * @returns Hex-encoded hash
 */
export function hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Generate a secure random token
 *
 * @param length - Length in bytes (default: 32)
 * @returns Hex-encoded random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Derive a key from a password using PBKDF2
 * Useful for password-based encryption
 *
 * @param password - The password to derive from
 * @param salt - Salt (will be generated if not provided)
 * @returns Object with derived key and salt
 */
export function deriveKey(
  password: string,
  salt?: string
): { key: Buffer; salt: string } {
  const saltBuffer = salt
    ? Buffer.from(salt, 'hex')
    : crypto.randomBytes(SALT_LENGTH);

  const key = crypto.pbkdf2Sync(
    password,
    saltBuffer,
    100000, // iterations
    KEY_LENGTH,
    'sha256'
  );

  return {
    key,
    salt: saltBuffer.toString('hex'),
  };
}

/**
 * Validate encryption key format
 * Checks if the key in environment is valid
 *
 * @returns True if key is valid, false otherwise
 */
export function validateEncryptionKey(): boolean {
  try {
    const key = process.env.ENCRYPTION_KEY;

    if (!key) {
      return false;
    }

    if (key.length !== KEY_LENGTH * 2) {
      return false;
    }

    // Try to parse as hex
    Buffer.from(key, 'hex');
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a new encryption key
 * FOR DEVELOPMENT/SETUP ONLY - In production, use a secure key management system
 *
 * @returns Hex-encoded encryption key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Mask a sensitive string for display (e.g., connection strings)
 * Shows first and last few characters, masks the middle
 *
 * @param value - The string to mask
 * @param visibleChars - Number of characters to show at start/end (default: 4)
 * @returns Masked string
 */
export function maskSensitiveString(value: string, visibleChars: number = 4): string {
  if (!value) return '';

  if (value.length <= visibleChars * 2) {
    return '*'.repeat(value.length);
  }

  const start = value.substring(0, visibleChars);
  const end = value.substring(value.length - visibleChars);
  const maskedLength = value.length - (visibleChars * 2);

  return `${start}${'*'.repeat(Math.min(maskedLength, 20))}${end}`;
}
