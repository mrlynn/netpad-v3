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

    // Find and remove the connection
    const index = connections.findIndex((conn) => conn.id === id);

    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Connection not found' },
        { status: 404 }
      );
    }

    connections.splice(index, 1);
    await saveConnections(sessionId, connections);

    return NextResponse.json({
      success: true,
      message: 'Connection deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting connection:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete connection' },
      { status: 500 }
    );
  }
}
