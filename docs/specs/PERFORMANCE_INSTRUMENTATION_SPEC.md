# NetPad Performance Instrumentation Specification

**Version:** 1.0.0
**Status:** Draft
**Author:** Michael / Engineering
**Target Completion:** 1 week from approval
**Created:** January 25, 2025

---

## 1. Executive Summary

NetPad users are experiencing slow screen-to-screen navigation. Before optimizing, we need systematic instrumentation to identify bottlenecks and measure improvements. This spec defines a performance measurement system that tracks navigation timing, API latency, database query performance, and client-side rendering metrics.

### Goals

- Establish quantitative baselines for all key user journeys
- Identify the top 5 performance bottlenecks
- Enable continuous performance monitoring
- Create automated benchmarks for regression detection

### Non-Goals (v1)

- Real-time alerting
- User-facing performance dashboards
- Distributed tracing across microservices
- Performance optimization (that comes after measurement)

---

## 2. Success Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Instrumentation coverage | % of API routes with timing | 100% |
| Navigation tracking | All client-side navigations logged | 100% |
| Database query visibility | % of queries with timing | 100% |
| Benchmark automation | Key journeys measured automatically | 7 journeys |
| Baseline established | Documented current performance | Week 1 |

---

## 3. Performance Targets

| Interaction | Current (estimate) | Target | Industry Benchmark |
|-------------|-------------------|--------|-------------------|
| Initial page load (cold) | ? ms | <2000ms | <3000ms (acceptable) |
| Navigation between screens | ? ms | <300ms | <500ms (feels instant) |
| Form builder load | ? ms | <1000ms | - |
| Workflow editor load | ? ms | <1500ms | - |
| API response (simple CRUD) | ? ms | <200ms | <500ms |
| API response (complex query) | ? ms | <500ms | <1000ms |

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ NavigationTimer │  │ RenderProfiler  │  │ NetworkObserver │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                    │           │
│           └────────────────────┼────────────────────┘           │
│                                │                                │
│                    ┌───────────▼───────────┐                    │
│                    │  PerformanceCollector │                    │
│                    └───────────┬───────────┘                    │
└────────────────────────────────┼────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     /api/telemetry      │
                    └────────────┬────────────┘
                                 │
┌────────────────────────────────┼────────────────────────────────┐
│                         Server                                  │
│                                │                                │
│  ┌─────────────────┐  ┌───────▼───────┐  ┌─────────────────┐   │
│  │  API Middleware │  │ TelemetryStore│  │  DB Query Timer │   │
│  │   (withTiming)  │  │               │  │  (timedQuery)   │   │
│  └────────┬────────┘  └───────┬───────┘  └────────┬────────┘   │
│           │                   │                   │            │
│           └───────────────────┼───────────────────┘            │
│                               │                                │
│                   ┌───────────▼───────────┐                    │
│                   │   Performance Logs    │                    │
│                   │   (structured JSON)   │                    │
│                   └───────────────────────┘                    │
└────────────────────────────────────────────────────────────────┘
```

---

## 5. Component Specifications

### 5.1 Client-Side Navigation Timer

**Purpose:** Track time between route changes, including hydration and data fetching.

**File:** `src/lib/performance/NavigationTimer.tsx`

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { performanceCollector } from './PerformanceCollector';

interface NavigationMetric {
  type: 'navigation';
  from: string;
  to: string;
  duration: number;
  timestamp: number;
  // Web Vitals
  ttfb?: number;        // Time to First Byte
  fcp?: number;         // First Contentful Paint
  lcp?: number;         // Largest Contentful Paint
  // Custom metrics
  hydrationTime?: number;
  dataFetchTime?: number;
}

export function NavigationTimer(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navigationStart = useRef<number>(performance.now());
  const previousPath = useRef<string>('');
  const isInitialLoad = useRef<boolean>(true);

  // Track route changes
  useEffect(() => {
    const currentPath = pathname + (searchParams?.toString() ? `?${searchParams}` : '');
    const endTime = performance.now();
    const duration = endTime - navigationStart.current;

    if (previousPath.current && previousPath.current !== currentPath) {
      const metric: NavigationMetric = {
        type: 'navigation',
        from: previousPath.current,
        to: currentPath,
        duration: Math.round(duration),
        timestamp: Date.now(),
      };

      // Capture Web Vitals if available
      if (typeof window !== 'undefined' && 'performance' in window) {
        const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navEntry) {
          metric.ttfb = Math.round(navEntry.responseStart - navEntry.requestStart);
        }
      }

      performanceCollector.record(metric);

      // Console logging for development
      if (process.env.NODE_ENV === 'development') {
        const status = duration > 1000 ? '🔴' : duration > 500 ? '🟡' : '🟢';
        console.log(`${status} [NAV] ${metric.from} → ${metric.to}: ${duration.toFixed(0)}ms`);
      }
    }

    // Handle initial page load
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      const initialLoadMetric: NavigationMetric = {
        type: 'navigation',
        from: 'initial',
        to: currentPath,
        duration: Math.round(performance.now()),
        timestamp: Date.now(),
      };
      performanceCollector.record(initialLoadMetric);
    }

    previousPath.current = currentPath;
    navigationStart.current = performance.now();
  }, [pathname, searchParams]);

  return null;
}
```

