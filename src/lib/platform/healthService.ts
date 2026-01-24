/**
 * Health Service
 *
 * Monitors the health of platform services including database, AI, email, and storage
 */

import { createTransport } from 'nodemailer';
import {
  SystemHealthCheck,
  SystemHealthHistory,
  ServiceName,
  HealthStatus,
} from '@/types/observability';
import {
  getSystemHealthCollection,
  getSystemHealthHistoryCollection,
  getPlatformDb,
} from './db';

// Service check intervals (in minutes)
const CHECK_INTERVAL_MINUTES = 5;

// Latency thresholds (in ms)
const LATENCY_THRESHOLDS: Record<ServiceName, { degraded: number; unhealthy: number }> = {
  api: { degraded: 500, unhealthy: 2000 },
  database: { degraded: 100, unhealthy: 1000 },
  ai: { degraded: 2000, unhealthy: 10000 },
  email: { degraded: 1000, unhealthy: 5000 },
  storage: { degraded: 500, unhealthy: 2000 },
};

/**
 * Determine health status based on latency
 */
function getStatusFromLatency(service: ServiceName, latencyMs: number): HealthStatus {
  const thresholds = LATENCY_THRESHOLDS[service];
  if (latencyMs >= thresholds.unhealthy) return 'unhealthy';
  if (latencyMs >= thresholds.degraded) return 'degraded';
  return 'healthy';
}

/**
 * Check database health
 */
async function checkDatabaseHealth(): Promise<{
  status: HealthStatus;
  latencyMs: number;
  errorMessage?: string;
}> {
  const startTime = Date.now();
  try {
    const db = await getPlatformDb();
    await db.command({ ping: 1 });
    const latencyMs = Date.now() - startTime;
    return {
      status: getStatusFromLatency('database', latencyMs),
      latencyMs,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - startTime,
      errorMessage: error instanceof Error ? error.message : 'Database connection failed',
    };
  }
}

/**
 * Check API health (self-check)
 */
async function checkAPIHealth(): Promise<{
  status: HealthStatus;
  latencyMs: number;
  errorMessage?: string;
}> {
  // API is healthy if this code is running
  const startTime = Date.now();
  const latencyMs = Date.now() - startTime;
  return {
    status: 'healthy',
    latencyMs,
  };
}

/**
 * Check AI service health
 */
async function checkAIHealth(): Promise<{
  status: HealthStatus;
  latencyMs: number;
  errorMessage?: string;
}> {
  const startTime = Date.now();

  // Check if AI is configured
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasOllama = !!process.env.OLLAMA_URL;
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;

  if (!hasOpenAI && !hasOllama && !hasOpenRouter) {
    return {
      status: 'unknown',
      latencyMs: 0,
      errorMessage: 'No AI provider configured',
    };
  }

  try {
    // Try to ping OpenAI if configured
    if (hasOpenAI) {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        signal: AbortSignal.timeout(5000),
      });

      const latencyMs = Date.now() - startTime;

      if (response.ok) {
        return {
          status: getStatusFromLatency('ai', latencyMs),
          latencyMs,
        };
      }

      return {
        status: 'degraded',
        latencyMs,
        errorMessage: `OpenAI returned ${response.status}`,
      };
    }

    // Try Ollama if configured
    if (hasOllama) {
      const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
      const response = await fetch(`${ollamaUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      const latencyMs = Date.now() - startTime;

      if (response.ok) {
        return {
          status: getStatusFromLatency('ai', latencyMs),
          latencyMs,
        };
      }

      return {
        status: 'degraded',
        latencyMs,
        errorMessage: `Ollama returned ${response.status}`,
      };
    }

    // OpenRouter check
    if (hasOpenRouter) {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        signal: AbortSignal.timeout(5000),
      });

      const latencyMs = Date.now() - startTime;

      if (response.ok) {
        return {
          status: getStatusFromLatency('ai', latencyMs),
          latencyMs,
        };
      }

      return {
        status: 'degraded',
        latencyMs,
        errorMessage: `OpenRouter returned ${response.status}`,
      };
    }

    return {
      status: 'unknown',
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - startTime,
      errorMessage: error instanceof Error ? error.message : 'AI service check failed',
    };
  }
}

/**
 * Check email service health
 */
async function checkEmailHealth(): Promise<{
  status: HealthStatus;
  latencyMs: number;
  errorMessage?: string;
}> {
  const startTime = Date.now();

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    return {
      status: 'unknown',
      latencyMs: 0,
      errorMessage: 'Email not configured',
    };
  }

  try {
    const transporter = createTransport({
      host: smtpHost,
      port: parseInt(smtpPort || '587', 10),
      secure: smtpPort === '465',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.verify();
    const latencyMs = Date.now() - startTime;

    return {
      status: getStatusFromLatency('email', latencyMs),
      latencyMs,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - startTime,
      errorMessage: error instanceof Error ? error.message : 'Email verification failed',
    };
  }
}

/**
 * Check blob storage health
 */
async function checkStorageHealth(): Promise<{
  status: HealthStatus;
  latencyMs: number;
  errorMessage?: string;
}> {
  const startTime = Date.now();

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  if (!blobToken) {
    return {
      status: 'unknown',
      latencyMs: 0,
      errorMessage: 'Blob storage not configured',
    };
  }

  try {
    // Vercel Blob API health check
    const response = await fetch('https://blob.vercel-storage.com', {
      method: 'HEAD',
      headers: {
        Authorization: `Bearer ${blobToken}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    const latencyMs = Date.now() - startTime;

    // 401/403 means the endpoint is reachable but auth check, which is fine
    if (response.ok || response.status === 401 || response.status === 403) {
      return {
        status: getStatusFromLatency('storage', latencyMs),
        latencyMs,
      };
    }

    return {
      status: 'degraded',
      latencyMs,
      errorMessage: `Storage returned ${response.status}`,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - startTime,
      errorMessage: error instanceof Error ? error.message : 'Storage check failed',
    };
  }
}

