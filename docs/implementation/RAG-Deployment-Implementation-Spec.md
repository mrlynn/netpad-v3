# RAG Deployment Architecture - Implementation Specification

**Version:** 1.4.0
**Date:** January 29, 2026
**Author:** Michael Lynn + AI Assistant
**Status:** Phase 1, 2 & 3 Complete - Ready for Testing
**Dependencies:** RAG-Deployment-Architecture.md, Strategic-Discussion-RAG-Storage-Architecture.md

**Progress Update:**
- ✅ Phase 1: Foundation (Complete - ~2,640 lines)
- ✅ Phase 2: API Integration (Complete - All endpoints migrated)
- ✅ Storage Provider Migration (Complete - See RAG-Storage-Provider-Migration-Complete.md)
- ✅ UI Components (Complete - Usage dashboard, settings page, document management)
- ✅ Phase 3: User-Cluster Support (COMPLETE - See RAG-Phase-3-Summary.md)
  - ✅ UserClusterStorageProvider (~530 lines)
  - ✅ Cluster validation service (~380 lines)
  - ✅ Storage factory dual-mode support
  - ✅ Validation API endpoint (~65 lines)
  - ✅ UI components (wizard, validation display, settings)
  - ✅ Connection string encryption (AES-256-GCM)
  - ✅ Contextual knowledge base access in forms
  - ⏳ End-to-end testing in progress
- ⏳ Phase 4: Monitoring & Polish (Pending)

**Recent Accomplishments (Jan 29, 2026):**

**Session 1:**
- Migrated all API endpoints to use storage provider abstraction
- Fixed 7 TypeScript compilation errors
- Removed debug logging from production code
- Completed UI components for RAG management
- Vector search indexes created and tested

**Session 2 (Phase 3 Backend):**
- Implemented UserClusterStorageProvider with full feature parity (~530 lines)
- Created comprehensive cluster validation service (~380 lines)
- Updated storage factory for dual-mode support
- Built validation API endpoint (~65 lines)
- All TypeScript compilation successful (0 errors)
- Total new code: ~975 lines

**Session 3 (Phase 3 UI & UX):**
- Built ClusterSetupWizard (3-step wizard, ~480 lines)
- Created ValidationResultDisplay component (~230 lines)
- Implemented StorageModeSettings page (~400 lines)
- Added connection string encryption library (~280 lines)
- Enhanced ConversationalConfigEditor with contextual knowledge base access (~95 lines)
- Updated .env.example with ENCRYPTION_KEY documentation
- Created comprehensive documentation (5 new docs, ~12,000 lines)
- Total Phase 3 code: ~2,000 lines
- Total Phase 3 documentation: ~12,000 lines

---

## Executive Summary

This implementation spec translates the strategic RAG deployment decisions into concrete development tasks. We're implementing a **Hybrid Tiered** storage model with platform storage for Free/Pro tiers and user-cluster storage for Team/Enterprise.

**Implementation Timeline:** 4 weeks (phased approach)

**Key Deliverables:**
1. Storage provider abstraction layer
2. Usage tracking and limit enforcement
3. User-cluster setup wizard (basic)
4. Health monitoring foundation
5. Migration system (basic)

---

## Phase 1: Foundation (Week 1) - PRIORITY

### 1.1 Database Schema & Configuration

**File:** `src/types/rag-storage.ts` (NEW)

```typescript
// Storage mode types
export type RAGStorageMode = 'platform' | 'user-cluster';

// Main configuration schema
export interface RAGStorageConfig {
  mode: RAGStorageMode;

  // Platform mode configuration
  platform?: {
    region: 'us-east' | 'eu-west' | 'ap-southeast';
  };

  // User-cluster mode configuration
  userCluster?: {
    connectionId: string;           // Reference to connection vault entry
    database: string;               // Database name for RAG collections
    embeddingApiKey?: string;       // Optional: customer's Atlas Embedding API key
  };

  // Usage limits
  limits: {
    maxDocuments: number;           // -1 = unlimited
    maxStorageBytes: number;        // -1 = unlimited
    maxQueriesPerDay: number;       // -1 = unlimited
    maxQueriesPerMonth: number;     // -1 = unlimited
  };

  // Status tracking
  status: RAGStorageStatus;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  migratedFrom?: RAGStorageMode;
  migrationDate?: Date;
}

export interface RAGStorageStatus {
  isConfigured: boolean;
  isHealthy: boolean;
  vectorIndexStatus: 'pending' | 'building' | 'ready' | 'error';
  lastHealthCheck: Date;
  healthCheckErrors?: string[];

  // Usage tracking
  usage: {
    documentCount: number;
    storageBytes: number;
    queryCountToday: number;
    queryCountMonth: number;
    lastQueryAt?: Date;
  };
}

// Tier-based defaults
export const RAG_STORAGE_DEFAULTS: Record<SubscriptionTier, Partial<RAGStorageConfig>> = {
  free: {
    mode: 'platform',
    platform: { region: 'us-east' },
    limits: {
      maxDocuments: 3,
      maxStorageBytes: 25 * 1024 * 1024,  // 25 MB
      maxQueriesPerDay: 50,
      maxQueriesPerMonth: 1500,
    },
  },

  pro: {
    mode: 'platform',  // Default, can be changed to 'user-cluster'
    platform: { region: 'us-east' },
    limits: {
      maxDocuments: 50,
      maxStorageBytes: 500 * 1024 * 1024,  // 500 MB
      maxQueriesPerDay: -1,  // Unlimited
      maxQueriesPerMonth: -1,
    },
  },

  team: {
    mode: 'user-cluster',  // Required
    limits: {
      maxDocuments: -1,  // Unlimited
      maxStorageBytes: -1,
      maxQueriesPerDay: -1,
      maxQueriesPerMonth: -1,
    },
  },

  enterprise: {
    mode: 'user-cluster',  // Required
    limits: {
      maxDocuments: -1,
      maxStorageBytes: -1,
      maxQueriesPerDay: -1,
      maxQueriesPerMonth: -1,
    },
  },
};
```

