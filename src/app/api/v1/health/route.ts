/**
 * Health Check Endpoint
 *
 * GET /api/v1/health - Check API and database health status
 *
 * This endpoint is used by monitoring services (like Upptime) to verify
 * that the API is operational and can connect to the database.
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    api: {
      status: 'up' | 'down';
      responseTime?: number;
    };
    database: {
      status: 'up' | 'down';
      responseTime?: number;
      error?: string;
    };
  };
}

export async function GET() {
  const startTime = Date.now();
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    services: {
      api: {
        status: 'up',
        responseTime: 0,
      },
      database: {
        status: 'down',
        responseTime: 0,
      },
    },
  };

  // Check database connectivity
  const dbStartTime = Date.now();
  try {
    const db = await connectDB();
    // Perform a simple operation to verify connection
    await db.command({ ping: 1 });
    health.services.database.status = 'up';
    health.services.database.responseTime = Date.now() - dbStartTime;
  } catch (error) {
    health.services.database.status = 'down';
    health.services.database.responseTime = Date.now() - dbStartTime;
    health.services.database.error =
      error instanceof Error ? error.message : 'Unknown database error';
    health.status = 'unhealthy';
  }

  // Calculate API response time
  health.services.api.responseTime = Date.now() - startTime;

  // Determine overall status
  if (health.services.database.status === 'down') {
    health.status = 'unhealthy';
  } else if (
    health.services.database.responseTime &&
    health.services.database.responseTime > 1000
  ) {
    health.status = 'degraded';
  }

  // Return appropriate HTTP status
  const httpStatus = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

  return NextResponse.json(health, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Health-Status': health.status,
    },
  });
}
