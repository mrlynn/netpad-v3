/**
 * Setup file for collaborate extension tests
 * Polyfills Request/Response for Node.js environment
 */

// Polyfill Web APIs that next/server requires
class MockRequest {
  url: string;
  method: string;
  headers: Map<string, string>;
  body: string | null;

  constructor(url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) {
    this.url = url;
    this.method = init?.method || 'GET';
    this.headers = new Map(Object.entries(init?.headers || {}));
    this.body = init?.body || null;
  }

  async json() {
    return this.body ? JSON.parse(this.body) : {};
  }

  async text() {
    return this.body || '';
  }
}

class MockResponse {
  body: string;
  status: number;
  headers: Map<string, string>;

  constructor(body?: string | object, init?: { status?: number; headers?: Record<string, string> }) {
    this.body = typeof body === 'object' ? JSON.stringify(body) : body || '';
    this.status = init?.status || 200;
    this.headers = new Map(Object.entries(init?.headers || {}));
  }

  async json() {
    return JSON.parse(this.body);
  }

  async text() {
    return this.body;
  }

  static json(data: object, init?: { status?: number }) {
    return new MockResponse(JSON.stringify(data), { status: init?.status || 200 });
  }
}

class MockHeaders {
  private map: Map<string, string>;

  constructor(init?: Record<string, string> | [string, string][]) {
    this.map = new Map();
    if (init) {
      if (Array.isArray(init)) {
        init.forEach(([key, value]) => this.map.set(key.toLowerCase(), value));
      } else {
        Object.entries(init).forEach(([key, value]) => this.map.set(key.toLowerCase(), value));
      }
    }
  }

  get(name: string) {
    return this.map.get(name.toLowerCase()) || null;
  }

  set(name: string, value: string) {
    this.map.set(name.toLowerCase(), value);
  }

  has(name: string) {
    return this.map.has(name.toLowerCase());
  }
}

// @ts-expect-error - Polyfill globals
global.Request = MockRequest;
// @ts-expect-error - Polyfill globals
global.Response = MockResponse;
// @ts-expect-error - Polyfill globals
global.Headers = MockHeaders;