**Task 1.1.1:** Create type definitions
- File: `src/types/rag-storage.ts`
- Estimated time: 2 hours
- Dependencies: None

**Task 1.1.2:** Add to organization schema
- File: `src/types/platform.ts`
- Add `ragConfig?: RAGStorageConfig` to Organization interface
- Estimated time: 1 hour

### 1.2 Storage Provider Interface

**File:** `src/lib/rag/storage/provider.ts` (NEW)

```typescript
import { RAGDocument, RAGChunk } from '@/types/rag';

export interface RAGStorageProvider {
  readonly providerId: string;
  readonly mode: RAGStorageMode;

  // Initialization
  initialize(): Promise<void>;
  disconnect(): Promise<void>;

  // Document operations
  createDocument(doc: RAGDocumentInput): Promise<RAGDocument>;
  getDocument(documentId: string): Promise<RAGDocument | null>;
  listDocuments(formId: string, options?: ListOptions): Promise<RAGDocument[]>;
  deleteDocument(documentId: string): Promise<void>;

  // Chunk operations
  createChunks(documentId: string, chunks: RAGChunkInput[]): Promise<RAGChunk[]>;
  getChunks(documentId: string): Promise<RAGChunk[]>;
  deleteChunks(documentId: string): Promise<void>;

  // Vector search
  vectorSearch(query: VectorSearchQuery): Promise<VectorSearchResult[]>;

  // File storage
  uploadFile(file: File, documentId: string): Promise<string>;  // Returns file URL
  deleteFile(documentId: string): Promise<void>;

  // Health & status
  checkHealth(): Promise<HealthCheckResult>;
  getUsage(): Promise<RAGUsageStats>;

  // Index management
  ensureVectorIndex(): Promise<void>;
  getVectorIndexStatus(): Promise<VectorIndexStatus>;
}

export interface VectorSearchQuery {
  embedding: number[];
  formId: string;
  organizationId: string;
  limit?: number;
  minScore?: number;
  documentIds?: string[];
}

export interface VectorSearchResult {
  chunkId: string;
  documentId: string;
  text: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface RAGDocumentInput {
  formId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  metadata?: Record<string, unknown>;
}

export interface RAGChunkInput {
  text: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
  pageNumber?: number;
  chunkIndex: number;
}

export interface HealthCheckResult {
  healthy: boolean;
  latencyMs: number;
  vectorIndexStatus: 'pending' | 'building' | 'ready' | 'error';
  errors: string[];
}

export interface RAGUsageStats {
  documentCount: number;
  storageBytes: number;
  queryCountToday: number;
  queryCountMonth: number;
}

export interface VectorIndexStatus {
  status: 'pending' | 'building' | 'ready' | 'error';
  name: string;
  definition?: any;
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  status?: 'processing' | 'ready' | 'error';
}
```

**Task 1.2.1:** Create provider interface
- File: `src/lib/rag/storage/provider.ts`
- Estimated time: 3 hours
- Dependencies: Task 1.1.1

### 1.3 Platform Storage Provider (Initial Implementation)

**File:** `src/lib/rag/storage/platform-provider.ts` (NEW)

