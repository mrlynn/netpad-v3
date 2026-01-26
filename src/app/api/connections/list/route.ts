import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, ensureSessionId } from '@/lib/session';
import { getConnections } from '@/lib/storage';
import { withTiming } from '@/lib/performance/withTiming';

export const dynamic = 'force-dynamic';

async function handleGET(request: NextRequest) {
  try {
    // Get session ID
    const session = await getIronSession(await cookies(), sessionOptions);
    const sessionId = ensureSessionId(session);
    await session.save();

    // Get connections from file storage
    const savedConnections = await getConnections(sessionId);

    // Return connections without the actual connection strings (for security in list view)
    const connections = savedConnections.map((conn) => ({
      id: conn.id,
      name: conn.name,
      defaultDatabase: conn.defaultDatabase,
      createdAt: conn.createdAt,
      lastUsed: conn.lastUsed,
    }));

    return NextResponse.json({
      success: true,
      connections,
    });
  } catch (error: any) {
    console.error('Error listing connections:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list connections' },
      { status: 500 }
    );
  }
}

// Export with timing instrumentation
export const GET = withTiming(handleGET);
