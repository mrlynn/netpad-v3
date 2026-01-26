/**
 * Google Forms Add-on Import API
 *
 * This endpoint receives form definitions and responses from the
 * Google Forms Editor Add-on for NetPad.
 *
 * @see /packages/google-forms-addon
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getDb } from '@/lib/platform/db';
import { ObjectId } from 'mongodb';
import { FieldConfig } from '@/types/form';
import {
  GoogleFormsMappingWarning,
  GoogleFormsUnsupportedItem,
  MappingConfidence,
} from '@/types/googleFormsImport';

// ============================================
// Types for Add-on Import
// ============================================

/**
 * Form item from Google Apps Script
 */
interface AddonFormItem {
  id: string;
  title: string;
  helpText?: string;
  type: string;
  index: number;
  required?: boolean;
  // Choice fields
  choices?: Array<{
    value: string;
    isCorrectAnswer?: boolean;
    gotoPageId?: string | null;
    gotoPageAction?: string | null;
  }>;
  hasOtherOption?: boolean;
  showOtherOption?: boolean;
  // Scale fields
  lowerBound?: number;
  upperBound?: number;
  leftLabel?: string;
  rightLabel?: string;
  // Grid fields
  rows?: string[];
  columns?: string[];
  // Date fields
  includesYear?: boolean;
  // Validation
  validation?: {
    hasValidation?: boolean;
  };
  // Page break
  pageNavigationType?: string;
  gotoPageId?: string | null;
}

/**
 * Form definition from Google Apps Script
 */
interface AddonFormDefinition {
  sourceId: string;
  sourcePlatform: 'google_forms';
  title: string;
  description?: string;
  confirmationMessage?: string;
  isQuiz?: boolean;
  collectEmail?: boolean;
  allowResponseEdits?: boolean;
  limitOneResponse?: boolean;
  shuffleQuestions?: boolean;
  items: AddonFormItem[];
  metadata: {
    editUrl?: string;
    publishedUrl?: string;
    summaryUrl?: string;
    responseCount?: number;
    exportedAt: string;
    exportedBy?: string;
  };
}

/**
 * Form responses from Google Apps Script
 */
interface AddonFormResponses {
  formId: string;
  formTitle: string;
  totalResponses: number;
  exportedCount: number;
  offset: number;
  fields: Record<string, { title: string; type: string }>;
  responses: Array<{
    responseId: string;
    timestamp: string;
    respondentEmail?: string;
    data: Record<string, { fieldTitle: string; response: unknown }>;
  }>;
}

/**
 * Import request body
 */
interface AddonImportRequest {
  organizationId: string;
  projectId?: string;
  formId?: string; // For response imports
  formDefinition?: AddonFormDefinition;
  formResponses?: AddonFormResponses;
  importType: 'definition' | 'responses';
  options?: {
    createNewForm?: boolean;
    formName?: string;
  };
}

// ============================================
// Type Mapping Configuration
// ============================================

const APPS_SCRIPT_TYPE_MAP: Record<string, { netpadType: FieldConfig['type']; confidence: MappingConfidence }> = {
  TEXT: { netpadType: 'text', confidence: 'exact' },
  PARAGRAPH_TEXT: { netpadType: 'long_text', confidence: 'exact' },
  MULTIPLE_CHOICE: { netpadType: 'radio', confidence: 'exact' },
  CHECKBOX: { netpadType: 'checkbox_group', confidence: 'exact' },
  LIST: { netpadType: 'select', confidence: 'exact' },
  SCALE: { netpadType: 'rating', confidence: 'exact' },
  GRID: { netpadType: 'matrix', confidence: 'approximate' },
  CHECKBOX_GRID: { netpadType: 'matrix', confidence: 'approximate' },
  DATE: { netpadType: 'date', confidence: 'exact' },
  DATETIME: { netpadType: 'datetime', confidence: 'exact' },
  TIME: { netpadType: 'time', confidence: 'exact' },
  DURATION: { netpadType: 'text', confidence: 'approximate' },
  FILE_UPLOAD: { netpadType: 'file', confidence: 'exact' },
  PAGE_BREAK: { netpadType: 'text', confidence: 'approximate' }, // Handled separately
  SECTION_HEADER: { netpadType: 'text', confidence: 'approximate' }, // Handled separately
  IMAGE: { netpadType: 'text', confidence: 'approximate' },
  VIDEO: { netpadType: 'text', confidence: 'approximate' },
};

