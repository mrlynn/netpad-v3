/**
 * Vault Decrypt API - Get decrypted connection string
 *
 * GET /api/organizations/[orgId]/vault/[vaultId]/decrypt - Get decrypted connection string
 *
 * Security: This endpoint returns the actual connection string for client-side use.
 * It should only be used when the client needs to make direct MongoDB connections
 * (e.g., in the pipeline builder for live queries).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, ensureSessionId, SessionData } from '@/lib/session';
import { getDecryptedConnectionString } from '@/lib/platform/connectionVault';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; vaultId: string }> }
) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    ensureSessionId(session);
    await session.save();

    const { orgId, vaultId } = await params;

    if (!orgId || !vaultId) {
      return NextResponse.json(
        { error: 'Organization ID and Vault ID are required' },
        { status: 400 }
      );
    }

    // Get the decrypted connection string
    const result = await getDecryptedConnectionString(orgId, vaultId);

    if (!result) {
      return NextResponse.json(
        { error: 'Connection not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      connectionString: result.connectionString,
      database: result.database,
    });
  } catch (error) {
    console.error('Error decrypting connection:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to decrypt connection' },
      { status: 500 }
    );
  }
}
