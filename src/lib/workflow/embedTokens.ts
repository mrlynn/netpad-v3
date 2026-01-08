/**
 * Workflow Embed Token Management
 *
 * Functions for generating and validating execution tokens for workflow embedding.
 */

import { randomBytes, createHash } from 'crypto';

/**
 * Generate a new execution token
 * Format: wf_exec_{random}
 * Example: wf_exec_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
 */
export function generateExecutionToken(): string {
  const prefix = 'wf_exec_';
  const randomPart = randomBytes(24).toString('base64url'); // 32 chars
  return `${prefix}${randomPart}`;
}

/**
 * Hash an execution token for secure storage
 */
export function hashExecutionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Extract the prefix from a token for display
 */
export function getTokenPrefix(token: string): string {
  // Return first 16 chars (e.g., "wf_exec_a1b2c3d4")
  return token.substring(0, 16);
}
