/**
 * Slack API Client
 * 
 * Wrapper around Slack Web API for making authenticated requests
 * Handles token refresh and error handling
 */

import { getDecryptedCredentials, refreshOAuth2Tokens } from '@/lib/platform/integrationCredentials';

export interface SlackMessage {
  channel: string;
  text?: string;
  blocks?: any[];
  attachments?: any[];
  thread_ts?: string; // Reply to thread
}

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_archived: boolean;
}

export class SlackClient {
  private organizationId: string;
  private credentialId: string;
  private accessToken: string | null = null;

  constructor(organizationId: string, credentialId: string) {
    this.organizationId = organizationId;
    this.credentialId = credentialId;
  }

  /**
   * Get access token, refreshing if needed
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken) {
      return this.accessToken;
    }

    const credData = await getDecryptedCredentials(
      this.organizationId,
      this.credentialId
    );

    if (!credData || credData.authType !== 'oauth2') {
      throw new Error('Invalid Slack credentials');
    }

    const tokens = credData.credentials as any;

    // Check if token is expired
    if (tokens.expiresAt && new Date(tokens.expiresAt) < new Date()) {
      // Try to refresh
      if (tokens.refreshToken) {
        const refreshed = await refreshOAuth2Tokens(
          this.organizationId,
          this.credentialId,
          'https://slack.com/api/oauth.v2.access',
          process.env.SLACK_CLIENT_ID!,
          process.env.SLACK_CLIENT_SECRET!
        );

        if (refreshed && refreshed.accessToken) {
          this.accessToken = refreshed.accessToken;
          return this.accessToken;
        }
      }

      throw new Error('Slack access token expired and could not be refreshed');
    }

    if (!tokens.accessToken) {
      throw new Error('No access token found in Slack credentials');
    }

    this.accessToken = tokens.accessToken;
    return tokens.accessToken;
  }

  /**
   * Make authenticated request to Slack API
   */
  private async apiRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const token = await this.getAccessToken();

    const response = await fetch(`https://slack.com/api/${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!data.ok) {
      // Handle specific errors
      if (data.error === 'token_expired' || data.error === 'invalid_auth') {
        // Clear cached token and retry once
        this.accessToken = null;
        const newToken = await this.getAccessToken();
        
        const retryResponse = await fetch(`https://slack.com/api/${endpoint}`, {
          ...options,
          headers: {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        const retryData = await retryResponse.json();
        if (!retryData.ok) {
          throw new Error(`Slack API error: ${retryData.error}`);
        }

        return retryData;
      }

      throw new Error(`Slack API error: ${data.error}`);
    }

    return data;
  }

  /**
   * Send a message to a Slack channel
   */
  async sendMessage(message: SlackMessage): Promise<{ ts: string; channel: string }> {
    const response = await this.apiRequest('chat.postMessage', {
      method: 'POST',
      body: JSON.stringify({
        channel: message.channel,
        text: message.text,
        blocks: message.blocks,
        attachments: message.attachments,
        thread_ts: message.thread_ts,
      }),
    });

    return {
      ts: response.ts,
      channel: response.channel,
    };
  }

  /**
   * List channels in workspace
   */
  async listChannels(excludeArchived: boolean = true): Promise<SlackChannel[]> {
    const response = await this.apiRequest('conversations.list', {
      method: 'POST',
      body: JSON.stringify({
        types: 'public_channel,private_channel',
        exclude_archived: excludeArchived,
      }),
    });

    return response.channels.map((ch: any) => ({
      id: ch.id,
      name: ch.name,
      is_private: ch.is_private,
      is_archived: ch.is_archived,
    }));
  }

  /**
   * Get channel info
   */
  async getChannel(channelId: string): Promise<SlackChannel | null> {
    const response = await this.apiRequest('conversations.info', {
      method: 'POST',
      body: JSON.stringify({
        channel: channelId,
      }),
    });

    if (!response.channel) return null;

    return {
      id: response.channel.id,
      name: response.channel.name,
      is_private: response.channel.is_private,
      is_archived: response.channel.is_archived,
    };
  }

  /**
   * Upload a file to Slack
   */
  async uploadFile(
    channel: string,
    file: Buffer | string,
    filename: string,
    title?: string,
    initialComment?: string
  ): Promise<{ id: string }> {
    const formData = new FormData();
    formData.append('channels', channel);
    // Convert Buffer to ArrayBuffer for Blob compatibility
    const fileData = typeof file === 'string'
      ? file
      : new Uint8Array(file).buffer;
    formData.append('file', new Blob([fileData]), filename);
    if (title) formData.append('title', title);
    if (initialComment) formData.append('initial_comment', initialComment);

    const token = await this.getAccessToken();

    const response = await fetch('https://slack.com/api/files.upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    return { id: data.file.id };
  }

  /**
   * Get user info
   */
  async getUserInfo(userId: string): Promise<any> {
    const response = await this.apiRequest('users.info', {
      method: 'POST',
      body: JSON.stringify({
        user: userId,
      }),
    });

    return response.user;
  }

  /**
   * Test authentication
   */
  async testAuth(): Promise<{ ok: boolean; team: string; user: string }> {
    return await this.apiRequest('auth.test', {
      method: 'POST',
    });
  }
}

/**
 * Get Slack client for an organization
 */
export async function getSlackClient(
  organizationId: string,
  credentialId: string
): Promise<SlackClient> {
  return new SlackClient(organizationId, credentialId);
}
