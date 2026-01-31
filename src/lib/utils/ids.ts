/**
 * ID Generation Utilities
 * 
 * Generates prefixed IDs for various entity types.
 */

import { nanoid } from 'nanoid';

/**
 * Generate a prefixed ID
 * @param prefix - The entity prefix (e.g., 'grp', 'role', 'asgn')
 * @param length - Length of the random portion (default 12)
 * @returns Prefixed ID like "grp_abc123xyz456"
 */
export function generateId(prefix: string, length: number = 12): string {
  return `${prefix}_${nanoid(length)}`;
}

/**
 * Generate IDs for specific entity types
 */
export const ids = {
  group: () => generateId('grp'),
  role: () => generateId('role'),
  assignment: () => generateId('asgn'),
  invitation: () => generateId('inv'),
  org: () => generateId('org'),
  project: () => generateId('proj'),
  user: () => generateId('user'),
  form: () => generateId('form'),
  submission: () => generateId('sub'),
  vault: () => generateId('vault'),
  workflow: () => generateId('wf'),
  deployment: () => generateId('dep'),
  credential: () => generateId('intcred'),
};
