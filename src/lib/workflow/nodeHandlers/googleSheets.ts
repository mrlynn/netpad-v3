/**
 * Google Sheets Node Handler
 *
 * Integrates with Google Sheets API to read and write spreadsheet data.
 * Supports service account authentication and OAuth2 tokens.
 *
 * Config:
 *   - connectionId: Vault ID containing Google credentials
 *   - spreadsheetId: Google Sheets spreadsheet ID
 *   - action: 'append_row' | 'read_range' | 'update_range' | 'clear_range' | 'get_spreadsheet_info'
 *   - range: Sheet range (e.g., 'Sheet1!A1:D10' or 'Sheet1')
 *   - values: Array of values for write operations
 *   - valueInputOption: 'RAW' | 'USER_ENTERED' (how values are interpreted)
 *   - insertDataOption: 'OVERWRITE' | 'INSERT_ROWS' (for append)
 *   - majorDimension: 'ROWS' | 'COLUMNS' (how values are organized)
 *
 * Output (varies by action):
 *   - append_row: { updatedRange, updatedRows, updatedCells, spreadsheetId }
 *   - read_range: { range, majorDimension, values }
 *   - update_range: { updatedRange, updatedRows, updatedCells, updatedColumns }
 *   - clear_range: { clearedRange, spreadsheetId }
 *   - get_spreadsheet_info: { spreadsheetId, title, sheets, locale, timeZone }
 */

import { registerHandler } from './registry';
import {
  ExtendedNodeContext,
  NodeHandler,
  HandlerMetadata,
  successResult,
  failureResult,
  NodeErrorCodes,
} from './types';

const metadata: HandlerMetadata = {
  type: 'google-sheets',
  name: 'Google Sheets',
  description: 'Read and write data to Google Sheets spreadsheets',
  version: '1.0.0',
};

type GoogleSheetsAction =
  | 'append_row'
  | 'read_range'
  | 'update_range'
  | 'clear_range'
  | 'get_spreadsheet_info';

type ValueInputOption = 'RAW' | 'USER_ENTERED';
type InsertDataOption = 'OVERWRITE' | 'INSERT_ROWS';
type MajorDimension = 'ROWS' | 'COLUMNS';

interface GoogleCredentials {
  // Service Account credentials
  type?: 'service_account';
  client_email?: string;
  private_key?: string;
  project_id?: string;

  // OAuth2 credentials
  access_token?: string;
  refresh_token?: string;
  client_id?: string;
  client_secret?: string;
  token_expiry?: string;
}

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';

/**
 * Generate a JWT for service account authentication
 */
async function generateServiceAccountToken(credentials: GoogleCredentials): Promise<string> {
  const { client_email, private_key } = credentials;

  if (!client_email || !private_key) {
    throw new Error('Service account credentials require client_email and private_key');
  }

  // Create JWT header
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  // Create JWT claims
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: OAUTH_TOKEN_URL,
    iat: now,
    exp: now + 3600, // 1 hour
  };

  // Base64url encode
  const base64url = (obj: object) => {
    const json = JSON.stringify(obj);
    const base64 = Buffer.from(json).toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const headerEncoded = base64url(header);
  const claimsEncoded = base64url(claims);
  const signatureInput = `${headerEncoded}.${claimsEncoded}`;

  // Sign with private key using Web Crypto API (Node.js)
  const crypto = await import('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(private_key, 'base64');
  const signatureEncoded = signature.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const jwt = `${signatureInput}.${signatureEncoded}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

/**
 * Refresh an OAuth2 access token
 */
async function refreshOAuthToken(credentials: GoogleCredentials): Promise<string> {
  const { refresh_token, client_id, client_secret } = credentials;

  if (!refresh_token || !client_id || !client_secret) {
    throw new Error('OAuth2 refresh requires refresh_token, client_id, and client_secret');
  }

  const tokenResponse = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token,
      client_id,
      client_secret,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

/**
 * Get access token from credentials
 */
async function getAccessToken(credentials: GoogleCredentials): Promise<string> {
  // If we have a valid access token, use it
  if (credentials.access_token) {
    // Check if token is expired
    if (credentials.token_expiry) {
      const expiry = new Date(credentials.token_expiry);
      if (expiry > new Date()) {
        return credentials.access_token;
      }
    } else {
      // No expiry, assume it's valid
      return credentials.access_token;
    }
  }

  // Service account authentication
  if (credentials.type === 'service_account' || credentials.private_key) {
    return generateServiceAccountToken(credentials);
  }

  // OAuth2 token refresh
  if (credentials.refresh_token) {
    return refreshOAuthToken(credentials);
  }

  throw new Error('No valid authentication method found in credentials');
}

/**
 * Make a request to the Google Sheets API
 */
async function sheetsApiRequest(
  accessToken: string,
  endpoint: string,
  method: string = 'GET',
  body?: unknown
): Promise<unknown> {
  const url = endpoint.startsWith('http') ? endpoint : `${SHEETS_API_BASE}${endpoint}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
    const errorMessage = errorData.error?.message || response.statusText;
    throw new Error(`Google Sheets API error (${response.status}): ${errorMessage}`);
  }

  return response.json();
}

