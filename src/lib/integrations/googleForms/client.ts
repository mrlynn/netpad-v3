/**
 * Google Forms API Client
 *
 * Client for interacting with Google Forms API v1 and Drive API
 * to list and retrieve form definitions for import.
 */

import {
  GoogleForm,
  GoogleFormListItem,
  GoogleFormItem,
} from '@/types/googleFormsImport';
import {
  getDecryptedCredentials,
  refreshOAuth2Tokens,
} from '@/lib/platform/integrationCredentials';
import { OAuth2Tokens } from '@/types/platform';

// ============================================
// Constants
// ============================================

const GOOGLE_FORMS_API_BASE = 'https://forms.googleapis.com/v1';
const GOOGLE_DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const GOOGLE_OAUTH2_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

// ============================================
// Types
// ============================================

export interface GoogleFormsClientConfig {
  organizationId: string;
  credentialId: string;
}

export interface GoogleFormsClientError {
  code: string;
  message: string;
  status?: number;
  details?: unknown;
}

export interface GoogleFormsClientResult<T> {
  success: boolean;
  data?: T;
  error?: GoogleFormsClientError;
}

// ============================================
// Google Forms API Client
// ============================================

export class GoogleFormsClient {
  private organizationId: string;
  private credentialId: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(config: GoogleFormsClientConfig) {
    this.organizationId = config.organizationId;
    this.credentialId = config.credentialId;
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.accessToken && this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
      return this.accessToken;
    }

    // Get credentials from vault
    const credData = await getDecryptedCredentials(
      this.organizationId,
      this.credentialId
    );

    if (!credData || credData.authType !== 'oauth2') {
      throw new Error('Invalid or missing Google Forms credentials');
    }

    const tokens = credData.credentials as OAuth2Tokens;

    // Check if token is expired or about to expire (5 min buffer)
    const isExpired = tokens.expiresAt &&
      new Date(tokens.expiresAt).getTime() < Date.now() + 5 * 60 * 1000;

    if (isExpired && tokens.refreshToken) {
      // Refresh the token
      const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error('Google OAuth not configured');
      }

      const refreshedTokens = await refreshOAuth2Tokens(
        this.organizationId,
        this.credentialId,
        GOOGLE_OAUTH2_TOKEN_URL,
        clientId,
        clientSecret
      );

      if (!refreshedTokens) {
        throw new Error('Failed to refresh Google OAuth token');
      }

