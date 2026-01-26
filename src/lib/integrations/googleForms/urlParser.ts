/**
 * Google Forms URL Parser
 *
 * Extracts form structure from publicly accessible Google Forms
 * without requiring OAuth authentication.
 *
 * This uses the FB_PUBLIC_LOAD_DATA_ technique - Google Forms embed
 * the complete form structure as a JavaScript variable in the page HTML.
 */

import { FieldConfig } from '@/types/form';

// ============================================
// Types
// ============================================

export interface ParsedGoogleForm {
  formId: string;
  title: string;
  description?: string;
  fields: ParsedFormField[];
  pageCount: number;
  sourceUrl: string;
}

export interface ParsedFormField {
  id: string;
  title: string;
  description?: string;
  type: GoogleFormFieldType;
  required: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  pageIndex: number;
}

export type GoogleFormFieldType =
  | 'SHORT_TEXT'
  | 'PARAGRAPH'
  | 'MULTIPLE_CHOICE'
  | 'CHECKBOXES'
  | 'DROPDOWN'
  | 'LINEAR_SCALE'
  | 'MULTIPLE_CHOICE_GRID'
  | 'CHECKBOX_GRID'
  | 'DATE'
  | 'TIME'
  | 'FILE_UPLOAD'
  | 'SECTION'
  | 'UNKNOWN';

export interface UrlParseResult {
  success: boolean;
  form?: ParsedGoogleForm;
  error?: {
    code: string;
    message: string;
  };
}

export interface UrlMappingResult {
  success: boolean;
  fields: FieldConfig[];
  warnings: string[];
  statistics: {
    totalFields: number;
    mappedFields: number;
    unmappedFields: number;
  };
}

// ============================================
// Constants
// ============================================

// Field type codes in FB_PUBLIC_LOAD_DATA_
// These codes are found at item[3] in each question
const FIELD_TYPE_CODES: Record<number, GoogleFormFieldType> = {
  0: 'SHORT_TEXT',
  1: 'PARAGRAPH',
  2: 'MULTIPLE_CHOICE',      // Radio buttons
  3: 'DROPDOWN',
  4: 'CHECKBOXES',           // Multiple select checkboxes
  5: 'LINEAR_SCALE',         // 1-10 scale
  7: 'MULTIPLE_CHOICE_GRID', // Grid with radio buttons per row
  8: 'CHECKBOX_GRID',        // Grid with checkboxes per row
  9: 'DATE',
  10: 'TIME',
  11: 'DATE',                // Date with time
  13: 'FILE_UPLOAD',
  18: 'LINEAR_SCALE',        // NPS-style scale (appears similar to 5)
};

// NetPad type mapping
const NETPAD_TYPE_MAP: Record<GoogleFormFieldType, FieldConfig['type']> = {
  SHORT_TEXT: 'text',
  PARAGRAPH: 'long_text',
  MULTIPLE_CHOICE: 'radio',
  CHECKBOXES: 'checkbox',
  DROPDOWN: 'select',
  LINEAR_SCALE: 'rating',
  MULTIPLE_CHOICE_GRID: 'text', // Approximate - grid not fully supported
  CHECKBOX_GRID: 'text', // Approximate - grid not fully supported
  DATE: 'date',
  TIME: 'text', // Map to text with time pattern
  FILE_UPLOAD: 'file',
  SECTION: 'text', // Section headers become descriptive text
  UNKNOWN: 'text',
};

// ============================================
// URL Utilities
// ============================================

/**
 * URL format detection result
 */
interface UrlParseInfo {
  formId: string | null;
  isPublishedUrl: boolean;  // true if /d/e/ format (use URL directly)
  originalUrl: string;
}

/**
 * Extract form ID from various Google Forms URL formats
 */
export function extractFormIdFromUrl(url: string): string | null {
  const info = parseFormUrl(url);
  return info.formId;
}

/**
 * Parse Google Forms URL to extract form ID and determine URL type
 */
