/**
 * Admin Extensions API
 *
 * GET: List all known extensions with their enabled state
 *
 * Returns information about all known extensions, their current status,
 * and whether they can be toggled via the admin UI.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { getRegistryStatus } from '@/lib/extensions/registry';
import { getAllExtensionNodes } from '@/lib/extensions/workflowNodes';
import {
  getAllExtensionSettings,
  getExtensionSettingsStats,
} from '@/lib/platform/adminExtensionSettings';

/**
 * Known extensions that can be managed via the admin UI
 * Cloud extension is controlled by environment variable and cannot be toggled
 */
const KNOWN_EXTENSIONS = [
  {
    id: '@netpad/cloud-features',
    name: 'Cloud Features',
    description: 'NetPad Cloud platform features including billing, Atlas provisioning, and waitlist management',
    systemControlled: true,
    controlledBy: 'NETPAD_DEPLOYMENT_MODE environment variable',
  },
  {
    id: '@netpad/collaborate',
    name: 'Collaborate',
    description: 'Community collaboration features for sharing and discovering applications',
    systemControlled: false,
  },
  {
    id: '@netpad/demo-node',
    name: 'Demo Node',
    description: 'Demo workflow node extension for learning and testing',
    systemControlled: false,
  },
];

export async function GET(req: NextRequest) {
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

    // Get current registry status (what's actually loaded)
    const registryStatus = getRegistryStatus();
    const loadedExtensionIds = new Set(registryStatus.extensions.map(e => e.id));

    // Get admin settings from database
    const dbSettings = await getAllExtensionSettings();

    // Get workflow nodes from extensions
    const workflowNodes = getAllExtensionNodes();

    // Get extensions from NETPAD_EXTENSIONS env var
    const envExtensions = (process.env.NETPAD_EXTENSIONS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    // Build extension list
    const extensions = KNOWN_EXTENSIONS.map(knownExt => {
      const loadedExt = registryStatus.extensions.find(e => e.id === knownExt.id);
      const dbSetting = dbSettings.get(knownExt.id);
      const extNodes = workflowNodes.filter(n => n.providedBy === knownExt.id);

      // Determine status
      let status: 'loaded' | 'disabled' | 'not_installed' | 'error';
      if (loadedExtensionIds.has(knownExt.id)) {
        status = 'loaded';
      } else if (dbSetting?.enabled === false) {
        status = 'disabled';
      } else if (envExtensions.includes(knownExt.id) || knownExt.id === '@netpad/cloud-features') {
        // Was in env but didn't load - could be not installed or error
        status = 'not_installed';
      } else {
        status = 'not_installed';
      }

      return {
        id: knownExt.id,
        name: knownExt.name,
        description: knownExt.description,
        version: loadedExt?.version || null,
        status,
        features: loadedExt?.features || [],
        workflowNodeCount: extNodes.length,
        workflowNodes: extNodes.map(n => ({
          type: n.type,
          label: n.label,
          category: n.category,
        })),
        systemControlled: knownExt.systemControlled,
        controlledBy: knownExt.systemControlled ? 'NETPAD_DEPLOYMENT_MODE environment variable' : undefined,
        // Database settings
        dbEnabled: dbSetting?.enabled ?? null,
        dbUpdatedAt: dbSetting?.updatedAt || null,
        dbUpdatedBy: dbSetting?.updatedBy || null,
        // Can be toggled via UI
        canToggle: !knownExt.systemControlled,
      };
    });

    // Add any extensions from env that aren't in known list
    for (const envExt of envExtensions) {
      if (!KNOWN_EXTENSIONS.find(k => k.id === envExt)) {
        const loadedExt = registryStatus.extensions.find(e => e.id === envExt);
        const dbSetting = dbSettings.get(envExt);
        const extNodes = workflowNodes.filter(n => n.providedBy === envExt);

        extensions.push({
          id: envExt,
          name: envExt.split('/').pop() || envExt,
          description: 'Extension loaded from NETPAD_EXTENSIONS environment variable',
          version: loadedExt?.version || null,
          status: loadedExtensionIds.has(envExt) ? 'loaded' : 'not_installed',
          features: loadedExt?.features || [],
          workflowNodeCount: extNodes.length,
          workflowNodes: extNodes.map(n => ({
            type: n.type,
            label: n.label,
            category: n.category,
          })),
          systemControlled: false,
          controlledBy: undefined,
          dbEnabled: dbSetting?.enabled ?? null,
          dbUpdatedAt: dbSetting?.updatedAt || null,
          dbUpdatedBy: dbSetting?.updatedBy || null,
          canToggle: true,
        });
      }
    }

    // Get stats
    const stats = await getExtensionSettingsStats();

    return NextResponse.json({
      extensions,
      stats: {
        totalKnown: extensions.length,
        loaded: extensions.filter(e => e.status === 'loaded').length,
        disabled: extensions.filter(e => e.status === 'disabled').length,
        notInstalled: extensions.filter(e => e.status === 'not_installed').length,
        dbSettingsCount: stats.totalSettings,
      },
      registryStatus: {
        initialized: registryStatus.initialized,
        deploymentMode: registryStatus.deploymentMode,
        enabledFeatures: registryStatus.enabledFeatures,
      },
      envExtensions,
    });
  } catch (error) {
    console.error('[Admin Extensions] Error fetching extensions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch extensions' },
      { status: 500 }
    );
  }
}