      this.accessToken = refreshedTokens.accessToken;
      this.tokenExpiresAt = refreshedTokens.expiresAt || null;
    } else {
      this.accessToken = tokens.accessToken;
      this.tokenExpiresAt = tokens.expiresAt ? new Date(tokens.expiresAt) : null;
    }

    return this.accessToken;
  }

  /**
   * Make an authenticated request to Google API
   */
  private async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<GoogleFormsClientResult<T>> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorBody);
        } catch {
          errorData = { message: errorBody };
        }

        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: errorData.error?.message || errorData.message || 'Request failed',
            status: response.status,
            details: errorData,
          },
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REQUEST_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
      };
    }
  }

  /**
   * Get the connected user's email
   */
  async getConnectedEmail(): Promise<GoogleFormsClientResult<string>> {
    const result = await this.request<{ email: string }>(GOOGLE_USERINFO_URL);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data?.email };
  }

  /**
   * List Google Forms accessible to the user
   */
  async listForms(options: {
    pageSize?: number;
    pageToken?: string;
    searchQuery?: string;
  } = {}): Promise<GoogleFormsClientResult<{
    forms: GoogleFormListItem[];
    nextPageToken?: string;
  }>> {
    const { pageSize = 20, pageToken, searchQuery } = options;

    // Use Drive API to list forms (Forms API doesn't have a list endpoint)
    const params = new URLSearchParams({
      q: `mimeType='application/vnd.google-apps.form'${searchQuery ? ` and name contains '${searchQuery}'` : ''}`,
      pageSize: pageSize.toString(),
      fields: 'nextPageToken,files(id,name,description,createdTime,modifiedTime,mimeType,webViewLink)',
      orderBy: 'modifiedTime desc',
    });

    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const url = `${GOOGLE_DRIVE_API_BASE}/files?${params}`;
    const result = await this.request<{
      files: GoogleFormListItem[];
      nextPageToken?: string;
    }>(url);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      data: {
        forms: result.data?.files || [],
        nextPageToken: result.data?.nextPageToken,
      },
    };
  }

  /**
   * Get a specific Google Form by ID
   */
  async getForm(formId: string): Promise<GoogleFormsClientResult<GoogleForm>> {
    const url = `${GOOGLE_FORMS_API_BASE}/forms/${formId}`;
    return this.request<GoogleForm>(url);
  }

  /**
   * Get form metadata from Drive API (lighter weight than full form fetch)
   */
  async getFormMetadata(formId: string): Promise<GoogleFormsClientResult<GoogleFormListItem>> {
    const params = new URLSearchParams({
      fields: 'id,name,description,createdTime,modifiedTime,mimeType,webViewLink',
    });

    const url = `${GOOGLE_DRIVE_API_BASE}/files/${formId}?${params}`;
    return this.request<GoogleFormListItem>(url);
  }

  /**
   * Validate that the credential has access to Google Forms
   */
  async validateAccess(): Promise<GoogleFormsClientResult<{
    valid: boolean;
    email?: string;
    formCount?: number;
  }>> {
    // Try to get user info
    const emailResult = await this.getConnectedEmail();
    if (!emailResult.success) {
      return {
        success: false,
        error: emailResult.error,
      };
    }

    // Try to list forms (just 1 to verify access)
    const listResult = await this.listForms({ pageSize: 1 });
    if (!listResult.success) {
      return {
        success: false,
        error: listResult.error,
      };
    }

    return {
      success: true,
      data: {
        valid: true,
        email: emailResult.data,
        formCount: listResult.data?.forms.length,
      },
    };
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a Google Forms client for an organization
 */
export function createGoogleFormsClient(
  organizationId: string,
  credentialId: string
): GoogleFormsClient {
  return new GoogleFormsClient({ organizationId, credentialId });
}

// ============================================
// Helper Functions
// ============================================

/**
 * Extract form ID from various Google Forms URL formats
 */
export function extractFormIdFromUrl(url: string): string | null {
  // Handle various Google Forms URL patterns:
  // - https://docs.google.com/forms/d/{formId}/edit
  // - https://docs.google.com/forms/d/{formId}/viewform
  // - https://docs.google.com/forms/d/e/{formId}/viewform
  // - https://forms.gle/{shortId}

  try {
    const urlObj = new URL(url);

    // Standard forms URL
    if (urlObj.hostname === 'docs.google.com' && urlObj.pathname.includes('/forms/d/')) {
      const match = urlObj.pathname.match(/\/forms\/d\/(?:e\/)?([a-zA-Z0-9_-]+)/);
      if (match) {
        return match[1];
      }
    }

    // Short forms.gle URL - would need to follow redirect
    if (urlObj.hostname === 'forms.gle') {
      // This is a short URL, we'd need to follow the redirect
      // For now, return null and let the caller handle it
      return null;
    }
  } catch {
    // Not a valid URL
  }

  // Check if it's already just a form ID
  if (/^[a-zA-Z0-9_-]{25,}$/.test(url)) {
    return url;
  }

  return null;
}

/**
 * Build the public responder URL for a form
 */
export function buildFormResponderUrl(formId: string): string {
  return `https://docs.google.com/forms/d/${formId}/viewform`;
}

/**
 * Build the edit URL for a form
 */
export function buildFormEditUrl(formId: string): string {
  return `https://docs.google.com/forms/d/${formId}/edit`;
}

/**
 * Count the number of questions in a Google Form
 */
export function countFormQuestions(items: GoogleFormItem[] | undefined): number {
  if (!items) return 0;

  return items.reduce((count, item) => {
    if (item.questionItem) {
      return count + 1;
    }
    if (item.questionGroupItem?.questions) {
      return count + item.questionGroupItem.questions.length;
    }
    return count;
  }, 0);
}
