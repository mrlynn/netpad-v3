/**
 * Google Forms Import Types
 *
 * Types and interfaces for importing Google Forms into NetPad.
 * Based on the Google Forms API v1 specification.
 */

import { FieldConfig } from './form';

// ============================================
// Google Forms API Types
// ============================================

/**
 * Google Forms question types
 * @see https://developers.google.com/forms/api/reference/rest/v1/forms
 */
export type GoogleFormQuestionType =
  | 'SHORT_ANSWER'
  | 'PARAGRAPH_TEXT'
  | 'MULTIPLE_CHOICE'
  | 'CHECKBOXES'
  | 'DROPDOWN'
  | 'LINEAR_SCALE'
  | 'MULTIPLE_CHOICE_GRID'
  | 'CHECKBOX_GRID'
  | 'DATE'
  | 'TIME'
  | 'FILE_UPLOAD';

/**
 * Google Forms item types (includes non-question items)
 */
export type GoogleFormItemType =
  | GoogleFormQuestionType
  | 'SECTION_HEADER'
  | 'PAGE_BREAK'
  | 'IMAGE'
  | 'VIDEO'
  | 'TEXT';

/**
 * Google Forms text validation types
 */
export type GoogleTextValidationType =
  | 'NUMBER'
  | 'TEXT_CONTAINS'
  | 'TEXT_NOT_CONTAINS'
  | 'TEXT_EMAIL'
  | 'TEXT_URL'
  | 'LENGTH_MINIMUM'
  | 'LENGTH_MAXIMUM'
  | 'REGEX';

/**
 * Choice option in Google Forms
 */
export interface GoogleFormChoice {
  value: string;
  isOther?: boolean;
  goToAction?: 'NEXT_SECTION' | 'RESTART_FORM' | 'SUBMIT_FORM';
  goToSectionId?: string;
  image?: GoogleFormImage;
}

/**
 * Choice question configuration
 */
export interface GoogleFormChoiceQuestion {
  type: 'RADIO' | 'CHECKBOX' | 'DROP_DOWN';
  options: GoogleFormChoice[];
  shuffle?: boolean;
}

/**
 * Text question configuration
 */
export interface GoogleFormTextQuestion {
  paragraph: boolean;
}

/**
 * Scale question configuration
 */
export interface GoogleFormScaleQuestion {
  low: number;
  high: number;
  lowLabel?: string;
  highLabel?: string;
}

/**
 * Date question configuration
 */
export interface GoogleFormDateQuestion {
  includeTime?: boolean;
  includeYear?: boolean;
}

/**
 * Time question configuration
 */
export interface GoogleFormTimeQuestion {
  duration?: boolean;
}

/**
 * File upload question configuration
 */
export interface GoogleFormFileUploadQuestion {
  folderId?: string;
  maxFiles?: number;
  maxFileSize?: string;
  types?: string[];
}

/**
 * Grid question row
 */
export interface GoogleFormGridRow {
  rowId: string;
  title: string;
}

/**
 * Grid question configuration
 */
export interface GoogleFormGridQuestion {
  columns: GoogleFormChoice[];
  rows: GoogleFormGridRow[];
  shuffleRows?: boolean;
}

/**
 * Text validation rule
 */
export interface GoogleFormTextValidation {
  type: GoogleTextValidationType;
  errorText?: string;
  // Type-specific fields
  number?: number;          // For LENGTH_MINIMUM, LENGTH_MAXIMUM
  text?: string;            // For TEXT_CONTAINS, TEXT_NOT_CONTAINS, REGEX
}

/**
 * Google Forms question
 */
export interface GoogleFormQuestion {
  questionId: string;
  required: boolean;
  choiceQuestion?: GoogleFormChoiceQuestion;
  textQuestion?: GoogleFormTextQuestion;
  scaleQuestion?: GoogleFormScaleQuestion;
  dateQuestion?: GoogleFormDateQuestion;
  timeQuestion?: GoogleFormTimeQuestion;
  fileUploadQuestion?: GoogleFormFileUploadQuestion;
  grading?: {
    pointValue: number;
    correctAnswers?: {
      answers: { value: string }[];
    };
  };
  // Validation
  textValidation?: GoogleFormTextValidation;
}

/**
 * Google Forms image
 */
export interface GoogleFormImage {
  contentUri?: string;
  altText?: string;
  sourceUri?: string;
  properties?: {
    alignment?: 'LEFT' | 'CENTER' | 'RIGHT';
    width?: number;
  };
}

/**
 * Google Forms video
 */
export interface GoogleFormVideo {
  youtubeUri?: string;
  properties?: {
    alignment?: 'LEFT' | 'CENTER' | 'RIGHT';
    width?: number;
  };
}

/**
 * Google Forms item (question or other element)
 */
