/**
 * Google Forms to NetPad Field Mapper
 *
 * Converts Google Forms items to NetPad FieldConfig objects.
 * Handles all Google Forms question types and preserves validation rules.
 */

import {
  GoogleForm,
  GoogleFormItem,
  GoogleFormQuestion,
  GoogleFormChoiceQuestion,
  GoogleFormScaleQuestion,
  GoogleFormGridQuestion,
  GoogleFormTextValidation,
  GoogleFormsMappingResult,
  GoogleFormsMappingWarning,
  GoogleFormsUnsupportedItem,
  ImportedFieldConfig,
  MappingConfidence,
  GOOGLE_FORMS_TYPE_MAPPINGS,
} from '@/types/googleFormsImport';
import { FieldConfig } from '@/types/form';

// ============================================
// Types
// ============================================

interface MappingContext {
  form: GoogleForm;
  warnings: GoogleFormsMappingWarning[];
  unsupportedItems: GoogleFormsUnsupportedItem[];
  statistics: {
    totalItems: number;
    mappedFields: number;
    exactMappings: number;
    approximateMappings: number;
    unsupportedCount: number;
    pageCount: number;
  };
  currentPageId: string | null;
  pages: Map<string, {
    id: string;
    title: string;
    description?: string;
    fieldPaths: string[];
  }>;
  fieldPathCounter: Map<string, number>;
}

// ============================================
// Main Mapper Function
// ============================================

/**
 * Map a Google Form to NetPad field configurations
 */
export function mapGoogleFormToNetPad(form: GoogleForm): GoogleFormsMappingResult {
  const context: MappingContext = {
    form,
    warnings: [],
    unsupportedItems: [],
    statistics: {
      totalItems: form.items?.length || 0,
      mappedFields: 0,
      exactMappings: 0,
      approximateMappings: 0,
      unsupportedCount: 0,
      pageCount: 1,
    },
    currentPageId: 'page_1',
    pages: new Map([
      ['page_1', {
        id: 'page_1',
        title: 'Page 1',
        description: undefined,
        fieldPaths: [],
      }],
    ]),
    fieldPathCounter: new Map(),
  };

  const fields: ImportedFieldConfig[] = [];

  if (form.items) {
    for (const item of form.items) {
      const mappedFields = mapFormItem(item, context);
      fields.push(...mappedFields);
    }
  }

  // Convert pages map to array
  const pagesArray = Array.from(context.pages.values()).filter(
    (page) => page.fieldPaths.length > 0 || page.id === 'page_1'
  );

  return {
    success: fields.length > 0 || context.statistics.unsupportedCount < context.statistics.totalItems,
    fields,
    pages: pagesArray.length > 1 ? pagesArray : undefined,
    warnings: context.warnings,
    unsupportedItems: context.unsupportedItems,
    statistics: context.statistics,
  };
}

// ============================================
// Item Mapping
// ============================================

/**
 * Map a single Google Form item to NetPad field(s)
 */
function mapFormItem(item: GoogleFormItem, context: MappingContext): ImportedFieldConfig[] {
  const fields: ImportedFieldConfig[] = [];

  // Handle page breaks
  if (item.pageBreakItem !== undefined) {
    handlePageBreak(item, context);
    return fields;
  }

  // Handle text items (section headers, descriptions)
  if (item.textItem) {
    // Text items don't map to form fields in NetPad
    // They could be converted to layout fields in the future
    return fields;
  }

  // Handle images (not supported)
  if (item.imageItem) {
    context.unsupportedItems.push({
      itemId: item.itemId,
      itemTitle: item.title,
      googleType: 'IMAGE',
      reason: 'Image items cannot be imported as form fields',
    });
    context.statistics.unsupportedCount++;
    return fields;
  }

  // Handle videos (not supported)
  if (item.videoItem) {
    context.unsupportedItems.push({
      itemId: item.itemId,
      itemTitle: item.title,
      googleType: 'VIDEO',
      reason: 'Video items cannot be imported as form fields',
    });
    context.statistics.unsupportedCount++;
    return fields;
  }

  // Handle question items
  if (item.questionItem) {
    const field = mapQuestionItem(item, item.questionItem.question, context);
    if (field) {
      fields.push(field);

      // Add to current page
      const currentPage = context.pages.get(context.currentPageId!);
      if (currentPage) {
        currentPage.fieldPaths.push(field.path);
      }
    }
    return fields;
  }

  // Handle question group items (grids)
  if (item.questionGroupItem) {
    const gridFields = mapQuestionGroupItem(item, context);
    fields.push(...gridFields);

    // Add to current page
    const currentPage = context.pages.get(context.currentPageId!);
    if (currentPage) {
      gridFields.forEach((f) => currentPage.fieldPaths.push(f.path));
    }
    return fields;
  }

  return fields;
}

