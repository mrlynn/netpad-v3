/**
 * Public Marketplace Page
 *
 * Browse and import NetPad applications from the public marketplace.
 * No organization required to browse - only needed when importing.
 */

'use client';

import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { MarketplaceView } from '@/components/Marketplace';

export default function MarketplacePage() {
  return (
    <>
      <AppNavBar />
      <MarketplaceView />
    </>
  );
}