export interface GoogleFormItem {
  itemId: string;
  title?: string;
  description?: string;
  questionItem?: {
    question: GoogleFormQuestion;
    image?: GoogleFormImage;
  };
  questionGroupItem?: {
    questions: GoogleFormQuestion[];
    grid?: GoogleFormGridQuestion;
    image?: GoogleFormImage;
  };
  pageBreakItem?: Record<string, never>;
  textItem?: {
    text?: string;
  };
  imageItem?: {
    image: GoogleFormImage;
  };
  videoItem?: {
    video: GoogleFormVideo;
    caption?: string;
  };
}

/**
 * Google Forms form info
 */
export interface GoogleFormInfo {
  title: string;
  description?: string;
  documentTitle?: string;
}

/**
 * Google Forms settings
 */
export interface GoogleFormSettings {
  quizSettings?: {
    isQuiz: boolean;
  };
}

/**
 * Complete Google Form structure from API
 */
export interface GoogleForm {
  formId: string;
  info: GoogleFormInfo;
  settings?: GoogleFormSettings;
  revisionId?: string;
  responderUri?: string;
  linkedSheetId?: string;
  items?: GoogleFormItem[];
}

/**
 * Google Forms list response (from Drive API)
 */
export interface GoogleFormListItem {
  id: string;
  name: string;
  description?: string;
  createdTime?: string;
  modifiedTime?: string;
  mimeType: string;
  webViewLink?: string;
}

// ============================================
// Mapping Types
// ============================================

/**
 * Mapping confidence level
 */
export type MappingConfidence = 'exact' | 'approximate' | 'manual_review';

/**
 * Import source metadata for tracking provenance
 */
export interface GoogleFormsImportSource {
  platform: 'google_forms';
  originalId: string;
  originalType: GoogleFormItemType;
  originalTitle?: string;
  mappingConfidence: MappingConfidence;
}

/**
 * Extended FieldConfig with import metadata
 */
export interface ImportedFieldConfig extends FieldConfig {
  _importSource?: GoogleFormsImportSource;
}

/**
 * Mapping warning for issues during import
 */
export interface GoogleFormsMappingWarning {
  itemId: string;
  itemTitle?: string;
  warningType:
    | 'validation_lost'
    | 'type_approximated'
    | 'feature_unsupported'
    | 'options_truncated'
    | 'go_to_logic_lost';
  message: string;
  suggestion?: string;
}

/**
 * Unsupported item that couldn't be imported
 */
export interface GoogleFormsUnsupportedItem {
  itemId: string;
  itemTitle?: string;
  googleType: string;
  reason: string;
}

/**
 * Result of mapping a Google Form to NetPad fields
 */
export interface GoogleFormsMappingResult {
  success: boolean;
  fields: ImportedFieldConfig[];
  pages?: {
    id: string;
    title: string;
    description?: string;
    fieldPaths: string[];
  }[];
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
}

// ============================================
// Import Job Types
// ============================================

/**
 * Google Forms import job status
 */
export type GoogleFormsImportStatus =
  | 'pending'
  | 'authenticating'
  | 'fetching'
  | 'mapping'
  | 'previewing'
  | 'importing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Import metadata stored with the form
 */
export interface GoogleFormsImportMetadata {
  source: 'google_forms';
  sourceFormId: string;
  sourceFormUrl: string;
  sourceFormTitle: string;
  importedAt: Date;
  importedBy: string;
  importVersion: string;
  googleFormVersion?: string;
  mappingReport: {
    totalSourceItems: number;
    successfulMappings: number;
    warnings: GoogleFormsMappingWarning[];
    unsupportedItems: GoogleFormsUnsupportedItem[];
  };
  reimportHistory?: Array<{
    reimportedAt: Date;
    changes: string[];
  }>;
}

/**
 * Google Forms import job record
 */
export interface GoogleFormsImportJob {
  importId: string;
  organizationId: string;
  projectId: string;
  applicationId?: string;
  createdBy: string;
  status: GoogleFormsImportStatus;

  // Source info
  credentialId: string;
  sourceFormId: string;
  sourceForm?: GoogleForm;

  // Mapping
  mappingResult?: GoogleFormsMappingResult;

  // Customizations from user
  customizations?: {
    name?: string;
    description?: string;
    fieldOverrides?: Record<string, Partial<FieldConfig>>;
    excludeFields?: string[];
  };

  // Result
  resultFormId?: string;