/**
 * Handle page break item
 */
function handlePageBreak(item: GoogleFormItem, context: MappingContext): void {
  context.statistics.pageCount++;
  const pageId = `page_${context.statistics.pageCount}`;
  context.currentPageId = pageId;

  context.pages.set(pageId, {
    id: pageId,
    title: item.title || `Page ${context.statistics.pageCount}`,
    description: item.description,
    fieldPaths: [],
  });
}

/**
 * Map a question item to a NetPad field
 */
function mapQuestionItem(
  item: GoogleFormItem,
  question: GoogleFormQuestion,
  context: MappingContext
): ImportedFieldConfig | null {
  // Determine the Google Forms question type
  const questionType = getQuestionType(question);

  if (!questionType) {
    context.unsupportedItems.push({
      itemId: item.itemId,
      itemTitle: item.title,
      googleType: 'UNKNOWN',
      reason: 'Unable to determine question type',
    });
    context.statistics.unsupportedCount++;
    return null;
  }

  // Get the mapping configuration
  const mapping = GOOGLE_FORMS_TYPE_MAPPINGS[questionType];
  if (!mapping) {
    context.unsupportedItems.push({
      itemId: item.itemId,
      itemTitle: item.title,
      googleType: questionType,
      reason: `Unsupported question type: ${questionType}`,
    });
    context.statistics.unsupportedCount++;
    return null;
  }

  // Generate field path
  const fieldPath = generateFieldPath(item.title || 'field', context);

  // Create base field config
  const field: ImportedFieldConfig = {
    path: fieldPath,
    label: item.title || 'Untitled Question',
    type: mapping.netpadType,
    included: true,
    required: question.required,
    placeholder: undefined,
    _importSource: {
      platform: 'google_forms',
      originalId: item.itemId,
      originalType: questionType,
      originalTitle: item.title,
      mappingConfidence: mapping.confidence,
    },
  };

  // Add description as help text if present
  if (item.description) {
    field.validation = {
      ...field.validation,
    };
    // Note: NetPad doesn't have a direct helpText field in validation
    // This would need to be handled at the UI level
  }

  // Apply type-specific mappings
  applyQuestionTypeMapping(field, question, questionType, context, item);

  // Update statistics
  context.statistics.mappedFields++;
  if (mapping.confidence === 'exact') {
    context.statistics.exactMappings++;
  } else {
    context.statistics.approximateMappings++;
  }

  return field;
}

/**
 * Map a question group item (grid) to NetPad field(s)
 */
function mapQuestionGroupItem(
  item: GoogleFormItem,
  context: MappingContext
): ImportedFieldConfig[] {
  const fields: ImportedFieldConfig[] = [];
  const groupItem = item.questionGroupItem!;

  if (groupItem.grid) {
    // This is a grid question (matrix)
    const field = mapGridQuestion(item, groupItem.grid, context);
    if (field) {
      fields.push(field);
    }
  } else if (groupItem.questions) {
    // This is a group of related questions
    for (const question of groupItem.questions) {
      const field = mapQuestionItem(
        {
          ...item,
          itemId: question.questionId,
        },
        question,
        context
      );
      if (field) {
        fields.push(field);
      }
    }
  }

  return fields;
}