```typescript
import { MongoClient, Collection, Db, ObjectId } from 'mongodb';
import { RAGStorageProvider, RAGStorageMode } from './provider';
import { getNetPadPlatformClient } from '@/lib/platform/db';
import { RAGDocument, RAGChunk } from '@/types/rag';

export class PlatformStorageProvider implements RAGStorageProvider {
  readonly providerId = 'platform';
  readonly mode: RAGStorageMode = 'platform';

  private client: MongoClient | null = null;
  private db: Db | null = null;
  private documentsCollection: Collection<RAGDocument> | null = null;
  private chunksCollection: Collection<RAGChunk> | null = null;
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  async initialize(): Promise<void> {
    this.client = await getNetPadPlatformClient();
    this.db = this.client.db(`netpad_rag_${this.organizationId}`);
    this.documentsCollection = this.db.collection('rag_documents');
    this.chunksCollection = this.db.collection('rag_document_chunks');

    await this.ensureIndexes();
  }

  async disconnect(): Promise<void> {
    // Connection is managed by platform client pool
  }

  private async ensureIndexes(): Promise<void> {
    if (!this.documentsCollection || !this.chunksCollection) {
      throw new Error('Collections not initialized');
    }

    // Standard indexes
    await this.documentsCollection.createIndex({ formId: 1 });
    await this.documentsCollection.createIndex({ organizationId: 1, formId: 1 });
    await this.documentsCollection.createIndex({ status: 1 });

    await this.chunksCollection.createIndex({ documentId: 1 });
    await this.chunksCollection.createIndex({ formId: 1 });
  }

  async createDocument(doc: RAGDocumentInput): Promise<RAGDocument> {
    if (!this.documentsCollection) throw new Error('Not initialized');

    const document: RAGDocument = {
      _id: new ObjectId(),
      ...doc,
      organizationId: this.organizationId,
      status: 'processing',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.documentsCollection.insertOne(document);
    return document;
  }

  async getDocument(documentId: string): Promise<RAGDocument | null> {
    if (!this.documentsCollection) throw new Error('Not initialized');
    return this.documentsCollection.findOne({ _id: new ObjectId(documentId) });
  }

  async listDocuments(formId: string, options?: ListOptions): Promise<RAGDocument[]> {
    if (!this.documentsCollection) throw new Error('Not initialized');

    const query: any = {
      organizationId: this.organizationId,
      ...(formId !== '*' && { formId }),
      ...(options?.status && { status: options.status }),
    };

    return this.documentsCollection
      .find(query)
      .limit(options?.limit || 100)
      .skip(options?.offset || 0)
      .toArray();
  }

  async deleteDocument(documentId: string): Promise<void> {
    if (!this.documentsCollection) throw new Error('Not initialized');

    await this.documentsCollection.deleteOne({ _id: new ObjectId(documentId) });
    await this.deleteChunks(documentId);
  }

  async createChunks(documentId: string, chunks: RAGChunkInput[]): Promise<RAGChunk[]> {
    if (!this.chunksCollection) throw new Error('Not initialized');

    const doc = await this.getDocument(documentId);
    if (!doc) throw new Error('Document not found');

    const ragChunks: RAGChunk[] = chunks.map(chunk => ({
      _id: new ObjectId(),
      documentId,
      formId: doc.formId,
      organizationId: this.organizationId,
      text: chunk.text,
      embedding: chunk.embedding,
      metadata: chunk.metadata || {},
      pageNumber: chunk.pageNumber,
      chunkIndex: chunk.chunkIndex,
      createdAt: new Date(),
    }));

    await this.chunksCollection.insertMany(ragChunks);
    return ragChunks;
  }

  async getChunks(documentId: string): Promise<RAGChunk[]> {
    if (!this.chunksCollection) throw new Error('Not initialized');
    return this.chunksCollection.find({ documentId }).toArray();
  }

  async deleteChunks(documentId: string): Promise<void> {
    if (!this.chunksCollection) throw new Error('Not initialized');
    await this.chunksCollection.deleteMany({ documentId });
  }

  async vectorSearch(query: VectorSearchQuery): Promise<VectorSearchResult[]> {
    if (!this.chunksCollection) throw new Error('Not initialized');

    const pipeline = [
      {
        $vectorSearch: {
          index: 'rag_vector_index',
          path: 'embedding',
          queryVector: query.embedding,
          numCandidates: Math.max(query.limit || 5, 20) * 4,
          limit: query.limit || 5,
          filter: {
            organizationId: query.organizationId,
            formId: query.formId,
            ...(query.documentIds && { documentId: { $in: query.documentIds } }),
          },
        },
      },
      {
        $project: {
          _id: 1,
          documentId: 1,
          text: 1,
          metadata: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ];

    if (query.minScore) {
      pipeline.push({
        $match: { score: { $gte: query.minScore } } as any,
      });
    }

    const results = await this.chunksCollection.aggregate(pipeline).toArray();

    return results.map(r => ({
      chunkId: r._id.toString(),
      documentId: r.documentId,
      text: r.text,
      score: r.score,
      metadata: r.metadata,
    }));
  }

  async uploadFile(file: File, documentId: string): Promise<string> {
    const { put } = await import('@vercel/blob');

    const blob = await put(
      `rag/${this.organizationId}/${documentId}/${file.name}`,
      file,
      { access: 'public' }
    );

    return blob.url;
  }

  async deleteFile(documentId: string): Promise<void> {
    // Vercel Blob cleanup if needed
  }

  async checkHealth(): Promise<HealthCheckResult> {
    try {
      if (!this.db) throw new Error('Not initialized');

      await this.db.command({ ping: 1 });
      const indexStatus = await this.getVectorIndexStatus();

      return {
        healthy: indexStatus.status === 'ready',
        latencyMs: 0,  // TODO: measure actual latency
        vectorIndexStatus: indexStatus.status,
        errors: indexStatus.status !== 'ready' ? ['Vector index not ready'] : [],
      };
    } catch (error) {
      return {
        healthy: false,
        latencyMs: -1,
        vectorIndexStatus: 'error',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  async getUsage(): Promise<RAGUsageStats> {
    if (!this.documentsCollection || !this.chunksCollection) {
      throw new Error('Not initialized');
    }

    const documentCount = await this.documentsCollection.countDocuments({
      organizationId: this.organizationId,
    });

    // TODO: Calculate actual storage bytes
    // TODO: Track query counts

    return {
      documentCount,
      storageBytes: 0,
      queryCountToday: 0,
      queryCountMonth: 0,
    };
  }

  async ensureVectorIndex(): Promise<void> {
    // Vector index must be created via Atlas UI or Admin API
    // This method verifies it exists
    const status = await this.getVectorIndexStatus();
    if (status.status === 'error') {
      throw new Error('Vector search index not found or not ready');
    }
  }

  async getVectorIndexStatus(): Promise<VectorIndexStatus> {
    try {
      if (!this.client || !this.chunksCollection) {
        throw new Error('Not initialized');
      }

      const adminDb = this.client.db('admin');
      const indexes = await adminDb.command({
        listSearchIndexes: `netpad_rag_${this.organizationId}.rag_document_chunks`,
      });

      const vectorIndex = indexes.cursor?.firstBatch?.find(
        (idx: any) => idx.name === 'rag_vector_index'
      );

      if (!vectorIndex) {
        return { status: 'error', name: 'rag_vector_index' };
      }

      return {
        status: vectorIndex.status === 'READY' ? 'ready' : 'building',
        name: vectorIndex.name,
        definition: vectorIndex.latestDefinition,
      };
    } catch (error) {
      return { status: 'error', name: 'rag_vector_index' };
    }
  }
}
```

