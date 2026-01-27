/**
 * Admin Conversation Details API
 *
 * GET: Get full details of a specific conversation
 *
 * Query Parameters:
 * - orgId: Organization ID (required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { getUserOrganizations } from '@/lib/platform/organizations';
import { Organization } from '@/types/platform';
import { getConversationDetails } from '@/lib/conversational/persistence';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { conversationId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    // Check authorization
    const isAdmin = await isPlatformAdmin(session.userId);
    if (!isAdmin) {
      const userOrgs = await getUserOrganizations(session.userId);
      const hasAccess = userOrgs.some((org: Organization) => org.orgId === orgId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied to this organization' },
          { status: 403 }
        );
      }
    }

    // Get conversation details
    const conversation = await getConversationDetails(orgId, conversationId);

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Calculate completion percentage
    const topicsCovered = conversation.topicsCovered || [];
    const requiredTopics = topicsCovered.filter((t) => t.priority === 'required');
    const coveredRequired = requiredTopics.filter((t) => t.covered);
    const completionPercentage = requiredTopics.length > 0
      ? Math.round((coveredRequired.length / requiredTopics.length) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      conversation: {
        ...conversation,
        completionPercentage,
        extractedFieldCount: Object.keys(conversation.extractedData || {}).filter(
          (k) => conversation.extractedData[k] !== null && conversation.extractedData[k] !== undefined
        ).length,
      },
    });
  } catch (error: any) {
    console.error('[Admin Conversation Details API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversation details' },
      { status: 500 }
    );
  }
}