**Integration:** Add to root layout

```typescript
// src/app/layout.tsx
import { NavigationTimer } from '@/lib/performance/NavigationTimer';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavigationTimer />
        {children}
      </body>
    </html>
  );
}
```

---

### 5.2 Performance Collector (Client)

**Purpose:** Batch and transmit performance metrics to the server.

**File:** `src/lib/performance/PerformanceCollector.ts`

```typescript
type PerformanceMetric =
  | NavigationMetric
  | RenderMetric
  | NetworkMetric
  | CustomMetric;

interface CollectorConfig {
  batchSize: number;
  flushInterval: number;  // ms
  endpoint: string;
  enabled: boolean;
}

const DEFAULT_CONFIG: CollectorConfig = {
  batchSize: 10,
  flushInterval: 5000,
  endpoint: '/api/telemetry/performance',
  enabled: process.env.NODE_ENV !== 'test',
};

class PerformanceCollector {
  private buffer: PerformanceMetric[] = [];
  private config: CollectorConfig;
  private flushTimer: NodeJS.Timeout | null = null;
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
    this.flushTimer = setInterval(() => this.flush(), this.config.flushInterval);
  }

  record(metric: PerformanceMetric): void {
    if (!this.config.enabled) return;

    this.buffer.push({
      ...metric,
      sessionId: this.sessionId,
    });

    if (this.buffer.length >= this.config.batchSize) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const metrics = [...this.buffer];
    this.buffer = [];

    try {
      // Use sendBeacon for reliability during page unload
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          this.config.endpoint,
          JSON.stringify({ metrics, timestamp: Date.now() })
        );
      } else {
        await fetch(this.config.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metrics, timestamp: Date.now() }),
          keepalive: true,
        });
      }
    } catch (error) {
      // Re-add metrics to buffer on failure
      this.buffer.unshift(...metrics);
      console.error('[Performance] Failed to flush metrics:', error);
    }
  }

  // Manual timing helper
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
}

// Singleton export
export const performanceCollector = new PerformanceCollector();
```

---

### 5.3 API Timing Middleware

**Purpose:** Automatically time all API route handlers.

**File:** `src/lib/performance/withTiming.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { performanceLogger } from './PerformanceLogger';

interface TimingContext {
  startTime: number;
  route: string;
  method: string;
  queries: QueryTiming[];
}

interface QueryTiming {
  operation: string;
  collection?: string;
  duration: number;
}

// AsyncLocalStorage for tracking nested query timings
import { AsyncLocalStorage } from 'async_hooks';
export const timingContext = new AsyncLocalStorage<TimingContext>();

export function withTiming<T extends any[]>(
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    const startTime = performance.now();
    const route = req.nextUrl.pathname;
    const method = req.method;

    const context: TimingContext = {
      startTime,
      route,
      method,
      queries: [],
    };

    try {
      // Run handler with timing context
      const response = await timingContext.run(context, () => handler(req, ...args));

      const duration = performance.now() - startTime;

      // Add timing headers
      response.headers.set('X-Response-Time', `${Math.round(duration)}ms`);
      response.headers.set('Server-Timing', `total;dur=${Math.round(duration)}`);

      // Log the request
      performanceLogger.logAPIRequest({
        route,
        method,
        duration: Math.round(duration),
        statusCode: response.status,
        queries: context.queries,
        timestamp: Date.now(),
      });

      return response;
    } catch (error) {
      const duration = performance.now() - startTime;

      performanceLogger.logAPIRequest({
        route,
        method,
        duration: Math.round(duration),
        statusCode: 500,
        error: error instanceof Error ? error.message : 'Unknown error',
        queries: context.queries,
        timestamp: Date.now(),
      });

      throw error;
    }
  };
}

// Helper to wrap existing handlers
export function wrapAPIRoute(handler: Function) {
  return withTiming(handler as any);
}
```

**Usage in API routes:**

