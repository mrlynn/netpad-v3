'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Default page for /apps/[appSlug]
 * Redirects to /apps/[appSlug]/forms
 */
export default function AppSlugIndexPage() {
  const router = useRouter();

  useEffect(() => {
    // Get the current pathname and redirect to /forms
    const currentPath = window.location.pathname;
    router.replace(`${currentPath}/forms`);
  }, [router]);

  return null;
}
