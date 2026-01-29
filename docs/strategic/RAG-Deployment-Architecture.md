# RAG Cluster Deployment & Management Model

## NetPad Knowledge-Guided Forms Infrastructure Specification

**Version:** 1.0.0  
**Date:** January 28, 2026  
**Author:** Michael Lynn  
**Status:** Draft for Implementation  
**Dependencies:** voyage-ai-integration-spec.md, Strategic RAG Architecture Document

---

## Executive Summary

This specification defines the deployment and management model for NetPad's RAG (Retrieval-Augmented Generation) infrastructure supporting Knowledge-Guided Conversational Forms. It implements the **Hybrid Tiered** architecture recommended in the strategic analysis, providing:

- **Platform-Managed Storage** for Free and Pro tiers (default)
- **User-Cluster Storage** for Pro (optional) and Team/Enterprise (required)
- **Automated provisioning, migration, and monitoring** across all deployment modes
- **Cost-optimized infrastructure** leveraging MongoDB Atlas Embedding API

---

## 1. Deployment Architecture Overview

### 1.1 Storage Model Decision Matrix

| Tier | Default Storage | Alternative | Vector Search | Minimum Atlas Tier |
|------|-----------------|-------------|---------------|-------------------|
| **Free** | Platform | — | Platform cluster | M0 (user) / M10+ (platform) |
| **Pro** | Platform | User cluster (opt-in) | Depends on choice | M10+ if user cluster |
| **Team** | User cluster | — | User cluster | M10+ required |
| **Enterprise** | User cluster | — | User cluster | M10+ required |

### 1.2 Infrastructure Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NetPad RAG Infrastructure                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Platform-Managed Storage                          │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │   │
│  │  │ NetPad Atlas    │  │ Vercel Blob     │  │ Atlas Embedding    │  │   │
│  │  │ Cluster (M10+)  │  │ Storage         │  │ API               │  │   │
│  │  │                 │  │                 │  │ (ai.mongodb.com)  │  │   │
│  │  │ • rag_documents │  │ • PDF files     │  │                   │  │   │
│  │  │ • rag_chunks    │  │ • DOCX files    │  │ • Embeddings      │  │   │
│  │  │ • Vector index  │  │ • TXT files     │  │ • Reranking       │  │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘  │   │
│  │                                                                      │   │
│  │  Used by: Free tier, Pro tier (default)                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    User-Cluster Storage                              │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │   │
│  │  │ Customer Atlas  │  │ Customer Blob   │  │ Atlas Embedding    │  │   │
│  │  │ Cluster (M10+)  │  │ (optional)      │  │ API (customer key) │  │   │
│  │  │                 │  │                 │  │                   │  │   │
│  │  │ • rag_documents │  │ • Document      │  │ • Embeddings      │  │   │
│  │  │ • rag_chunks    │  │   files         │  │ • Reranking       │  │   │
│  │  │ • Vector index  │  │                 │  │                   │  │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘  │   │
│  │                                                                      │   │
│  │  Used by: Pro tier (opt-in), Team tier, Enterprise tier             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Storage Mode Definitions

### 2.1 Platform Storage Mode

**Description:** RAG documents and embeddings stored in NetPad's managed MongoDB Atlas cluster.

**Architecture:**
```typescript
// Database naming convention
const platformDbName = `netpad_rag_${organizationId}`;

// Collections
interface PlatformStorageCollections {
  rag_documents: Collection<RAGDocument>;      // Document metadata
  rag_document_chunks: Collection<RAGChunk>;   // Text chunks + embeddings
}

// Vector search index on platform cluster
const vectorIndexDefinition = {
  name: "rag_vector_index",
  type: "vectorSearch",
  definition: {
    fields: [
      { type: "vector", path: "embedding", numDimensions: 1024, similarity: "dotProduct" },
      { type: "filter", path: "formId" },
      { type: "filter", path: "organizationId" },
      { type: "filter", path: "documentId" }
    ]
  }
};
```

**Characteristics:**
| Aspect | Detail |
|--------|--------|
| Setup complexity | Zero (automatic) |
| User action required | None |
| Data ownership | NetPad (on behalf of user) |
| Vector search capability | Always available |
| Cost bearer | NetPad (included in tier pricing) |
| Data sovereignty | NetPad infrastructure (US/EU regions) |
| Backup responsibility | NetPad |
| Export capability | Full export available |

**Applicable Tiers:** Free, Pro (default)

### 2.2 User-Cluster Storage Mode

**Description:** RAG documents and embeddings stored in customer's own MongoDB Atlas cluster.

**Architecture:**
```typescript
// Database naming convention (within customer's cluster)
const userClusterDbName = `netpad_rag`;  // Or customer-specified name

// Collections (same structure as platform)
interface UserClusterStorageCollections {
  rag_documents: Collection<RAGDocument>;
  rag_document_chunks: Collection<RAGChunk>;
}

// Vector search index created by NetPad automation
// Requires M10+ Atlas tier on customer cluster
```

**Characteristics:**
| Aspect | Detail |
|--------|--------|
| Setup complexity | Moderate (guided setup wizard) |
| User action required | Provide connection string, create API key |
| Data ownership | Customer (full control) |
| Vector search capability | Requires M10+ cluster tier |
| Cost bearer | Customer (direct Atlas billing) |
| Data sovereignty | Customer's chosen Atlas region |
| Backup responsibility | Customer |
| Export capability | Direct database access |

**Applicable Tiers:** Pro (opt-in), Team, Enterprise

---

## 3. Cluster Configuration Requirements

### 3.1 Platform Cluster Specification

**NetPad Managed Cluster Requirements:**

| Component | Specification | Rationale |
|-----------|---------------|-----------|
| **Cluster tier** | M10 minimum (M30 recommended for production) | Vector search requires dedicated cluster |
| **Region** | Multi-region deployment (US-East, EU-West) | Latency optimization |
| **Storage** | Auto-scaling enabled, 100GB initial | Growth accommodation |
| **Replica set** | 3-node replica set | High availability |
| **Backup** | Continuous backup with PITR | Data protection |
| **Encryption** | At-rest and in-transit | Security compliance |