/**
 * Append rows to a sheet
 */
async function appendRows(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: unknown[][],
  valueInputOption: ValueInputOption = 'USER_ENTERED',
  insertDataOption: InsertDataOption = 'INSERT_ROWS'
): Promise<Record<string, unknown>> {
  const endpoint = `/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=${valueInputOption}&insertDataOption=${insertDataOption}`;

  const result = await sheetsApiRequest(accessToken, endpoint, 'POST', {
    values,
  });

  return result as Record<string, unknown>;
}

/**
 * Read values from a range
 */
async function readRange(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  majorDimension: MajorDimension = 'ROWS'
): Promise<Record<string, unknown>> {
  const endpoint = `/${spreadsheetId}/values/${encodeURIComponent(range)}?majorDimension=${majorDimension}`;

  const result = await sheetsApiRequest(accessToken, endpoint, 'GET');

  return result as Record<string, unknown>;
}

/**
 * Update values in a range
 */
async function updateRange(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: unknown[][],
  valueInputOption: ValueInputOption = 'USER_ENTERED',
  majorDimension: MajorDimension = 'ROWS'
): Promise<Record<string, unknown>> {
  const endpoint = `/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=${valueInputOption}`;

  const result = await sheetsApiRequest(accessToken, endpoint, 'PUT', {
    range,
    majorDimension,
    values,
  });

  return result as Record<string, unknown>;
}

/**
 * Clear values in a range
 */
async function clearRange(
  accessToken: string,
  spreadsheetId: string,
  range: string
): Promise<Record<string, unknown>> {
  const endpoint = `/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`;

  const result = await sheetsApiRequest(accessToken, endpoint, 'POST', {});

  return result as Record<string, unknown>;
}

/**
 * Get spreadsheet metadata
 */
async function getSpreadsheetInfo(
  accessToken: string,
  spreadsheetId: string
): Promise<Record<string, unknown>> {
  const endpoint = `/${spreadsheetId}?fields=spreadsheetId,properties,sheets.properties`;

  const result = await sheetsApiRequest(accessToken, endpoint, 'GET') as {
    spreadsheetId: string;
    properties?: { title?: string; locale?: string; timeZone?: string };
    sheets?: Array<{ properties?: { sheetId?: number; title?: string; index?: number } }>;
  };

  return {
    spreadsheetId: result.spreadsheetId,
    title: result.properties?.title,
    locale: result.properties?.locale,
    timeZone: result.properties?.timeZone,
    sheets: result.sheets?.map((s) => ({
      sheetId: s.properties?.sheetId,
      title: s.properties?.title,
      index: s.properties?.index,
    })),
  };
}

/**
 * Parse values config into 2D array
 */
function parseValues(values: unknown): unknown[][] {
  if (!values) {
    return [];
  }

  // Already a 2D array
  if (Array.isArray(values) && values.length > 0 && Array.isArray(values[0])) {
    return values as unknown[][];
  }

  // 1D array - wrap in array (single row)
  if (Array.isArray(values)) {
    return [values];
  }

  // Object - convert to row of values
  if (typeof values === 'object' && values !== null) {
    return [Object.values(values)];
  }

  // Single value - wrap in 2D array
  return [[values]];
}