function parseFormUrl(url: string): UrlParseInfo {
  try {
    const urlObj = new URL(url);

    // Published form URL format: /forms/d/e/{publishedId}/viewform
    // These URLs should be used directly - the ID is not a real form ID
    if (urlObj.hostname.includes('google.com') && urlObj.pathname.includes('/forms/d/e/')) {
      const match = urlObj.pathname.match(/\/forms\/d\/e\/([a-zA-Z0-9_-]+)/);
      if (match) {
        return {
          formId: match[1],
          isPublishedUrl: true,
          originalUrl: url,
        };
      }
    }

    // Standard forms URL: /forms/d/{formId}/... (not /e/)
    if (urlObj.hostname.includes('google.com') && urlObj.pathname.includes('/forms/d/')) {
      const match = urlObj.pathname.match(/\/forms\/d\/([a-zA-Z0-9_-]+)/);
      if (match) {
        return {
          formId: match[1],
          isPublishedUrl: false,
          originalUrl: url,
        };
      }
    }

    // Short URL: forms.gle/{shortId} - we can't resolve these without a request
    if (urlObj.hostname === 'forms.gle') {
      return {
        formId: null,
        isPublishedUrl: false,
        originalUrl: url,
      };
    }
  } catch {
    // Not a valid URL
  }

  // Check if it's already just a form ID
  if (/^[a-zA-Z0-9_-]{25,}$/.test(url)) {
    return {
      formId: url,
      isPublishedUrl: false,
      originalUrl: url,
    };
  }

  return {
    formId: null,
    isPublishedUrl: false,
    originalUrl: url,
  };
}

/**
 * Build the public viewform URL for a form ID
 */
export function buildViewFormUrl(formId: string): string {
  return `https://docs.google.com/forms/d/${formId}/viewform`;
}

// ============================================
// HTML Fetching
// ============================================

/**
 * Fetch the HTML content of a Google Form page
 */
async function fetchFormHtml(url: string): Promise<string> {
  console.log('[URL Parser] Fetching form from:', url);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    },
    redirect: 'follow',
  });

  console.log('[URL Parser] Response status:', response.status, 'Final URL:', response.url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Form not found. Please check the URL is correct.');
    }
    if (response.status === 403) {
      throw new Error('Form is not publicly accessible. The form owner may need to change sharing settings.');
    }
    throw new Error(`Failed to fetch form: HTTP ${response.status}`);
  }

  return response.text();
}

// ============================================
// Data Extraction
// ============================================

/**
 * Extract FB_PUBLIC_LOAD_DATA_ from HTML
 */
function extractPublicLoadData(html: string): unknown[] | null {
  console.log('[URL Parser] HTML length:', html.length);
  console.log('[URL Parser] Contains FB_PUBLIC_LOAD_DATA_:', html.includes('FB_PUBLIC_LOAD_DATA_'));

  // Check if we got redirected to an actual login page (not just a page that has login links)
  // A real login redirect won't have FB_PUBLIC_LOAD_DATA_
  if (!html.includes('FB_PUBLIC_LOAD_DATA_') &&
      (html.includes('accounts.google.com/ServiceLogin') || html.includes('accounts.google.com/signin'))) {
    console.log('[URL Parser] Received login page - form requires authentication');
    return null;
  }

  // Find the start of FB_PUBLIC_LOAD_DATA_
  const startMarker = 'var FB_PUBLIC_LOAD_DATA_ = ';
  const startIndex = html.indexOf(startMarker);

  if (startIndex === -1) {
    console.log('[URL Parser] Could not find FB_PUBLIC_LOAD_DATA_ start marker');
    return null;
  }

  // Extract from the start marker
  const dataStart = startIndex + startMarker.length;

  // Find the end by matching brackets - the data is a JSON array
  let bracketCount = 0;
  let inString = false;
  let escapeNext = false;
  let endIndex = -1;

  for (let i = dataStart; i < html.length; i++) {
    const char = html[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '[') {
        bracketCount++;
      } else if (char === ']') {
        bracketCount--;
        if (bracketCount === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }
  }

  if (endIndex === -1) {
    console.log('[URL Parser] Could not find end of FB_PUBLIC_LOAD_DATA_ array');
    return null;
  }

  const jsonStr = html.substring(dataStart, endIndex);
  console.log('[URL Parser] Found FB_PUBLIC_LOAD_DATA_, length:', jsonStr.length);

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('[URL Parser] Failed to parse FB_PUBLIC_LOAD_DATA_:', e);
    console.log('[URL Parser] First 200 chars:', jsonStr.substring(0, 200));
    return null;
  }
}