**Vector Search Index Configuration:**
```json
{
  "name": "rag_vector_index",
  "type": "vectorSearch",
  "definition": {
    "fields": [
      {
        "type": "vector",
        "path": "embedding",
        "numDimensions": 1024,
        "similarity": "dotProduct"
      },
      {
        "type": "filter",
        "path": "formId"
      },
      {
        "type": "filter",
        "path": "organizationId"
      },
      {
        "type": "filter",
        "path": "documentId"
      },
      {
        "type": "filter",
        "path": "status"
      }
    ]
  }
}
```

### 3.2 User Cluster Requirements

**Minimum Requirements for User-Cluster Storage:**

| Requirement | Specification | Validation Method |
|-------------|---------------|-------------------|
| **Cluster tier** | M10 or higher | Atlas API cluster info check |
| **MongoDB version** | 6.0+ | Connection metadata |
| **Vector search** | Enabled | Atlas capabilities check |
| **Network access** | NetPad IPs whitelisted | Connection test |
| **Database user** | Read/write on RAG database | Permission test |

**Recommended User Cluster Setup:**
```
Atlas Cluster (M10+)
├── Database: netpad_rag (or custom name)
│   ├── Collection: rag_documents
│   ├── Collection: rag_document_chunks
│   └── Index: rag_vector_index (vector search)
└── Database User: netpad_rag_user
    ├── Role: readWrite on netpad_rag
    └── Authentication: SCRAM-SHA-256
```

---

## 4. Storage Mode Configuration

### 4.1 Configuration Schema

```typescript
// src/types/rag-storage.ts

export type RAGStorageMode = 'platform' | 'user-cluster';

export interface RAGStorageConfig {
  mode: RAGStorageMode;
  
  // Platform mode configuration
  platform?: {
    region: 'us-east' | 'eu-west' | 'ap-southeast';
    // Platform-specific settings (internal use)
  };
  
  // User-cluster mode configuration
  userCluster?: {
    connectionId: string;           // Reference to connection vault entry
    database: string;               // Database name for RAG collections
    embeddingApiKey?: string;       // Customer's Atlas Embedding API key (optional)
    useCustomBlobStorage?: boolean; // Use customer's blob storage instead of Vercel
    blobStorageConfig?: {
      provider: 's3' | 'azure-blob' | 'gcs';
      bucket: string;
      region: string;
      // Credentials reference (encrypted)
    };
  };
  
  // Shared configuration
  limits: {
    maxDocuments: number;
    maxStorageBytes: number;
    maxQueriesPerDay: number;
    maxQueriesPerMonth: number;
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
```

### 4.2 Tier-Based Default Configuration

```typescript
// src/lib/rag/storage-defaults.ts

export const RAG_STORAGE_DEFAULTS: Record<SubscriptionTier, RAGStorageConfig> = {
  free: {
    mode: 'platform',
    platform: { region: 'us-east' },
    limits: {
      maxDocuments: 3,
      maxStorageBytes: 25 * 1024 * 1024,  // 25 MB
      maxQueriesPerDay: 50,
      maxQueriesPerMonth: 1500,
    },
    status: { /* initialized */ }
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
    status: { /* initialized */ }
  },
  
  team: {
    mode: 'user-cluster',  // Required
    limits: {
      maxDocuments: -1,  // Unlimited
      maxStorageBytes: -1,
      maxQueriesPerDay: -1,
      maxQueriesPerMonth: -1,
    },
    status: { /* initialized */ }
  },
  
  enterprise: {
    mode: 'user-cluster',  // Required
    limits: {
      maxDocuments: -1,
      maxStorageBytes: -1,
      maxQueriesPerDay: -1,
      maxQueriesPerMonth: -1,
    },
    status: { /* initialized */ }
  }
};
```

---

## 5. Storage Provider Abstraction

### 5.1 Provider Interface

```typescript
// src/lib/rag/storage/provider.ts

export interface RAGStorageProvider {
  readonly providerId: string;
  readonly mode: RAGStorageMode;
  
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
  getFileUrl(documentId: string): Promise<string>;
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
  filters?: Record<string, unknown>;
}

export interface VectorSearchResult {
  chunkId: string;
  documentId: string;
  text: string;
  score: number;
  metadata: Record<string, unknown>;
}
```

### 5.2 Platform Storage Provider

```typescript
// src/lib/rag/storage/platform-provider.ts

import { MongoClient, Collection, Db } from 'mongodb';
import { RAGStorageProvider, RAGStorageMode } from './provider';
import { getNetPadPlatformClient } from '@/lib/platform/db';

export class PlatformStorageProvider implements RAGStorageProvider {
  readonly providerId = 'platform';
  readonly mode: RAGStorageMode = 'platform';
  
  private client: MongoClient;
  private db: Db;
  private documentsCollection: Collection<RAGDocument>;
  private chunksCollection: Collection<RAGChunk>;
  private organizationId: string;
  
  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }
  
  async initialize(): Promise<void> {
    this.client = await getNetPadPlatformClient();
    this.db = this.client.db(`netpad_rag_${this.organizationId}`);
    this.documentsCollection = this.db.collection('rag_documents');
    this.chunksCollection = this.db.collection('rag_document_chunks');
    
    // Ensure indexes exist
    await this.ensureIndexes();
  }
  
  private async ensureIndexes(): Promise<void> {
    // Standard indexes
    await this.documentsCollection.createIndex({ formId: 1 });
    await this.documentsCollection.createIndex({ organizationId: 1, formId: 1 });
    await this.documentsCollection.createIndex({ status: 1 });
    
    await this.chunksCollection.createIndex({ documentId: 1 });
    await this.chunksCollection.createIndex({ formId: 1 });
  }
  
  async createDocument(doc: RAGDocumentInput): Promise<RAGDocument> {
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
  
  async vectorSearch(query: VectorSearchQuery): Promise<VectorSearchResult[]> {
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
        $match: { score: { $gte: query.minScore } },
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
    // Use Vercel Blob for platform storage
    const { put } = await import('@vercel/blob');
    
    const blob = await put(
      `rag/${this.organizationId}/${documentId}/${file.name}`,
      file,
      { access: 'public' }
    );
    
    return blob.url;
  }
  
  async ensureVectorIndex(): Promise<void> {
    // Vector search index is managed at the Atlas cluster level
    // This method verifies the index exists and is ready
    const adminDb = this.client.db('admin');
    
    const indexes = await adminDb.command({
      listSearchIndexes: `netpad_rag_${this.organizationId}.rag_document_chunks`,
    });
    
    const vectorIndex = indexes.cursor?.firstBatch?.find(
      (idx: any) => idx.name === 'rag_vector_index'
    );
    
    if (!vectorIndex) {
      throw new Error('Vector search index not found. Please contact support.');
    }
    
    if (vectorIndex.status !== 'READY') {
      throw new Error(`Vector index status: ${vectorIndex.status}. Please wait.`);
    }
  }
  
  async checkHealth(): Promise<HealthCheckResult> {
    try {
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
  
  // ... additional method implementations
}
```

