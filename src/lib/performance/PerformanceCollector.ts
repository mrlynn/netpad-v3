/**
 * Performance Collector (Client-Side)
 * Batches and transmits performance metrics to the server
 */

import type { PerformanceMetric, CollectorConfig } from './types';

const DEFAULT_CONFIG: CollectorConfig = {
  batchSize: 10,
  flushInterval: 5000,
  endpoint: '/api/telemetry/performance',
  enabled: process.env.NODE_ENV !== 'test',
};

class PerformanceCollector {
  private buffer: PerformanceMetric[] = [];
  private config: CollectorConfig;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private sessionId: string;

  constructor(config: Partial<CollectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = this.generateSessionId();

    if (typeof window !== 'undefined' && this.config.enabled) {
      this.startFlushTimer();
      window.addEventListener('beforeunload', () => this.flush());
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flush();
        }
      });
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private startFlushTimer(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = setInterval(
      () => this.flush(),
      this.config.flushInterval
    );
  }

  /**
   * Record a performance metric
   */
  record(metric: PerformanceMetric): void {
    if (!this.config.enabled) return;

    this.buffer.push({
      ...metric,
      sessionId: this.sessionId,
    } as PerformanceMetric);

    if (this.buffer.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Flush all buffered metrics to the server
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const metrics = [...this.buffer];
    this.buffer = [];

    try {
      // Use sendBeacon for reliability during page unload
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const success = navigator.sendBeacon(
          this.config.endpoint,
          JSON.stringify({ metrics, timestamp: Date.now() })
        );
        if (!success) {
          // Fallback to fetch if sendBeacon fails
          await this.sendViaFetch(metrics);
        }
      } else {
        await this.sendViaFetch(metrics);
      }
    } catch (error) {
      // Re-add metrics to buffer on failure
      this.buffer.unshift(...metrics);
      console.error('[Performance] Failed to flush metrics:', error);
    }
  }

  private async sendViaFetch(metrics: PerformanceMetric[]): Promise<void> {
    await fetch(this.config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metrics, timestamp: Date.now() }),
      keepalive: true,
    });
  }

  /**
   * Start a manual timer and return a function to stop it
   */
  startTimer(name: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.record({
        type: 'custom',
        name,
        duration: Math.round(duration),
        timestamp: Date.now(),
      });
    };
  }

  /**
   * Get the current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get the number of buffered metrics
   */
  getBufferSize(): number {
    return this.buffer.length;
  }

  /**
   * Clear all buffered metrics without sending
   */
  clear(): void {
    this.buffer = [];
  }

  /**
   * Update configuration
   */
  configure(config: Partial<CollectorConfig>): void {
    this.config = { ...this.config, ...config };
    if (typeof window !== 'undefined' && this.config.enabled) {
      this.startFlushTimer();
    }
  }

  /**
   * Disable the collector
   */
  disable(): void {
    this.config.enabled = false;
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Enable the collector
   */
  enable(): void {
    this.config.enabled = true;
    if (typeof window !== 'undefined') {
      this.startFlushTimer();
    }
  }
}

// Singleton export
export const performanceCollector = new PerformanceCollector();
