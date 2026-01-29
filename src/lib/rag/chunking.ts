/**
 * Document Chunking
 *
 * Text extraction and chunking strategies for different document types
 */

import {
  DocumentChunk,
  ChunkMetadata,
  ChunkingOptions,
  DEFAULT_CHUNKING_OPTIONS,
  SupportedMimeType,
  SUPPORTED_MIME_TYPES,
} from '@/types/rag';

// ============================================
// Text Chunking
// ============================================

/**
 * Chunk text with sentence boundary preservation and overlap
 *
 * Enhanced algorithm that:
 * 1. Splits on paragraph boundaries first (if preserveParagraphs is true)
 * 2. Then splits on sentence boundaries within paragraphs
 * 3. Groups sentences into chunks of target size
 * 4. Maintains overlap between chunks for context continuity
 */
export function chunkText(
  text: string,
  options: Partial<ChunkingOptions> = {}
): DocumentChunk[] {
  const opts: ChunkingOptions = {
    ...DEFAULT_CHUNKING_OPTIONS,
    ...options,
  };

  // Handle empty or very short text
  if (!text || text.trim().length === 0) {
    return [];
  }

  if (text.length <= opts.chunkSize) {
    return [
      {
        text: text.trim(),
        metadata: { chunkIndex: 0, startChar: 0, endChar: text.length },
      },
    ];
  }

  const chunks: DocumentChunk[] = [];

  // Split by paragraphs if preserving paragraph boundaries
  const paragraphs = opts.preserveParagraphs
    ? text.split(/\n\s*\n/).filter((p) => p.trim())
    : [text];

  let currentChunk = '';
  let chunkIndex = 0;
  let chunkStartChar = 0;
  let currentPos = 0;

  for (const paragraph of paragraphs) {
    // Split paragraph into sentences
    const sentences = splitIntoSentences(paragraph);

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      // Calculate what adding this sentence would do
      const potentialChunk = currentChunk
        ? `${currentChunk} ${trimmedSentence}`
        : trimmedSentence;

      // If adding this sentence exceeds chunk size and we have content, finalize chunk
      if (potentialChunk.length > opts.chunkSize && currentChunk.length > 0) {
        // Save current chunk
        chunks.push({
          text: currentChunk.trim(),
          metadata: {
            chunkIndex,
            startChar: chunkStartChar,
            endChar: currentPos,
          },
        });

        // Start new chunk with overlap from end of previous
        const overlapText = getOverlapText(currentChunk, opts.chunkOverlap);
        currentChunk = overlapText ? `${overlapText} ${trimmedSentence}` : trimmedSentence;
        chunkStartChar = currentPos - overlapText.length;
        chunkIndex++;
      } else {
        currentChunk = potentialChunk;
      }

      currentPos += sentence.length;
    }

    // Add paragraph break tracking
    if (opts.preserveParagraphs && paragraphs.length > 1) {
      currentPos += 2; // Account for \n\n between paragraphs
    }
  }

  // Add final chunk if there's remaining content
  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      metadata: {
        chunkIndex,
        startChar: chunkStartChar,
        endChar: currentPos,
      },
    });
  }

  return chunks;
}

/**
 * Split text into sentences
 * Handles common sentence-ending patterns while avoiding false splits
 */
function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by space or end
  // Be careful with abbreviations (Mr., Dr., etc.)
  const sentences: string[] = [];
  let current = '';

  // Common abbreviations that shouldn't end sentences
  const abbreviations = ['mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'vs', 'etc', 'inc', 'ltd', 'co'];

  const chars = text.split('');
  for (let i = 0; i < chars.length; i++) {
    current += chars[i];

    // Check for sentence-ending punctuation
    if (chars[i] === '.' || chars[i] === '!' || chars[i] === '?') {
      const nextChar = chars[i + 1];

      // If followed by whitespace or end, it's likely a sentence end
      if (!nextChar || /\s/.test(nextChar)) {
        // Check if this is an abbreviation
        const lastWord = current.trim().split(/\s+/).pop()?.toLowerCase().replace(/[.!?]$/, '');
        const isAbbreviation = lastWord && abbreviations.includes(lastWord);

        if (!isAbbreviation) {
          sentences.push(current);
          current = '';
        }
      }
    }
  }

  // Add any remaining text
  if (current.trim()) {
    sentences.push(current);
  }

  return sentences;
}

/**
 * Get overlap text from the end of a chunk
 */
