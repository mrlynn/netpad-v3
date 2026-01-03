/**
 * MongoDB Atlas Data API Client
 *
 * Enables document operations via the Atlas Data API:
 * - findOne, find, insertOne, insertMany
 * - updateOne, updateMany, deleteOne, deleteMany
 * - aggregate
 *
 * The Data API provides a serverless way to access MongoDB data
 * without managing connection strings or drivers.
 *
 * @see https://www.mongodb.com/docs/atlas/app-services/data-api/
 */

// ============================================
// Types
// ============================================

export interface DataApiConfig {
  appId: string;           // Data API App ID (from Atlas)
  apiKey: string;          // Data API Key
  baseUrl?: string;        // Custom endpoint (defaults to data.mongodb-api.com)
}

export interface DataApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export type DataApiAction =
  | 'findOne'
  | 'find'
  | 'insertOne'
  | 'insertMany'
  | 'updateOne'
  | 'updateMany'
  | 'deleteOne'
  | 'deleteMany'
  | 'aggregate';

export interface FindOptions {
  projection?: Record<string, unknown>;
  sort?: Record<string, number>;
  limit?: number;
  skip?: number;
}

export interface UpdateOptions {
  upsert?: boolean;
}

// ============================================
// Atlas Data API Client
// ============================================

export class AtlasDataApiClient {
  private appId: string;
  private apiKey: string;
  private baseUrl: string;

  constructor(config: DataApiConfig) {
    this.appId = config.appId;
    this.apiKey = config.apiKey;
    // The Data API URL format is: https://data.mongodb-api.com/app/{appId}/endpoint/data/v1
    this.baseUrl = config.baseUrl || `https://data.mongodb-api.com/app/${config.appId}/endpoint/data/v1`;
  }

  /**
   * Check if the client is configured with valid credentials
   */
  isConfigured(): boolean {
    return !!(this.appId && this.apiKey);
  }

  /**
   * Make a request to the Data API
   */
  private async request<T>(
    action: DataApiAction,
    payload: Record<string, unknown>
  ): Promise<DataApiResponse<T>> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: {
          code: 'NOT_CONFIGURED',
          message: 'Data API credentials not configured',
        },
      };
    }

    const url = `${this.baseUrl}/action/${action}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/ejson',
          'Accept': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorData: any = null;
        try {
          errorData = await response.json();
        } catch {
          // Ignore JSON parse errors for error responses
        }

        console.error(`[DataAPI] Request failed: ${response.status}`, errorData);

        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: errorData?.error || errorData?.message || response.statusText,
          },
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('[DataAPI] Request error:', error);
      return {
        success: false,
        error: {
          code: 'REQUEST_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  // ============================================
  // Read Operations
  // ============================================

  /**
   * Find a single document
   */
  async findOne(
    dataSource: string,
    database: string,
    collection: string,
    filter: Record<string, unknown>,
    projection?: Record<string, unknown>
  ): Promise<DataApiResponse<{ document: Record<string, unknown> | null }>> {
    return this.request('findOne', {
      dataSource,
      database,
      collection,
      filter,
      ...(projection && { projection }),
    });
  }

  /**
   * Find multiple documents
   */
  async find(
    dataSource: string,
    database: string,
    collection: string,
    filter: Record<string, unknown>,
    options?: FindOptions
  ): Promise<DataApiResponse<{ documents: Record<string, unknown>[] }>> {
    return this.request('find', {
      dataSource,
      database,
      collection,
      filter,
      ...(options?.projection && { projection: options.projection }),
      ...(options?.sort && { sort: options.sort }),
      ...(options?.limit && { limit: options.limit }),
      ...(options?.skip && { skip: options.skip }),
    });
  }

  /**
   * Run an aggregation pipeline
   */
  async aggregate(
    dataSource: string,
    database: string,
    collection: string,
    pipeline: Record<string, unknown>[]
  ): Promise<DataApiResponse<{ documents: Record<string, unknown>[] }>> {
    return this.request('aggregate', {
      dataSource,
      database,
      collection,
      pipeline,
    });
  }

  // ============================================
  // Write Operations
  // ============================================

  /**
   * Insert a single document
   */
  async insertOne(
    dataSource: string,
    database: string,
    collection: string,
    document: Record<string, unknown>
  ): Promise<DataApiResponse<{ insertedId: string }>> {
    return this.request('insertOne', {
      dataSource,
      database,
      collection,
      document,
    });
  }

  /**
   * Insert multiple documents
   */
  async insertMany(
    dataSource: string,
    database: string,
    collection: string,
    documents: Record<string, unknown>[]
  ): Promise<DataApiResponse<{ insertedIds: string[] }>> {
    return this.request('insertMany', {
      dataSource,
      database,
      collection,
      documents,
    });
  }

  /**
   * Update a single document
   */
  async updateOne(
    dataSource: string,
    database: string,
    collection: string,
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: UpdateOptions
  ): Promise<DataApiResponse<{ matchedCount: number; modifiedCount: number; upsertedId?: string }>> {
    return this.request('updateOne', {
      dataSource,
      database,
      collection,
      filter,
      update,
      ...(options?.upsert !== undefined && { upsert: options.upsert }),
    });
  }

  /**
   * Update multiple documents
   */
  async updateMany(
    dataSource: string,
    database: string,
    collection: string,
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: UpdateOptions
  ): Promise<DataApiResponse<{ matchedCount: number; modifiedCount: number; upsertedId?: string }>> {
    return this.request('updateMany', {
      dataSource,
      database,
      collection,
      filter,
      update,
      ...(options?.upsert !== undefined && { upsert: options.upsert }),
    });
  }

  /**
   * Delete a single document
   */
  async deleteOne(
    dataSource: string,
    database: string,
    collection: string,
    filter: Record<string, unknown>
  ): Promise<DataApiResponse<{ deletedCount: number }>> {
    return this.request('deleteOne', {
      dataSource,
      database,
      collection,
      filter,
    });
  }

  /**
   * Delete multiple documents
   */
  async deleteMany(
    dataSource: string,
    database: string,
    collection: string,
    filter: Record<string, unknown>
  ): Promise<DataApiResponse<{ deletedCount: number }>> {
    return this.request('deleteMany', {
      dataSource,
      database,
      collection,
      filter,
    });
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create an Atlas Data API client from stored integration credentials
 *
 * @param organizationId - The NetPad organization ID
 * @param credentialId - The integration credential ID
 * @returns The Data API client, or null if credentials not found
 */
export async function createDataApiClientFromCredential(
  organizationId: string,
  credentialId: string
): Promise<AtlasDataApiClient | null> {
  // Import dynamically to avoid circular dependencies
  const { getAtlasDataApiCredentials } = await import('@/lib/platform/integrationCredentials');

  const creds = await getAtlasDataApiCredentials(organizationId, credentialId);

  if (!creds) {
    console.warn(`[DataApiClient] Could not retrieve credentials for ${credentialId}`);
    return null;
  }

  return new AtlasDataApiClient({
    appId: creds.appId,
    apiKey: creds.apiKey,
  });
}