### 5.3 User-Cluster Storage Provider

```typescript
// src/lib/rag/storage/user-cluster-provider.ts

import { MongoClient, Collection, Db } from 'mongodb';
import { RAGStorageProvider, RAGStorageMode } from './provider';
import { getConnectionFromVault } from '@/lib/platform/connection-vault';
import { decryptConnectionString } from '@/lib/platform/encryption';

export class UserClusterStorageProvider implements RAGStorageProvider {
  readonly providerId = 'user-cluster';
  readonly mode: RAGStorageMode = 'user-cluster';
  
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private documentsCollection: Collection<RAGDocument> | null = null;
  private chunksCollection: Collection<RAGChunk> | null = null;
  
  private organizationId: string;
  private config: UserClusterConfig;
  
  constructor(organizationId: string, config: UserClusterConfig) {
    this.organizationId = organizationId;
    this.config = config;
  }
  
  async initialize(): Promise<void> {
    // Get connection from vault
    const connection = await getConnectionFromVault(
      this.organizationId,
      this.config.connectionId
    );
    
    if (!connection) {
      throw new Error('RAG storage connection not found in vault');
    }
    
    // Decrypt and connect
    const connectionString = await decryptConnectionString(connection.encryptedUri);
    this.client = new MongoClient(connectionString);
    await this.client.connect();
    
    // Validate cluster tier
    await this.validateClusterTier();
    
    this.db = this.client.db(this.config.database);
    this.documentsCollection = this.db.collection('rag_documents');
    this.chunksCollection = this.db.collection('rag_document_chunks');
    
    // Ensure indexes exist
    await this.ensureIndexes();
  }
  
  private async validateClusterTier(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');
    
    const adminDb = this.client.db('admin');
    const serverStatus = await adminDb.command({ serverStatus: 1 });
    
    // Check if vector search is available (M10+ indicator)
    // This is a heuristic - actual validation requires Atlas Admin API
    const buildInfo = await adminDb.command({ buildInfo: 1 });
    const atlasVersion = buildInfo.version;
    
    // Vector search requires MongoDB 6.0+ on M10+ clusters
    const majorVersion = parseInt(atlasVersion.split('.')[0]);
    if (majorVersion < 6) {
      throw new Error(
        'User cluster requires MongoDB 6.0+ for vector search. ' +
        'Please upgrade your Atlas cluster.'
      );
    }
    
    // Additional validation would use Atlas Admin API to check cluster tier
    // For now, we'll validate during vector index creation
  }
  
  async ensureVectorIndex(): Promise<void> {
    if (!this.chunksCollection) throw new Error('Collection not initialized');
    
    // Create vector search index using Atlas Search API
    // Note: This requires the Atlas Admin API or manual creation
    
    const indexDefinition = {
      name: 'rag_vector_index',
      definition: {
        mappings: {
          dynamic: false,
          fields: {
            embedding: {
              type: 'knnVector',
              dimensions: 1024,
              similarity: 'dotProduct',
            },
            formId: { type: 'token' },
            organizationId: { type: 'token' },
            documentId: { type: 'token' },
            status: { type: 'token' },
          },
        },
      },
    };
    
    try {
      // Attempt to create vector search index
      // This will fail if cluster tier doesn't support it
      await this.db?.command({
        createSearchIndexes: this.chunksCollection.collectionName,
        indexes: [indexDefinition],
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not supported')) {
        throw new Error(
          'Vector search is not available on your cluster tier. ' +
          'Please upgrade to M10 or higher to use RAG features with user-cluster storage.'
        );
      }
      throw error;
    }
  }
  
  async uploadFile(file: File, documentId: string): Promise<string> {
    if (this.config.useCustomBlobStorage && this.config.blobStorageConfig) {
      // Use customer's blob storage
      return this.uploadToCustomStorage(file, documentId);
    }
    
    // Default to Vercel Blob even for user-cluster mode
    // (Documents are separate from embeddings)
    const { put } = await import('@vercel/blob');
    
    const blob = await put(
      `rag/${this.organizationId}/${documentId}/${file.name}`,
      file,
      { access: 'public' }
    );
    
    return blob.url;
  }
  
  private async uploadToCustomStorage(file: File, documentId: string): Promise<string> {
    const config = this.config.blobStorageConfig!;
    
    switch (config.provider) {
      case 's3':
        return this.uploadToS3(file, documentId, config);
      case 'azure-blob':
        return this.uploadToAzureBlob(file, documentId, config);
      case 'gcs':
        return this.uploadToGCS(file, documentId, config);
      default:
        throw new Error(`Unsupported blob storage provider: ${config.provider}`);
    }
  }
  
  // Vector search implementation for user cluster
  async vectorSearch(query: VectorSearchQuery): Promise<VectorSearchResult[]> {
    if (!this.chunksCollection) throw new Error('Collection not initialized');
    
    // Same pipeline as platform, but runs on user's cluster
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
    
    const results = await this.chunksCollection.aggregate(pipeline).toArray();
    
    return results.map(r => ({
      chunkId: r._id.toString(),
      documentId: r.documentId,
      text: r.text,
      score: r.score,
      metadata: r.metadata,
    }));
  }
  
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }
  
  // ... additional method implementations
}
```

### 5.4 Storage Provider Factory

