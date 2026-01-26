/**
 * Google Forms Add-on Validation API
 *
 * Validates API key and organization access for the Google Forms Add-on.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/platform/db';
import { ObjectId } from 'mongodb';

interface ValidateRequest {
  organizationId: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get API key from Authorization header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { valid: false, error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const apiKey = authHeader.substring(7);

    if (!apiKey) {
      return NextResponse.json(
        { valid: false, error: 'API key is required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: ValidateRequest = await request.json();

    if (!body.organizationId) {
      return NextResponse.json(
        { valid: false, error: 'organizationId is required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Look up the API key
    const apiKeyDoc = await db.collection('apiKeys').findOne({
      key: apiKey,
      isActive: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    });

    if (!apiKeyDoc) {
      return NextResponse.json(
        { valid: false, error: 'Invalid or expired API key' },
        { status: 401 }
      );
    }

    // Check organization access
    const membership = await db.collection('organizationMembers').findOne({
      organizationId: new ObjectId(body.organizationId),
      userId: apiKeyDoc.userId,
    });

    if (!membership && apiKeyDoc.organizationId?.toString() !== body.organizationId) {
      return NextResponse.json(
        { valid: false, error: 'No access to this organization' },
        { status: 403 }
      );
    }

    // Get organization details
    const organization = await db.collection('organizations').findOne({
      _id: new ObjectId(body.organizationId),
    });

    if (!organization) {
      return NextResponse.json(
        { valid: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Update API key last used timestamp
    await db.collection('apiKeys').updateOne(
      { _id: apiKeyDoc._id },
      { $set: { lastUsedAt: new Date() } }
    );

    return NextResponse.json({
      valid: true,
      organization: {
        id: organization._id.toString(),
        name: organization.name,
      },
      user: {
        id: apiKeyDoc.userId.toString(),
      },
    });
  } catch (error) {
    console.error('[Google Forms Validate] Error:', error);
    return NextResponse.json(
      { valid: false, error: 'Validation failed' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  });
}