const handler: NodeHandler = async (context: ExtendedNodeContext) => {
  const startTime = Date.now();

  await context.log('info', 'Executing Google Sheets operation', {
    nodeId: context.nodeId,
  });

  const { resolvedConfig, getConnection } = context;

  // Extract configuration
  const connectionId = resolvedConfig.connectionId as string | undefined;
  const spreadsheetId = resolvedConfig.spreadsheetId as string | undefined;
  const action = (resolvedConfig.action as GoogleSheetsAction) || 'read_range';
  const range = resolvedConfig.range as string | undefined;
  const values = resolvedConfig.values;
  const valueInputOption = (resolvedConfig.valueInputOption as ValueInputOption) || 'USER_ENTERED';
  const insertDataOption = (resolvedConfig.insertDataOption as InsertDataOption) || 'INSERT_ROWS';
  const majorDimension = (resolvedConfig.majorDimension as MajorDimension) || 'ROWS';

  // Validate required config
  if (!connectionId) {
    await context.log('error', 'Connection ID is required');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'Google credentials connection ID is required',
      false
    );
  }

  if (!spreadsheetId) {
    await context.log('error', 'Spreadsheet ID is required');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'Spreadsheet ID is required',
      false
    );
  }

  // Range is required for most actions
  if (action !== 'get_spreadsheet_info' && !range) {
    await context.log('error', 'Range is required for this action');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      `Range is required for action: ${action}`,
      false
    );
  }

  // Values required for write operations
  if (['append_row', 'update_range'].includes(action) && !values) {
    await context.log('error', 'Values are required for write operations');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      `Values are required for action: ${action}`,
      false
    );
  }

  try {
    // Get credentials from vault
    // Note: For Google credentials, we store them as JSON in the connectionString field
    const connectionData = await getConnection(connectionId);
    if (!connectionData) {
      await context.log('error', 'Connection not found', { connectionId });
      return failureResult(
        NodeErrorCodes.MISSING_CONNECTION,
        `Google credentials not found for connection ID: ${connectionId}`,
        false
      );
    }

    // Parse credentials (stored as JSON string)
    let credentials: GoogleCredentials;
    try {
      credentials = JSON.parse(connectionData.connectionString) as GoogleCredentials;
    } catch {
      await context.log('error', 'Invalid credentials format');
      return failureResult(
        NodeErrorCodes.INVALID_CONFIG,
        'Google credentials are not valid JSON',
        false
      );
    }

    // Get access token
    await context.log('info', 'Authenticating with Google');
    const accessToken = await getAccessToken(credentials);

    // Execute the action
    await context.log('info', `Executing action: ${action}`, { spreadsheetId, range });

    let result: Record<string, unknown>;

    switch (action) {
      case 'append_row': {
        const parsedValues = parseValues(values);
        result = await appendRows(
          accessToken,
          spreadsheetId,
          range!,
          parsedValues,
          valueInputOption,
          insertDataOption
        );
        const updates = result.updates as Record<string, unknown> | undefined;
        await context.log('info', 'Rows appended successfully', {
          updatedRows: updates?.updatedRows,
          updatedCells: updates?.updatedCells,
        });
        break;
      }

      case 'read_range': {
        result = await readRange(accessToken, spreadsheetId, range!, majorDimension);
        const rowCount = Array.isArray(result.values) ? result.values.length : 0;
        await context.log('info', 'Range read successfully', { rowCount });
        break;
      }

      case 'update_range': {
        const parsedValues = parseValues(values);
        result = await updateRange(
          accessToken,
          spreadsheetId,
          range!,
          parsedValues,
          valueInputOption,
          majorDimension
        );
        await context.log('info', 'Range updated successfully', {
          updatedRows: result.updatedRows,
          updatedCells: result.updatedCells,
        });
        break;
      }

      case 'clear_range': {
        result = await clearRange(accessToken, spreadsheetId, range!);
        await context.log('info', 'Range cleared successfully', {
          clearedRange: result.clearedRange,
        });
        break;
      }

      case 'get_spreadsheet_info': {
        result = await getSpreadsheetInfo(accessToken, spreadsheetId);
        await context.log('info', 'Spreadsheet info retrieved', {
          title: result.title,
          sheetCount: Array.isArray(result.sheets) ? result.sheets.length : 0,
        });
        break;
      }

      default:
        await context.log('error', `Unknown action: ${action}`);
        return failureResult(
          NodeErrorCodes.INVALID_OPERATION,
          `Unknown Google Sheets action: ${action}`,
          false
        );
    }

    return successResult(result, {
      durationMs: Date.now() - startTime,
      bytesProcessed: JSON.stringify(result).length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check for specific error types
    if (errorMessage.includes('401') || errorMessage.includes('Invalid Credentials')) {
      await context.log('error', 'Authentication failed', { error: errorMessage });
      return failureResult(
        NodeErrorCodes.CONNECTION_FAILED,
        `Google authentication failed: ${errorMessage}`,
        false // Auth errors are not retryable without fixing credentials
      );
    }

    if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
      await context.log('error', 'Permission denied', { error: errorMessage });
      return failureResult(
        NodeErrorCodes.OPERATION_FAILED,
        `Permission denied: ${errorMessage}`,
        false
      );
    }

    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      await context.log('error', 'Spreadsheet or range not found', { error: errorMessage });
      return failureResult(
        NodeErrorCodes.OPERATION_FAILED,
        `Spreadsheet or range not found: ${errorMessage}`,
        false
      );
    }

    if (errorMessage.includes('429') || errorMessage.includes('quota')) {
      await context.log('error', 'Rate limit exceeded', { error: errorMessage });
      return failureResult(
        NodeErrorCodes.RATE_LIMIT,
        `Google API rate limit exceeded: ${errorMessage}`,
        true // Rate limits are retryable
      );
    }

    if (errorMessage.includes('500') || errorMessage.includes('503')) {
      await context.log('error', 'Google server error', { error: errorMessage });
      return failureResult(
        NodeErrorCodes.OPERATION_FAILED,
        `Google server error: ${errorMessage}`,
        true // Server errors are retryable
      );
    }

    await context.log('error', 'Google Sheets operation failed', { error: errorMessage });
    return failureResult(
      NodeErrorCodes.OPERATION_FAILED,
      `Google Sheets error: ${errorMessage}`,
      true
    );
  }
};

// Register the handler
registerHandler(metadata, handler);

export { handler, metadata };
