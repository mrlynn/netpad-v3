/**
 * Node Handler Registry - Main Entry Point
 *
 * Import handlers here to trigger their registration.
 * Re-exports registry functions for external use.
 */

// Re-export types
export * from './types';

// Re-export registry functions
export {
  registerHandler,
  getHandler,
  getHandlerMetadata,
  listHandlers,
  hasHandler,
} from './registry';

// Import handlers to trigger registration
// These must be imported AFTER re-exporting registry functions
import './formTrigger';
import './mongodbWrite';
import './transform';
import './delay';
