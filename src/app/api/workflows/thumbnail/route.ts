/**
 * Workflow Thumbnail Upload API
 *
 * POST /api/workflows/thumbnail
 * Uploads a thumbnail image for a workflow
 *
 * Storage strategy:
 * - If BLOB_READ_WRITE_TOKEN is set: Use Vercel Blob storage
 * - Otherwise: Store as base64 data URL directly in MongoDB
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrgDb } from '@/lib/platform/db';

export const dynamic = 'force-dynamic';

// Check if Vercel Blob is configured
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

export async function POST(request: NextRequest) {
  console.log('[Workflow Thumbnail API] Received request');

  try {
    const formData = await request.formData();
    const thumbnail = formData.get('thumbnail') as Blob | null;
    const workflowId = formData.get('workflowId') as string;
    const organizationId = formData.get('organizationId') as string;

    console.log('[Workflow Thumbnail API] Parsed form data:', {
      hasThumb: !!thumbnail,
      thumbSize: thumbnail?.size,
      workflowId,
      organizationId,
      blobConfigured: !!BLOB_TOKEN,
    });

    if (!thumbnail || !workflowId || !organizationId) {
      console.error('[Workflow Thumbnail API] Missing fields');
      return NextResponse.json(
        { success: false, error: 'Missing required fields: thumbnail, workflowId, organizationId' },
        { status: 400 }
      );
    }

    let thumbnailUrl: string;

    if (BLOB_TOKEN) {
      // Use Vercel Blob storage
      console.log('[Workflow Thumbnail API] Using Vercel Blob storage');
      const { put } = await import('@vercel/blob');
      const storagePath = `workflow-thumbnails/${organizationId}/${workflowId}/thumbnail.jpg`;
      const blob = await put(storagePath, thumbnail, {
        access: 'public',
        contentType: 'image/jpeg',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      thumbnailUrl = blob.url;
    } else {
      // Fallback: Store as base64 data URL in MongoDB
      console.log('[Workflow Thumbnail API] Using base64 fallback (no BLOB_TOKEN)');
      const arrayBuffer = await thumbnail.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      thumbnailUrl = `data:image/jpeg;base64,${base64}`;
      console.log('[Workflow Thumbnail API] Base64 generated, length:', thumbnailUrl.length);
    }

    // Update the workflow document with the thumbnail URL
    const db = await getOrgDb(organizationId);
    const workflowsCollection = db.collection('workflows');
    await workflowsCollection.updateOne(
      { id: workflowId },
      {
        $set: {
          thumbnailUrl: thumbnailUrl,
          thumbnailUpdatedAt: new Date().toISOString(),
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      url: thumbnailUrl,
    });
  } catch (error: any) {
    console.error('[Workflow Thumbnail API] Upload failed:', error);
    console.error('[Workflow Thumbnail API] Error stack:', error.stack);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload thumbnail' },
      { status: 500 }
    );
  }
}
