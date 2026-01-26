/**
 * Telemetry API Endpoint
 * Receives client-side performance metrics
 */

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