**Task 1.3.1:** Implement PlatformStorageProvider
- File: `src/lib/rag/storage/platform-provider.ts`
- Estimated time: 6 hours
- Dependencies: Task 1.2.1

**Task 1.3.2:** Create provider factory
- File: `src/lib/rag/storage/factory.ts`
- Simple factory for now (only platform mode)
- Estimated time: 2 hours

### 1.4 Usage Tracking Foundation

**File:** `src/lib/rag/usage/tracking.ts` (NEW)

```typescript
import { getOrgDb } from '@/lib/platform/db';
import { RAGStorageConfig } from '@/types/rag-storage';

export interface RAGUsageRecord {
  organizationId: string;
  date: string;  // YYYY-MM-DD

  documentsCreated: number;
  documentsDeleted: number;
  storageBytesAdded: number;
  storageBytesRemoved: number;
  vectorSearchQueries: number;

  totalDocuments: number;
  totalStorageBytes: number;
}

export class RAGUsageTrackingService {
  async recordDocumentUpload(
    organizationId: string,
    sizeBytes: number
  ): Promise<void> {
    const db = await getOrgDb(organizationId);
    const today = new Date().toISOString().split('T')[0];

    await db.collection('rag_usage').updateOne(
      { organizationId, date: today },
      {
        $inc: {
          documentsCreated: 1,
          storageBytesAdded: sizeBytes,
        },
        $setOnInsert: {
          organizationId,
          date: today,
        },
      },
      { upsert: true }
    );

    await this.updateTotals(organizationId);
  }

  async recordDocumentDelete(
    organizationId: string,
    sizeBytes: number
  ): Promise<void> {
    const db = await getOrgDb(organizationId);
    const today = new Date().toISOString().split('T')[0];

    await db.collection('rag_usage').updateOne(
      { organizationId, date: today },
      {
        $inc: {
          documentsDeleted: 1,
          storageBytesRemoved: sizeBytes,
        },
        $setOnInsert: {
          organizationId,
          date: today,
        },
      },
      { upsert: true }
    );

    await this.updateTotals(organizationId);
  }

  async recordVectorSearchQuery(organizationId: string): Promise<void> {
    const db = await getOrgDb(organizationId);
    const today = new Date().toISOString().split('T')[0];

    await db.collection('rag_usage').updateOne(
      { organizationId, date: today },
      {
        $inc: { vectorSearchQueries: 1 },
        $setOnInsert: { organizationId, date: today },
      },
      { upsert: true }
    );
  }

  private async updateTotals(organizationId: string): Promise<void> {
    // Update total document count and storage bytes
    // This would query the actual RAG storage provider
  }

  async checkLimits(
    organizationId: string,
    config: RAGStorageConfig
  ): Promise<{ canUpload: boolean; canQuery: boolean; violations: string[] }> {
    const db = await getOrgDb(organizationId);
    const today = new Date().toISOString().split('T')[0];

    const usage = await db.collection('rag_usage').findOne({
      organizationId,
      date: today,
    });

    const violations: string[] = [];
    let canUpload = true;
    let canQuery = true;

    // Check document limit
    if (config.limits.maxDocuments > 0) {
      const currentDocs = usage?.totalDocuments || 0;
      if (currentDocs >= config.limits.maxDocuments) {
        violations.push(`Document limit reached (${config.limits.maxDocuments})`);
        canUpload = false;
      }
    }

    // Check storage limit
    if (config.limits.maxStorageBytes > 0) {
      const currentBytes = usage?.totalStorageBytes || 0;
      if (currentBytes >= config.limits.maxStorageBytes) {
        violations.push(`Storage limit reached`);
        canUpload = false;
      }
    }

    // Check daily query limit
    if (config.limits.maxQueriesPerDay > 0) {
      const todayQueries = usage?.vectorSearchQueries || 0;
      if (todayQueries >= config.limits.maxQueriesPerDay) {
        violations.push(`Daily query limit reached (${config.limits.maxQueriesPerDay})`);
        canQuery = false;
      }
    }

    return { canUpload, canQuery, violations };
  }
}
```