```typescript
// src/lib/rag/storage/factory.ts

import { RAGStorageProvider } from './provider';
import { PlatformStorageProvider } from './platform-provider';
import { UserClusterStorageProvider } from './user-cluster-provider';
import { getOrganizationRAGConfig } from '@/lib/platform/organizations';

// Provider cache to avoid reconnections
const providerCache = new Map<string, RAGStorageProvider>();

export async function getRAGStorageProvider(
  organizationId: string
): Promise<RAGStorageProvider> {
  // Check cache first
  const cacheKey = organizationId;
  if (providerCache.has(cacheKey)) {
    return providerCache.get(cacheKey)!;
  }
  
  // Get organization's RAG configuration
  const config = await getOrganizationRAGConfig(organizationId);
  
  let provider: RAGStorageProvider;
  
  switch (config.mode) {
    case 'platform':
      provider = new PlatformStorageProvider(organizationId);
      break;
      
    case 'user-cluster':
      if (!config.userCluster) {
        throw new Error('User-cluster mode requires userCluster configuration');
      }
      provider = new UserClusterStorageProvider(organizationId, config.userCluster);
      break;
      
    default:
      throw new Error(`Unknown storage mode: ${config.mode}`);
  }
  
  // Initialize provider
  await provider.initialize();
  
  // Cache for reuse
  providerCache.set(cacheKey, provider);
  
  return provider;
}

export function clearProviderCache(organizationId?: string): void {
  if (organizationId) {
    providerCache.delete(organizationId);
  } else {
    providerCache.clear();
  }
}
```

---

## 6. User-Cluster Setup Wizard

### 6.1 Setup Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    User-Cluster RAG Setup Wizard                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Step 1: Cluster Selection                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Choose from existing connections in your vault:                     │   │
│  │  ○ Production Cluster (M30, US-East-1) ✓ Vector Search Available    │   │
│  │  ○ Development Cluster (M10, US-West-2) ✓ Vector Search Available   │   │
│  │  ○ Free Cluster (M0, US-East-1) ✗ Upgrade required for RAG          │   │
│  │  ○ Add new connection...                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Step 2: Database Configuration                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Database name: [ netpad_rag ]                                       │   │
│  │  ☐ Create new database (recommended)                                 │   │
│  │  ☐ Use existing database                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Step 3: Permissions Check                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Checking database user permissions...                               │   │
│  │  ✓ Can read from database                                            │   │
│  │  ✓ Can write to database                                             │   │
│  │  ✓ Can create collections                                            │   │
│  │  ✓ Can create indexes                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Step 4: Vector Index Setup                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Creating vector search index...                                     │   │
│  │  Status: ⏳ Building (typically takes 2-5 minutes)                   │   │
│  │                                                                       │   │
│  │  Index: rag_vector_index                                             │   │
│  │  Dimensions: 1024                                                    │   │
│  │  Similarity: dotProduct                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Step 5: Embedding API Configuration (Optional)                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ☐ Use NetPad's Embedding API (default, included in subscription)   │   │
│  │  ☐ Use your own Atlas Embedding API key                             │   │
│  │     API Key: [ ********************************** ]                   │   │
│  │     (Get your key from Atlas → AI Services → API Keys)              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Step 6: Confirmation                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ✓ User-cluster RAG storage configured successfully!                 │   │
│  │                                                                       │   │
│  │  Summary:                                                            │   │
│  │  • Cluster: Production Cluster (M30)                                 │   │
│  │  • Database: netpad_rag                                              │   │
│  │  • Vector Index: Ready                                               │   │
│  │  • Embedding API: NetPad managed                                     │   │
│  │                                                                       │   │
│  │  [ Complete Setup ]                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Setup API Endpoints

```typescript
// src/app/api/organizations/[organizationId]/rag/setup/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { validateClusterForRAG } from '@/lib/rag/storage/validation';
import { createVectorSearchIndex } from '@/lib/rag/storage/index-management';

export async function POST(
  request: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  const { organizationId } = params;
  const body = await request.json();
  
  const { step, ...stepData } = body;
  
  switch (step) {
    case 'validate-connection':
      return handleValidateConnection(organizationId, stepData);
    case 'check-permissions':
      return handleCheckPermissions(organizationId, stepData);
    case 'create-index':
      return handleCreateIndex(organizationId, stepData);
    case 'configure-embedding-api':
      return handleConfigureEmbeddingAPI(organizationId, stepData);
    case 'complete':
      return handleComplete(organizationId, stepData);
    default:
      return NextResponse.json({ error: 'Unknown step' }, { status: 400 });
  }
}

async function handleValidateConnection(
  organizationId: string,
  data: { connectionId: string }
) {
  const validation = await validateClusterForRAG(organizationId, data.connectionId);
  
  return NextResponse.json({
    valid: validation.isValid,
    clusterTier: validation.clusterTier,
    mongoVersion: validation.mongoVersion,
    vectorSearchAvailable: validation.vectorSearchAvailable,
    issues: validation.issues,
  });
}

async function handleCreateIndex(
  organizationId: string,
  data: { connectionId: string; database: string }
) {
  const result = await createVectorSearchIndex(
    organizationId,
    data.connectionId,
    data.database
  );
  
  return NextResponse.json({
    indexName: result.indexName,
    status: result.status,
    estimatedReadyTime: result.estimatedReadyTime,
  });
}

// ... additional handlers
```

### 6.3 Cluster Validation Service

```typescript
// src/lib/rag/storage/validation.ts

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
  const issues: ValidationIssue[] = [];
  
  // Get connection and connect
  const connection = await getConnectionFromVault(organizationId, connectionId);
  if (!connection) {
    return {
      isValid: false,
      clusterTier: null,
      mongoVersion: null,
      vectorSearchAvailable: false,
      issues: [{
        code: 'CONNECTION_NOT_FOUND',
        severity: 'error',
        message: 'Connection not found in vault',
      }],
    };
  }
  
  const connectionString = await decryptConnectionString(connection.encryptedUri);
  const client = new MongoClient(connectionString);
  
  try {
    await client.connect();
    const adminDb = client.db('admin');
    
    // Get MongoDB version
    const buildInfo = await adminDb.command({ buildInfo: 1 });
    const mongoVersion = buildInfo.version;
    const majorVersion = parseInt(mongoVersion.split('.')[0]);
    
    if (majorVersion < 6) {
      issues.push({
        code: 'MONGO_VERSION_TOO_LOW',
        severity: 'error',
        message: `MongoDB version ${mongoVersion} does not support vector search. Version 6.0+ required.`,
        resolution: 'Upgrade your Atlas cluster to MongoDB 6.0 or higher.',
      });
    }
    
    // Check if this is Atlas (vs self-hosted)
    const isAtlas = connectionString.includes('mongodb.net') ||
                    connectionString.includes('mongodb+srv');
    
    if (!isAtlas) {
      issues.push({
        code: 'NOT_ATLAS_CLUSTER',
        severity: 'error',
        message: 'RAG features require MongoDB Atlas for vector search.',
        resolution: 'Migrate to MongoDB Atlas or use platform storage mode.',
      });
    }
    
    // Attempt to detect cluster tier (heuristic)
    // Full validation requires Atlas Admin API
    let clusterTier = 'unknown';
    let vectorSearchAvailable = false;
    
    try {
      // Try to list search indexes - this fails on M0/M2/M5
      await adminDb.command({
        listSearchIndexes: 'test.test',
      });
      vectorSearchAvailable = true;
      clusterTier = 'M10+';  // At least M10
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not supported') ||
            error.message.includes('requires a dedicated')) {
          issues.push({
            code: 'VECTOR_SEARCH_NOT_AVAILABLE',
            severity: 'error',
            message: 'Vector search is not available on this cluster tier.',
            resolution: 'Upgrade to M10 or higher cluster tier in Atlas.',
          });
          clusterTier = 'M0/M2/M5';
        }
      }
    }
    
    return {
      isValid: issues.filter(i => i.severity === 'error').length === 0,
      clusterTier,
      mongoVersion,
      vectorSearchAvailable,
      issues,
    };
    
  } finally {
    await client.close();
  }
}
```

