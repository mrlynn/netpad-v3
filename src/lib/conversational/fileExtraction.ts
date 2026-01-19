/**
 * File Extraction for Conversational Forms
 *
 * Extracts structured data from uploaded files (images and documents)
 * using AI vision and text extraction.
 */

import { ExtractionSchema } from '@/types/conversational';
import { IMAGE_MIME_TYPES, DOCUMENT_MIME_TYPES } from '@/lib/storage/blob';
import { extractTextFromDocument, isSupportedMimeType } from '@/lib/rag/chunking';

/**
 * File input for extraction
 */
export interface FileInput {
  id: string;
  url: string;
  downloadUrl: string;
  originalName: string;
  mimeType: string;
  size: number;
}

/**
 * Result of file extraction
 */
export interface FileExtractionResult {
  /** Extracted field values */
  extractedData: Record<string, any>;
  /** Overall confidence score (0-1) */
  confidence: number;
  /** Description of what was found/extracted */
  description: string;
}

/**
 * Options for image analysis
 */
export interface ImageAnalysisOptions {
  prompt: string;
  maxTokens?: number;
}

/**
 * Result of image analysis
 */
export interface ImageAnalysisResult {
  data: Record<string, any>;
  confidence: number;
  description: string;
}

/**
 * Interface for providers that support image analysis
 */
export interface VisionCapableProvider {
  analyzeImage(imageUrl: string, options: ImageAnalysisOptions): Promise<ImageAnalysisResult>;
}

/**
 * Check if a MIME type is an image
 */
export function isImageFile(mimeType: string): boolean {
  return IMAGE_MIME_TYPES.includes(mimeType);
}

/**
 * Check if a MIME type is a document
 */
export function isDocumentFile(mimeType: string): boolean {
  return DOCUMENT_MIME_TYPES.includes(mimeType);
}

/**
 * Check if a provider supports vision/image analysis
 */
export function isVisionCapable(provider: any): provider is VisionCapableProvider {
  return typeof provider.analyzeImage === 'function';
}

/**
 * Build extraction prompt from schema
 */
function buildSchemaPrompt(schema: ExtractionSchema[]): string {
  return schema
    .map((s) => {
      let desc = `- ${s.field}`;
      if (s.required) desc += ' (required)';
      desc += `: ${s.description}`;
      if (s.options) {
        desc += ` [Options: ${s.options.join(', ')}]`;
      }
      return desc;
    })
    .join('\n');
}

/**
 * Extract structured data from a file
 *
 * @param file - The file to extract from
 * @param schema - Schema defining what fields to extract
 * @param provider - AI provider (must support vision for images)
 * @returns Extraction result with data and confidence
 */
export async function extractDataFromFile(
  file: FileInput,
  schema: ExtractionSchema[],
  provider: any
): Promise<FileExtractionResult> {
  if (isImageFile(file.mimeType)) {
    return extractDataFromImage(file, schema, provider);
  } else if (isDocumentFile(file.mimeType)) {
    return extractDataFromDocument(file, schema, provider);
  }

  throw new Error(`Unsupported file type: ${file.mimeType}`);
}

/**
 * Extract data from an image using AI vision
 */
async function extractDataFromImage(
  file: FileInput,
  schema: ExtractionSchema[],
  provider: any
): Promise<FileExtractionResult> {
  // Check if provider supports vision
  if (!isVisionCapable(provider)) {
    return {
      extractedData: {},
      confidence: 0,
      description: 'Image analysis not available - provider does not support vision',
    };
  }

  const schemaDescription = buildSchemaPrompt(schema);

  const prompt = `Analyze this image and extract the following information if present:

${schemaDescription}

Return a JSON object with exactly this structure:
{
  "data": {
    "fieldName": "extracted value or null if not found"
  },
  "confidence": 0.85,
  "description": "Brief description of what you found in the image"
}

Only include fields from the schema above. Set confidence between 0 and 1 based on how clearly the information is visible in the image.`;

  try {
    const result = await provider.analyzeImage(file.url, {
      prompt,
      maxTokens: 1000,
    });

    return {
      extractedData: result.data || {},
      confidence: result.confidence || 0.5,
      description: result.description || `Analyzed image: ${file.originalName}`,
    };
  } catch (error: any) {
    console.error('[FileExtraction] Image analysis failed:', error);
    return {
      extractedData: {},
      confidence: 0,
      description: `Failed to analyze image: ${error.message}`,
    };
  }
}