**Task 1.4.1:** Implement usage tracking service
- File: `src/lib/rag/usage/tracking.ts`
- Estimated time: 4 hours
- Dependencies: Task 1.1.1

**Task 1.4.2:** Create limit enforcement middleware
- File: `src/lib/rag/middleware/limits.ts`
- Estimated time: 2 hours

---

## Phase 2: Integration & API Updates (Week 2)

### 2.1 Update Existing RAG Endpoints

**Current files to update:**
- `src/app/api/rag/documents/upload/route.ts`
- `src/app/api/rag/retrieve/route.ts`
- All RAG-related API routes

**Changes needed:**
1. Replace direct MongoDB calls with provider abstraction
2. Add limit checks before operations
3. Record usage events

**Example pattern:**

```typescript
// BEFORE
import { getOrgDb } from '@/lib/platform/db';
const db = await getOrgDb(organizationId);
const doc = await db.collection('rag_documents').insertOne(...);

// AFTER
import { getRAGStorageProvider } from '@/lib/rag/storage/factory';
import { RAGUsageTrackingService } from '@/lib/rag/usage/tracking';

const provider = await getRAGStorageProvider(organizationId);
const tracker = new RAGUsageTrackingService();

// Check limits
const limits = await tracker.checkLimits(organizationId, config);
if (!limits.canUpload) {
  return NextResponse.json(
    { error: 'Upload limit reached', violations: limits.violations },
    { status: 429 }
  );
}

// Use provider
const doc = await provider.createDocument({...});

// Track usage
await tracker.recordDocumentUpload(organizationId, sizeBytes);
```

**Task 2.1.1:** Update upload endpoint
- File: `src/app/api/rag/documents/upload/route.ts`
- Estimated time: 3 hours

**Task 2.1.2:** Update retrieve endpoint
- File: `src/app/api/rag/retrieve/route.ts`
- Estimated time: 2 hours

**Task 2.1.3:** Update other RAG endpoints
- Estimated time: 4 hours

### 2.2 Configuration Management

**File:** `src/lib/rag/config.ts` (NEW)