function getOverlapText(text: string, overlapSize: number): string {
  if (overlapSize <= 0 || text.length <= overlapSize) {
    return '';
  }

  // Try to break at a word boundary
  const overlapStart = text.length - overlapSize;
  const overlap = text.slice(overlapStart);

  // Find first space to start at word boundary
  const firstSpace = overlap.indexOf(' ');
  if (firstSpace > 0 && firstSpace < overlap.length / 2) {
    return overlap.slice(firstSpace + 1);
  }

  return overlap;
}

// ============================================
// Text Extraction
// ============================================

/**
 * Extract text from a document given its URL and MIME type
 *
 * @param blobUrl - URL to the document
 * @param mimeType - MIME type (may be incorrect if from blob storage)
 * @param fileName - Optional filename to use as fallback for type detection
 */
export async function extractTextFromDocument(
  blobUrl: string,
  mimeType: string,
  fileName?: string
): Promise<string> {
  // Normalize MIME type using filename as fallback
  // Blob storage may return application/octet-stream for unknown types
  let normalizedMimeType = mimeType;

  if ((!mimeType || mimeType === 'application/octet-stream') && fileName) {
    const ext = fileName.toLowerCase();
    if (ext.endsWith('.md') || ext.endsWith('.markdown')) {
      normalizedMimeType = 'text/markdown';
    } else if (ext.endsWith('.txt')) {
      normalizedMimeType = 'text/plain';
    } else if (ext.endsWith('.pdf')) {
      normalizedMimeType = 'application/pdf';
    } else if (ext.endsWith('.docx')) {
      normalizedMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (ext.endsWith('.doc')) {
      normalizedMimeType = 'application/msword';
    }
  }

  // Validate MIME type
  if (!isSupportedMimeType(normalizedMimeType)) {
    throw new Error(
      `Unsupported MIME type: ${normalizedMimeType}. Supported types: ${SUPPORTED_MIME_TYPES.join(', ')}`
    );
  }

  // Plain text and markdown
  if (normalizedMimeType === 'text/plain' || normalizedMimeType === 'text/markdown') {
    return extractPlainText(blobUrl);
  }

  // PDF
  if (normalizedMimeType === 'application/pdf') {
    return extractPdfText(blobUrl);
  }

  // Word documents
  if (
    normalizedMimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    normalizedMimeType === 'application/msword'
  ) {
    return extractDocxText(blobUrl);
  }

  throw new Error(`Extraction not implemented for: ${normalizedMimeType}`);
}

/**
 * Check if a MIME type is supported
 */
export function isSupportedMimeType(mimeType: string): mimeType is SupportedMimeType {
  return (SUPPORTED_MIME_TYPES as readonly string[]).includes(mimeType);
}

/**
 * Extract text from plain text file
 */
async function extractPlainText(blobUrl: string): Promise<string> {
  const response = await fetch(blobUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

/**
 * Extract text from PDF using pdf-parse
 */
async function extractPdfText(blobUrl: string): Promise<string> {
  // pdf-parse exports a default function, not a named export
  const pdfParse = (await import('pdf-parse')).default;

  const response = await fetch(blobUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // pdf-parse expects a Buffer and returns a promise with { text, numpages, info, metadata, version }
  const data = await pdfParse(buffer);

  return data.text;
}

/**
 * Extract text from DOCX using mammoth
 */
async function extractDocxText(blobUrl: string): Promise<string> {
  const mammoth = await import('mammoth');

  const response = await fetch(blobUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch DOCX: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();

  // mammoth.extractRawText accepts { buffer } for Node.js or { arrayBuffer } for browser
  const result = await mammoth.extractRawText({
    buffer: Buffer.from(arrayBuffer),
  });

  return result.value;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Estimate chunk count for a document
 * Useful for progress indication
 */
export function estimateChunkCount(
  textLength: number,
  options: Partial<ChunkingOptions> = {}
): number {
  const opts = { ...DEFAULT_CHUNKING_OPTIONS, ...options };

  if (textLength <= opts.chunkSize) {
    return 1;
  }

  // Account for overlap
  const effectiveChunkSize = opts.chunkSize - opts.chunkOverlap;
  return Math.ceil(textLength / effectiveChunkSize);
}

/**
 * Get human-readable file type from MIME type
 */
export function getFileTypeLabel(mimeType: string): string {
  switch (mimeType) {
    case 'text/plain':
      return 'Text';
    case 'application/pdf':
      return 'PDF';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'Word (DOCX)';
    case 'application/msword':
      return 'Word (DOC)';
    default:
      return 'Unknown';
  }
}