/**
 * Extract data from a document using text extraction + AI
 */
async function extractDataFromDocument(
  file: FileInput,
  schema: ExtractionSchema[],
  provider: any
): Promise<FileExtractionResult> {
  // Check if this document type is supported for text extraction
  if (!isSupportedMimeType(file.mimeType)) {
    return {
      extractedData: {},
      confidence: 0,
      description: `Unsupported document type: ${file.mimeType}`,
    };
  }

  let text: string;
  try {
    text = await extractTextFromDocument(file.url, file.mimeType);
  } catch (error: any) {
    console.error('[FileExtraction] Text extraction failed:', error);
    return {
      extractedData: {},
      confidence: 0,
      description: `Failed to extract text from document: ${error.message}`,
    };
  }

  if (!text || text.trim().length === 0) {
    return {
      extractedData: {},
      confidence: 0,
      description: 'No text could be extracted from document',
    };
  }

  // Truncate if too long (keep first ~10K chars for context window)
  const maxLength = 10000;
  const truncatedText =
    text.length > maxLength ? text.substring(0, maxLength) + '\n...[truncated]' : text;

  // Use the provider's extractStructuredData if available, otherwise build a prompt
  const schemaDescription = buildSchemaPrompt(schema);

  // Build extraction messages
  const extractionMessages = [
    {
      role: 'system' as const,
      content: `You are a data extraction assistant. Extract structured information from documents accurately.`,
    },
    {
      role: 'user' as const,
      content: `Extract the following fields from this document:

${schemaDescription}

Document content:
---
${truncatedText}
---

Return a JSON object with exactly this structure:
{
  "data": {
    "fieldName": "extracted value or null if not found"
  },
  "confidence": {
    "fieldName": 0.95
  },
  "overallConfidence": 0.90,
  "missingFields": ["fieldName if not found"],
  "warnings": []
}`,
    },
  ];

  try {
    // Use extractStructuredData if available
    if (typeof provider.extractStructuredData === 'function') {
      const result = await provider.extractStructuredData(extractionMessages, schema);
      return {
        extractedData: result.data,
        confidence: result.overallConfidence,
        description: `Extracted from document: ${file.originalName}`,
      };
    }

    // Fallback: not supported
    return {
      extractedData: {},
      confidence: 0,
      description: 'Document extraction not available - provider does not support structured extraction',
    };
  } catch (error: any) {
    console.error('[FileExtraction] Document extraction failed:', error);
    return {
      extractedData: {},
      confidence: 0,
      description: `Failed to extract data from document: ${error.message}`,
    };
  }
}

/**
 * Get a human-readable description of a file for chat context
 */
export function getFileDescription(file: FileInput): string {
  const sizeKB = Math.round(file.size / 1024);
  const sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

  if (isImageFile(file.mimeType)) {
    return `[Image: ${file.originalName} (${sizeStr})]`;
  } else if (isDocumentFile(file.mimeType)) {
    const type = file.mimeType.includes('pdf')
      ? 'PDF'
      : file.mimeType.includes('word')
        ? 'Word Document'
        : file.mimeType.includes('excel') || file.mimeType.includes('spreadsheet')
          ? 'Spreadsheet'
          : 'Document';
    return `[${type}: ${file.originalName} (${sizeStr})]`;
  }

  return `[File: ${file.originalName} (${sizeStr})]`;
}
