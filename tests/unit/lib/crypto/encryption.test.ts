/**
 * Tests for crypto/encryption module
 */
import crypto from 'crypto';

// Set up a valid encryption key before importing
const TEST_KEY = crypto.randomBytes(32).toString('hex');
process.env.ENCRYPTION_KEY = TEST_KEY;

import {
  encrypt,
  decrypt,
  hash,
  generateToken,
  deriveKey,
  validateEncryptionKey,
  generateEncryptionKey,
  maskSensitiveString,
} from '@/lib/crypto/encryption';

describe('crypto/encryption', () => {
  // ============================================
  // encrypt / decrypt roundtrip
  // ============================================
  describe('encrypt and decrypt', () => {
    it('should roundtrip a simple string', () => {
      const plaintext = 'hello world';
      const encrypted = encrypt(plaintext);
      expect(decrypt(encrypted)).toBe(plaintext);
    });

    it('should roundtrip a long string', () => {
      const plaintext = 'a'.repeat(10000);
      expect(decrypt(encrypt(plaintext))).toBe(plaintext);
    });

    it('should roundtrip unicode', () => {
      const plaintext = '日本語テスト 🎉🔐';
      expect(decrypt(encrypt(plaintext))).toBe(plaintext);
    });

    it('should roundtrip special characters', () => {
      const plaintext = 'mongodb+srv://user:p@ss@cluster.example.com/db?retryWrites=true';
      expect(decrypt(encrypt(plaintext))).toBe(plaintext);
    });

    it('should produce different ciphertexts for same plaintext (random IV)', () => {
      const a = encrypt('test');
      const b = encrypt('test');
      expect(a).not.toBe(b);
    });

    it('should produce format iv:authTag:ciphertext', () => {
      const encrypted = encrypt('test');
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toHaveLength(32); // 16 bytes hex
      expect(parts[1]).toHaveLength(32); // 16 bytes hex
      expect(parts[2].length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // encrypt errors
  // ============================================
  describe('encrypt errors', () => {
    it('should throw on empty string', () => {
      expect(() => encrypt('')).toThrow('Cannot encrypt empty string');
    });

    it('should throw when ENCRYPTION_KEY is missing', () => {
      const saved = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;
      expect(() => encrypt('test')).toThrow('Encryption failed');
      process.env.ENCRYPTION_KEY = saved;
    });

    it('should throw when ENCRYPTION_KEY is wrong length', () => {
      process.env.ENCRYPTION_KEY = 'tooshort';
      expect(() => encrypt('test')).toThrow();
      process.env.ENCRYPTION_KEY = TEST_KEY;
    });
  });

  // ============================================
  // decrypt errors
  // ============================================
  describe('decrypt errors', () => {
    it('should throw on empty string', () => {
      expect(() => decrypt('')).toThrow('Cannot decrypt empty string');
    });

    it('should throw on invalid format (no colons)', () => {
      expect(() => decrypt('invaliddata')).toThrow('Decryption failed');
    });

    it('should throw on invalid format (wrong parts)', () => {
      expect(() => decrypt('a:b')).toThrow('Decryption failed');
    });

    it('should throw on tampered ciphertext', () => {
      process.env.ENCRYPTION_KEY = TEST_KEY;
      const encrypted = encrypt('secret');
      const parts = encrypted.split(':');
      parts[2] = 'ff' + parts[2].slice(2); // tamper
      expect(() => decrypt(parts.join(':'))).toThrow('Decryption failed');
    });

    it('should throw on tampered auth tag', () => {
      process.env.ENCRYPTION_KEY = TEST_KEY;
      const encrypted = encrypt('secret');
      const parts = encrypted.split(':');
      parts[1] = '00'.repeat(16);
      expect(() => decrypt(parts.join(':'))).toThrow('Decryption failed');
    });

    it('should throw on wrong key', () => {
      process.env.ENCRYPTION_KEY = TEST_KEY;
      const encrypted = encrypt('secret');
      process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      expect(() => decrypt(encrypted)).toThrow('Decryption failed');
      process.env.ENCRYPTION_KEY = TEST_KEY;
    });
  });

  // ============================================
  // hash
  // ============================================
  describe('hash', () => {
    it('should return hex SHA-256', () => {
      const result = hash('hello');
      expect(result).toHaveLength(64);
      expect(result).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should be deterministic', () => {
      expect(hash('test')).toBe(hash('test'));
    });

    it('should produce different hashes for different inputs', () => {
      expect(hash('a')).not.toBe(hash('b'));
    });

    it('should handle empty string', () => {
      expect(hash('')).toHaveLength(64);
    });
  });

  // ============================================
  // generateToken
  // ============================================
  describe('generateToken', () => {
    it('should generate 64-char hex token by default (32 bytes)', () => {
      const token = generateToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate token of specified byte length', () => {
      const token = generateToken(16);
      expect(token).toHaveLength(32);
    });

    it('should generate unique tokens', () => {
      const a = generateToken();
      const b = generateToken();
      expect(a).not.toBe(b);
    });
  });

  // ============================================
  // deriveKey
  // ============================================
  describe('deriveKey', () => {
    it('should derive a 32-byte key', () => {
      const { key, salt } = deriveKey('password123');
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
      expect(salt).toBeDefined();
    });

    it('should generate salt when not provided', () => {
      const { salt } = deriveKey('password');
      expect(salt.length).toBe(128); // 64 bytes hex
    });

    it('should produce same key with same password and salt', () => {
      const { key: k1, salt } = deriveKey('password');
      const { key: k2 } = deriveKey('password', salt);
      expect(k1.equals(k2)).toBe(true);
    });

    it('should produce different key with different salt', () => {
      const { key: k1 } = deriveKey('password', 'aa'.repeat(64));
      const { key: k2 } = deriveKey('password', 'bb'.repeat(64));
      expect(k1.equals(k2)).toBe(false);
    });

    it('should produce different key with different password', () => {
      const salt = crypto.randomBytes(64).toString('hex');
      const { key: k1 } = deriveKey('password1', salt);
      const { key: k2 } = deriveKey('password2', salt);
      expect(k1.equals(k2)).toBe(false);
    });
  });

  // ============================================
  // validateEncryptionKey
  // ============================================
  describe('validateEncryptionKey', () => {
    it('should return true for valid key', () => {
      process.env.ENCRYPTION_KEY = TEST_KEY;
      expect(validateEncryptionKey()).toBe(true);
    });

    it('should return false when key is missing', () => {
      const saved = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;
      expect(validateEncryptionKey()).toBe(false);
      process.env.ENCRYPTION_KEY = saved;
    });

    it('should return false for wrong length key', () => {
      const saved = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'abc';
      expect(validateEncryptionKey()).toBe(false);
      process.env.ENCRYPTION_KEY = saved;
    });
  });

  // ============================================
  // generateEncryptionKey
  // ============================================
  describe('generateEncryptionKey', () => {
    it('should return 64-char hex string', () => {
      const key = generateEncryptionKey();
      expect(key).toHaveLength(64);
      expect(key).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate unique keys', () => {
      expect(generateEncryptionKey()).not.toBe(generateEncryptionKey());
    });
  });

  // ============================================
  // maskSensitiveString
  // ============================================
  describe('maskSensitiveString', () => {
    it('should mask middle of string', () => {
      const result = maskSensitiveString('mongodb+srv://user:pass@cluster/db');
      expect(result.startsWith('mong')).toBe(true);
      expect(result.endsWith('r/db')).toBe(true); // last 4 chars
      expect(result).toContain('*');
    });

    it('should return empty string for empty input', () => {
      expect(maskSensitiveString('')).toBe('');
    });

    it('should mask entire short string', () => {
      expect(maskSensitiveString('ab')).toBe('**');
    });

    it('should mask string equal to 2x visibleChars', () => {
      expect(maskSensitiveString('abcdefgh')).toBe('********');
    });

    it('should respect custom visibleChars', () => {
      const result = maskSensitiveString('hello world test', 2);
      expect(result.startsWith('he')).toBe(true);
      expect(result.endsWith('st')).toBe(true);
      expect(result).toContain('*');
    });

    it('should cap mask length at 20 asterisks', () => {
      const result = maskSensitiveString('a'.repeat(100));
      const stars = (result.match(/\*/g) || []).length;
      expect(stars).toBe(20);
    });
  });
});
