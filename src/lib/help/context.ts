/**
 * Help Context Detection
 * 
 * Detects the current page/feature context to provide relevant help topics
 */

/**
 * Map route patterns to help context identifiers
 */
const routeContextMap: Array<{ pattern: RegExp | string; context: string }> = [
  // Form Builder
  { pattern: /^\/forms\/builder/, context: 'form-builder' },
  { pattern: /^\/builder/, context: 'form-builder' },
  { pattern: /^\/orgs\/[^/]+\/projects\/[^/]+\/builder/, context: 'form-builder' },
  
  // Forms (general)
  { pattern: /^\/forms/, context: 'forms' },
  { pattern: /^\/orgs\/[^/]+\/projects\/[^/]+\/forms/, context: 'forms' },
  { pattern: /^\/my-forms/, context: 'forms' },
  
  // Workflow Editor
  { pattern: /^\/workflows\/editor/, context: 'workflow-editor' },
  { pattern: /^\/orgs\/[^/]+\/projects\/[^/]+\/workflows\/editor/, context: 'workflow-editor' },
  
  // Workflows (general)
  { pattern: /^\/workflows/, context: 'workflows' },
  { pattern: /^\/orgs\/[^/]+\/projects\/[^/]+\/workflows/, context: 'workflows' },
  
  // Data Explorer
  { pattern: /^\/data/, context: 'data-explorer' },
  { pattern: /^\/orgs\/[^/]+\/projects\/[^/]+\/data/, context: 'data-explorer' },
  
  // Marketplace
  { pattern: /^\/marketplace/, context: 'marketplace' },
  { pattern: /^\/orgs\/[^/]+\/marketplace/, context: 'marketplace' },
  { pattern: /^\/orgs\/[^/]+\/projects\/[^/]+\/marketplace/, context: 'marketplace' },
  
  // Settings
  { pattern: /^\/settings/, context: 'settings' },
  
  // Applications
  { pattern: /^\/applications/, context: 'applications' },
  { pattern: /^\/orgs\/[^/]+\/projects\/[^/]+\/applications/, context: 'applications' },
  { pattern: /^\/apps\/[^/]+/, context: 'applications' },
  
  // Projects
  { pattern: /^\/projects/, context: 'projects' },
  { pattern: /^\/orgs\/[^/]+\/projects$/, context: 'projects' },
  
  // Organizations
  { pattern: /^\/orgs\/[^/]+$/, context: 'organizations' },
  
  // Connections/Vault
  { pattern: /\/connections/, context: 'connection-vault' },
  { pattern: /\/vault/, context: 'connection-vault' },
  
  // Conversational Forms
  { pattern: /\/conversational/, context: 'conversational-forms' },
  
  // Templates
  { pattern: /\/templates/, context: 'template-gallery' },
];

/**
 * Human-readable labels for contexts
 */
export const contextLabels: Record<string, string> = {
  'form-builder': 'Form Builder',
  'forms': 'Forms',
  'workflow-editor': 'Workflow Editor',
  'workflows': 'Workflows',
  'data-explorer': 'Data Explorer',
  'marketplace': 'Marketplace',
  'settings': 'Settings',
  'applications': 'Applications',
  'projects': 'Projects',
  'organizations': 'Organizations',
  'connection-vault': 'Connections',
  'conversational-forms': 'Conversational Forms',
  'template-gallery': 'Templates',
};

/**
 * Detect help context from current pathname
 * 
 * @param pathname - Current route pathname
 * @returns Help context identifier or null
 */
export function detectHelpContext(pathname: string): string | null {
  // Remove query params and hash
  const cleanPath = pathname.split('?')[0].split('#')[0];
  
  // Check each pattern
  for (const { pattern, context } of routeContextMap) {
    if (typeof pattern === 'string') {
      if (cleanPath === pattern || cleanPath.startsWith(pattern)) {
        return context;
      }
    } else {
      if (pattern.test(cleanPath)) {
        return context;
      }
    }
  }
  
  return null;
}

/**
 * Get human-readable label for a context
 */
export function getContextLabel(context: string | null): string {
  if (!context) return '';
  return contextLabels[context] || context.replace(/-/g, ' ');
}
