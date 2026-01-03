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

// Triggers
import './formTrigger';
import './manualTrigger';
import './webhookTrigger';
import './scheduleTrigger';

// Data operations
import './mongodbWrite';
import './mongodbQuery';
import './transform';
import './filter';

// Logic & Flow
import './conditional';
import './switch';
import './delay';

// External integrations
import './httpRequest';
import './emailSend';
import './googleSheets';

// MongoDB Atlas integrations
import './atlasCluster';
import './atlasDataApi';

// Custom code
import './code';
