import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, ensureSessionId } from '@/lib/session';
import { getConnections, saveConnections } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    // Get session ID
    const session = await getIronSession(await cookies(), sessionOptions);
    const sessionId = ensureSessionId(session);
    await session.save();

    // Get connections from file storage
    const connections = await getConnections(sessionId);

    // Find the connection
    const connection = connections.find((conn) => conn.id === id);

    if (!connection) {
      return NextResponse.json(
        { success: false, error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Update last used timestamp
    connection.lastUsed = Date.now();
    await saveConnections(sessionId, connections);

    return NextResponse.json({
      success: true,
      connection: {
        id: connection.id,
        name: connection.name,
        connectionString: connection.connectionString,
        defaultDatabase: connection.defaultDatabase,
        createdAt: connection.createdAt,
        lastUsed: connection.lastUsed,
      },
    });
  } catch (error: any) {
    console.error('Error loading connection:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load connection' },
      { status: 500 }
    );
  }
}
