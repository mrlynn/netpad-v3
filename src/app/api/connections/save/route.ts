import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, ensureSessionId, SavedConnection } from '@/lib/session';
import { randomBytes } from 'crypto';
import { getConnections, saveConnections } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, connectionString, defaultDatabase } = body;

    if (!name || !connectionString) {
      return NextResponse.json(
        { success: false, error: 'Name and connection string are required' },
        { status: 400 }
      );
    }

    // Get session ID
    const session = await getIronSession(await cookies(), sessionOptions);
    const sessionId = ensureSessionId(session);
    await session.save();

    // Get existing connections
    const connections = await getConnections(sessionId);

    // Create new connection entry
    const newConnection: SavedConnection = {
      id: randomBytes(16).toString('hex'),
      name,
      connectionString,
      defaultDatabase,
      createdAt: Date.now(),
      lastUsed: Date.now(),
    };

    // Add to saved connections
    connections.push(newConnection);
    await saveConnections(sessionId, connections);

    return NextResponse.json({
      success: true,
      connection: {
        id: newConnection.id,
        name: newConnection.name,
        defaultDatabase: newConnection.defaultDatabase,
        createdAt: newConnection.createdAt,
        lastUsed: newConnection.lastUsed,
      },
    });
  } catch (error: any) {
    console.error('Error saving connection:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save connection' },
      { status: 500 }
    );
  }
}