/**
 * Map a grid question to a matrix field
 */
function mapGridQuestion(
  item: GoogleFormItem,
  grid: GoogleFormGridQuestion,
  context: MappingContext
): ImportedFieldConfig | null {
  const fieldPath = generateFieldPath(item.title || 'matrix', context);

  // Determine if this is a radio or checkbox grid
  const isCheckbox = item.questionGroupItem?.questions?.some(
    (q) => q.choiceQuestion?.type === 'CHECKBOX'
  );

  const field: ImportedFieldConfig = {
    path: fieldPath,
    label: item.title || 'Untitled Grid',
    type: 'matrix',
    included: true,
    required: false, // Grid required status is per-row
    validation: {
      matrixRows: grid.rows.map((row) => ({
        id: row.rowId,
        label: row.title,
      })),
      matrixColumns: grid.columns.map((col, idx) => ({
        id: `col_${idx}`,
        label: col.value,
        value: col.value,
      })),
      matrixCellType: isCheckbox ? 'checkbox' : 'radio',
    },
    _importSource: {
      platform: 'google_forms',
      originalId: item.itemId,
      originalType: isCheckbox ? 'CHECKBOX_GRID' : 'MULTIPLE_CHOICE_GRID',
      originalTitle: item.title,
      mappingConfidence: 'approximate',
    },
  };

  context.statistics.mappedFields++;
  context.statistics.approximateMappings++;

  context.warnings.push({
    itemId: item.itemId,
    itemTitle: item.title,
    warningType: 'type_approximated',
    message: 'Grid question mapped to matrix field - verify layout',
    suggestion: 'Review the matrix field configuration in the form editor',
  });

  return field;
}

// ============================================
// Type-Specific Mapping
// ============================================

/**
 * Get the Google Forms question type from a question object
 */
function getQuestionType(question: GoogleFormQuestion): keyof typeof GOOGLE_FORMS_TYPE_MAPPINGS | null {
  if (question.textQuestion) {
    return question.textQuestion.paragraph ? 'PARAGRAPH_TEXT' : 'SHORT_ANSWER';
  }
  if (question.choiceQuestion) {
    switch (question.choiceQuestion.type) {
      case 'RADIO':
        return 'MULTIPLE_CHOICE';
      case 'CHECKBOX':
        return 'CHECKBOXES';
      case 'DROP_DOWN':
        return 'DROPDOWN';
    }
  }
  if (question.scaleQuestion) {
    return 'LINEAR_SCALE';
  }
  if (question.dateQuestion) {
    return 'DATE';
  }
  if (question.timeQuestion) {
    return 'TIME';
  }
  if (question.fileUploadQuestion) {
    return 'FILE_UPLOAD';
  }
  return null;
}

/**
 * Apply type-specific mapping rules to a field
 */
function applyQuestionTypeMapping(
  field: ImportedFieldConfig,
  question: GoogleFormQuestion,
  questionType: string,
  context: MappingContext,
  item: GoogleFormItem
): void {
  // Apply text validation
  if (question.textValidation) {
    applyTextValidation(field, question.textValidation, context, item);
  }

  // Apply type-specific mappings
  switch (questionType) {
    case 'SHORT_ANSWER':
    case 'PARAGRAPH_TEXT':
      // Already handled by text validation
      break;

    case 'MULTIPLE_CHOICE':
    case 'CHECKBOXES':
    case 'DROPDOWN':
      applyChoiceMapping(field, question.choiceQuestion!, context, item);
      break;

    case 'LINEAR_SCALE':
      applyScaleMapping(field, question.scaleQuestion!);
      break;

    case 'DATE':
      applyDateMapping(field, question.dateQuestion);
      break;

    case 'TIME':
      applyTimeMapping(field, question.timeQuestion);
      break;

    case 'FILE_UPLOAD':
      applyFileUploadMapping(field, question.fileUploadQuestion);
      break;
  }
}

