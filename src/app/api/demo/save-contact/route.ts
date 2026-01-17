/**
 * Demo Contact Save API
 *
 * POST /api/demo/save-contact
 * Saves contact data from conversational form demo to MongoDB
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPlatformDb } from '@/lib/platform/db';

// Collection for demo contacts
const DEMO_COLLECTION = 'demo_contacts';

interface ContactSubmission {
  data: {
    fullName?: string;
    email?: string;
    company?: string;
    interest?: string;
    [key: string]: unknown;
  };
  conversationId: string;
  transcript: Array<{
    role: string;
    content: string;
    timestamp?: string;
  }>;
  metadata: {
    turnCount: number;
    confidence: number;
    completedAt: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ContactSubmission = await request.json();

    // Validate required fields
    if (!body.data) {
      return NextResponse.json(
        { error: 'Missing data field' },
        { status: 400 }
      );
    }

    if (!body.conversationId) {
      return NextResponse.json(
        { error: 'Missing conversationId' },
        { status: 400 }
      );
    }

    // Get database
    const db = await getPlatformDb();
    const collection = db.collection(DEMO_COLLECTION);

    // Create index on first use
    await collection.createIndex({ conversationId: 1 }, { unique: true }).catch(() => {
      // Index may already exist
    });
    await collection.createIndex({ 'data.email': 1 }).catch(() => {});
    await collection.createIndex({ createdAt: -1 }).catch(() => {});

    // Prepare document
    const document = {
      conversationId: body.conversationId,
      data: {
        fullName: body.data.fullName || null,
        email: body.data.email || null,
        company: body.data.company || null,
        interest: body.data.interest || null,
        // Include any additional extracted fields
        ...body.data,
      },
      transcript: body.transcript || [],
      metadata: {
        turnCount: body.metadata?.turnCount || 0,
        confidence: body.metadata?.confidence || 0,
        completedAt: body.metadata?.completedAt
          ? new Date(body.metadata.completedAt)
          : new Date(),
        source: 'conversational-form-demo',
      },
      createdAt: new Date(),
    };

    // Upsert to handle duplicate submissions
    const result = await collection.updateOne(
      { conversationId: body.conversationId },
      { $set: document },
      { upsert: true }
    );

    console.log('[Demo API] Contact saved:', {
      conversationId: body.conversationId,
      email: body.data.email,
      upserted: result.upsertedCount > 0,
      modified: result.modifiedCount > 0,
    });

    return NextResponse.json({
      success: true,
      message: 'Contact saved to MongoDB',
      id: result.upsertedId?.toString() || body.conversationId,
    });
  } catch (error: any) {
    console.error('[Demo API] Error saving contact:', error);
    return NextResponse.json(
      { error: 'Failed to save contact', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/demo/save-contact
 * Lists recent demo contacts (for debugging)
 */
export async function GET() {
  try {
    const db = await getPlatformDb();
    const collection = db.collection(DEMO_COLLECTION);

    const contacts = await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    return NextResponse.json({
      success: true,
      count: contacts.length,
      contacts: contacts.map((c) => ({
        id: c._id.toString(),
        conversationId: c.conversationId,
        data: c.data,
        metadata: c.metadata,
        createdAt: c.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('[Demo API] Error listing contacts:', error);
    return NextResponse.json(
      { error: 'Failed to list contacts', details: error.message },
      { status: 500 }
    );
  }
}
