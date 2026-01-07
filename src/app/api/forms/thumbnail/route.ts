/**
 * Form Thumbnail Upload API
 *
 * POST /api/forms/thumbnail
 * Uploads a thumbnail image for a form
 *
 * Storage strategy:
 * - If BLOB_READ_WRITE_TOKEN is set: Use Vercel Blob storage
 * - Otherwise: Store as base64 data URL directly in MongoDB
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPlatformDb } from '@/lib/platform/db';

export const dynamic = 'force-dynamic';

// Check if Vercel Blob is configured
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

export async function POST(request: NextRequest) {
  console.log('[Thumbnail API] Received request');

  try {
    const formData = await request.formData();
    const thumbnail = formData.get('thumbnail') as Blob | null;
    const formId = formData.get('formId') as string;
    const organizationId = formData.get('organizationId') as string;

    console.log('[Thumbnail API] Parsed form data:', {
      hasThumb: !!thumbnail,
      thumbSize: thumbnail?.size,
      formId,
      organizationId,
      blobConfigured: !!BLOB_TOKEN,
    });

    if (!thumbnail || !formId || !organizationId) {
      console.error('[Thumbnail API] Missing fields');
      return NextResponse.json(
        { success: false, error: 'Missing required fields: thumbnail, formId, organizationId' },
        { status: 400 }
      );
    }

    let thumbnailUrl: string;

    if (BLOB_TOKEN) {
      // Use Vercel Blob storage
      console.log('[Thumbnail API] Using Vercel Blob storage');
      const { put } = await import('@vercel/blob');
      const storagePath = `thumbnails/${organizationId}/${formId}/thumbnail.jpg`;
      const blob = await put(storagePath, thumbnail, {
        access: 'public',
        contentType: 'image/jpeg',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      thumbnailUrl = blob.url;
    } else {
      // Fallback: Store as base64 data URL in MongoDB
      console.log('[Thumbnail API] Using base64 fallback (no BLOB_TOKEN)');
      const arrayBuffer = await thumbnail.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      thumbnailUrl = `data:image/jpeg;base64,${base64}`;
      console.log('[Thumbnail API] Base64 generated, length:', thumbnailUrl.length);
    }

    // Update the form document with the thumbnail URL
    // Forms are stored with nested structure: { form: { ...formData } }
    const db = await getPlatformDb();
    const formsCollection = db.collection('user_forms');
    await formsCollection.updateOne(
      { 'form.id': formId },
      {
        $set: {
          'form.thumbnailUrl': thumbnailUrl,
          'form.thumbnailUpdatedAt': new Date().toISOString(),
          updatedAt: new Date(),
        },
      }
    );

    // Also update published_forms if it exists
    const publishedCollection = db.collection('published_forms');
    await publishedCollection.updateOne(
      { 'form.id': formId },
      {
        $set: {
          'form.thumbnailUrl': thumbnailUrl,
          'form.thumbnailUpdatedAt': new Date().toISOString(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      url: thumbnailUrl,
    });
  } catch (error: any) {
    console.error('[Thumbnail API] Upload failed:', error);
    console.error('[Thumbnail API] Error stack:', error.stack);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload thumbnail' },
      { status: 500 }
    );
  }
}