```typescript
// src/app/api/forms/route.ts
import { withTiming } from '@/lib/performance/withTiming';
import { NextRequest, NextResponse } from 'next/server';

async function handleGET(req: NextRequest) {
  // Your existing handler logic
  const forms = await db.collection('forms').find({}).toArray();
  return NextResponse.json({ forms });
}

async function handlePOST(req: NextRequest) {
  // Your existing handler logic
  const body = await req.json();
  const result = await db.collection('forms').insertOne(body);
  return NextResponse.json({ id: result.insertedId });
}

export const GET = withTiming(handleGET);
export const POST = withTiming(handlePOST);
```

---

### 5.4 Database Query Timer

**Purpose:** Track individual MongoDB query performance.

**File:** `src/lib/performance/timedQuery.ts`

```typescript
import { timingContext } from './withTiming';
import { performanceLogger } from './PerformanceLogger';

interface QueryOptions {
  operation: string;
  collection?: string;
  filter?: object;
  // Set to true for queries that are expected to be slow
  allowSlow?: boolean;
}

const SLOW_QUERY_THRESHOLD_MS = 100;

export async function timedQuery<T>(
  options: QueryOptions,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  const { operation, collection, allowSlow = false } = options;

  try {
    const result = await queryFn();
    const duration = performance.now() - start;
    const roundedDuration = Math.round(duration);

    // Add to request context if available
    const context = timingContext.getStore();
    if (context) {
      context.queries.push({
        operation,
        collection,
        duration: roundedDuration,
      });
    }

    // Log slow queries
    if (duration > SLOW_QUERY_THRESHOLD_MS && !allowSlow) {
      performanceLogger.logSlowQuery({
        operation,
        collection,
        duration: roundedDuration,
        filter: options.filter,
        timestamp: Date.now(),
      });
    }

    // Development logging
    if (process.env.NODE_ENV === 'development') {
      const status = duration > 100 ? '🔴' : duration > 50 ? '🟡' : '🟢';
      console.log(`${status} [DB] ${operation}${collection ? ` (${collection})` : ''}: ${roundedDuration}ms`);
    }

    return result;
  } catch (error) {
    const duration = performance.now() - start;

    performanceLogger.logQueryError({
      operation,
      collection,
      duration: Math.round(duration),
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    });

    throw error;
  }
}

// Convenience wrapper for common operations
export function createTimedCollection(db: any, collectionName: string) {
  const collection = db.collection(collectionName);

  return {
    find: (filter: object = {}, options?: object) =>
      timedQuery(
        { operation: 'find', collection: collectionName, filter },
        () => collection.find(filter, options).toArray()
      ),

    findOne: (filter: object, options?: object) =>
      timedQuery(
        { operation: 'findOne', collection: collectionName, filter },
        () => collection.findOne(filter, options)
      ),

    insertOne: (doc: object) =>
      timedQuery(
        { operation: 'insertOne', collection: collectionName },
        () => collection.insertOne(doc)
      ),

    insertMany: (docs: object[]) =>
      timedQuery(
        { operation: 'insertMany', collection: collectionName },
        () => collection.insertMany(docs)
      ),

    updateOne: (filter: object, update: object, options?: object) =>
      timedQuery(
        { operation: 'updateOne', collection: collectionName, filter },
        () => collection.updateOne(filter, update, options)
      ),

    updateMany: (filter: object, update: object, options?: object) =>
      timedQuery(
        { operation: 'updateMany', collection: collectionName, filter },
        () => collection.updateMany(filter, update, options)
      ),

    deleteOne: (filter: object) =>
      timedQuery(
        { operation: 'deleteOne', collection: collectionName, filter },
        () => collection.deleteOne(filter)
      ),

    deleteMany: (filter: object) =>
      timedQuery(
        { operation: 'deleteMany', collection: collectionName, filter },
        () => collection.deleteMany(filter)
      ),

    aggregate: (pipeline: object[]) =>
      timedQuery(
        { operation: 'aggregate', collection: collectionName, allowSlow: true },
        () => collection.aggregate(pipeline).toArray()
      ),

    countDocuments: (filter: object = {}) =>
      timedQuery(
        { operation: 'countDocuments', collection: collectionName, filter },
        () => collection.countDocuments(filter)
      ),

    // Pass through to original collection for operations not wrapped
    raw: collection,
  };
}
```

**Usage:**

```typescript
// Option 1: Wrap individual queries
const forms = await timedQuery(
  { operation: 'find', collection: 'forms' },
  () => db.collection('forms').find({ organizationId }).toArray()
);

// Option 2: Create a timed collection wrapper
const formsCollection = createTimedCollection(db, 'forms');
const forms = await formsCollection.find({ organizationId });
const form = await formsCollection.findOne({ _id: formId });
```

---

### 5.5 Performance Logger (Server)

**Purpose:** Centralized structured logging for all performance metrics.

