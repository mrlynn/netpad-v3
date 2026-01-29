/**
 * RAG Usage Tracking Service
 *
 * Tracks RAG feature usage for limit enforcement and analytics
 */

import { getPlatformDb } from '@/lib/platform/db';
import {
  RAGStorageConfig,
  RAGUsageRecord,
  RAGUsageSummary,
  LimitCheckResult,
  LimitViolation,
  calculateUtilization,
  formatBytes,
} from '@/types/rag-storage';
import { getRAGStorageProvider } from '../storage/factory';

/**
 * RAG Usage Tracking Service
 */
export class RAGUsageTrackingService {
  /**
   * Record a document upload
   */
  async recordDocumentUpload(organizationId: string, sizeBytes: number): Promise<void> {
    const db = await getPlatformDb();
    const today = this.getTodayDate();

    await db.collection<RAGUsageRecord>('rag_usage').updateOne(
      { organizationId, date: today },
      {
        $inc: {
          documentsCreated: 1,
          storageBytesAdded: sizeBytes,
        },
        $setOnInsert: {
          organizationId,
          date: today,
          documentsDeleted: 0,
          storageBytesRemoved: 0,
          vectorSearchQueries: 0,
          rerankingQueries: 0,
          embeddingTokensUsed: 0,
          totalDocuments: 0,
          totalStorageBytes: 0,
          totalChunks: 0,
          createdAt: new Date(),
        },
        $set: {
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    // Update totals
    await this.updateTotals(organizationId);
  }

  /**
   * Record a document deletion
   */
  async recordDocumentDelete(organizationId: string, sizeBytes: number): Promise<void> {
    const db = await getPlatformDb();
    const today = this.getTodayDate();

    await db.collection<RAGUsageRecord>('rag_usage').updateOne(
      { organizationId, date: today },
      {
        $inc: {
          documentsDeleted: 1,
          storageBytesRemoved: sizeBytes,
        },
        $setOnInsert: {
          organizationId,
          date: today,
          documentsCreated: 0,
          storageBytesAdded: 0,
          vectorSearchQueries: 0,
          rerankingQueries: 0,
          embeddingTokensUsed: 0,
          totalDocuments: 0,
          totalStorageBytes: 0,
          totalChunks: 0,
          createdAt: new Date(),
        },
        $set: {
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    // Update totals
    await this.updateTotals(organizationId);
  }

  /**
   * Record a vector search query
   */
  async recordVectorSearchQuery(organizationId: string): Promise<void> {
    const db = await getPlatformDb();
    const today = this.getTodayDate();

    await db.collection<RAGUsageRecord>('rag_usage').updateOne(
      { organizationId, date: today },
      {
        $inc: { vectorSearchQueries: 1 },
        $setOnInsert: {
          organizationId,
          date: today,
          documentsCreated: 0,
          documentsDeleted: 0,
          storageBytesAdded: 0,
          storageBytesRemoved: 0,
          rerankingQueries: 0,
          embeddingTokensUsed: 0,
          totalDocuments: 0,
          totalStorageBytes: 0,
          totalChunks: 0,
          createdAt: new Date(),
        },
        $set: {
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  /**
   * Record a reranking query
   */
  async recordRerankingQuery(organizationId: string): Promise<void> {
    const db = await getPlatformDb();
    const today = this.getTodayDate();

    await db.collection<RAGUsageRecord>('rag_usage').updateOne(
      { organizationId, date: today },
      {
        $inc: { rerankingQueries: 1 },
        $setOnInsert: {
          organizationId,
          date: today,
          documentsCreated: 0,
          documentsDeleted: 0,
          storageBytesAdded: 0,
          storageBytesRemoved: 0,
          vectorSearchQueries: 0,
          embeddingTokensUsed: 0,
          totalDocuments: 0,
          totalStorageBytes: 0,
          totalChunks: 0,
          createdAt: new Date(),
        },
        $set: {
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  /**
   * Record embedding token usage
   */
  async recordEmbeddingTokens(organizationId: string, tokens: number): Promise<void> {
    const db = await getPlatformDb();
    const today = this.getTodayDate();

    await db.collection<RAGUsageRecord>('rag_usage').updateOne(
      { organizationId, date: today },
      {
        $inc: { embeddingTokensUsed: tokens },
        $setOnInsert: {
          organizationId,
          date: today,
          documentsCreated: 0,
          documentsDeleted: 0,
          storageBytesAdded: 0,
          storageBytesRemoved: 0,
          vectorSearchQueries: 0,
          rerankingQueries: 0,
          totalDocuments: 0,
          totalStorageBytes: 0,
          totalChunks: 0,
          createdAt: new Date(),
        },
        $set: {
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  /**
   * Update total document count and storage from actual provider
   */
  private async updateTotals(organizationId: string): Promise<void> {
    try {
      const provider = await getRAGStorageProvider(organizationId);
      const usage = await provider.getUsage();

      const db = await getPlatformDb();
      const today = this.getTodayDate();

      await db.collection<RAGUsageRecord>('rag_usage').updateOne(
        { organizationId, date: today },
        {
          $set: {
            totalDocuments: usage.documentCount,
            totalStorageBytes: usage.storageBytes,
            updatedAt: new Date(),
          },
        }
      );
    } catch (error) {
      console.error('[RAGUsageTracking] Failed to update totals:', error);
      // Don't throw - usage tracking should not break main operations
    }
  }

  /**
   * Get usage summary for an organization
   */
  async getUsageSummary(
    organizationId: string,
    config: RAGStorageConfig
  ): Promise<RAGUsageSummary> {
    const db = await getPlatformDb();
    const today = this.getTodayDate();
    const monthStart = this.getMonthStart();

    // Get current totals directly from storage provider
    // This ensures we always have accurate counts regardless of when documents were uploaded
    let currentDocs = 0;
    let currentBytes = 0;
    try {
      const provider = await getRAGStorageProvider(organizationId);
      const usage = await provider.getUsage();
      currentDocs = usage.documentCount;
      currentBytes = usage.storageBytes;
    } catch (error) {
      console.error('[RAGUsageTracking] Failed to get provider usage:', error);
      // Fall back to today's usage record if provider fails
      const todayUsage = await db.collection<RAGUsageRecord>('rag_usage').findOne({
        organizationId,
        date: today,
      });
      currentDocs = todayUsage?.totalDocuments || 0;
      currentBytes = todayUsage?.totalStorageBytes || 0;
    }

    // Get today's query usage
    const todayUsage = await db.collection<RAGUsageRecord>('rag_usage').findOne({
      organizationId,
      date: today,
    });

    // Get month's usage
    const monthUsage = await db
      .collection<RAGUsageRecord>('rag_usage')
      .aggregate([
        {
          $match: {
            organizationId,
            date: { $gte: monthStart },
          },
        },
        {
          $group: {
            _id: null,
            totalQueries: { $sum: '$vectorSearchQueries' },
          },
        },
      ])
      .toArray();

    const queriesToday = todayUsage?.vectorSearchQueries || 0;
    const queriesMonth = monthUsage[0]?.totalQueries || 0;

    const summary: RAGUsageSummary = {
      organizationId,
      period: 'day',
      documents: {
        current: currentDocs,
        limit: config.limits.maxDocuments,
        utilizationPercent: calculateUtilization(currentDocs, config.limits.maxDocuments),
      },
      storage: {
        currentBytes,
        limitBytes: config.limits.maxStorageBytes,
        utilizationPercent: calculateUtilization(currentBytes, config.limits.maxStorageBytes),
      },
      queries: {
        today: queriesToday,
        todayLimit: config.limits.maxQueriesPerDay,
        month: queriesMonth,
        monthLimit: config.limits.maxQueriesPerMonth,
      },
      isAtLimit: false,
      warnings: [],
    };

    // Generate warnings for approaching limits
    summary.warnings = this.generateWarnings(summary, config);

    // Check if at limit
    summary.isAtLimit = this.checkIfAtLimit(summary, config);

    return summary;
  }

  /**
   * Check if organization can perform specific operations
   */
  async checkLimits(
    organizationId: string,
    config: RAGStorageConfig
  ): Promise<LimitCheckResult> {
    const summary = await this.getUsageSummary(organizationId, config);
    const violations: LimitViolation[] = [];

    // Check document limit
    if (
      config.limits.maxDocuments > 0 &&
      summary.documents.current >= config.limits.maxDocuments
    ) {
      violations.push({
        type: 'documents',
        current: summary.documents.current,
        limit: config.limits.maxDocuments,
        message: `Document limit reached (${config.limits.maxDocuments} documents)`,
        resolution: 'Upgrade to a higher tier for more documents',
      });
    }

    // Check storage limit
    if (
      config.limits.maxStorageBytes > 0 &&
      summary.storage.currentBytes >= config.limits.maxStorageBytes
    ) {
      violations.push({
        type: 'storage',
        current: summary.storage.currentBytes,
        limit: config.limits.maxStorageBytes,
        message: `Storage limit reached (${formatBytes(config.limits.maxStorageBytes)})`,
        resolution: 'Upgrade to a higher tier for more storage',
      });
    }

    // Check daily query limit
    if (
      config.limits.maxQueriesPerDay > 0 &&
      summary.queries.today >= config.limits.maxQueriesPerDay
    ) {
      violations.push({
        type: 'queries_daily',
        current: summary.queries.today,
        limit: config.limits.maxQueriesPerDay,
        message: `Daily query limit reached (${config.limits.maxQueriesPerDay} queries)`,
        resolution: 'Limit will reset tomorrow, or upgrade for unlimited queries',
      });
    }

    // Check monthly query limit
    if (
      config.limits.maxQueriesPerMonth > 0 &&
      summary.queries.month >= config.limits.maxQueriesPerMonth
    ) {
      violations.push({
        type: 'queries_monthly',
        current: summary.queries.month,
        limit: config.limits.maxQueriesPerMonth,
        message: `Monthly query limit reached (${config.limits.maxQueriesPerMonth} queries)`,
        resolution: 'Limit will reset next month, or upgrade for unlimited queries',
      });
    }

    return {
      canUpload: !violations.some(v => v.type === 'documents' || v.type === 'storage'),
      canQuery: !violations.some(v => v.type === 'queries_daily' || v.type === 'queries_monthly'),
      violations,
      warnings: summary.warnings,
    };
  }

  /**
   * Generate warnings for approaching limits
   */
  private generateWarnings(summary: RAGUsageSummary, config: RAGStorageConfig): string[] {
    const warnings: string[] = [];

    // Warn at 80% utilization
    if (
      summary.documents.utilizationPercent >= 80 &&
      summary.documents.utilizationPercent < 100
    ) {
      warnings.push(
        `Approaching document limit: ${summary.documents.current}/${config.limits.maxDocuments} documents used (${Math.round(summary.documents.utilizationPercent)}%)`
      );
    }

    if (
      summary.storage.utilizationPercent >= 80 &&
      summary.storage.utilizationPercent < 100
    ) {
      warnings.push(
        `Approaching storage limit: ${formatBytes(summary.storage.currentBytes)} of ${formatBytes(config.limits.maxStorageBytes)} used (${Math.round(summary.storage.utilizationPercent)}%)`
      );
    }

    if (
      config.limits.maxQueriesPerDay > 0 &&
      summary.queries.today / config.limits.maxQueriesPerDay >= 0.8 &&
      summary.queries.today < config.limits.maxQueriesPerDay
    ) {
      warnings.push(
        `Approaching daily query limit: ${summary.queries.today}/${config.limits.maxQueriesPerDay} queries used today`
      );
    }

    return warnings;
  }

  /**
   * Check if any limit is currently reached
   */
  private checkIfAtLimit(summary: RAGUsageSummary, config: RAGStorageConfig): boolean {
    return (
      (config.limits.maxDocuments > 0 &&
        summary.documents.current >= config.limits.maxDocuments) ||
      (config.limits.maxStorageBytes > 0 &&
        summary.storage.currentBytes >= config.limits.maxStorageBytes) ||
      (config.limits.maxQueriesPerDay > 0 &&
        summary.queries.today >= config.limits.maxQueriesPerDay) ||
      (config.limits.maxQueriesPerMonth > 0 &&
        summary.queries.month >= config.limits.maxQueriesPerMonth)
    );
  }

  /**
   * Get today's date in YYYY-MM-DD format
   */
  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Get month start date in YYYY-MM-DD format
   */
  private getMonthStart(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  }
}

/**
 * Global singleton instance
 */
export const ragUsageTracker = new RAGUsageTrackingService();