---

## 7. Migration System

### 7.1 Migration Types

| Migration Path | Trigger | Complexity | Data Movement |
|----------------|---------|------------|---------------|
| Platform → User-Cluster | Pro upgrade to Team, or manual opt-in | Medium | Documents + Embeddings |
| User-Cluster → Platform | Downgrade, or manual request | Medium | Documents + Embeddings |
| Free → Pro (platform) | Subscription upgrade | None | Limits updated only |
| Pro → Team (user-cluster) | Subscription upgrade | Medium | Full migration required |

### 7.2 Migration Service

```typescript
// src/lib/rag/storage/migration.ts

export interface MigrationJob {
  id: string;
  organizationId: string;
  sourceMode: RAGStorageMode;
  targetMode: RAGStorageMode;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: {
    totalDocuments: number;
    migratedDocuments: number;
    totalChunks: number;
    migratedChunks: number;
    totalBytes: number;
    migratedBytes: number;
  };
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export class RAGStorageMigrationService {
  
  async createMigration(
    organizationId: string,
    targetMode: RAGStorageMode,
    targetConfig?: UserClusterConfig
  ): Promise<MigrationJob> {
    // Get current configuration
    const currentConfig = await getOrganizationRAGConfig(organizationId);
    
    if (currentConfig.mode === targetMode) {
      throw new Error('Source and target modes are the same');
    }
    
    // Validate target configuration
    if (targetMode === 'user-cluster') {
      if (!targetConfig) {
        throw new Error('User-cluster migration requires target configuration');
      }
      
      const validation = await validateClusterForRAG(
        organizationId,
        targetConfig.connectionId
      );
      
      if (!validation.isValid) {
        throw new Error(
          `Target cluster validation failed: ${validation.issues.map(i => i.message).join(', ')}`
        );
      }
    }
    
    // Create migration job
    const job: MigrationJob = {
      id: generateId(),
      organizationId,
      sourceMode: currentConfig.mode,
      targetMode,
      status: 'pending',
      progress: {
        totalDocuments: 0,
        migratedDocuments: 0,
        totalChunks: 0,
        migratedChunks: 0,
        totalBytes: 0,
        migratedBytes: 0,
      },
    };
    
    // Store job
    await this.storeMigrationJob(job);
    
    // Queue migration execution
    await this.queueMigration(job.id, targetConfig);
    
    return job;
  }
  
  async executeMigration(jobId: string, targetConfig?: UserClusterConfig): Promise<void> {
    const job = await this.getMigrationJob(jobId);
    if (!job) throw new Error('Migration job not found');
    
    // Update status
    job.status = 'running';
    job.startedAt = new Date();
    await this.updateMigrationJob(job);
    
    try {
      // Get source provider
      const sourceProvider = await getRAGStorageProvider(job.organizationId);
      
      // Create target provider
      let targetProvider: RAGStorageProvider;
      if (job.targetMode === 'platform') {
        targetProvider = new PlatformStorageProvider(job.organizationId);
      } else {
        targetProvider = new UserClusterStorageProvider(job.organizationId, targetConfig!);
      }
      await targetProvider.initialize();
      
      // Ensure vector index exists on target
      await targetProvider.ensureVectorIndex();
      
      // Get all documents from source
      const documents = await sourceProvider.listDocuments('*');  // All forms
      job.progress.totalDocuments = documents.length;
      
      // Migrate each document
      for (const doc of documents) {
        await this.migrateDocument(sourceProvider, targetProvider, doc, job);
        job.progress.migratedDocuments++;
        await this.updateMigrationJob(job);
      }
      
      // Update organization configuration
      await this.updateOrganizationRAGConfig(job.organizationId, {
        mode: job.targetMode,
        ...(targetConfig && { userCluster: targetConfig }),
        migratedFrom: job.sourceMode,
        migrationDate: new Date(),
      });
      
      // Clear provider cache
      clearProviderCache(job.organizationId);
      
      // Mark complete
      job.status = 'completed';
      job.completedAt = new Date();
      await this.updateMigrationJob(job);
      
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      await this.updateMigrationJob(job);
      throw error;
    }
  }
  
  private async migrateDocument(
    source: RAGStorageProvider,
    target: RAGStorageProvider,
    document: RAGDocument,
    job: MigrationJob
  ): Promise<void> {
    // Create document in target
    await target.createDocument({
      formId: document.formId,
      filename: document.filename,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      metadata: document.metadata,
    });
    
    // Get chunks from source
    const chunks = await source.getChunks(document._id.toString());
    job.progress.totalChunks += chunks.length;
    
    // Create chunks in target (including embeddings)
    await target.createChunks(
      document._id.toString(),
      chunks.map(c => ({
        text: c.text,
        embedding: c.embedding,
        metadata: c.metadata,
        pageNumber: c.pageNumber,
        chunkIndex: c.chunkIndex,
      }))
    );
    
    job.progress.migratedChunks += chunks.length;
    
    // Migrate file if using different blob storage
    // (In most cases, blob storage remains the same)
  }
}
```

### 7.3 Migration API

