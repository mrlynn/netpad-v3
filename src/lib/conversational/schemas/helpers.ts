/**
 * Schema Helper Functions
 * 
 * Utilities for working with extraction schemas
 */

import { ConversationalFormConfig } from '@/types/conversational';
import { ExtractionSchema } from '@/lib/ai/providers/base';
import {
  getITHelpdeskExtractionSchema,
  IT_HELPDESK_EXTRACTION_SCHEMA,
} from './it-helpdesk';

/**
 * Get extraction schema for a conversational form config
 * 
 * If useITHelpdeskTemplate is true, returns the IT Helpdesk schema.
 * Otherwise, returns the schema from the config.
 */
export function getExtractionSchemaForConfig(
  config: ConversationalFormConfig
): ExtractionSchema[] {
  if (config.useITHelpdeskTemplate) {
    return getITHelpdeskExtractionSchema();
  }

  return config.extractionSchema || [];
}

/**
 * Check if a config uses the IT Helpdesk template
 */
export function isITHelpdeskConfig(
  config: ConversationalFormConfig
): boolean {
  return config.useITHelpdeskTemplate === true;
}

/**
 * Get default extraction schema for IT Helpdesk
 * 
 * Returns the base schema without topic mappings (for display/editing)
 */
export function getDefaultITHelpdeskSchema(): ExtractionSchema[] {
  return IT_HELPDESK_EXTRACTION_SCHEMA;
}
