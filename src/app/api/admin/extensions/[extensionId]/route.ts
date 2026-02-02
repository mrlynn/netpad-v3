/**
 * Admin Extension Toggle API
 *
 * PATCH: Toggle extension enabled/disabled state
 * DELETE: Remove extension setting (revert to default behavior)
 *
 * Note: Changes require application restart to take effect.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import {
  setExtensionEnabled,
  getExtensionSetting,
  deleteExtensionSetting,
} from '@/lib/platform/adminExtensionSettings';

export const dynamic = 'force-dynamic';

/**
 * System-controlled extensions that cannot be toggled via admin UI
 */
const SYSTEM_CONTROLLED_EXTENSIONS = ['@netpad/cloud-features'];

interface RouteParams {
  params: Promise<{ extensionId: string }>;
}

export async function PATCH(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check admin access
    const isAdmin = await isPlatformAdmin(session.userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { extensionId } = await params;
    const decodedExtensionId = decodeURIComponent(extensionId);

    // Check if this extension can be toggled
    if (SYSTEM_CONTROLLED_EXTENSIONS.includes(decodedExtensionId)) {
      return NextResponse.json(
        {
          error: 'Cannot toggle system-controlled extension',
          message: `${decodedExtensionId} is controlled by the NETPAD_PLATFORM_MODE environment variable`,
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { enabled } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request body', message: 'enabled must be a boolean' },
        { status: 400 }
      );
    }

    // Update the setting
    const setting = await setExtensionEnabled(decodedExtensionId, enabled, session.userId);

    return NextResponse.json({
      success: true,
      setting: {
        extensionId: setting.extensionId,
        enabled: setting.enabled,
        updatedAt: setting.updatedAt,
        updatedBy: setting.updatedBy,
      },
      message: `Extension ${enabled ? 'enabled' : 'disabled'}. Restart the application for changes to take effect.`,
      restartRequired: true,
    });
  } catch (error) {
    console.error('[Admin Extensions] Error toggling extension:', error);
    return NextResponse.json(
      { error: 'Failed to toggle extension' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check admin access
    const isAdmin = await isPlatformAdmin(session.userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { extensionId } = await params;
    const decodedExtensionId = decodeURIComponent(extensionId);

    const setting = await getExtensionSetting(decodedExtensionId);

    if (!setting) {
      return NextResponse.json({
        extensionId: decodedExtensionId,
        hasDbSetting: false,
        message: 'No database setting found - extension uses default behavior',
      });
    }

    return NextResponse.json({
      extensionId: setting.extensionId,
      hasDbSetting: true,
      enabled: setting.enabled,
      enabledAt: setting.enabledAt,
      disabledAt: setting.disabledAt,
      updatedBy: setting.updatedBy,
      updatedAt: setting.updatedAt,
      createdAt: setting.createdAt,
    });
  } catch (error) {
    console.error('[Admin Extensions] Error getting extension:', error);
    return NextResponse.json(
      { error: 'Failed to get extension setting' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check admin access
    const isAdmin = await isPlatformAdmin(session.userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { extensionId } = await params;
    const decodedExtensionId = decodeURIComponent(extensionId);

    const deleted = await deleteExtensionSetting(decodedExtensionId);

    return NextResponse.json({
      success: true,
      deleted,
      message: deleted
        ? 'Extension setting removed. Extension will use default behavior after restart.'
        : 'No setting found to delete.',
      restartRequired: deleted,
    });
  } catch (error) {
    console.error('[Admin Extensions] Error deleting extension setting:', error);
    return NextResponse.json(
      { error: 'Failed to delete extension setting' },
      { status: 500 }
    );
  }
}