```typescript
import { getOrgDb } from '@/lib/platform/db';
import { RAGStorageConfig, RAG_STORAGE_DEFAULTS } from '@/types/rag-storage';
import { getOrganizationSubscription } from '@/lib/platform/subscriptions';

export async function getOrganizationRAGConfig(
  organizationId: string
): Promise<RAGStorageConfig> {
  const db = await getOrgDb(organizationId);
  const org = await db.collection('organizations').findOne({ _id: organizationId });

  if (org?.ragConfig) {
    return org.ragConfig;
  }

  // Create default config based on subscription tier
  const subscription = await getOrganizationSubscription(organizationId);
  const defaults = RAG_STORAGE_DEFAULTS[subscription.tier];

  const config: RAGStorageConfig = {
    ...defaults,
    status: {
      isConfigured: true,
      isHealthy: false,
      vectorIndexStatus: 'pending',
      lastHealthCheck: new Date(),
      usage: {
        documentCount: 0,
        storageBytes: 0,
        queryCountToday: 0,
        queryCountMonth: 0,
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  } as RAGStorageConfig;

  // Save config
  await db.collection('organizations').updateOne(
    { _id: organizationId },
    { $set: { ragConfig: config } }
  );

  return config;
}

export async function updateOrganizationRAGConfig(
  organizationId: string,
  updates: Partial<RAGStorageConfig>
): Promise<void> {
  const db = await getOrgDb(organizationId);

  await db.collection('organizations').updateOne(
    { _id: organizationId },
    {
      $set: {
        ...Object.fromEntries(
          Object.entries(updates).map(([k, v]) => [`ragConfig.${k}`, v])
        ),
        'ragConfig.updatedAt': new Date(),
      },
    }
  );
}
```

**Task 2.2.1:** Implement configuration management
- File: `src/lib/rag/config.ts`
- Estimated time: 3 hours

**Task 2.2.2:** Create configuration API endpoint
- File: `src/app/api/organizations/[organizationId]/rag/config/route.ts`
- GET and PUT methods
- Estimated time: 2 hours

### 2.3 Environment Configuration

**File:** `.env.example` (UPDATE)

Add these variables:

```bash
# =============================================================================
# RAG Storage Configuration
# =============================================================================

# Platform cluster connection (NetPad infrastructure)
NETPAD_PLATFORM_MONGODB_URI=mongodb+srv://...
NETPAD_PLATFORM_MONGODB_DATABASE=netpad_platform

# Atlas Embedding API (recommended)
ATLAS_MODEL_API_KEY=voyage_...

# Storage defaults
RAG_DEFAULT_STORAGE_MODE=platform
RAG_PLATFORM_REGION=us-east

# Free tier limits
RAG_FREE_MAX_DOCUMENTS=3
RAG_FREE_MAX_STORAGE_MB=25
RAG_FREE_MAX_QUERIES_DAY=50
RAG_FREE_MAX_QUERIES_MONTH=1500

# Pro tier limits
RAG_PRO_MAX_DOCUMENTS=50
RAG_PRO_MAX_STORAGE_MB=500
```

**Task 2.3.1:** Update environment configuration
- Files: `.env.example`, `.env.local`
- Estimated time: 1 hour

---

## Phase 3: User-Cluster Support (Week 3)

### 3.1 User-Cluster Storage Provider

**File:** `src/lib/rag/storage/user-cluster-provider.ts` (NEW)

**Implementation notes:**
- Similar structure to PlatformStorageProvider
- Uses connection from vault instead of platform client
- Validates cluster tier (M10+ required)
- Same interface, different data source

**Task 3.1.1:** Implement UserClusterStorageProvider
- File: `src/lib/rag/storage/user-cluster-provider.ts`
- Estimated time: 8 hours
- Dependencies: Connection vault system

**Task 3.1.2:** Update factory to support both modes
- File: `src/lib/rag/storage/factory.ts`
- Estimated time: 2 hours

### 3.2 Cluster Validation Service

**File:** `src/lib/rag/storage/validation.ts` (NEW)

```typescript
export interface ClusterValidationResult {
  isValid: boolean;
  clusterTier: string | null;
  mongoVersion: string | null;
  vectorSearchAvailable: boolean;
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  resolution?: string;
}

export async function validateClusterForRAG(
  organizationId: string,
  connectionId: string
): Promise<ClusterValidationResult> {
  // Implementation from spec
}
```

**Task 3.2.1:** Implement cluster validation
- File: `src/lib/rag/storage/validation.ts`
- Estimated time: 4 hours

### 3.3 Basic Setup Wizard (UI)

**File:** `src/app/apps/[appSlug]/settings/rag/page.tsx` (NEW)

**Screens:**
1. Storage mode selection (Platform vs User-Cluster)
2. Connection selection (if user-cluster)
3. Database configuration
4. Index creation status
5. Confirmation

**Task 3.3.1:** Create RAG settings page
- File: `src/app/apps/[appSlug]/settings/rag/page.tsx`
- Estimated time: 6 hours

**Task 3.3.2:** Create setup wizard components
- Components for each step
- Estimated time: 8 hours

---

## Phase 4: Monitoring & Polish (Week 4)

### 4.1 Health Monitoring

**File:** `src/lib/rag/monitoring/health.ts` (NEW)