/**
 * Check a specific service
 */
export async function checkService(serviceName: ServiceName): Promise<SystemHealthCheck> {
  const checkFunctions: Record<ServiceName, () => Promise<{ status: HealthStatus; latencyMs: number; errorMessage?: string }>> = {
    api: checkAPIHealth,
    database: checkDatabaseHealth,
    ai: checkAIHealth,
    email: checkEmailHealth,
    storage: checkStorageHealth,
  };

  const checkFn = checkFunctions[serviceName];
  const result = await checkFn();

  const now = new Date();
  const collection = await getSystemHealthCollection();

  // Get existing record to track consecutive failures
  const existing = await collection.findOne({ serviceName });
  const consecutiveFailures =
    result.status === 'unhealthy'
      ? (existing?.consecutiveFailures || 0) + 1
      : 0;

  // Calculate 24h uptime
  const uptimePercent24h = await calculateUptime(serviceName, 24);

  const healthCheck: SystemHealthCheck = {
    serviceName,
    status: result.status,
    latencyMs: result.latencyMs,
    lastCheckedAt: now,
    nextCheckAt: new Date(now.getTime() + CHECK_INTERVAL_MINUTES * 60 * 1000),
    errorMessage: result.errorMessage,
    consecutiveFailures,
    uptimePercent24h,
  };

  // Upsert the health check
  await collection.updateOne(
    { serviceName },
    { $set: healthCheck },
    { upsert: true }
  );

  // Record history
  const historyCollection = await getSystemHealthHistoryCollection();
  await historyCollection.insertOne({
    serviceName,
    status: result.status,
    latencyMs: result.latencyMs,
    recordedAt: now,
    errorMessage: result.errorMessage,
  });

  return healthCheck;
}

/**
 * Check all services
 */
export async function checkAllServices(): Promise<SystemHealthCheck[]> {
  const services: ServiceName[] = ['api', 'database', 'ai', 'email', 'storage'];
  const results = await Promise.all(services.map(checkService));
  return results;
}

/**
 * Get current health status for all services
 */
export async function getAllServiceStatus(): Promise<SystemHealthCheck[]> {
  const collection = await getSystemHealthCollection();
  const services = await collection.find({}).toArray();

  // If no services have been checked, run initial checks
  if (services.length === 0) {
    return checkAllServices();
  }

  return services;
}

/**
 * Calculate uptime percentage for a service
 */
export async function calculateUptime(serviceName: ServiceName, hours: number): Promise<number> {
  const historyCollection = await getSystemHealthHistoryCollection();
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  const records = await historyCollection
    .find({
      serviceName,
      recordedAt: { $gte: cutoff },
    })
    .toArray();

  if (records.length === 0) {
    return 100; // No data means we assume healthy
  }

  const healthyCount = records.filter((r) => r.status === 'healthy' || r.status === 'degraded').length;
  return Math.round((healthyCount / records.length) * 10000) / 100;
}

/**
 * Get service history for charts
 */
export async function getServiceHistory(
  serviceName: ServiceName,
  hours: number = 24
): Promise<SystemHealthHistory[]> {
  const historyCollection = await getSystemHealthHistoryCollection();
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  return historyCollection
    .find({
      serviceName,
      recordedAt: { $gte: cutoff },
    })
    .sort({ recordedAt: 1 })
    .toArray();
}

/**
 * Get overall system status
 */
export async function getOverallStatus(): Promise<HealthStatus> {
  const services = await getAllServiceStatus();

  // If any critical service (api, database) is unhealthy, system is unhealthy
  const criticalServices = services.filter((s) => s.serviceName === 'api' || s.serviceName === 'database');
  if (criticalServices.some((s) => s.status === 'unhealthy')) {
    return 'unhealthy';
  }

  // If any service is unhealthy, system is degraded
  if (services.some((s) => s.status === 'unhealthy')) {
    return 'degraded';
  }

  // If any service is degraded, system is degraded
  if (services.some((s) => s.status === 'degraded')) {
    return 'degraded';
  }

  return 'healthy';
}

/**
 * Get latency trends for a service
 */
export async function getLatencyTrend(
  serviceName: ServiceName,
  hours: number = 24
): Promise<Array<{ timestamp: Date; latencyMs: number }>> {
  const history = await getServiceHistory(serviceName, hours);
  return history.map((h) => ({
    timestamp: h.recordedAt,
    latencyMs: h.latencyMs,
  }));
}