// ============================================
// API Key Authentication
// ============================================

async function authenticateApiKey(request: NextRequest): Promise<{
  valid: boolean;
  userId?: string;
  organizationId?: string;
  error?: string;
}> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing or invalid Authorization header' };
  }

  const apiKey = authHeader.substring(7); // Remove 'Bearer '

  if (!apiKey) {
    return { valid: false, error: 'API key is required' };
  }

  // Look up the API key
  const db = await getDb();
  const apiKeyDoc = await db.collection('apiKeys').findOne({
    key: apiKey,
    isActive: true,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } },
    ],
  });

  if (!apiKeyDoc) {
    return { valid: false, error: 'Invalid or expired API key' };
  }

  // Update last used timestamp
  await db.collection('apiKeys').updateOne(
    { _id: apiKeyDoc._id },
    { $set: { lastUsedAt: new Date() } }
  );

  return {
    valid: true,
    userId: apiKeyDoc.userId?.toString(),
    organizationId: apiKeyDoc.organizationId?.toString(),
  };
}

// ============================================
// Field Mapping
// ============================================

function mapAddonItemToField(
  item: AddonFormItem,
  usedPaths: Set<string>,
  warnings: GoogleFormsMappingWarning[],
  unsupportedItems: GoogleFormsUnsupportedItem[]
): FieldConfig | null {
  // Skip non-question items
  if (['PAGE_BREAK', 'SECTION_HEADER', 'IMAGE', 'VIDEO'].includes(item.type)) {
    if (item.type === 'IMAGE' || item.type === 'VIDEO') {
      unsupportedItems.push({
        itemId: item.id,
        itemTitle: item.title,
        googleType: item.type,
        reason: `${item.type} items cannot be imported as form fields`,
      });
    }
    return null;
  }

  const typeMapping = APPS_SCRIPT_TYPE_MAP[item.type];
  if (!typeMapping) {
    unsupportedItems.push({
      itemId: item.id,
      itemTitle: item.title,
      googleType: item.type,
      reason: `Unsupported item type: ${item.type}`,
    });
    return null;
  }

  // Generate unique path
  const basePath = generateFieldPath(item.title || 'field');
  let path = basePath;
  let counter = 1;
  while (usedPaths.has(path)) {
    path = `${basePath}_${counter}`;
    counter++;
  }
  usedPaths.add(path);

  // Create base field config
  const field: FieldConfig = {
    path,
    label: item.title || 'Untitled Question',
    type: typeMapping.netpadType,
    required: item.required || false,
    included: true,
  };

  // Add help text as placeholder
  if (item.helpText) {
    field.placeholder = item.helpText;
  }

  // Apply type-specific mappings
  applyTypeSpecificMapping(field, item, warnings);

  return field;
}

function generateFieldPath(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 50) || 'field';
}