```typescript
export interface RAGHealthStatus {
  organizationId: string;
  storageMode: RAGStorageMode;
  overall: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: HealthCheck;
    vectorIndex: HealthCheck;
    blobStorage: HealthCheck;
  };
  lastChecked: Date;
}

export class RAGHealthMonitor {
  async checkHealth(organizationId: string): Promise<RAGHealthStatus> {
    // Implementation
  }
}
```

**Task 4.1.1:** Implement health monitoring
- File: `src/lib/rag/monitoring/health.ts`
- Estimated time: 4 hours

**Task 4.1.2:** Create health check API endpoint
- File: `src/app/api/organizations/[organizationId]/rag/health/route.ts`
- Estimated time: 2 hours

**Task 4.1.3:** Add health status to UI
- Show in settings page
- Estimated time: 2 hours

### 4.2 Usage Dashboard

**File:** `src/components/RAG/UsageDashboard.tsx` (NEW)

**Display:**
- Document count vs limit
- Storage used vs limit
- Query count (today/month)
- Visual progress bars
- Upgrade prompts

**Task 4.2.1:** Create usage dashboard component
- File: `src/components/RAG/UsageDashboard.tsx`
- Estimated time: 4 hours

**Task 4.2.2:** Integrate into settings page
- Estimated time: 2 hours

### 4.3 Migration System (Basic)

**File:** `src/lib/rag/storage/migration.ts` (NEW)

**Initial scope:**
- Platform → User-Cluster migration
- Manual trigger only
- Progress tracking
- Simple job queue

**Task 4.3.1:** Implement basic migration service
- File: `src/lib/rag/storage/migration.ts`
- Estimated time: 6 hours

**Task 4.3.2:** Create migration API endpoints
- File: `src/app/api/organizations/[organizationId]/rag/migrate/route.ts`
- Estimated time: 3 hours

---

## Testing Requirements

### Unit Tests

**Priority files:**
- `src/lib/rag/storage/platform-provider.ts`
- `src/lib/rag/usage/tracking.ts`
- `src/lib/rag/storage/validation.ts`

**Task T.1:** Write unit tests
- Estimated time: 8 hours

### Integration Tests

**Scenarios:**
1. Upload document → check limits → track usage
2. Vector search → record query → check limits
3. Switch storage mode → validate → migrate
4. Health check across all components

**Task T.2:** Write integration tests
- Estimated time: 6 hours

### Manual Testing

**Test cases:**
1. Free tier limit enforcement
2. Pro tier with both storage modes
3. Migration between modes
4. Health monitoring alerts
5. Usage dashboard accuracy

**Task T.3:** Manual testing checklist
- Estimated time: 4 hours

---

## Environment Setup

### Required Infrastructure

**Platform MongoDB Cluster:**
- Tier: M10+ (for vector search)
- Region: US-East
- Vector search index: Must be created manually
- Collections: Auto-created by providers

**Atlas Embedding API:**
- API key configured in environment
- Voyage 4 model access
- Reranking enabled

**Vercel Blob Storage:**
- Token configured in environment
- Public access for document files

### Index Creation Script

**File:** `scripts/create-vector-index.ts` (NEW)

```typescript
// Script to create vector search index on platform cluster
// Run once during deployment
```

**Task E.1:** Create index creation script
- Estimated time: 2 hours

---

## Migration from Current Implementation

### Current State Analysis

**What exists:**
- RAG document upload/retrieval
- Embedding generation (via Voyage API)
- Basic chunking
- Vector search queries

**What's missing:**
- Storage provider abstraction
- Usage tracking/limits
- User-cluster option
- Health monitoring
- Configuration management

### Migration Steps

1. **Add new code without breaking existing:**
   - Create all new files/interfaces
   - Don't modify existing RAG code yet

2. **Create parallel implementation:**
   - Implement PlatformStorageProvider
   - Test thoroughly

3. **Switch endpoints one-by-one:**
   - Update upload endpoint first
   - Test each endpoint after switching
   - Monitor for regressions

4. **Remove old code:**
   - After all endpoints switched
   - Archive for reference

**Task M.1:** Migration execution
- Estimated time: 6 hours

---

## Metrics & Success Criteria

### Key Metrics to Track

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Platform storage cost per user | <$2/year | Usage tracking |
| Vector search latency (P99) | <500ms | Health monitoring |
| Limit enforcement accuracy | 100% | Audit logs |
| Free→Pro conversion (RAG users) | >10% | Analytics |
| User-cluster setup success rate | >80% | Wizard completion tracking |

### Success Criteria

**Phase 1 Complete:**
- [ ] Storage provider abstraction working
- [ ] Usage tracking functional
- [ ] Limits enforced on all endpoints
- [ ] All tests passing

