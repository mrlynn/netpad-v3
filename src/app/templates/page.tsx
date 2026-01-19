/**
 * Public Templates Page
 *
 * Browse 100+ professionally designed form templates.
 * Organized by category with search and filtering.
 */

'use client';

import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { TemplatesView } from '@/components/Templates';

export default function TemplatesPage() {
  return (
    <>
      <AppNavBar />
      <TemplatesView />
    </>
  );
}
