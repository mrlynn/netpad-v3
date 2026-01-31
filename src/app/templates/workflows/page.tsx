/**
 * Public Workflow Templates Page
 *
 * Browse workflow templates organized by category with search and filtering.
 * Similar to the form templates page at /templates
 */

'use client';

import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { WorkflowTemplatesView } from '@/components/Templates/WorkflowTemplatesView';

export default function WorkflowTemplatesPage() {
  return (
    <>
      <AppNavBar />
      <WorkflowTemplatesView />
    </>
  );
}