/**
 * Parse the nested array structure to extract form data
 *
 * FB_PUBLIC_LOAD_DATA_ structure (based on Google Forms):
 * data[1][1] - Array of questions/items
 * data[1][8] - Form title
 * data[1][0] - Form description
 *
 * Each question item structure:
 * item[0] - Question ID (number)
 * item[1] - Question title/label (string)
 * item[2] - Question description (string or null)
 * item[3] - Question type code (0=short text, 1=paragraph, 2=multiple choice,
 *           3=dropdown, 4=checkboxes, 5=linear scale, 7=mc grid, 9=date, etc.)
 * item[4] - Array containing question details (sub-questions or options)
 *   item[4][0] - First sub-question info array:
 *     [0] - Sub-question ID
 *     [1] - Options array (for choice fields): [[label, null, null, null, 0], ...]
 *     [2] - Required flag (0 = optional, 1 = required)
 *     [3] - Scale labels for linear scale: [lowLabel, highLabel]
 */
function parseFormData(data: unknown[]): ParsedGoogleForm | null {
  try {
    console.log('[URL Parser] Data structure - top level length:', data.length);

    // The structure is deeply nested - data[1] contains form info
    const formData = data[1] as unknown[];
    if (!formData || !Array.isArray(formData)) {
      console.log('[URL Parser] formData is not an array');
      return null;
    }

    // Form title is at index 8
    const title = (formData[8] as string) || 'Untitled Form';
    console.log('[URL Parser] Title:', title);

    // Form description is at index 0
    const description = formData[0] as string | undefined;
    console.log('[URL Parser] Description:', description?.substring(0, 100));

    // Questions are at index 1
    const questionsData = formData[1] as unknown[];
    if (!questionsData || !Array.isArray(questionsData)) {
      console.log('[URL Parser] questionsData is not an array');
      return {
        formId: '',
        title,
        description,
        fields: [],
        pageCount: 1,
        sourceUrl: '',
      };
    }

    console.log('[URL Parser] Number of questions:', questionsData.length);

    const fields: ParsedFormField[] = [];
    let currentPage = 0;

    for (let idx = 0; idx < questionsData.length; idx++) {
      const item = questionsData[idx];
      if (!Array.isArray(item)) {
        continue;
      }

      // Extract basic info from question item
      const fieldId = String(item[0] || `field_${fields.length}`);
      const fieldTitle = String(item[1] || 'Untitled Question');
      const fieldDescription = item[2] ? String(item[2]) : undefined;
      const typeCode = item[3] as number;  // Type code is at item[3], NOT nested deeper
      const fieldType = FIELD_TYPE_CODES[typeCode] || 'UNKNOWN';

      console.log(`[URL Parser] Question ${idx}: type=${fieldType} (code=${typeCode}), title="${fieldTitle.substring(0, 50)}"`);

      // Check if this is a page break (type 8)
      if (typeCode === 8) {
        currentPage++;
        continue;
      }

      // Get question details from item[4]
      const questionDetails = item[4];
      if (!Array.isArray(questionDetails) || questionDetails.length === 0) {
        console.log(`[URL Parser] Question ${idx}: No question details at item[4]`);
        // Still create a field with basic info
        fields.push({
          id: fieldId,
          title: fieldTitle,
          description: fieldDescription,
          type: fieldType,
          required: false,
          pageIndex: currentPage,
        });
        continue;
      }

      // Get the first sub-question info (most questions only have one)
      const subQuestion = questionDetails[0];
      if (!Array.isArray(subQuestion)) {
        console.log(`[URL Parser] Question ${idx}: subQuestion is not an array`);
        fields.push({
          id: fieldId,
          title: fieldTitle,
          description: fieldDescription,
          type: fieldType,
          required: false,
          pageIndex: currentPage,
        });
        continue;
      }

      // Required flag is at subQuestion[2]
      const isRequired = subQuestion[2] === 1;

      // Extract options for choice fields (MULTIPLE_CHOICE, CHECKBOXES, DROPDOWN)
      let options: string[] | undefined;
      if (['MULTIPLE_CHOICE', 'CHECKBOXES', 'DROPDOWN'].includes(fieldType)) {
        const optionsData = subQuestion[1];
        if (Array.isArray(optionsData)) {
          options = optionsData
            .filter((opt): opt is unknown[] => Array.isArray(opt))
            .map((opt) => String(opt[0] || ''))  // Label is at opt[0]
            .filter((opt) => opt.length > 0);
          console.log(`[URL Parser] Question ${idx}: Found ${options.length} options:`, options);
        }
      }

      // Extract scale info for linear scale
      let validation: ParsedFormField['validation'];
      if (fieldType === 'LINEAR_SCALE') {
        const scaleOptions = subQuestion[1];
        if (Array.isArray(scaleOptions) && scaleOptions.length > 0) {
          // Scale options are like ["1", null, null, null, 0], ["2", ...], etc.
          // Extract min/max from the first and last option labels
          const scaleValues = scaleOptions
            .filter((opt): opt is unknown[] => Array.isArray(opt))
            .map((opt) => parseInt(String(opt[0]), 10))
            .filter((v) => !isNaN(v));

          if (scaleValues.length >= 2) {
            validation = {
              min: Math.min(...scaleValues),
              max: Math.max(...scaleValues),
            };
            console.log(`[URL Parser] Question ${idx}: Scale range ${validation.min}-${validation.max}`);
          }
        }

        // Scale labels (low/high) are at subQuestion[3]
        const scaleLabels = subQuestion[3];
        if (Array.isArray(scaleLabels) && scaleLabels.length >= 2) {
          console.log(`[URL Parser] Question ${idx}: Scale labels: "${scaleLabels[0]}" to "${scaleLabels[1]}"`);
        }
      }

      fields.push({
        id: fieldId,
        title: fieldTitle,
        description: fieldDescription,
        type: fieldType,
        required: Boolean(isRequired),
        options,
        validation,
        pageIndex: currentPage,
      });
    }

    console.log(`[URL Parser] Total fields parsed: ${fields.length}`);
    return {
      formId: '',
      title,
      description,
      fields,
      pageCount: currentPage + 1,
      sourceUrl: '',
    };
  } catch (error) {
    console.error('[URL Parser] Failed to parse form data:', error);
    return null;
  }
}

