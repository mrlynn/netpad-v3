/**
 * Legacy Org-Scoped Marketplace Route
 *
 * Redirects to public marketplace for backward compatibility.
 * The marketplace is now public - no org required to browse.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { Box } from '@mui/material';

export default function MarketplaceRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to public marketplace
    router.replace('/marketplace');
  }, [router]);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <NetPadLoader size="large" message="Redirecting to marketplace..." />
    </Box>
  );
}
