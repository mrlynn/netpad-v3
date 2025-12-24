/**
 * Data Import Service
 * Orchestrates the import process from file upload to MongoDB insertion
 */

import { MongoClient, ObjectId, Db, Collection } from 'mongodb';
import {
  ImportJob,
  ImportJobStatus,
  ImportProgress,
  ImportSourceConfig,
  ImportMappingConfig,
  InferredSchema,
  ImportRowError,
  GeneratedFormConfig,
  FormGenerationOptions,
} from '@/types/dataImport';
import { FieldConfig, FormConfiguration } from '@/types/form';
import { parseData, parseExcel, ParseResult, getPreview } from './parser';
import { inferSchema, generateDefaultMappings } from './schemaInference';
import { transformBatch } from './transformer';
import { generateSecureId } from '@/lib/encryption';

export interface ImportServiceConfig {
  platformDb: Db;
  getTargetClient: (vaultId: string) => Promise<MongoClient>;
  batchSize?: number;
  maxErrors?: number;
}

export class ImportService {
  private config: ImportServiceConfig;
  private importJobsCollection: Collection<ImportJob>;

  constructor(config: ImportServiceConfig) {
    this.config = config;
    this.importJobsCollection = config.platformDb.collection('import_jobs');
  }

  /**
   * Create a new import job
   */
  async createImportJob(params: {
    organizationId: string;
    createdBy: string;
    sourceFile: {
      name: string;
      size: number;
      mimeType: string;
      blobUrl?: string;
    };
    sourceConfig: ImportSourceConfig;
    targetVaultId: string;
    targetDatabase: string;
    targetCollection: string;
    createCollection?: boolean;
    errorHandling?: {
      strategy: 'stop' | 'skip' | 'log';
      maxErrors?: number;
    };
  }): Promise<ImportJob> {
    const importId = generateSecureId('import');

    const job: ImportJob = {
      importId,
      organizationId: params.organizationId,
      createdBy: params.createdBy,
      sourceFile: params.sourceFile,
      sourceConfig: params.sourceConfig,
      targetVaultId: params.targetVaultId,
      targetDatabase: params.targetDatabase,
      targetCollection: params.targetCollection,
      createCollection: params.createCollection,
      status: 'pending',
      progress: {
        phase: 'upload',
        totalRows: 0,
        processedRows: 0,
        successCount: 0,
        errorCount: 0,
        skipCount: 0,
        percentComplete: 0,
      },
      errorHandling: params.errorHandling || {
        strategy: 'skip',
        maxErrors: 100,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.importJobsCollection.insertOne(job);
    return job;
  }

  /**
   * Get an import job by ID
   */
  async getImportJob(importId: string): Promise<ImportJob | null> {
    return this.importJobsCollection.findOne({ importId });
  }

  /**
   * Update import job status
   */
  async updateJobStatus(
    importId: string,
    status: ImportJobStatus,
    progress?: Partial<ImportProgress>
  ): Promise<void> {
    const update: any = {
      $set: {
        status,
        updatedAt: new Date(),
      },
    };

    if (progress) {
      for (const [key, value] of Object.entries(progress)) {
        update.$set[`progress.${key}`] = value;
      }
    }

    await this.importJobsCollection.updateOne({ importId }, update);
  }

  /**
   * Analyze data and infer schema
   */
  async analyzeData(
    importId: string,
    content: string | ArrayBuffer,
    sampleSize?: number
  ): Promise<{
    schema: InferredSchema;
    preview: { headers: string[]; rows: any[][]; totalRows: number };
    suggestedMappings: ReturnType<typeof generateDefaultMappings>;
  }> {
    const job = await this.getImportJob(importId);
    if (!job) {
      throw new Error(`Import job ${importId} not found`);
    }

    await this.updateJobStatus(importId, 'analyzing', { phase: 'analyze' });

    let parseResult: ParseResult;

    // Parse based on format
    if (
      job.sourceConfig.format === 'xlsx' ||
      job.sourceConfig.format === 'xls'
    ) {
      if (!(content instanceof ArrayBuffer)) {
        throw new Error('Excel files require ArrayBuffer content');
      }
      parseResult = await parseExcel(content, {
        ...job.sourceConfig,
        maxRows: sampleSize || 1000,
      });
    } else {
      if (typeof content !== 'string') {
        content = new TextDecoder(job.sourceConfig.encoding || 'utf-8').decode(
          content
        );
      }
      parseResult = parseData(content as string, {
        ...job.sourceConfig,
        maxRows: sampleSize || 1000,
      });
    }

    // Infer schema
    const schema = inferSchema(parseResult.headers, parseResult.records, {
      sampleSize: parseResult.records.length,
      suggestedCollection: job.targetCollection,
    });

    // Generate default mappings
    const suggestedMappings = generateDefaultMappings(schema);

    // Get preview
    const preview = getPreview(parseResult, 10);

    // Update job with schema
    await this.importJobsCollection.updateOne(
      { importId },
      {
        $set: {
          inferredSchema: schema,
          status: 'mapping',
          'progress.totalRows': parseResult.totalRows,
          'progress.phase': 'analyze',
          updatedAt: new Date(),
        },
      }
    );

    return { schema, preview, suggestedMappings };
  }

  /**
   * Configure mapping for import
   */
  async configureMappings(
    importId: string,
    mappingConfig: ImportMappingConfig,
    content: string | ArrayBuffer
  ): Promise<{
    valid: boolean;
    errors: ImportRowError[];
    warnings: string[];
    sampleOutput: any[];
  }> {
    const job = await this.getImportJob(importId);
    if (!job) {
      throw new Error(`Import job ${importId} not found`);
    }

    await this.updateJobStatus(importId, 'validating', { phase: 'validate' });

    // Parse data (sample for validation)
    let parseResult: ParseResult;

    if (
      job.sourceConfig.format === 'xlsx' ||
      job.sourceConfig.format === 'xls'
    ) {
      if (!(content instanceof ArrayBuffer)) {
        throw new Error('Excel files require ArrayBuffer content');
      }
      parseResult = await parseExcel(content, {
        ...job.sourceConfig,
        maxRows: 100, // Sample for validation
      });
    } else {
      if (typeof content !== 'string') {
        content = new TextDecoder(job.sourceConfig.encoding || 'utf-8').decode(
          content
        );
      }
      parseResult = parseData(content as string, {
        ...job.sourceConfig,
        maxRows: 100,
      });
    }

    // Transform sample
    const transformResult = transformBatch(parseResult.records, mappingConfig, {
      stopOnError: false,
      maxErrors: 10,
    });

    // Collect warnings
    const warnings: string[] = [];
    if (transformResult.skipped > 0) {
      warnings.push(`${transformResult.skipped} rows would be skipped`);
    }
    if (transformResult.errors.length > 0) {
      warnings.push(`${transformResult.errors.length} validation errors found`);
    }

    // Update job with mapping config
    await this.importJobsCollection.updateOne(
      { importId },
      {
        $set: {
          mappingConfig,
          status: transformResult.errors.length > 0 ? 'mapping' : 'validating',
          updatedAt: new Date(),
        },
      }
    );

    return {
      valid: transformResult.errors.length === 0,
      errors: transformResult.errors,
      warnings,
      sampleOutput: transformResult.documents.slice(0, 5),
    };
  }

  /**
   * Execute the import
   */
  async executeImport(
    importId: string,
    content: string | ArrayBuffer,
    options?: {
      dryRun?: boolean;
      onProgress?: (progress: ImportProgress) => void;
    }
  ): Promise<ImportJob> {
    const job = await this.getImportJob(importId);
    if (!job) {
      throw new Error(`Import job ${importId} not found`);
    }

    if (!job.mappingConfig) {
      throw new Error('Mapping configuration not set');
    }

    await this.updateJobStatus(importId, 'importing', {
      phase: 'import',
      processedRows: 0,
      successCount: 0,
      errorCount: 0,
      skipCount: 0,
    });

    const startTime = Date.now();

    // Parse all data
    let parseResult: ParseResult;

    if (
      job.sourceConfig.format === 'xlsx' ||
      job.sourceConfig.format === 'xls'
    ) {
      if (!(content instanceof ArrayBuffer)) {
        throw new Error('Excel files require ArrayBuffer content');
      }
      parseResult = await parseExcel(content, job.sourceConfig);
    } else {
      if (typeof content !== 'string') {
        content = new TextDecoder(job.sourceConfig.encoding || 'utf-8').decode(
          content
        );
      }
      parseResult = parseData(content as string, job.sourceConfig);
    }

    const totalRows = parseResult.records.length;
    const batchSize = this.config.batchSize || 100;
    const allErrors: ImportRowError[] = [];
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    let insertedDocIds: string[] = [];

    // Get target collection
    let targetCollection: Collection | null = null;
    if (!options?.dryRun) {
      try {
        const targetClient = await this.config.getTargetClient(job.targetVaultId);
        const targetDb = targetClient.db(job.targetDatabase);

        // Create collection if needed
        if (job.createCollection) {
          const collections = await targetDb.listCollections({ name: job.targetCollection }).toArray();
          if (collections.length === 0) {
            await targetDb.createCollection(job.targetCollection);
          }
        }

        targetCollection = targetDb.collection(job.targetCollection);
      } catch (error) {
        await this.updateJobStatus(importId, 'failed');
        await this.importJobsCollection.updateOne(
          { importId },
          {
            $set: {
              'results.errors': [{
                rowNumber: 0,
                error: `Failed to connect to target database: ${error instanceof Error ? error.message : 'Unknown error'}`,
                errorCode: 'UNKNOWN',
              }],
              updatedAt: new Date(),
            },
          }
        );
        throw error;
      }
    }

    // Process in batches
    const totalBatches = Math.ceil(totalRows / batchSize);

    for (let batch = 0; batch < totalBatches; batch++) {
      const start = batch * batchSize;
      const end = Math.min(start + batchSize, totalRows);
      const batchRecords = parseResult.records.slice(start, end);

      // Transform batch
      const transformResult = transformBatch(batchRecords, job.mappingConfig!, {
        stopOnError: job.errorHandling.strategy === 'stop',
        maxErrors: job.errorHandling.maxErrors,
      });

      // Collect errors
      allErrors.push(...transformResult.errors);
      skipCount += transformResult.skipped;
      errorCount += transformResult.errors.length;

      // Check if we should stop
      if (
        job.errorHandling.strategy === 'stop' &&
        transformResult.errors.length > 0
      ) {
        break;
      }

      // Insert documents
      if (!options?.dryRun && targetCollection && transformResult.documents.length > 0) {
        try {
          // Add metadata
          const documentsWithMeta = transformResult.documents.map(doc => ({
            ...doc,
            _importedAt: new Date(),
            _importId: importId,
          }));

          const insertResult = await targetCollection.insertMany(documentsWithMeta, {
            ordered: false,
          });

          successCount += insertResult.insertedCount;
          insertedDocIds.push(
            ...Object.values(insertResult.insertedIds).map(id => id.toString())
          );
        } catch (error: any) {
          // Handle bulk write errors
          if (error.writeErrors) {
            for (const writeError of error.writeErrors) {
              allErrors.push({
                rowNumber: start + writeError.index + 1,
                error: writeError.errmsg,
                errorCode: 'UNKNOWN',
              });
              errorCount++;
            }
            // Some may have succeeded
            successCount += transformResult.documents.length - error.writeErrors.length;
          } else {
            throw error;
          }
        }
      } else if (options?.dryRun) {
        successCount += transformResult.documents.length;
      }

      // Update progress
      const progress: ImportProgress = {
        phase: 'import',
        totalRows,
        processedRows: end,
        successCount,
        errorCount,
        skipCount,
        percentComplete: Math.round((end / totalRows) * 100),
        currentBatch: batch + 1,
        totalBatches,
        estimatedTimeRemaining:
          end > 0
            ? Math.round(((Date.now() - startTime) / end) * (totalRows - end) / 1000)
            : undefined,
      };

      await this.updateJobStatus(importId, 'importing', progress);

      if (options?.onProgress) {
        options.onProgress(progress);
      }

      // Check error limit
      if (
        job.errorHandling.maxErrors &&
        errorCount >= job.errorHandling.maxErrors
      ) {
        break;
      }
    }

    // Finalize
    const finalStatus: ImportJobStatus =
      errorCount > 0 && successCount === 0 ? 'failed' : 'completed';

    await this.importJobsCollection.updateOne(
      { importId },
      {
        $set: {
          status: finalStatus,
          completedAt: new Date(),
          results: {
            totalProcessed: parseResult.records.length,
            inserted: successCount,
            updated: 0, // Would be non-zero if upsert
            skipped: skipCount,
            failed: errorCount,
            errors: allErrors.slice(0, 100), // Keep first 100 errors
            errorCount: allErrors.length,
            sampleInserted: insertedDocIds.slice(0, 5),
          },
          progress: {
            phase: 'import',
            totalRows,
            processedRows: totalRows,
            successCount,
            errorCount,
            skipCount,
            percentComplete: 100,
          },
          updatedAt: new Date(),
        },
      }
    );

    return (await this.getImportJob(importId))!;
  }

  /**
   * Generate form configuration from import
   */
  async generateFormConfig(
    importId: string,
    options: FormGenerationOptions
  ): Promise<GeneratedFormConfig> {
    const job = await this.getImportJob(importId);
    if (!job) {
      throw new Error(`Import job ${importId} not found`);
    }

    if (!job.inferredSchema) {
      throw new Error('Schema not inferred yet');
    }

    const fieldConfigs: FieldConfig[] = [];

    for (const field of job.inferredSchema.fields) {
      // Skip excluded fields
      if (options.excludeFields?.includes(field.originalName)) {
        continue;
      }

      // Skip non-included fields if not including all
      if (!options.includeAllFields && !field.isRequired) {
        continue;
      }

      // Map type (allow overrides)
      const fieldType =
        options.fieldTypeOverrides?.[field.originalName] ||
        mapInferredTypeToFieldType(field.inferredType);

      const config: FieldConfig = {
        path: field.suggestedPath,
        label: field.suggestedLabel,
        type: fieldType,
        included: true,
        required: field.isRequired,
        source: 'schema',
      };

      // Add validation if requested
      if (options.generateValidation && field.suggestedValidation) {
        config.validation = {};

        if (field.suggestedValidation.min !== undefined) {
          config.validation.min = field.suggestedValidation.min;
        }
        if (field.suggestedValidation.max !== undefined) {
          config.validation.max = field.suggestedValidation.max;
        }
        if (field.suggestedValidation.options) {
          config.validation.options = field.suggestedValidation.options;
        }
      }

      fieldConfigs.push(config);
    }

    const formConfig: GeneratedFormConfig = {
      name: options.formName || `${job.targetCollection} Form`,
      description:
        options.formDescription ||
        `Form for managing ${job.targetCollection} data`,
      collection: job.targetCollection,
      database: job.targetDatabase,
      fieldConfigs,
      dataSource: {
        vaultId: job.targetVaultId,
        collection: job.targetCollection,
      },
      generatedFrom: {
        importId,
        sourceFile: job.sourceFile.name,
        generatedAt: new Date().toISOString(),
      },
    };

    // Store generated config
    await this.importJobsCollection.updateOne(
      { importId },
      {
        $set: {
          generatedFieldConfigs: fieldConfigs,
          updatedAt: new Date(),
        },
      }
    );

    return formConfig;
  }

  /**
   * Cancel an import job
   */
  async cancelImport(importId: string): Promise<void> {
    const job = await this.getImportJob(importId);
    if (!job) {
      throw new Error(`Import job ${importId} not found`);
    }

    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      throw new Error(`Cannot cancel import in ${job.status} status`);
    }

    await this.updateJobStatus(importId, 'cancelled');
  }

  /**
   * List import jobs for an organization
   */
  async listImportJobs(
    organizationId: string,
    options?: {
      status?: ImportJobStatus;
      limit?: number;
      skip?: number;
    }
  ): Promise<{ jobs: ImportJob[]; total: number }> {
    const filter: any = { organizationId };
    if (options?.status) {
      filter.status = options.status;
    }

    const [jobs, total] = await Promise.all([
      this.importJobsCollection
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(options?.skip || 0)
        .limit(options?.limit || 20)
        .toArray(),
      this.importJobsCollection.countDocuments(filter),
    ]);

    return { jobs, total };
  }

  /**
   * Delete an import job and optionally its imported data
   */
  async deleteImportJob(
    importId: string,
    options?: { deleteImportedData?: boolean }
  ): Promise<void> {
    const job = await this.getImportJob(importId);
    if (!job) {
      throw new Error(`Import job ${importId} not found`);
    }

    // Delete imported data if requested
    if (options?.deleteImportedData && job.results?.inserted) {
      try {
        const targetClient = await this.config.getTargetClient(job.targetVaultId);
        const targetDb = targetClient.db(job.targetDatabase);
        const targetCollection = targetDb.collection(job.targetCollection);

        await targetCollection.deleteMany({ _importId: importId });
      } catch (error) {
        console.error('Failed to delete imported data:', error);
      }
    }

    await this.importJobsCollection.deleteOne({ importId });
  }
}

/**
 * Map inferred data type to form field type
 */
function mapInferredTypeToFieldType(inferredType: string): string {
  const typeMap: Record<string, string> = {
    string: 'short-answer',
    number: 'number',
    integer: 'number',
    decimal: 'number',
    boolean: 'yes-no',
    date: 'date',
    datetime: 'datetime',
    time: 'time',
    email: 'email',
    url: 'url',
    phone: 'phone',
    objectId: 'short-answer',
    array: 'checkboxes',
    object: 'long-answer',
    null: 'short-answer',
    mixed: 'short-answer',
  };

  return typeMap[inferredType] || 'short-answer';
}