**File:** `src/lib/performance/PerformanceLogger.ts`

```typescript
interface APIRequestLog {
  route: string;
  method: string;
  duration: number;
  statusCode: number;
  queries: Array<{
    operation: string;
    collection?: string;
    duration: number;
  }>;
  error?: string;
  timestamp: number;
}

interface SlowQueryLog {
  operation: string;
  collection?: string;
  duration: number;
  filter?: object;
  timestamp: number;
}

interface QueryErrorLog {
  operation: string;
  collection?: string;
  duration: number;
  error: string;
  timestamp: number;
}

interface ClientMetricsBatch {
  metrics: Array<{
    type: string;
    [key: string]: any;
  }>;
  timestamp: number;
}

class PerformanceLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  logAPIRequest(log: APIRequestLog): void {
    const { route, method, duration, statusCode, queries } = log;

    // Calculate total DB time
    const dbTime = queries.reduce((sum, q) => sum + q.duration, 0);
    const serverTime = duration - dbTime;

    const logEntry = {
      level: duration > 1000 ? 'warn' : 'info',
      type: 'api_request',
      ...log,
      dbTime,
      serverTime,
      queryCount: queries.length,
    };

    // Structured JSON logging for production
    if (!this.isDevelopment) {
      console.log(JSON.stringify(logEntry));
    } else {
      // Pretty logging for development
      const status = duration > 1000 ? '🔴' : duration > 500 ? '🟡' : '🟢';
      console.log(
        `${status} [API] ${method} ${route}: ${duration}ms ` +
        `(server: ${serverTime}ms, db: ${dbTime}ms, queries: ${queries.length})`
      );

      if (queries.length > 0 && duration > 500) {
        console.log('  Queries:', queries.map(q =>
          `${q.operation}${q.collection ? `(${q.collection})` : ''}: ${q.duration}ms`
        ).join(', '));
      }
    }
  }

  logSlowQuery(log: SlowQueryLog): void {
    const logEntry = {
      level: 'warn',
      type: 'slow_query',
      ...log,
    };

    if (!this.isDevelopment) {
      console.log(JSON.stringify(logEntry));
    } else {
      console.warn(
        `🐢 [SLOW QUERY] ${log.operation}` +
        `${log.collection ? ` (${log.collection})` : ''}: ${log.duration}ms`
      );
    }
  }

  logQueryError(log: QueryErrorLog): void {
    const logEntry = {
      level: 'error',
      type: 'query_error',
      ...log,
    };

    if (!this.isDevelopment) {
      console.log(JSON.stringify(logEntry));
    } else {
      console.error(
        `❌ [DB ERROR] ${log.operation}` +
        `${log.collection ? ` (${log.collection})` : ''}: ${log.error}`
      );
    }
  }

  logClientMetrics(batch: ClientMetricsBatch): void {
    const logEntry = {
      level: 'info',
      type: 'client_metrics',
      count: batch.metrics.length,
      metrics: batch.metrics,
      timestamp: batch.timestamp,
    };

    if (!this.isDevelopment) {
      console.log(JSON.stringify(logEntry));
    } else {
      batch.metrics.forEach(metric => {
        if (metric.type === 'navigation') {
          const status = metric.duration > 1000 ? '🔴' : metric.duration > 500 ? '🟡' : '🟢';
          console.log(
            `${status} [CLIENT NAV] ${metric.from} → ${metric.to}: ${metric.duration}ms`
          );
        }
      });
    }
  }
}

export const performanceLogger = new PerformanceLogger();
```

---

### 5.6 Telemetry API Endpoint

**Purpose:** Receive client-side metrics.

**File:** `src/app/api/telemetry/performance/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { performanceLogger } from '@/lib/performance/PerformanceLogger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate payload
    if (!body.metrics || !Array.isArray(body.metrics)) {
      return NextResponse.json(
        { error: 'Invalid payload: metrics array required' },
        { status: 400 }
      );
    }

    // Log the metrics
    performanceLogger.logClientMetrics(body);

    return NextResponse.json({ received: body.metrics.length });
  } catch (error) {
    console.error('[Telemetry] Error processing metrics:', error);
    return NextResponse.json(
      { error: 'Failed to process metrics' },
      { status: 500 }
    );
  }
}

// Allow beacon requests (no CORS preflight)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
```

---

### 5.7 Automated Benchmark Script

**Purpose:** Reproducible performance measurement of key user journeys.

**File:** `scripts/benchmark.ts`