```typescript
// src/app/api/organizations/[organizationId]/rag/migrate/route.ts

export async function POST(
  request: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  const { organizationId } = params;
  const body = await request.json();
  
  const { targetMode, targetConfig } = body;
  
  // Validate user has permission
  const session = await getSession();
  const hasPermission = await checkOrganizationPermission(
    session.userId,
    organizationId,
    'manage:rag'
  );
  
  if (!hasPermission) {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    );
  }
  
  // Validate tier allows target mode
  const subscription = await getOrganizationSubscription(organizationId);
  
  if (targetMode === 'user-cluster' && subscription.tier === 'free') {
    return NextResponse.json(
      { error: 'User-cluster storage requires Pro tier or higher' },
      { status: 400 }
    );
  }
  
  // Create migration
  const migrationService = new RAGStorageMigrationService();
  const job = await migrationService.createMigration(
    organizationId,
    targetMode,
    targetConfig
  );
  
  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    message: 'Migration started. Check status with GET /api/.../rag/migrate/{jobId}',
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  const { organizationId } = params;
  const jobId = request.nextUrl.searchParams.get('jobId');
  
  const migrationService = new RAGStorageMigrationService();
  
  if (jobId) {
    const job = await migrationService.getMigrationJob(jobId);
    return NextResponse.json(job);
  }
  
  // List recent migrations
  const jobs = await migrationService.listMigrationJobs(organizationId);
  return NextResponse.json({ jobs });
}
```

---

## 8. Usage Tracking & Limits

### 8.1 Usage Tracking Schema

```typescript
// src/types/rag-usage.ts

export interface RAGUsageRecord {
  organizationId: string;
  date: string;  // YYYY-MM-DD
  
  // Document metrics
  documentsCreated: number;
  documentsDeleted: number;
  
  // Storage metrics
  storageBytesAdded: number;
  storageBytesRemoved: number;
  
  // Query metrics
  vectorSearchQueries: number;
  rerankingQueries: number;
  
  // Embedding metrics
  embeddingTokensUsed: number;
  
  // Current totals (updated daily)
  totalDocuments: number;
  totalStorageBytes: number;
  totalChunks: number;
}

export interface RAGUsageSummary {
  organizationId: string;
  period: 'day' | 'month';
  
  documents: {
    current: number;
    limit: number;
    utilizationPercent: number;
  };
  
  storage: {
    currentBytes: number;
    limitBytes: number;
    utilizationPercent: number;
  };
  
  queries: {
    today: number;
    todayLimit: number;
    month: number;
    monthLimit: number;
  };
  
  isAtLimit: boolean;
  warnings: string[];
}
```

### 8.2 Usage Tracking Service

```typescript
// src/lib/rag/usage/tracking.ts

export class RAGUsageTrackingService {
  
  async recordDocumentUpload(
    organizationId: string,
    sizeBytes: number,
    chunkCount: number
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    await this.usageCollection.updateOne(
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
    
    // Update totals
    await this.updateTotals(organizationId);
  }
  
  async recordVectorSearchQuery(organizationId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    await this.usageCollection.updateOne(
      { organizationId, date: today },
      {
        $inc: { vectorSearchQueries: 1 },
        $setOnInsert: { organizationId, date: today },
      },
      { upsert: true }
    );
  }
  
  async checkLimits(organizationId: string): Promise<LimitCheckResult> {
    const config = await getOrganizationRAGConfig(organizationId);
    const usage = await this.getUsageSummary(organizationId);
    
    const violations: LimitViolation[] = [];
    
    // Check document limit
    if (config.limits.maxDocuments > 0 &&
        usage.documents.current >= config.limits.maxDocuments) {
      violations.push({
        type: 'documents',
        current: usage.documents.current,
        limit: config.limits.maxDocuments,
        message: `Document limit reached (${config.limits.maxDocuments} documents)`,
      });
    }
    
    // Check storage limit
    if (config.limits.maxStorageBytes > 0 &&
        usage.storage.currentBytes >= config.limits.maxStorageBytes) {
      violations.push({
        type: 'storage',
        current: usage.storage.currentBytes,
        limit: config.limits.maxStorageBytes,
        message: `Storage limit reached (${formatBytes(config.limits.maxStorageBytes)})`,
      });
    }
    
    // Check daily query limit
    if (config.limits.maxQueriesPerDay > 0 &&
        usage.queries.today >= config.limits.maxQueriesPerDay) {
      violations.push({
        type: 'queries_daily',
        current: usage.queries.today,
        limit: config.limits.maxQueriesPerDay,
        message: `Daily query limit reached (${config.limits.maxQueriesPerDay} queries)`,
      });
    }
    
    return {
      canUpload: !violations.some(v => v.type === 'documents' || v.type === 'storage'),
      canQuery: !violations.some(v => v.type === 'queries_daily'),
      violations,
      warnings: this.generateWarnings(usage, config),
    };
  }
  
  private generateWarnings(
    usage: RAGUsageSummary,
    config: RAGStorageConfig
  ): string[] {
    const warnings: string[] = [];
    
    // Warn at 80% utilization
    if (usage.documents.utilizationPercent >= 80 &&
        usage.documents.utilizationPercent < 100) {
      warnings.push(
        `Approaching document limit: ${usage.documents.current}/${config.limits.maxDocuments} documents used`
      );
    }
    
    if (usage.storage.utilizationPercent >= 80 &&
        usage.storage.utilizationPercent < 100) {
      warnings.push(
        `Approaching storage limit: ${formatBytes(usage.storage.currentBytes)} of ${formatBytes(config.limits.maxStorageBytes)} used`
      );
    }
    
    return warnings;
  }
}
```

### 8.3 Limit Enforcement Middleware

```typescript
// src/lib/rag/middleware/limits.ts

export async function enforceRAGLimits(
  organizationId: string,
  operation: 'upload' | 'query'
): Promise<void> {
  const trackingService = new RAGUsageTrackingService();
  const limits = await trackingService.checkLimits(organizationId);
  
  if (operation === 'upload' && !limits.canUpload) {
    const violation = limits.violations.find(
      v => v.type === 'documents' || v.type === 'storage'
    );
    
    throw new RAGLimitError(
      violation?.message || 'Upload limit reached',
      'LIMIT_EXCEEDED',
      {
        type: violation?.type,
        current: violation?.current,
        limit: violation?.limit,
        upgradeUrl: '/settings/subscription',
      }
    );
  }
  
  if (operation === 'query' && !limits.canQuery) {
    const violation = limits.violations.find(
      v => v.type === 'queries_daily'
    );
    
    throw new RAGLimitError(
      violation?.message || 'Query limit reached',
      'LIMIT_EXCEEDED',
      {
        type: violation?.type,
        current: violation?.current,
        limit: violation?.limit,
        resetAt: getEndOfDay(),
        upgradeUrl: '/settings/subscription',
      }
    );
  }
}

export class RAGLimitError extends Error {
  constructor(
    message: string,
    public code: string,
    public details: Record<string, unknown>
  ) {
    super(message);
    this.name = 'RAGLimitError';
  }
}
```

