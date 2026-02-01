/**
 * Type declarations for optional @netpad/cloud-features module
 * 
 * This module is only available in cloud deployments.
 * The dynamic import will fail gracefully in self-hosted mode.
 */

declare module '@netpad/cloud-features' {
  import { AdminExtension } from '@/lib/platform/adminExtensions';
  
  export function getAdminExtensions(): Promise<AdminExtension>;
  
  // Add other cloud feature exports as needed
  export const cloudFeatures: {
    billing?: unknown;
    analytics?: unknown;
    support?: unknown;
  };
}