function applyTypeSpecificMapping(
  field: FieldConfig,
  item: AddonFormItem,
  warnings: GoogleFormsMappingWarning[]
): void {
  field.validation = field.validation || {};

  switch (item.type) {
    case 'MULTIPLE_CHOICE':
    case 'CHECKBOX':
    case 'LIST':
      if (item.choices && item.choices.length > 0) {
        field.validation.options = item.choices.map((choice) => ({
          label: choice.value,
          value: choice.value.toLowerCase().replace(/\s+/g, '_'),
        }));
      }
      if (item.hasOtherOption) {
        field.validation.allowOther = true;
      }
      // Check for go-to logic
      const hasGoTo = item.choices?.some((c) => c.gotoPageId || c.gotoPageAction);
      if (hasGoTo) {
        warnings.push({
          itemId: item.id,
          itemTitle: item.title,
          warningType: 'go_to_logic_lost',
          message: 'Go-to section logic cannot be imported',
          suggestion: 'Configure conditional logic manually in the form editor',
        });
      }
      break;

    case 'SCALE':
      field.validation.min = item.lowerBound ?? 1;
      field.validation.max = item.upperBound ?? 5;
      if (item.leftLabel) {
        field.validation.lowLabel = item.leftLabel;
      }
      if (item.rightLabel) {
        field.validation.highLabel = item.rightLabel;
      }
      field.validation.ratingStyle = 'numbers';
      break;

    case 'GRID':
    case 'CHECKBOX_GRID':
      if (item.rows && item.columns) {
        field.validation.matrixRows = item.rows.map((row, idx) => ({
          id: `row_${idx}`,
          label: row,
        }));
        field.validation.matrixColumns = item.columns.map((col, idx) => ({
          id: `col_${idx}`,
          label: col,
          value: col,
        }));
        field.validation.matrixCellType = item.type === 'CHECKBOX_GRID' ? 'checkbox' : 'radio';
      }
      warnings.push({
        itemId: item.id,
        itemTitle: item.title,
        warningType: 'type_approximated',
        message: 'Grid question mapped to matrix field - verify layout',
        suggestion: 'Review the matrix field configuration in the form editor',
      });
      break;

    case 'DATE':
    case 'DATETIME':
      // Date handling is straightforward
      break;

    case 'DURATION':
      warnings.push({
        itemId: item.id,
        itemTitle: item.title,
        warningType: 'type_approximated',
        message: 'Duration field converted to text input',
        suggestion: 'Consider using a custom time duration field',
      });
      break;

    case 'FILE_UPLOAD':
      // File upload configuration is limited in Apps Script API
      break;
  }

  // Clean up empty validation object
  if (Object.keys(field.validation).length === 0) {
    delete field.validation;
  }
}

// ============================================
// Form Creation
// ============================================

async function createFormFromDefinition(
  db: ReturnType<typeof getDb> extends Promise<infer T> ? T : never,
  organizationId: string,
  projectId: string,
  userId: string,
  formDef: AddonFormDefinition,
  options?: { formName?: string }
): Promise<{
  formId: string;
  formUrl: string;
  statistics: {
    totalItems: number;
    mappedFields: number;
    exactMappings: number;
    approximateMappings: number;
    unsupportedCount: number;
  };
  warnings: GoogleFormsMappingWarning[];
}> {
  const usedPaths = new Set<string>();
  const warnings: GoogleFormsMappingWarning[] = [];
  const unsupportedItems: GoogleFormsUnsupportedItem[] = [];
  const fields: FieldConfig[] = [];

  let exactMappings = 0;
  let approximateMappings = 0;

  // Map all items to fields
  for (const item of formDef.items) {
    const field = mapAddonItemToField(item, usedPaths, warnings, unsupportedItems);
    if (field) {
      fields.push(field);
      const typeMapping = APPS_SCRIPT_TYPE_MAP[item.type];
      if (typeMapping?.confidence === 'exact') {
        exactMappings++;
      } else {
        approximateMappings++;
      }
    }
  }

  // Generate form slug
  const formName = options?.formName || formDef.title || 'Imported Form';
  const baseSlug = formName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);

  // Ensure unique slug
  let slug = baseSlug;
  let slugCounter = 1;
  while (await db.collection('forms').findOne({ slug, organizationId: new ObjectId(organizationId) })) {
    slug = `${baseSlug}-${slugCounter}`;
    slugCounter++;
  }

  // Create the form document
  const formDoc = {
    name: formName,
    slug,
    description: formDef.description || '',
    organizationId: new ObjectId(organizationId),
    projectId: new ObjectId(projectId),
    createdBy: new ObjectId(userId),
    updatedBy: new ObjectId(userId),
    fields,
    settings: {
      isQuiz: formDef.isQuiz || false,
      collectEmail: formDef.collectEmail || false,
      allowResponseEdits: formDef.allowResponseEdits || false,
      limitOneResponse: formDef.limitOneResponse || false,
    },
    importMetadata: {
      source: 'google_forms_addon',
      sourceFormId: formDef.sourceId,
      sourceFormUrl: formDef.metadata.publishedUrl,
      sourceFormTitle: formDef.title,
      importedAt: new Date(),
      importedBy: userId,
      mappingReport: {
        totalSourceItems: formDef.items.length,
        successfulMappings: fields.length,
        warnings,
        unsupportedItems,
      },
    },
    status: 'draft',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection('forms').insertOne(formDoc);
  const formId = result.insertedId.toString();

  // Build form URL
  const formUrl = `/orgs/${organizationId}/projects/${projectId}/forms/${formId}`;

  return {
    formId,
    formUrl,
    statistics: {
      totalItems: formDef.items.length,
      mappedFields: fields.length,
      exactMappings,
      approximateMappings,
      unsupportedCount: unsupportedItems.length,
    },
    warnings,
  };
}