```typescript
import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs/promises';

interface BenchmarkConfig {
  baseUrl: string;
  warmupRuns: number;
  measurementRuns: number;
  outputFile: string;
}

interface JourneyStep {
  name: string;
  action: (page: Page) => Promise<void>;
  waitFor?: string; // CSS selector to wait for
}

interface Journey {
  name: string;
  steps: JourneyStep[];
}

interface StepResult {
  name: string;
  durations: number[];
  mean: number;
  p50: number;
  p95: number;
  min: number;
  max: number;
}

interface JourneyResult {
  name: string;
  steps: StepResult[];
  totalMean: number;
}

interface BenchmarkResults {
  timestamp: string;
  config: BenchmarkConfig;
  journeys: JourneyResult[];
  summary: {
    totalJourneys: number;
    totalSteps: number;
    slowestStep: { journey: string; step: string; p95: number };
    fastestStep: { journey: string; step: string; p95: number };
  };
}

const DEFAULT_CONFIG: BenchmarkConfig = {
  baseUrl: process.env.BENCHMARK_URL || 'http://localhost:3000',
  warmupRuns: 1,
  measurementRuns: 3,
  outputFile: 'benchmark-results.json',
};

// Define user journeys to benchmark
const JOURNEYS: Journey[] = [
  {
    name: 'Dashboard to Form Builder',
    steps: [
      {
        name: 'Load Dashboard',
        action: async (page) => {
          await page.goto('/dashboard', { waitUntil: 'networkidle' });
        },
        waitFor: '[data-testid="dashboard-loaded"]',
      },
      {
        name: 'Navigate to Forms',
        action: async (page) => {
          await page.click('[data-testid="nav-forms"]');
        },
        waitFor: '[data-testid="forms-list"]',
      },
      {
        name: 'Open New Form',
        action: async (page) => {
          await page.click('[data-testid="new-form-button"]');
        },
        waitFor: '[data-testid="form-builder"]',
      },
    ],
  },
  {
    name: 'Dashboard to Workflow Editor',
    steps: [
      {
        name: 'Load Dashboard',
        action: async (page) => {
          await page.goto('/dashboard', { waitUntil: 'networkidle' });
        },
        waitFor: '[data-testid="dashboard-loaded"]',
      },
      {
        name: 'Navigate to Workflows',
        action: async (page) => {
          await page.click('[data-testid="nav-workflows"]');
        },
        waitFor: '[data-testid="workflows-list"]',
      },
      {
        name: 'Open New Workflow',
        action: async (page) => {
          await page.click('[data-testid="new-workflow-button"]');
        },
        waitFor: '[data-testid="workflow-editor"]',
      },
    ],
  },
  {
    name: 'Application Navigation',
    steps: [
      {
        name: 'Load Applications List',
        action: async (page) => {
          await page.goto('/applications', { waitUntil: 'networkidle' });
        },
        waitFor: '[data-testid="applications-list"]',
      },
      {
        name: 'Open First Application',
        action: async (page) => {
          await page.click('[data-testid="application-card"]:first-child');
        },
        waitFor: '[data-testid="application-detail"]',
      },
      {
        name: 'Navigate to Application Forms',
        action: async (page) => {
          await page.click('[data-testid="app-forms-tab"]');
        },
        waitFor: '[data-testid="app-forms-list"]',
      },
    ],
  },
  {
    name: 'Form Submission Flow',
    steps: [
      {
        name: 'Load Form List',
        action: async (page) => {
          await page.goto('/forms', { waitUntil: 'networkidle' });
        },
        waitFor: '[data-testid="forms-list"]',
      },
      {
        name: 'Open First Form',
        action: async (page) => {
          await page.click('[data-testid="form-row"]:first-child');
        },
        waitFor: '[data-testid="form-detail"]',
      },
      {
        name: 'View Submissions',
        action: async (page) => {
          await page.click('[data-testid="submissions-tab"]');
        },
        waitFor: '[data-testid="submissions-table"]',
      },
    ],
  },
  {
    name: 'Settings Navigation',
    steps: [
      {
        name: 'Load Dashboard',
        action: async (page) => {
          await page.goto('/dashboard', { waitUntil: 'networkidle' });
        },
        waitFor: '[data-testid="dashboard-loaded"]',
      },
      {
        name: 'Open Settings',
        action: async (page) => {
          await page.click('[data-testid="nav-settings"]');
        },
        waitFor: '[data-testid="settings-page"]',
      },
      {
        name: 'Navigate to Connections',
        action: async (page) => {
          await page.click('[data-testid="settings-connections"]');
        },
        waitFor: '[data-testid="connections-list"]',
      },
    ],
  },
  {
    name: 'Template Gallery',
    steps: [
      {
        name: 'Load Templates',
        action: async (page) => {
          await page.goto('/templates', { waitUntil: 'networkidle' });
        },
        waitFor: '[data-testid="templates-gallery"]',
      },
      {
        name: 'Filter by Category',
        action: async (page) => {
          await page.click('[data-testid="category-filter-support"]');
        },
        waitFor: '[data-testid="filtered-templates"]',
      },
      {
        name: 'Preview Template',
        action: async (page) => {
          await page.click('[data-testid="template-card"]:first-child');
        },
        waitFor: '[data-testid="template-preview"]',
      },
    ],
  },
  {
    name: 'Initial Page Loads',
    steps: [
      {
        name: 'Cold Dashboard Load',
        action: async (page) => {
          await page.goto('/dashboard', { waitUntil: 'networkidle' });
        },
        waitFor: '[data-testid="dashboard-loaded"]',
      },
      {
        name: 'Cold Forms Load',
        action: async (page) => {
          await page.goto('/forms', { waitUntil: 'networkidle' });
        },
        waitFor: '[data-testid="forms-list"]',
      },
      {
        name: 'Cold Workflows Load',
        action: async (page) => {
          await page.goto('/workflows', { waitUntil: 'networkidle' });
        },
        waitFor: '[data-testid="workflows-list"]',
      },
    ],
  },
];

function calculateStats(durations: number[]): Omit<StepResult, 'name' | 'durations'> {
  const sorted = [...durations].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    mean: Math.round(sum / sorted.length),
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1],
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

async function runJourney(
  browser: Browser,
  journey: Journey,
  config: BenchmarkConfig
): Promise<JourneyResult> {
  const stepResults: Map<string, number[]> = new Map();
  journey.steps.forEach(step => stepResults.set(step.name, []));

  // Warmup runs
  for (let i = 0; i < config.warmupRuns; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();

    // TODO: Add authentication here if needed
    // await authenticate(page);

    for (const step of journey.steps) {
      await step.action(page);
      if (step.waitFor) {
        await page.waitForSelector(step.waitFor, { timeout: 30000 });
      }
    }

    await context.close();
  }

  // Measurement runs
  for (let i = 0; i < config.measurementRuns; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();

    // TODO: Add authentication here if needed
    // await authenticate(page);

    for (const step of journey.steps) {
      const start = performance.now();

      await step.action(page);
      if (step.waitFor) {
        await page.waitForSelector(step.waitFor, { timeout: 30000 });
      }

      const duration = Math.round(performance.now() - start);
      stepResults.get(step.name)!.push(duration);
    }

    await context.close();
  }

  // Calculate results
  const steps: StepResult[] = journey.steps.map(step => {
    const durations = stepResults.get(step.name)!;
    return {
      name: step.name,
      durations,
      ...calculateStats(durations),
    };
  });

  const totalMean = steps.reduce((sum, s) => sum + s.mean, 0);

  return {
    name: journey.name,
    steps,
    totalMean,
  };
}

async function runBenchmarks(config: BenchmarkConfig = DEFAULT_CONFIG): Promise<BenchmarkResults> {
  console.log('🚀 Starting NetPad Performance Benchmarks\n');
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Warmup runs: ${config.warmupRuns}`);
  console.log(`Measurement runs: ${config.measurementRuns}\n`);

  const browser = await chromium.launch({ headless: true });
  const results: JourneyResult[] = [];

  for (const journey of JOURNEYS) {
    console.log(`📍 Running: ${journey.name}`);

    try {
      const result = await runJourney(browser, journey, config);
      results.push(result);

      // Print step results
      result.steps.forEach(step => {
        const status = step.p95 > 1000 ? '🔴' : step.p95 > 500 ? '🟡' : '🟢';
        console.log(`   ${status} ${step.name}: ${step.mean}ms (p95: ${step.p95}ms)`);
      });
      console.log(`   Total: ${result.totalMean}ms\n`);
    } catch (error) {
      console.error(`   ❌ Failed: ${error}\n`);
    }
  }

  await browser.close();

  // Find slowest and fastest steps
  let slowest = { journey: '', step: '', p95: 0 };
  let fastest = { journey: '', step: '', p95: Infinity };

  results.forEach(journey => {
    journey.steps.forEach(step => {
      if (step.p95 > slowest.p95) {
        slowest = { journey: journey.name, step: step.name, p95: step.p95 };
      }
      if (step.p95 < fastest.p95) {
        fastest = { journey: journey.name, step: step.name, p95: step.p95 };
      }
    });
  });

  const benchmarkResults: BenchmarkResults = {
    timestamp: new Date().toISOString(),
    config,
    journeys: results,
    summary: {
      totalJourneys: results.length,
      totalSteps: results.reduce((sum, j) => sum + j.steps.length, 0),
      slowestStep: slowest,
      fastestStep: fastest,
    },
  };

  // Print summary
  console.log('═'.repeat(60));
  console.log('📊 BENCHMARK SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Journeys tested: ${benchmarkResults.summary.totalJourneys}`);
  console.log(`Total steps: ${benchmarkResults.summary.totalSteps}`);
  console.log(`\n🐢 Slowest: ${slowest.journey} → ${slowest.step}: ${slowest.p95}ms (p95)`);
  console.log(`⚡ Fastest: ${fastest.journey} → ${fastest.step}: ${fastest.p95}ms (p95)`);

  // Save results
  await fs.writeFile(
    config.outputFile,
    JSON.stringify(benchmarkResults, null, 2)
  );
  console.log(`\n💾 Results saved to ${config.outputFile}`);

  return benchmarkResults;
}