**Phase 2 Complete:**
- [ ] All RAG endpoints using provider abstraction
- [ ] Configuration management working
- [ ] Environment properly configured

**Phase 3 Complete:**
- [ ] User-cluster provider working
- [ ] Cluster validation functional
- [ ] Setup wizard accessible
- [ ] At least one test user migrated

**Phase 4 Complete:**
- [ ] Health monitoring operational
- [ ] Usage dashboard visible
- [ ] Migration system tested
- [ ] Documentation updated

---

## Risk Assessment

### High Risk

| Risk | Mitigation |
|------|------------|
| Vector index creation complexity | Manual process documented, Atlas Admin API as future enhancement |
| Migration data loss | Extensive testing, backup requirements, rollback plan |
| User-cluster permission issues | Clear error messages, validation before migration |

### Medium Risk

| Risk | Mitigation |
|------|------------|
| Cost overruns on platform storage | Strict limits, monitoring alerts, usage analysis |
| Performance degradation | Caching layer, query optimization, monitoring |
| Configuration complexity | Sensible defaults, tier-based presets |

### Low Risk

| Risk | Mitigation |
|------|------------|
| UI/UX confusion | User testing, clear documentation, tooltips |
| Edge cases in validation | Comprehensive test suite |

---

## Documentation Requirements

### Developer Documentation

**Files to create/update:**
1. `docs/rag/storage-architecture.md` - Architecture overview
2. `docs/rag/setup-guide.md` - Setup instructions
3. `docs/api/rag-endpoints.md` - API reference
4. `docs/deployment/vector-indexes.md` - Index creation guide

**Task D.1:** Write developer documentation
- Estimated time: 6 hours

### User Documentation

**Files to create:**
1. User guide for RAG features
2. Setup wizard walkthrough
3. Troubleshooting guide
4. Migration guide

**Task D.2:** Write user documentation
- Estimated time: 4 hours

---

## Timeline Summary

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 1: Foundation | 5 days | Week 1 Mon | Week 1 Fri |
| Phase 2: Integration | 5 days | Week 2 Mon | Week 2 Fri |
| Phase 3: User-Cluster | 5 days | Week 3 Mon | Week 3 Fri |
| Phase 4: Polish | 5 days | Week 4 Mon | Week 4 Fri |
| **Total** | **4 weeks** | | |

**Buffer:** Add 1 week for testing, bug fixes, documentation

---

## Next Steps

### Immediate Actions (This Week)

1. **Review this spec with team** - Get buy-in on approach
2. **Set up platform MongoDB cluster** - Provision M10+ with vector search
3. **Create vector search index** - Manual Atlas setup
4. **Start Phase 1, Task 1.1.1** - Create type definitions

### Week 1 Focus

Priority order:
1. Type definitions and schemas
2. Storage provider interface
3. Platform storage provider
4. Usage tracking foundation

### Dependencies to Resolve

- [ ] Platform MongoDB cluster provisioned
- [ ] Atlas Embedding API key obtained
- [ ] Vercel Blob storage configured
- [ ] Connection vault system ready (for user-cluster)

---

## Appendix: File Structure

```
src/
├── types/
│   ├── rag-storage.ts          [NEW]
│   └── platform.ts              [UPDATE]
├── lib/
│   ├── rag/
│   │   ├── storage/
│   │   │   ├── provider.ts      [NEW]
│   │   │   ├── platform-provider.ts  [NEW]
│   │   │   ├── user-cluster-provider.ts  [NEW]
│   │   │   ├── factory.ts       [NEW]
│   │   │   ├── validation.ts    [NEW]
│   │   │   └── migration.ts     [NEW]
│   │   ├── usage/
│   │   │   └── tracking.ts      [NEW]
│   │   ├── middleware/
│   │   │   └── limits.ts        [NEW]
│   │   ├── monitoring/
│   │   │   └── health.ts        [NEW]
│   │   └── config.ts            [NEW]
├── app/
│   ├── api/
│   │   ├── organizations/[organizationId]/rag/
│   │   │   ├── config/route.ts  [NEW]
│   │   │   ├── health/route.ts  [NEW]
│   │   │   ├── setup/route.ts   [NEW]
│   │   │   └── migrate/route.ts [NEW]
│   │   └── rag/
│   │       ├── documents/upload/route.ts  [UPDATE]
│   │       └── retrieve/route.ts          [UPDATE]
│   └── apps/[appSlug]/settings/rag/
│       └── page.tsx             [NEW]
├── components/
│   └── RAG/
│       ├── UsageDashboard.tsx   [NEW]
│       └── SetupWizard/         [NEW]
└── scripts/
    └── create-vector-index.ts   [NEW]
```

---

*End of Implementation Specification*