// ============================================
// Response Import
// ============================================

async function importResponses(
  db: ReturnType<typeof getDb> extends Promise<infer T> ? T : never,
  organizationId: string,
  formId: string,
  responses: AddonFormResponses
): Promise<{
  importedCount: number;
  submissionsUrl: string;
}> {
  // Get the form to verify it exists
  const form = await db.collection('forms').findOne({
    _id: new ObjectId(formId),
    organizationId: new ObjectId(organizationId),
  });

  if (!form) {
    throw new Error('Form not found');
  }

  // Build field mapping (Google field ID -> NetPad field path)
  const fieldMap = new Map<string, string>();
  const formFields = form.fields as FieldConfig[];

  // Try to match by title
  for (const [googleFieldId, googleField] of Object.entries(responses.fields)) {
    const matchingField = formFields.find(
      (f) => f.label.toLowerCase() === googleField.title.toLowerCase()
    );
    if (matchingField) {
      fieldMap.set(googleFieldId, matchingField.path);
    }
  }

  // Create submissions
  const submissions = responses.responses.map((response) => {
    const data: Record<string, unknown> = {};

    for (const [googleFieldId, responseData] of Object.entries(response.data)) {
      const netpadPath = fieldMap.get(googleFieldId);
      if (netpadPath) {
        data[netpadPath] = responseData.response;
      }
    }

    return {
      formId: new ObjectId(formId),
      organizationId: new ObjectId(organizationId),
      data,
      metadata: {
        importedFrom: 'google_forms_addon',
        originalResponseId: response.responseId,
        originalTimestamp: new Date(response.timestamp),
        respondentEmail: response.respondentEmail,
      },
      status: 'completed',
      createdAt: new Date(response.timestamp),
      updatedAt: new Date(),
    };
  });

  if (submissions.length > 0) {
    await db.collection('submissions').insertMany(submissions);
  }

  const submissionsUrl = `/orgs/${organizationId}/forms/${formId}/submissions`;

  return {
    importedCount: submissions.length,
    submissionsUrl,
  };
}

// ============================================
// API Handler
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Authenticate via API key
    const auth = await authenticateApiKey(request);

    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    // Parse request body
    const body: AddonImportRequest = await request.json();

    // Validate organization access
    if (body.organizationId !== auth.organizationId) {
      // Check if user has access to the organization
      const db = await getDb();
      const membership = await db.collection('organizationMembers').findOne({
        organizationId: new ObjectId(body.organizationId),
        userId: new ObjectId(auth.userId),
      });

      if (!membership) {
        return NextResponse.json(
          { error: 'Access denied to this organization' },
          { status: 403 }
        );
      }
    }

    const db = await getDb();

    // Handle form definition import
    if (body.importType === 'definition' && body.formDefinition) {
      if (!body.projectId) {
        return NextResponse.json(
          { error: 'projectId is required for form definition import' },
          { status: 400 }
        );
      }

      const result = await createFormFromDefinition(
        db,
        body.organizationId,
        body.projectId,
        auth.userId!,
        body.formDefinition,
        body.options
      );

      return NextResponse.json({
        success: true,
        formId: result.formId,
        formUrl: result.formUrl,
        statistics: result.statistics,
        warnings: result.warnings,
      });
    }

    // Handle responses import
    if (body.importType === 'responses' && body.formResponses) {
      if (!body.formId) {
        return NextResponse.json(
          { error: 'formId is required for response import' },
          { status: 400 }
        );
      }

      const result = await importResponses(
        db,
        body.organizationId,
        body.formId,
        body.formResponses
      );

      return NextResponse.json({
        success: true,
        importedCount: result.importedCount,
        submissionsUrl: result.submissionsUrl,
      });
    }

    return NextResponse.json(
      { error: 'Invalid import request. Provide either formDefinition or formResponses.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Google Forms Addon Import] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// Validation Endpoint
// ============================================

export async function OPTIONS(request: NextRequest) {
  // CORS preflight
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  });
}
