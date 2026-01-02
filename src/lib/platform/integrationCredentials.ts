/**
 * Integration Credentials Service
 *
 * Securely stores and manages OAuth tokens, service account keys,
 * and API credentials for third-party integrations (Google Sheets, Slack, etc.)
 *
 * Key features:
 * - Encryption at rest using AES-256-GCM
 * - OAuth2 token refresh support
 * - Permission-based access within organizations
 * - Usage tracking and audit logging
 */

import { getIntegrationCredentialsCollection, getOrgAuditCollection } from './db';
import { encrypt, decrypt, generateSecureId } from '../encryption';
import {
  IntegrationCredential,
  IntegrationProvider,
  IntegrationAuthType,
  IntegrationCredentialStatus,
  OAuth2Tokens,
  ServiceAccountCredentials,
  ApiKeyCredentials,
  BasicAuthCredentials,
  ConnectionPermission,
  AuditLogEntry,
} from '@/types/platform';

// ============================================
// Types
// ============================================

export type CredentialData =
  | OAuth2Tokens
  | ServiceAccountCredentials
  | ApiKeyCredentials
  | BasicAuthCredentials;

export interface CreateIntegrationCredentialInput {
  organizationId: string;
  createdBy: string;
  provider: IntegrationProvider;
  name: string;
  description?: string;
  authType: IntegrationAuthType;
  credentials: CredentialData;
  oauthMetadata?: IntegrationCredential['oauthMetadata'];
  serviceAccountMetadata?: IntegrationCredential['serviceAccountMetadata'];
}

// ============================================
// CRUD Operations
// ============================================

/**
 * Create a new integration credential
 */