// Run if called directly
runBenchmarks().catch(console.error);

export { runBenchmarks, BenchmarkResults, BenchmarkConfig };
```

**Add to package.json:**

```json
{
  "scripts": {
    "benchmark": "npx tsx scripts/benchmark.ts",
    "benchmark:ci": "BENCHMARK_URL=$STAGING_URL npx tsx scripts/benchmark.ts"
  },
  "devDependencies": {
    "playwright": "^1.40.0"
  }
}
```

---

## 6. Implementation Plan

### Phase 1: Core Infrastructure (Days 1-2)

| Task | Owner | Estimate |
|------|-------|----------|
| Create `src/lib/performance/` directory structure | Dev 1 | 1h |
| Implement `PerformanceLogger.ts` | Dev 1 | 2h |
| Implement `PerformanceCollector.ts` | Dev 1 | 3h |
| Implement `NavigationTimer.tsx` | Dev 1 | 2h |
| Add to root layout | Dev 1 | 0.5h |
| Create telemetry API endpoint | Dev 1 | 1h |

### Phase 2: Server-Side Instrumentation (Days 2-3)

| Task | Owner | Estimate |
|------|-------|----------|
| Implement `withTiming.ts` middleware | Dev 2 | 3h |
| Implement `timedQuery.ts` | Dev 2 | 3h |
| Add timing to 10 highest-traffic API routes | Dev 2 | 4h |
| Add timing to critical database operations | Dev 2 | 2h |

### Phase 3: Benchmarking (Days 4-5)

| Task | Owner | Estimate |
|------|-------|----------|
| Install Playwright | Dev 1 | 0.5h |
| Add `data-testid` attributes to key elements | Dev 1 | 4h |
| Implement benchmark script | Dev 1 | 4h |
| Run initial benchmarks, document baseline | Dev 1 | 2h |

### Phase 4: Validation & Documentation (Day 5)

| Task | Owner | Estimate |
|------|-------|----------|
| End-to-end testing of instrumentation | Both | 2h |
| Document baseline metrics | Both | 2h |
| Create performance monitoring runbook | Both | 2h |

---

## 7. Required `data-testid` Attributes

Add these attributes to enable benchmark automation:

| Component | Attribute | File |
|-----------|-----------|------|
| Dashboard container | `data-testid="dashboard-loaded"` | Dashboard page |
| Forms navigation link | `data-testid="nav-forms"` | Navigation |
| Forms list container | `data-testid="forms-list"` | Forms list page |
| New form button | `data-testid="new-form-button"` | Forms list page |
| Form builder container | `data-testid="form-builder"` | Form builder |
| Workflows navigation link | `data-testid="nav-workflows"` | Navigation |
| Workflows list container | `data-testid="workflows-list"` | Workflows list page |
| New workflow button | `data-testid="new-workflow-button"` | Workflows list page |
| Workflow editor container | `data-testid="workflow-editor"` | Workflow editor |
| Applications list | `data-testid="applications-list"` | Applications page |
| Application card | `data-testid="application-card"` | Applications page |
| Application detail | `data-testid="application-detail"` | Application detail page |
| App forms tab | `data-testid="app-forms-tab"` | Application detail |
| App forms list | `data-testid="app-forms-list"` | Application detail |
| Form row | `data-testid="form-row"` | Forms list |
| Form detail | `data-testid="form-detail"` | Form detail page |
| Submissions tab | `data-testid="submissions-tab"` | Form detail |
| Submissions table | `data-testid="submissions-table"` | Submissions view |
| Settings navigation | `data-testid="nav-settings"` | Navigation |
| Settings page | `data-testid="settings-page"` | Settings |
| Connections settings | `data-testid="settings-connections"` | Settings |
| Connections list | `data-testid="connections-list"` | Connections page |
| Templates gallery | `data-testid="templates-gallery"` | Templates page |
| Category filter | `data-testid="category-filter-{category}"` | Templates page |
| Filtered templates | `data-testid="filtered-templates"` | Templates page |
| Template card | `data-testid="template-card"` | Templates page |
| Template preview | `data-testid="template-preview"` | Template modal |

---

## 8. Output Formats

### 8.1 Development Console Output

```
🟢 [NAV] /dashboard → /forms: 245ms
🟢 [API] GET /api/forms: 156ms (server: 42ms, db: 114ms, queries: 2)
🟡 [NAV] /forms → /forms/new: 612ms
🔴 [SLOW QUERY] find (forms): 234ms
```

### 8.2 Production JSON Logs

```json
{"level":"info","type":"api_request","route":"/api/forms","method":"GET","duration":156,"statusCode":200,"queries":[{"operation":"find","collection":"forms","duration":89},{"operation":"countDocuments","collection":"forms","duration":25}],"dbTime":114,"serverTime":42,"queryCount":2,"timestamp":1706284800000}
```

### 8.3 Benchmark Results

```json
{
  "timestamp": "2025-01-26T10:00:00.000Z",
  "config": {
    "baseUrl": "http://localhost:3000",
    "warmupRuns": 1,
    "measurementRuns": 3
  },
  "journeys": [
    {
      "name": "Dashboard to Form Builder",
      "steps": [
        {
          "name": "Load Dashboard",
          "durations": [1245, 1189, 1203],
          "mean": 1212,
          "p50": 1203,
          "p95": 1245,
          "min": 1189,
          "max": 1245
        }
      ],
      "totalMean": 2456
    }
  ],
  "summary": {
    "totalJourneys": 7,
    "totalSteps": 21,
    "slowestStep": {
      "journey": "Initial Page Loads",
      "step": "Cold Dashboard Load",
      "p95": 2341
    },
    "fastestStep": {
      "journey": "Settings Navigation",
      "step": "Navigate to Connections",
      "p95": 156
    }
  }
}
```

---

## 9. Success Criteria

| Criteria | Measurement |
|----------|-------------|
| Navigation timer capturing all route changes | Console shows logs for every navigation |
| API timing on all instrumented routes | `X-Response-Time` header present |
| DB timing on all instrumented queries | Slow query logs appearing for >100ms queries |
| Benchmark script runs successfully | All 7 journeys complete without errors |
| Baseline documented | `benchmark-results.json` committed to repo |
| No performance regression from instrumentation | <5ms overhead per request |

---

## 10. Future Enhancements (Out of Scope for v1)

- Real-time performance dashboard
- Alerting on performance regression
- User-specific performance tracking
- Geographic performance analysis
- Core Web Vitals integration
- APM integration (DataDog, New Relic)
- Performance budgets in CI/CD

---

## 11. Questions for Engineering

1. **Authentication in benchmarks:** How should the benchmark script authenticate? Service account? Test user credentials?

2. **Existing logging:** Is there a logging library already in use we should integrate with?

3. **Data retention:** How long should we retain performance logs? (Suggest: 7 days dev, 30 days prod)

4. **High-traffic routes:** Which 10 API routes should be prioritized for instrumentation?

5. **Test data requirements:** Do benchmarks need specific seed data to run reliably?

---

## 12. Quick Diagnosis Checklist

Before deep instrumentation, check these common culprits:

| Check | How | Red Flag |
|-------|-----|----------|
| Bundle size | `npm run build` → check output | Any page >500KB |
| Unnecessary re-renders | React DevTools Profiler | Components rendering 5+ times |
| N+1 queries | Check API logs | Multiple DB calls per page load |
| Missing indexes | MongoDB Atlas Performance Advisor | Slow queries section |
| Large payloads | Network tab | API responses >100KB |
| Unoptimized images | Network tab | Images >500KB |
| Client-side data fetching | Check useEffect calls | Data fetched after render |

---

## 13. Bundle Analysis Setup

```bash
# Install bundle analyzer
npm install @next/bundle-analyzer

# Add to next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // your config
});

# Run analysis
ANALYZE=true npm run build
```

---

## Appendix A: File Structure

```
src/lib/performance/
├── index.ts                    # Public exports
├── NavigationTimer.tsx         # Client-side navigation tracking
├── PerformanceCollector.ts     # Client-side metric batching
├── PerformanceLogger.ts        # Server-side structured logging
├── withTiming.ts               # API route middleware
├── timedQuery.ts               # Database query wrapper
└── types.ts                    # Shared TypeScript types

src/app/api/telemetry/
└── performance/
    └── route.ts                # Telemetry ingestion endpoint

scripts/
└── benchmark.ts                # Playwright benchmark runner
```

---

*End of Specification*