/**
 * Apply text validation rules
 */
function applyTextValidation(
  field: ImportedFieldConfig,
  validation: GoogleFormTextValidation,
  context: MappingContext,
  item: GoogleFormItem
): void {
  field.validation = field.validation || {};

  switch (validation.type) {
    case 'NUMBER':
      field.type = 'number';
      break;

    case 'TEXT_EMAIL':
      field.type = 'email';
      break;

    case 'TEXT_URL':
      field.type = 'url';
      break;

    case 'LENGTH_MINIMUM':
      if (validation.number !== undefined) {
        field.validation.minLength = validation.number;
      }
      break;

    case 'LENGTH_MAXIMUM':
      if (validation.number !== undefined) {
        field.validation.maxLength = validation.number;
      }
      break;

    case 'REGEX':
      if (validation.text) {
        field.validation.pattern = validation.text;
      }
      break;

    case 'TEXT_CONTAINS':
    case 'TEXT_NOT_CONTAINS':
      // These don't have direct equivalents - add warning
      context.warnings.push({
        itemId: item.itemId,
        itemTitle: item.title,
        warningType: 'validation_lost',
        message: `"${validation.type}" validation cannot be directly translated`,
        suggestion: 'Add custom validation pattern in the form editor',
      });
      break;
  }
}

/**
 * Apply choice question mapping (radio, checkbox, dropdown)
 */
function applyChoiceMapping(
  field: ImportedFieldConfig,
  choiceQuestion: GoogleFormChoiceQuestion,
  context: MappingContext,
  item: GoogleFormItem
): void {
  field.validation = field.validation || {};

  // Map options
  const options = choiceQuestion.options.map((opt) => {
    if (opt.isOther) {
      return { label: 'Other', value: '__other__' };
    }
    return { label: opt.value, value: opt.value };
  });

  field.validation.options = options;

  // Handle "Other" option
  const hasOther = choiceQuestion.options.some((opt) => opt.isOther);
  if (hasOther) {
    field.validation.allowOther = true;
    field.validation.otherLabel = 'Other';
  }

  // Handle shuffle option
  if (choiceQuestion.shuffle) {
    field.validation.randomizeOptions = true;
  }

  // Handle go-to logic (not supported - add warning)
  const hasGoToLogic = choiceQuestion.options.some(
    (opt) => opt.goToAction || opt.goToSectionId
  );
  if (hasGoToLogic) {
    context.warnings.push({
      itemId: item.itemId,
      itemTitle: item.title,
      warningType: 'go_to_logic_lost',
      message: 'Go-to section logic cannot be imported',
      suggestion: 'Configure conditional logic manually in the form editor',
    });
  }
}

/**
 * Apply scale/rating question mapping
 */
function applyScaleMapping(field: ImportedFieldConfig, scaleQuestion: GoogleFormScaleQuestion): void {
  field.validation = field.validation || {};

  field.validation.min = scaleQuestion.low;
  field.validation.max = scaleQuestion.high;

  if (scaleQuestion.lowLabel) {
    field.validation.lowLabel = scaleQuestion.lowLabel;
  }
  if (scaleQuestion.highLabel) {
    field.validation.highLabel = scaleQuestion.highLabel;
  }

  // Default to number display for scales
  field.validation.ratingStyle = 'numbers';
  field.validation.scaleDisplayStyle = 'buttons';
}

/**
 * Apply date question mapping
 */
function applyDateMapping(
  field: ImportedFieldConfig,
  dateQuestion?: { includeTime?: boolean; includeYear?: boolean }
): void {
  if (dateQuestion?.includeTime) {
    field.type = 'datetime';
  }
  // includeYear is typically true by default, no special handling needed
}

/**
 * Apply time question mapping
 */
function applyTimeMapping(
  field: ImportedFieldConfig,
  timeQuestion?: { duration?: boolean }
): void {
  if (timeQuestion?.duration) {
    // Duration fields might need special handling
    field.validation = field.validation || {};
    // For now, treat as regular time
  }
}