---

## 9. Health Monitoring

### 9.1 Health Check System

```typescript
// src/lib/rag/monitoring/health.ts

export interface RAGHealthStatus {
  organizationId: string;
  storageMode: RAGStorageMode;
  
  overall: 'healthy' | 'degraded' | 'unhealthy';
  
  checks: {
    database: HealthCheck;
    vectorIndex: HealthCheck;
    blobStorage: HealthCheck;
    embeddingAPI: HealthCheck;
  };
  
  latency: {
    vectorSearchP50: number;
    vectorSearchP99: number;
    embeddingP50: number;
    embeddingP99: number;
  };
  
  lastChecked: Date;
}

export interface HealthCheck {
  status: 'pass' | 'warn' | 'fail';
  latencyMs?: number;
  message?: string;
  lastError?: string;
  lastErrorAt?: Date;
}

export class RAGHealthMonitor {
  
  async checkHealth(organizationId: string): Promise<RAGHealthStatus> {
    const provider = await getRAGStorageProvider(organizationId);
    const config = await getOrganizationRAGConfig(organizationId);
    
    const checks = {
      database: await this.checkDatabase(provider),
      vectorIndex: await this.checkVectorIndex(provider),
      blobStorage: await this.checkBlobStorage(config),
      embeddingAPI: await this.checkEmbeddingAPI(),
    };
    
    const overall = this.calculateOverallStatus(checks);
    
    const status: RAGHealthStatus = {
      organizationId,
      storageMode: config.mode,
      overall,
      checks,
      latency: await this.getLatencyMetrics(organizationId),
      lastChecked: new Date(),
    };
    
    // Store status for dashboards
    await this.storeHealthStatus(status);
    
    return status;
  }
  
  private async checkDatabase(provider: RAGStorageProvider): Promise<HealthCheck> {
    const start = Date.now();
    
    try {
      const health = await provider.checkHealth();
      return {
        status: health.healthy ? 'pass' : 'fail',
        latencyMs: Date.now() - start,
        message: health.healthy ? 'Database connection healthy' : undefined,
        lastError: health.errors?.[0],
      };
    } catch (error) {
      return {
        status: 'fail',
        latencyMs: Date.now() - start,
        lastError: error instanceof Error ? error.message : 'Unknown error',
        lastErrorAt: new Date(),
      };
    }
  }
  
  private async checkVectorIndex(provider: RAGStorageProvider): Promise<HealthCheck> {
    const start = Date.now();
    
    try {
      const indexStatus = await provider.getVectorIndexStatus();
      
      return {
        status: indexStatus.status === 'ready' ? 'pass' :
                indexStatus.status === 'building' ? 'warn' : 'fail',
        latencyMs: Date.now() - start,
        message: `Vector index status: ${indexStatus.status}`,
      };
    } catch (error) {
      return {
        status: 'fail',
        latencyMs: Date.now() - start,
        lastError: error instanceof Error ? error.message : 'Unknown error',
        lastErrorAt: new Date(),
      };
    }
  }
  
  private calculateOverallStatus(
    checks: Record<string, HealthCheck>
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(checks).map(c => c.status);
    
    if (statuses.some(s => s === 'fail')) {
      // Database or vector index failure = unhealthy
      if (checks.database.status === 'fail' ||
          checks.vectorIndex.status === 'fail') {
        return 'unhealthy';
      }
      return 'degraded';
    }
    
    if (statuses.some(s => s === 'warn')) {
      return 'degraded';
    }
    
    return 'healthy';
  }
}
```

### 9.2 Alerting Configuration

```typescript
// src/lib/rag/monitoring/alerts.ts

export interface AlertConfig {
  organizationId: string;
  
  alerts: {
    healthDegraded: boolean;
    healthUnhealthy: boolean;
    approachingLimits: boolean;
    limitReached: boolean;
    highLatency: boolean;
    indexBuildFailed: boolean;
  };
  
  channels: {
    email: string[];
    slack?: {
      webhookUrl: string;
      channel: string;
    };
    pagerDuty?: {
      serviceKey: string;
      severity: 'critical' | 'error' | 'warning' | 'info';
    };
  };
  
  thresholds: {
    latencyWarningMs: number;  // Default: 500ms
    latencyCriticalMs: number; // Default: 2000ms
    limitWarningPercent: number; // Default: 80%
  };
}

export async function sendRAGAlert(
  organizationId: string,
  alert: RAGAlert
): Promise<void> {
  const config = await getAlertConfig(organizationId);
  
  // Check if alert type is enabled
  if (!config.alerts[alert.type]) return;
  
  // Send to configured channels
  if (config.channels.email.length > 0) {
    await sendEmailAlert(config.channels.email, alert);
  }
  
  if (config.channels.slack) {
    await sendSlackAlert(config.channels.slack, alert);
  }
  
  if (config.channels.pagerDuty && alert.severity === 'critical') {
    await sendPagerDutyAlert(config.channels.pagerDuty, alert);
  }
}
```

---

## 10. Environment Configuration

### 10.1 Environment Variables

