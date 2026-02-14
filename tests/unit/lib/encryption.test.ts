/**
 * Tests for encryption utilities
 * @module lib/encryption
 */

import crypto from 'crypto';

// Generate a valid 32-byte key for testing
const TEST_KEY = crypto.randomBytes(32).toString('base64');

describe('encryption', () => {
  let encrypt: typeof import('@/lib/encryption').encrypt;
  let decrypt: typeof import('@/lib/encryption').decrypt;
  let verifyEncryptionConfig: typeof import('@/lib/encryption').verifyEncryptionConfig;
  let testEncryption: typeof import('@/lib/encryption').testEncryption;
  let generateEncryptionKey: typeof import('@/lib/encryption').generateEncryptionKey;
  let hashValue: typeof import('@/lib/encryption').hashValue;
  let generateSecureId: typeof import('@/lib/encryption').generateSecureId;

  beforeEach(() => {
    jest.resetModules();
    process.env.VAULT_ENCRYPTION_KEY = TEST_KEY;
  });

  afterEach(() => {
    delete process.env.VAULT_ENCRYPTION_KEY;
  });

  async function loadModule() {
    const mod = await import('@/lib/encryption');
    encrypt = mod.encrypt;
    decrypt = mod.decrypt;
    verifyEncryptionConfig = mod.verifyEncryptionConfig;
    testEncryption = mod.testEncryption;
    generateEncryptionKey = mod.generateEncryptionKey;
    hashValue = mod.hashValue;
    generateSecureId = mod.generateSecureId;
  }

  describe('encrypt/decrypt round-trip', () => {
    it('encrypts and decrypts a simple string', async () => {
      await loadModule();
      const plaintext = 'Hello, World!';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('encrypts and decrypts an empty string', async () => {
      await loadModule();
      const encrypted = encrypt('');
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe('');
    });

    it('encrypts and decrypts unicode text', async () => {
      await loadModule();
      const plaintext = '🔐 Héllo Wörld 日本語 مرحبا';
      const encrypted = encrypt(plaintext);
      expect(decrypt(encrypted)).toBe(plaintext);
    });

    it('encrypts and decrypts a long string', async () => {
      await loadModule();
      const plaintext = 'A'.repeat(10000);
      const encrypted = encrypt(plaintext);
      expect(decrypt(encrypted)).toBe(plaintext);
    });

    it('produces different ciphertext for the same plaintext (random IV)', async () => {
      await loadModule();
      const plaintext = 'same text';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);
      expect(encrypted1).not.toBe(encrypted2);
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it('produces output in keyId:iv:ciphertext:authTag format', async () => {
      await loadModule();
      const encrypted = encrypt('test');
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(4);
      expect(parts[0]).toBe('v1');
      // IV, ciphertext, and authTag should be valid base64
      for (let i = 1; i < 4; i++) {
        expect(() => Buffer.from(parts[i], 'base64')).not.toThrow();
      }
    });
  });

  describe('decrypt errors', () => {
    it('throws on invalid format (missing parts)', async () => {
      await loadModule();
      expect(() => decrypt('invalid')).toThrow('Invalid encrypted data format');
    });

    it('throws on unknown key ID', async () => {
      await loadModule();
      const encrypted = encrypt('test');
      const tampered = encrypted.replace('v1:', 'v99:');
      expect(() => decrypt(tampered)).toThrow('Unknown encryption key ID');
    });

    it('throws on tampered ciphertext (auth tag mismatch)', async () => {
      await loadModule();
      const encrypted = encrypt('test');
      const parts = encrypted.split(':');
      // Tamper with ciphertext
      const cipherBuf = Buffer.from(parts[2], 'base64');
      cipherBuf[0] ^= 0xff;
      parts[2] = cipherBuf.toString('base64');
      expect(() => decrypt(parts.join(':'))).toThrow();
    });

    it('throws on tampered auth tag', async () => {
      await loadModule();
      const encrypted = encrypt('test');
      const parts = encrypted.split(':');
      const tagBuf = Buffer.from(parts[3], 'base64');
      tagBuf[0] ^= 0xff;
      parts[3] = tagBuf.toString('base64');
      expect(() => decrypt(parts.join(':'))).toThrow();
    });
  });

  describe('verifyEncryptionConfig', () => {
    it('returns true when key is set', async () => {
      await loadModule();
      expect(verifyEncryptionConfig()).toBe(true);
    });

    it('returns false when key is not set', async () => {
      delete process.env.VAULT_ENCRYPTION_KEY;
      await loadModule();
      expect(verifyEncryptionConfig()).toBe(false);
    });

    it('returns false when key is wrong length', async () => {
      process.env.VAULT_ENCRYPTION_KEY = Buffer.from('short').toString('base64');
      await loadModule();
      expect(verifyEncryptionConfig()).toBe(false);
    });
  });

  describe('testEncryption', () => {
    it('returns success true when properly configured', async () => {
      await loadModule();
      const result = testEncryption();
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns success false when not configured', async () => {
      delete process.env.VAULT_ENCRYPTION_KEY;
      await loadModule();
      const result = testEncryption();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('generateEncryptionKey', () => {
    it('generates a valid base64 key', async () => {
      await loadModule();
      const key = generateEncryptionKey();
      const buf = Buffer.from(key, 'base64');
      expect(buf.length).toBe(32);
    });

    it('generates unique keys each time', async () => {
      await loadModule();
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('hashValue', () => {
    it('returns a hex SHA-256 hash', async () => {
      await loadModule();
      const hash = hashValue('test');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('produces consistent hashes', async () => {
      await loadModule();
      expect(hashValue('hello')).toBe(hashValue('hello'));
    });

    it('produces different hashes for different inputs', async () => {
      await loadModule();
      expect(hashValue('a')).not.toBe(hashValue('b'));
    });
  });

  describe('generateSecureId', () => {
    it('generates a random ID without prefix', async () => {
      await loadModule();
      const id = generateSecureId();
      expect(id.length).toBeGreaterThan(0);
      // No prefix separator pattern (prefix_xxx), just raw base64url
      expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('generates an ID with prefix', async () => {
      await loadModule();
      const id = generateSecureId('test');
      expect(id).toMatch(/^test_/);
    });

    it('generates unique IDs', async () => {
      await loadModule();
      const ids = new Set(Array.from({ length: 100 }, () => generateSecureId()));
      expect(ids.size).toBe(100);
    });
  });
});