/**
 * Apply file upload question mapping
 */
function applyFileUploadMapping(
  field: ImportedFieldConfig,
  fileQuestion?: {
    maxFiles?: number;
    maxFileSize?: string;
    types?: string[];
  }
): void {
  field.validation = field.validation || {};

  if (fileQuestion?.maxFiles) {
    field.validation.maxFiles = fileQuestion.maxFiles;
    if (fileQuestion.maxFiles > 1) {
      field.validation.multiple = true;
    }
  }

  if (fileQuestion?.maxFileSize) {
    // Convert from string like "10MB" to number in MB
    const match = fileQuestion.maxFileSize.match(/^(\d+)([A-Z]+)$/i);
    if (match) {
      const value = parseInt(match[1], 10);
      const unit = match[2].toUpperCase();
      if (unit === 'MB') {
        field.validation.maxSize = value;
      } else if (unit === 'GB') {
        field.validation.maxSize = value * 1024;
      }
    }
  }

  if (fileQuestion?.types && fileQuestion.types.length > 0) {
    // Map Google's file types to MIME types
    const mimeTypes = mapGoogleFileTypesToMime(fileQuestion.types);
    if (mimeTypes.length > 0) {
      field.validation.allowedTypes = mimeTypes;
    }
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a unique field path from a label
 */
function generateFieldPath(label: string, context: MappingContext): string {
  // Convert to snake_case
  let basePath = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 50);

  if (!basePath) {
    basePath = 'field';
  }

  // Ensure uniqueness
  const count = context.fieldPathCounter.get(basePath) || 0;
  context.fieldPathCounter.set(basePath, count + 1);

  if (count > 0) {
    return `${basePath}_${count + 1}`;
  }

  return basePath;
}

/**
 * Map Google file types to MIME types
 */
function mapGoogleFileTypesToMime(googleTypes: string[]): string[] {
  const typeMap: Record<string, string[]> = {
    DOCUMENT: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    SPREADSHEET: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    PRESENTATION: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    PDF: ['application/pdf'],
    IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    VIDEO: ['video/mp4', 'video/quicktime', 'video/webm'],
    AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  };

  const mimeTypes: string[] = [];
  for (const type of googleTypes) {
    const mapped = typeMap[type.toUpperCase()];
    if (mapped) {
      mimeTypes.push(...mapped);
    }
  }

  return [...new Set(mimeTypes)];
}

// ============================================
// Export Helper Functions
// ============================================

/**
 * Get a summary of the mapping result
 */
export function getMappingSummary(result: GoogleFormsMappingResult): string {
  const { statistics, warnings, unsupportedItems } = result;

  const lines: string[] = [
    `Mapped ${statistics.mappedFields} of ${statistics.totalItems} items`,
    `- Exact mappings: ${statistics.exactMappings}`,
    `- Approximate mappings: ${statistics.approximateMappings}`,
    `- Unsupported: ${statistics.unsupportedCount}`,
  ];

  if (statistics.pageCount > 1) {
    lines.push(`- Pages: ${statistics.pageCount}`);
  }

  if (warnings.length > 0) {
    lines.push(`\nWarnings (${warnings.length}):`);
    for (const warning of warnings.slice(0, 5)) {
      lines.push(`  - ${warning.message}`);
    }
    if (warnings.length > 5) {
      lines.push(`  ... and ${warnings.length - 5} more`);
    }
  }

  if (unsupportedItems.length > 0) {
    lines.push(`\nUnsupported items (${unsupportedItems.length}):`);
    for (const item of unsupportedItems.slice(0, 5)) {
      lines.push(`  - ${item.itemTitle || item.itemId}: ${item.reason}`);
    }
    if (unsupportedItems.length > 5) {
      lines.push(`  ... and ${unsupportedItems.length - 5} more`);
    }
  }

  return lines.join('\n');
}