// ============================================
// Main Parser Function
// ============================================

/**
 * Parse a Google Form from its public URL
 */
export async function parseGoogleFormUrl(url: string): Promise<UrlParseResult> {
  try {
    // Parse the URL to determine format
    const urlInfo = parseFormUrl(url);
    let formId = urlInfo.formId;
    let fetchUrl = url;

    if (urlInfo.isPublishedUrl && formId) {
      // Published URL format (/d/e/...) - use the URL directly but ensure it ends with /viewform
      if (!url.includes('/viewform')) {
        fetchUrl = url.replace(/\/?$/, '/viewform');
      } else {
        fetchUrl = url;
      }
      console.log('[URL Parser] Using published URL format directly:', fetchUrl);
    } else if (formId) {
      // Standard format - construct the viewform URL from form ID
      fetchUrl = buildViewFormUrl(formId);
      console.log('[URL Parser] Constructed viewform URL:', fetchUrl);
    } else if (url.includes('forms.gle')) {
      // Short URL - need to follow redirect
      try {
        console.log('[URL Parser] Following short URL redirect:', url);
        const response = await fetch(url, { redirect: 'follow' });
        fetchUrl = response.url;
        console.log('[URL Parser] Redirected to:', fetchUrl);
        const redirectInfo = parseFormUrl(fetchUrl);
        formId = redirectInfo.formId;
        // If it's a published URL, use it directly; otherwise construct from form ID
        if (redirectInfo.isPublishedUrl) {
          // Keep the redirected URL as-is, just ensure it has /viewform
          if (!fetchUrl.includes('/viewform')) {
            fetchUrl = fetchUrl.replace(/\/?(\?.*)?$/, '/viewform$1');
          }
          console.log('[URL Parser] Using published redirect URL:', fetchUrl);
        } else if (formId) {
          fetchUrl = buildViewFormUrl(formId);
          console.log('[URL Parser] Constructed URL from form ID:', fetchUrl);
        }
      } catch (err) {
        console.error('[URL Parser] Failed to follow short URL:', err);
        return {
          success: false,
          error: {
            code: 'INVALID_URL',
            message: 'Could not resolve short URL. Please use the full form URL.',
          },
        };
      }
    } else {
      return {
        success: false,
        error: {
          code: 'INVALID_URL',
          message: 'Invalid Google Forms URL. Please provide a valid Google Forms link.',
        },
      };
    }

    // Fetch the form HTML
    const html = await fetchFormHtml(fetchUrl);

    // Extract the form data
    const publicData = extractPublicLoadData(html);
    if (!publicData) {
      return {
        success: false,
        error: {
          code: 'PARSE_FAILED',
          message: 'Could not extract form data. The form may be private or have restricted access.',
        },
      };
    }

    // Parse the form structure
    const form = parseFormData(publicData);
    if (!form) {
      return {
        success: false,
        error: {
          code: 'PARSE_FAILED',
          message: 'Could not parse form structure. The form format may not be supported.',
        },
      };
    }

    // Add metadata
    form.formId = formId || '';
    form.sourceUrl = fetchUrl;

    return {
      success: true,
      form,
    };
  } catch (error) {
    console.error('[URL Parser] Error:', error);
    return {
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: error instanceof Error ? error.message : 'Failed to fetch form',
      },
    };
  }
}

