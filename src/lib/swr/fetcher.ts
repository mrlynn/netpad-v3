/**
 * SWR Fetcher utilities for data fetching with caching
 *
 * Provides a standard fetcher and error handling for SWR hooks.
 */

export class FetchError extends Error {
  status: number;
  info: unknown;

  constructor(message: string, status: number, info?: unknown) {
    super(message);
    this.name = 'FetchError';
    this.status = status;
    this.info = info;
  }
}

/**
 * Standard JSON fetcher for SWR
 * Throws FetchError on non-ok responses
 */
export async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    let info: unknown;
    try {
      info = await response.json();
    } catch {
      info = await response.text();
    }
    throw new FetchError(
      (info as { error?: string })?.error || `Request failed with status ${response.status}`,
      response.status,
      info
    );
  }

  return response.json();
}

/**
 * POST fetcher for SWR mutations
 */
export async function postFetcher<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let info: unknown;
    try {
      info = await response.json();
    } catch {
      info = await response.text();
    }
    throw new FetchError(
      (info as { error?: string })?.error || `Request failed with status ${response.status}`,
      response.status,
      info
    );
  }

  return response.json();
}
