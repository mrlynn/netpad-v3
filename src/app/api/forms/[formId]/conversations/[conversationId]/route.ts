/**
 * Form Conversation Detail API
 *
 * GET: Get full details of a specific conversation
 *
 * Query Parameters:
 * - orgId: Organization ID (required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, ensureSessionId } from '@/lib/session';
import { getConversationDetails } from '@/lib/conversational/persistence';
import { getFormById, getPublishedFormById } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string; conversationId: string }> }
) {
  try {
    // Check authentication
    const session = await getIronSession(await cookies(), sessionOptions);
    const sessionId = ensureSessionId(session);
    await session.save();

    const { formId, conversationId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    // Verify form exists and user has access
    const form = await getFormById(sessionId, formId) ||
                 await getPublishedFormById(formId);

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Get conversation details
    const conversation = await getConversationDetails(orgId, conversationId);

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Verify the conversation belongs to this form
    if (conversation.formId !== formId) {
      return NextResponse.json({ error: 'Conversation not found for this form' }, { status: 404 });
    }

    // Calculate completion metrics
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
    console.error('[Form Conversation Detail API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}
