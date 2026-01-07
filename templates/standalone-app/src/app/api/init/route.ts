/**
 * Application Initialization Endpoint
 *
 * POST /api/init
 * Initializes the application from the bundle.json file.
 * This is called on first boot to seed forms and workflows into the database.
 *
 * GET /api/init
 * Returns the current initialization status.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  initializeFromBundle,
  isInitialized,
  getAppState,
  loadBundle,
} from '@/lib/bundle';
import { initializeSchema } from '@/lib/database/schema';

export const dynamic = 'force-dynamic';

/**
 * GET /api/init
 * Check initialization status
 */
export async function GET() {
  try {
    const initialized = await isInitialized();
    const state = await getAppState();
    const bundle = loadBundle();

    return NextResponse.json({
      initialized,
      state,
      bundle: bundle
        ? {
            name: bundle.manifest.name,
            version: bundle.manifest.version,
            formsCount: bundle.forms?.length || 0,
            workflowsCount: bundle.workflows?.length || 0,
          }
        : null,
    });
  } catch (error) {
    console.error('[Init API] Error checking status:', error);
    return NextResponse.json(
      {
        error: 'Failed to check initialization status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/init
 * Initialize the application from bundle
 */
export async function POST(request: NextRequest) {
  try {
    // Check if already initialized
    const alreadyInitialized = await isInitialized();
    if (alreadyInitialized) {
      const state = await getAppState();
      return NextResponse.json({
        success: true,
        message: 'Application already initialized',
        alreadyInitialized: true,
        state,
      });
    }

    // Optionally accept force re-initialization
    let forceReinit = false;
    try {
      const body = await request.json();
      forceReinit = body?.force === true;
    } catch {
      // No body or invalid JSON, proceed with normal init
    }

    // Initialize database schema (creates collections and indexes)
    try {
      await initializeSchema();
    } catch (error) {
      console.error('[Init API] Schema initialization failed:', error);
      // Continue anyway - schema might already exist
    }

    // Perform initialization
    const result = await initializeFromBundle();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Initialization failed',
          formsCreated: result.formsCreated,
          workflowsCreated: result.workflowsCreated,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Application initialized successfully',
      formsCreated: result.formsCreated,
      workflowsCreated: result.workflowsCreated,
    });
  } catch (error) {
    console.error('[Init API] Error during initialization:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initialize application',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
