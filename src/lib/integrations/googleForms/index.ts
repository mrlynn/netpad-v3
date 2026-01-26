/**
 * Google Forms Integration
 *
 * Exports for the Google Forms import functionality.
 */

export {
  GoogleFormsClient,
  createGoogleFormsClient,
  extractFormIdFromUrl,
  buildFormResponderUrl,
  buildFormEditUrl,
  countFormQuestions,
  type GoogleFormsClientConfig,
  type GoogleFormsClientError,
  type GoogleFormsClientResult,
} from './client';

export {
  mapGoogleFormToNetPad,
  getMappingSummary,
} from './mapper';

// URL-based parsing (no OAuth required)
export {
  parseGoogleFormUrl,
  mapParsedFormToNetPad,
  extractFormIdFromUrl as extractFormIdFromUrlSimple,
  buildViewFormUrl,
  type ParsedGoogleForm,
  type ParsedFormField,
  type GoogleFormFieldType,
  type UrlParseResult,
  type UrlMappingResult,
} from './urlParser';