  // Error
  error?: {
    code: string;
    message: string;
    details?: string;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// ============================================
// API Types
// ============================================

/**
 * Request to initiate Google Forms OAuth
 */
export interface GoogleFormsAuthRequest {
  orgId: string;
  credentialName?: string;
  redirectUrl?: string;
}

/**
 * Response from Google Forms OAuth initiation
 */
export interface GoogleFormsAuthResponse {
  authUrl: string;
  state: string;
}

/**
 * Request to list available Google Forms
 */
export interface GoogleFormsListRequest {
  orgId: string;
  credentialId: string;
  pageSize?: number;
  pageToken?: string;
  searchQuery?: string;
}

/**
 * Response from listing Google Forms
 */
export interface GoogleFormsListResponse {
  forms: GoogleFormListItem[];
  nextPageToken?: string;
  totalCount?: number;
}

/**
 * Request to preview a Google Form import
 */
export interface GoogleFormsPreviewRequest {
  orgId: string;
  credentialId: string;
  formId: string;
}

/**
 * Response from previewing a Google Form import
 */
export interface GoogleFormsPreviewResponse {
  sourceForm: {
    id: string;
    title: string;
    description?: string;
    itemCount: number;
    responderUri?: string;
  };
  mappingResult: GoogleFormsMappingResult;
  previewConfig: {
    name: string;
    description?: string;
    fieldConfigs: ImportedFieldConfig[];
    multiPage?: {
      enabled: boolean;
      pages: {
        id: string;
        title: string;
        description?: string;
        fields: string[];
      }[];
    };
  };
}

/**
 * Request to execute a Google Form import
 */
export interface GoogleFormsExecuteRequest {
  orgId: string;
  credentialId: string;
  formId: string;
  projectId: string;
  applicationId?: string;
  customizations?: {
    name?: string;
    description?: string;
    fieldOverrides?: Record<string, Partial<FieldConfig>>;
    excludeFields?: string[];
  };
}

/**
 * Response from executing a Google Form import
 */
export interface GoogleFormsExecuteResponse {
  success: boolean;
  form?: {
    id: string;
    name: string;
    slug: string;
    fieldCount: number;
  };
  importReport: {
    duration: number;
    mappingStatistics: GoogleFormsMappingResult['statistics'];
    warnings: GoogleFormsMappingWarning[];
    viewUrl: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ============================================
// Field Type Mapping Configuration
// ============================================

/**
 * Mapping rule for converting Google Forms types to NetPad types
 */
export interface GoogleFormsTypeMapping {
  googleType: GoogleFormQuestionType;
  netpadType: string;
  confidence: MappingConfidence;
  validationMapper?: (question: GoogleFormQuestion) => Partial<FieldConfig['validation']>;
  optionsMapper?: (question: GoogleFormQuestion) => FieldConfig['validation'];
  notes?: string;
}

/**
 * Complete mapping configuration
 */
export const GOOGLE_FORMS_TYPE_MAPPINGS: Record<GoogleFormQuestionType, Omit<GoogleFormsTypeMapping, 'googleType'>> = {
  SHORT_ANSWER: {
    netpadType: 'text',
    confidence: 'exact',
  },
  PARAGRAPH_TEXT: {
    netpadType: 'long_text',
    confidence: 'exact',
  },
  MULTIPLE_CHOICE: {
    netpadType: 'radio',
    confidence: 'exact',
  },
  CHECKBOXES: {
    netpadType: 'checkbox_group',
    confidence: 'exact',
  },
  DROPDOWN: {
    netpadType: 'dropdown',
    confidence: 'exact',
  },
  LINEAR_SCALE: {
    netpadType: 'rating',
    confidence: 'exact',
  },
  MULTIPLE_CHOICE_GRID: {
    netpadType: 'matrix',
    confidence: 'approximate',
    notes: 'Grid structure preserved but may need layout adjustment',
  },
  CHECKBOX_GRID: {
    netpadType: 'matrix',
    confidence: 'approximate',
    notes: 'Grid structure preserved with checkbox cell type',
  },
  DATE: {
    netpadType: 'date',
    confidence: 'exact',
  },
  TIME: {
    netpadType: 'time',
    confidence: 'exact',
  },
  FILE_UPLOAD: {
    netpadType: 'file',
    confidence: 'exact',
  },
};

/**
 * Text validation type to NetPad validation mapping
 */
export const GOOGLE_TEXT_VALIDATION_MAPPINGS: Record<GoogleTextValidationType, {
  netpadValidation: Partial<FieldConfig['validation']>;
  netpadType?: string;
}> = {
  NUMBER: {
    netpadValidation: {},
    netpadType: 'number',
  },
  TEXT_CONTAINS: {
    netpadValidation: {},
    // Pattern would need custom implementation
  },
  TEXT_NOT_CONTAINS: {
    netpadValidation: {},
    // Pattern would need custom implementation
  },
  TEXT_EMAIL: {
    netpadValidation: {},
    netpadType: 'email',
  },
  TEXT_URL: {
    netpadValidation: {},
    netpadType: 'url',
  },
  LENGTH_MINIMUM: {
    netpadValidation: {},
    // minLength will be set dynamically
  },
  LENGTH_MAXIMUM: {
    netpadValidation: {},
    // maxLength will be set dynamically
  },
  REGEX: {
    netpadValidation: {},
    // pattern will be set dynamically
  },
};