export async function createIntegrationCredential(
  input: CreateIntegrationCredentialInput
): Promise<IntegrationCredential> {
  const collection = await getIntegrationCredentialsCollection(input.organizationId);

  // Encrypt the credentials
  const encryptedCredentials = encrypt(JSON.stringify(input.credentials));

  const credential: IntegrationCredential = {
    credentialId: generateSecureId('intcred'),
    organizationId: input.organizationId,
    createdBy: input.createdBy,
    provider: input.provider,
    name: input.name,
    description: input.description,
    authType: input.authType,
    encryptedCredentials,
    encryptionKeyId: 'v1',
    status: 'active',
    usageCount: 0,
    oauthMetadata: input.oauthMetadata,
    serviceAccountMetadata: input.serviceAccountMetadata,
    permissions: [
      {
        userId: input.createdBy,
        role: 'owner',
        grantedAt: new Date(),
        grantedBy: input.createdBy,
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await collection.insertOne(credential);

  // Audit log
  await logCredentialEvent(input.organizationId, {
    eventType: 'connection.created',
    userId: input.createdBy,
    resourceType: 'connection',
    resourceId: credential.credentialId,
    organizationId: input.organizationId,
    action: 'create_integration_credential',
    details: {
      provider: input.provider,
      name: input.name,
      authType: input.authType,
    },
    timestamp: new Date(),
  });

  // Return without encrypted data
  return {
    ...credential,
    encryptedCredentials: '[REDACTED]',
  };
}

/**
 * Get a credential by ID (without decrypted credentials)
 */
export async function getIntegrationCredential(
  organizationId: string,
  credentialId: string
): Promise<IntegrationCredential | null> {
  const collection = await getIntegrationCredentialsCollection(organizationId);
  const credential = await collection.findOne({
    credentialId,
    status: { $ne: 'disabled' },
  });

  if (!credential) return null;

  // Redact credentials
  return {
    ...credential,
    encryptedCredentials: '[REDACTED]',
  };
}

/**
 * Get decrypted credentials (internal use only)
 */
export async function getDecryptedCredentials(
  organizationId: string,
  credentialId: string
): Promise<{ credentials: CredentialData; authType: IntegrationAuthType } | null> {
  const collection = await getIntegrationCredentialsCollection(organizationId);
  const credential = await collection.findOne({
    credentialId,
    status: 'active',
  });

  if (!credential) return null;

  try {
    const decrypted = decrypt(credential.encryptedCredentials);
    const credentials = JSON.parse(decrypted) as CredentialData;

    // Update usage stats
    await collection.updateOne(
      { credentialId },
      {
        $set: { lastUsedAt: new Date(), updatedAt: new Date() },
        $inc: { usageCount: 1 },
      }
    );

    return {
      credentials,
      authType: credential.authType,
    };
  } catch (error) {
    console.error(`[IntegrationCreds] Failed to decrypt credentials for ${credentialId}:`, error);
    return null;
  }
}

/**
 * List all credentials for an organization
 */
export async function listIntegrationCredentials(
  organizationId: string,
  options: {
    provider?: IntegrationProvider;
    status?: IntegrationCredentialStatus;
  } = {}
): Promise<IntegrationCredential[]> {
  const collection = await getIntegrationCredentialsCollection(organizationId);

  const filter: Record<string, unknown> = {
    status: options.status || { $ne: 'disabled' },
  };

  if (options.provider) {
    filter.provider = options.provider;
  }

  const credentials = await collection
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  // Redact all credentials
  return credentials.map((c) => ({
    ...c,
    encryptedCredentials: '[REDACTED]',
  }));
}

/**
 * List credentials accessible by a specific user
 */
export async function listUserIntegrationCredentials(
  organizationId: string,
  userId: string,
  provider?: IntegrationProvider
): Promise<IntegrationCredential[]> {
  const collection = await getIntegrationCredentialsCollection(organizationId);

  const filter: Record<string, unknown> = {
    status: { $ne: 'disabled' },
    'permissions.userId': userId,
  };

  if (provider) {
    filter.provider = provider;
  }

  const credentials = await collection
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  return credentials.map((c) => ({
    ...c,
    encryptedCredentials: '[REDACTED]',
  }));
}

/**
 * Update credential metadata (not the actual credentials)
 */
export async function updateIntegrationCredential(
  organizationId: string,
  credentialId: string,
  updates: {
    name?: string;
    description?: string;
    status?: IntegrationCredentialStatus;
  },
  updatedBy: string
): Promise<boolean> {
  const collection = await getIntegrationCredentialsCollection(organizationId);

  const result = await collection.updateOne(
    { credentialId, status: { $ne: 'disabled' } },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    }
  );

  if (result.modifiedCount > 0) {
    await logCredentialEvent(organizationId, {
      eventType: 'connection.updated',
      userId: updatedBy,
      resourceType: 'connection',
      resourceId: credentialId,
      organizationId,
      action: 'update_integration_credential',
      details: updates,
      timestamp: new Date(),
    });
  }

  return result.modifiedCount > 0;
}

/**
 * Update the actual credentials (re-encrypts)
 */
export async function updateCredentials(
  organizationId: string,
  credentialId: string,
  newCredentials: CredentialData,
  updatedBy: string,
  oauthMetadata?: IntegrationCredential['oauthMetadata']
): Promise<boolean> {
  const collection = await getIntegrationCredentialsCollection(organizationId);

  const encryptedCredentials = encrypt(JSON.stringify(newCredentials));

  const updateFields: Record<string, unknown> = {
    encryptedCredentials,
    updatedAt: new Date(),
  };

  if (oauthMetadata) {
    updateFields.oauthMetadata = oauthMetadata;
  }

  const result = await collection.updateOne(
    { credentialId, status: { $ne: 'disabled' } },
    { $set: updateFields }
  );

  if (result.modifiedCount > 0) {
    await logCredentialEvent(organizationId, {
      eventType: 'connection.updated',
      userId: updatedBy,
      resourceType: 'connection',
      resourceId: credentialId,
      organizationId,
      action: 'update_credentials',
      details: { credentialsUpdated: true },
      timestamp: new Date(),
    });
  }

  return result.modifiedCount > 0;
}

/**
 * Soft delete a credential
 */
export async function deleteIntegrationCredential(
  organizationId: string,
  credentialId: string,
  deletedBy: string
): Promise<boolean> {
  const collection = await getIntegrationCredentialsCollection(organizationId);

  const result = await collection.updateOne(
    { credentialId },
    {
      $set: {
        status: 'disabled',
        updatedAt: new Date(),
      },
    }
  );

  if (result.modifiedCount > 0) {
    await logCredentialEvent(organizationId, {
      eventType: 'connection.deleted',
      userId: deletedBy,
      resourceType: 'connection',
      resourceId: credentialId,
      organizationId,
      action: 'delete_integration_credential',
      details: {},
      timestamp: new Date(),
    });
  }

  return result.modifiedCount > 0;
}

// ============================================
// Permission Management
// ============================================

/**
 * Check if a user has permission to use a credential
 */
export async function checkCredentialPermission(
  organizationId: string,
  credentialId: string,
  userId: string
): Promise<boolean> {
  const collection = await getIntegrationCredentialsCollection(organizationId);
  const credential = await collection.findOne({
    credentialId,
    status: 'active',
    'permissions.userId': userId,
  });

  return credential !== null;
}

/**
 * Add or update a user's permission on a credential
 */
export async function setCredentialPermission(
  organizationId: string,
  credentialId: string,
  permission: ConnectionPermission
): Promise<boolean> {
  const collection = await getIntegrationCredentialsCollection(organizationId);

  // Remove existing permission for this user if any
  await collection.updateOne(
    { credentialId },
    { $pull: { permissions: { userId: permission.userId } } }
  );

  // Add new permission
  const result = await collection.updateOne(
    { credentialId },
    {
      $push: { permissions: permission },
      $set: { updatedAt: new Date() },
    }
  );

  return result.modifiedCount > 0;
}

// ============================================
// OAuth Token Management
// ============================================

/**
 * Refresh OAuth2 tokens using refresh token
 * This is called by node handlers when access token is expired
 */
export async function refreshOAuth2Tokens(
  organizationId: string,
  credentialId: string,
  tokenUrl: string,
  clientId: string,
  clientSecret: string
): Promise<OAuth2Tokens | null> {
  const credData = await getDecryptedCredentials(organizationId, credentialId);

  if (!credData || credData.authType !== 'oauth2') {
    return null;
  }

  const tokens = credData.credentials as OAuth2Tokens;

  if (!tokens.refreshToken) {
    console.error(`[IntegrationCreds] No refresh token for ${credentialId}`);
    return null;
  }

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[IntegrationCreds] Token refresh failed: ${error}`);

      // Mark as expired
      await updateIntegrationCredential(
        organizationId,
        credentialId,
        { status: 'expired' },
        'system'
      );

      return null;
    }

    const data = await response.json();

    const newTokens: OAuth2Tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || tokens.refreshToken,
      tokenType: data.token_type || 'Bearer',
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
      scope: data.scope || tokens.scope,
    };

    // Update stored credentials
    await updateCredentials(organizationId, credentialId, newTokens, 'system', {
      expiresAt: newTokens.expiresAt,
    });

    return newTokens;
  } catch (error) {
    console.error(`[IntegrationCreds] Token refresh error:`, error);
    return null;
  }
}

/**
 * Update OAuth2 token status (mark as expired or error)
 */
export async function updateOAuth2Status(
  organizationId: string,
  credentialId: string,
  status: 'expired' | 'error' | 'revoked'
): Promise<void> {
  const collection = await getIntegrationCredentialsCollection(organizationId);

  await collection.updateOne(
    { credentialId },
    {
      $set: {
        status,
        updatedAt: new Date(),
      },
    }
  );
}

// ============================================
// Validation
// ============================================

/**
 * Validate Google service account credentials
 */
export async function validateGoogleServiceAccount(
  credentials: ServiceAccountCredentials
): Promise<{ valid: boolean; error?: string }> {
  if (!credentials.clientEmail || !credentials.privateKey) {
    return { valid: false, error: 'Missing client_email or private_key' };
  }

  // Verify private key format
  if (!credentials.privateKey.includes('-----BEGIN')) {
    return { valid: false, error: 'Invalid private key format' };
  }

  // Try to generate a token to verify credentials
  try {
    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: credentials.clientEmail,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    // Note: Full validation would require actual JWT signing and token exchange
    // For now, just verify the structure is correct
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}

// ============================================
// Audit Logging
// ============================================

async function logCredentialEvent(
  organizationId: string,
  event: Omit<AuditLogEntry, '_id'>
): Promise<void> {
  try {
    const auditCollection = await getOrgAuditCollection(organizationId);
    await auditCollection.insertOne(event as AuditLogEntry);
  } catch (error) {
    console.error('[IntegrationCreds Audit] Failed to log event:', error);
  }
}

// ============================================
// Provider-Specific Helpers
// ============================================

/**
 * Get credentials formatted for Google Sheets API
 */
export async function getGoogleSheetsCredentials(
  organizationId: string,
  credentialId: string
): Promise<{
  accessToken?: string;
  serviceAccountCredentials?: ServiceAccountCredentials;
  authType: 'oauth2' | 'service_account';
} | null> {
  const credData = await getDecryptedCredentials(organizationId, credentialId);

  if (!credData) return null;

  if (credData.authType === 'service_account') {
    return {
      serviceAccountCredentials: credData.credentials as ServiceAccountCredentials,
      authType: 'service_account',
    };
  }

  if (credData.authType === 'oauth2') {
    const tokens = credData.credentials as OAuth2Tokens;
    return {
      accessToken: tokens.accessToken,
      authType: 'oauth2',
    };
  }

  return null;
}