// ============================================
// Field Mapping
// ============================================

/**
 * Convert a field path-safe string from a title
 */
function titleToPath(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 50) || 'field';
}

/**
 * Map parsed Google Form fields to NetPad field configs
 */
export function mapParsedFormToNetPad(form: ParsedGoogleForm): UrlMappingResult {
  const fields: FieldConfig[] = [];
  const warnings: string[] = [];
  const usedPaths = new Set<string>();
  let unmappedCount = 0;

  for (const field of form.fields) {
    // Generate unique path
    let basePath = titleToPath(field.title);
    let path = basePath;
    let suffix = 1;
    while (usedPaths.has(path)) {
      path = `${basePath}_${suffix}`;
      suffix++;
    }
    usedPaths.add(path);

    // Get NetPad type
    const netpadType = NETPAD_TYPE_MAP[field.type];

    // Build field config with required fields
    const fieldConfig: FieldConfig = {
      path,
      label: field.title,
      type: netpadType,
      required: field.required,
      included: true,
    };

    // Add placeholder from description if present
    if (field.description) {
      fieldConfig.placeholder = field.description;
    }

    // Initialize validation object for options and other validation rules
    fieldConfig.validation = {};

    // Add options for choice fields
    if (field.options && field.options.length > 0) {
      fieldConfig.validation.options = field.options.map((label) => ({
        label,
        value: label.toLowerCase().replace(/\s+/g, '_'),
      }));
    }

    // Handle rating/scale fields
    if (field.type === 'LINEAR_SCALE' && field.validation) {
      fieldConfig.validation.min = field.validation.min;
      fieldConfig.validation.max = field.validation.max;
    }

    // Clean up empty validation object
    if (Object.keys(fieldConfig.validation).length === 0) {
      delete fieldConfig.validation;
    }

    // Add warnings for approximate mappings
    if (field.type === 'MULTIPLE_CHOICE_GRID' || field.type === 'CHECKBOX_GRID') {
      warnings.push(`Field "${field.title}": Grid questions are converted to text fields (grid format not fully supported)`);
      unmappedCount++;
    } else if (field.type === 'FILE_UPLOAD') {
      warnings.push(`Field "${field.title}": File upload fields may require additional configuration`);
    } else if (field.type === 'TIME') {
      warnings.push(`Field "${field.title}": Time field converted to text input`);
    } else if (field.type === 'UNKNOWN') {
      warnings.push(`Field "${field.title}": Unknown field type, converted to text input`);
      unmappedCount++;
    }

    fields.push(fieldConfig);
  }

  return {
    success: fields.length > 0,
    fields,
    warnings,
    statistics: {
      totalFields: form.fields.length,
      mappedFields: form.fields.length - unmappedCount,
      unmappedFields: unmappedCount,
    },
  };
}