```bash
# =============================================================================
# RAG Storage Configuration
# =============================================================================

# Platform cluster connection (NetPad infrastructure)
NETPAD_PLATFORM_MONGODB_URI=mongodb+srv://...
NETPAD_PLATFORM_MONGODB_DATABASE=netpad_platform

# Vercel Blob storage (for document files)
BLOB_READ_WRITE_TOKEN=vercel_blob_...

# Atlas Embedding API (recommended over direct Voyage)
ATLAS_MODEL_API_KEY=voyage_...

# Legacy Voyage API (fallback)
VOYAGE_API_KEY=pa-...

# Embedding configuration
VOYAGE_MODEL=voyage-4
VOYAGE_EMBEDDING_DIMENSIONS=1024
VOYAGE_RERANK_ENABLED=true
VOYAGE_RERANK_MODEL=rerank-2.5-lite

# Storage defaults
RAG_DEFAULT_STORAGE_MODE=platform
RAG_PLATFORM_REGION=us-east

# Limits (can be overridden per tier in database)
RAG_FREE_MAX_DOCUMENTS=3
RAG_FREE_MAX_STORAGE_MB=25
RAG_FREE_MAX_QUERIES_DAY=50
RAG_FREE_MAX_QUERIES_MONTH=1500

RAG_PRO_MAX_DOCUMENTS=50
RAG_PRO_MAX_STORAGE_MB=500
# Pro tier has unlimited queries

# Health monitoring
RAG_HEALTH_CHECK_INTERVAL_MS=60000
RAG_LATENCY_WARNING_MS=500
RAG_LATENCY_CRITICAL_MS=2000

# =============================================================================
# User-Cluster Configuration Defaults
# =============================================================================

RAG_USER_CLUSTER_MIN_MONGO_VERSION=6.0
RAG_USER_CLUSTER_MIN_TIER=M10
```

### 10.2 Feature Flags

```typescript
// src/lib/rag/feature-flags.ts

export const RAG_FEATURE_FLAGS = {
  // Enable user-cluster storage option for Pro tier
  USER_CLUSTER_FOR_PRO: process.env.RAG_USER_CLUSTER_FOR_PRO === 'true',
  
  // Enable two-stage retrieval (vector search + reranking)
  TWO_STAGE_RETRIEVAL: process.env.RAG_TWO_STAGE_RETRIEVAL !== 'false',
  
  // Enable shared embedding space optimization
  SHARED_EMBEDDING_SPACE: process.env.RAG_SHARED_EMBEDDING_SPACE === 'true',
  
  // Enable custom blob storage for user-cluster mode
  CUSTOM_BLOB_STORAGE: process.env.RAG_CUSTOM_BLOB_STORAGE === 'true',
  
  // Migration features
  ENABLE_MIGRATIONS: process.env.RAG_ENABLE_MIGRATIONS !== 'false',
  
  // Health monitoring
  HEALTH_MONITORING: process.env.RAG_HEALTH_MONITORING !== 'false',
};
```

---

## 11. API Reference

### 11.1 RAG Configuration APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/organizations/{orgId}/rag/config` | GET | Get current RAG configuration |
| `/api/organizations/{orgId}/rag/config` | PUT | Update RAG configuration |
| `/api/organizations/{orgId}/rag/setup` | POST | Run setup wizard step |
| `/api/organizations/{orgId}/rag/migrate` | POST | Start storage migration |
| `/api/organizations/{orgId}/rag/migrate/{jobId}` | GET | Get migration status |
| `/api/organizations/{orgId}/rag/usage` | GET | Get usage summary |
| `/api/organizations/{orgId}/rag/health` | GET | Get health status |

### 11.2 RAG Document APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/forms/{formId}/rag/documents` | GET | List documents |
| `/api/forms/{formId}/rag/documents` | POST | Upload document |
| `/api/forms/{formId}/rag/documents/{docId}` | GET | Get document |
| `/api/forms/{formId}/rag/documents/{docId}` | DELETE | Delete document |
| `/api/forms/{formId}/rag/search` | POST | Vector search |

---

## 12. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

| Task | Priority | Effort |
|------|----------|--------|
| Create storage provider interface | P0 | 4h |
| Implement PlatformStorageProvider | P0 | 8h |
| Add usage tracking service | P0 | 6h |
| Implement limit enforcement | P0 | 4h |
| Create RAG configuration schema | P0 | 2h |
| Add tier-based defaults | P0 | 2h |

### Phase 2: User-Cluster Support (Week 3-4)

| Task | Priority | Effort |
|------|----------|--------|
| Implement UserClusterStorageProvider | P0 | 12h |
| Create cluster validation service | P0 | 6h |
| Build setup wizard UI | P1 | 8h |
| Add connection vault integration | P0 | 4h |
| Create vector index automation | P0 | 6h |

### Phase 3: Migration & Monitoring (Week 5-6)

| Task | Priority | Effort |
|------|----------|--------|
| Implement migration service | P1 | 12h |
| Add migration API endpoints | P1 | 4h |
| Build health monitoring | P1 | 8h |
| Create alerting system | P2 | 6h |
| Add usage dashboards | P2 | 8h |

### Phase 4: Polish & Launch (Week 7-8)

| Task | Priority | Effort |
|------|----------|--------|
| Documentation | P0 | 8h |
| End-to-end testing | P0 | 12h |
| Performance optimization | P1 | 8h |
| Security audit | P0 | 4h |
| Launch preparation | P0 | 4h |

---

## 13. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Free tier RAG activation rate | >20% | Users who upload at least 1 document |
| Free → Pro conversion (RAG users) | >10% | Within 90 days of RAG activation |
| User-cluster setup success rate | >90% | Successful wizard completions |
| Vector search P99 latency | <500ms | Monitoring |
| Health check pass rate | >99.5% | Monitoring |
| Migration success rate | >99% | Migration job completions |

---

## 14. Security Considerations

### 14.1 Data Isolation

- **Platform storage:** Organization data isolated by database (netpad_rag_{orgId})
- **User-cluster:** Customer controls all access; NetPad requires minimal permissions
- **Embeddings:** Stored with document metadata; cannot be reverse-engineered to text

### 14.2 Access Control

- All RAG APIs require organization membership
- Document upload/delete requires `rag:write` permission
- Configuration changes require `rag:admin` permission
- Migration requires organization owner or admin role

### 14.3 Encryption

- **Platform storage:** Encrypted at rest (Atlas encryption)
- **User-cluster:** Inherits customer's Atlas encryption settings
- **Blob storage:** Encrypted at rest (Vercel Blob / customer storage)
- **API keys:** Encrypted in connection vault (AES-256-GCM)

---

## 15. Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| **Platform storage** | RAG data stored in NetPad's managed MongoDB cluster |
| **User-cluster storage** | RAG data stored in customer's own MongoDB Atlas cluster |
| **Vector index** | MongoDB Atlas Vector Search index for semantic search |
| **RAG chunk** | Text segment with embedding vector for retrieval |

### B. Related Documents

- voyage-ai-integration-spec.md - Embedding and reranking API integration
- Strategic RAG Architecture Document - Business model and tier analysis
- NetPad Memory Bank - Platform context and positioning

### C. Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-28 | Michael Lynn | Initial specification |

---

*End of Specification*