/**
 * Health Service Tests
 *
 * Tests for service health checks, uptime calculation, and overall status.
 */

import {
  checkService,
  checkAllServices,
  getAllServiceStatus,
  calculateUptime,
  getServiceHistory,
  getOverallStatus,
  getLatencyTrend,
} from '@/lib/platform/healthService';

const mockUpdateOne = jest.fn().mockResolvedValue({ upsertedCount: 1 });
const mockInsertOne = jest.fn().mockResolvedValue({ insertedId: 'id' });
const mockFindOne = jest.fn().mockResolvedValue(null);
const mockFind = jest.fn();

const mockHealthCollection = {
  updateOne: mockUpdateOne,
  findOne: mockFindOne,
  find: mockFind,
};

const mockHistoryCollection = {
  insertOne: mockInsertOne,
  find: mockFind,
};

const mockDb = {
  command: jest.fn().mockResolvedValue({ ok: 1 }),
};

jest.mock('@/lib/platform/db', () => ({
  getSystemHealthCollection: jest.fn().mockResolvedValue(null),
  getSystemHealthHistoryCollection: jest.fn().mockResolvedValue(null),
  getPlatformDb: jest.fn().mockResolvedValue(null),
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    verify: jest.fn().mockResolvedValue(true),
  }),
}));

const db = require('@/lib/platform/db');

beforeEach(() => {
  jest.clearAllMocks();
  db.getSystemHealthCollection.mockResolvedValue(mockHealthCollection);
  db.getSystemHealthHistoryCollection.mockResolvedValue(mockHistoryCollection);
  db.getPlatformDb.mockResolvedValue(mockDb);
  mockFind.mockReturnValue({
    sort: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
    toArray: jest.fn().mockResolvedValue([]),
  });
});

describe('checkService', () => {
  test('checks API service (always healthy)', async () => {
    const result = await checkService('api');
    expect(result.serviceName).toBe('api');
    expect(result.status).toBe('healthy');
    expect(result.latencyMs).toBeDefined();
    expect(result.lastCheckedAt).toBeInstanceOf(Date);
    expect(result.nextCheckAt).toBeInstanceOf(Date);
  });

  test('checks database service via ping', async () => {
    const result = await checkService('database');
    expect(result.serviceName).toBe('database');
    expect(result.status).toBe('healthy');
    expect(mockDb.command).toHaveBeenCalledWith({ ping: 1 });
  });

  test('marks database unhealthy on failure', async () => {
    mockDb.command.mockRejectedValueOnce(new Error('Connection refused'));
    const result = await checkService('database');
    expect(result.status).toBe('unhealthy');
    expect(result.errorMessage).toContain('Connection refused');
  });

  test('tracks consecutive failures', async () => {
    mockFindOne.mockResolvedValueOnce({ consecutiveFailures: 3 });
    mockDb.command.mockRejectedValueOnce(new Error('fail'));
    const result = await checkService('database');
    expect(result.consecutiveFailures).toBe(4);
  });

  test('resets consecutive failures on success', async () => {
    mockFindOne.mockResolvedValueOnce({ consecutiveFailures: 5 });
    const result = await checkService('database');
    expect(result.consecutiveFailures).toBe(0);
  });

  test('upserts health check to collection', async () => {
    await checkService('api');
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { serviceName: 'api' },
      { $set: expect.objectContaining({ serviceName: 'api' }) },
      { upsert: true }
    );
  });

  test('records history entry', async () => {
    await checkService('api');
    expect(mockInsertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceName: 'api',
        status: 'healthy',
      })
    );
  });

  test('AI service returns unknown when not configured', async () => {
    const origKeys = {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      OLLAMA_URL: process.env.OLLAMA_URL,
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    };
    delete process.env.OPENAI_API_KEY;
    delete process.env.OLLAMA_URL;
    delete process.env.OPENROUTER_API_KEY;

    const result = await checkService('ai');
    expect(result.status).toBe('unknown');

    Object.assign(process.env, origKeys);
  });

  test('email returns unknown when not configured', async () => {
    const origKeys = {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
    };
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    const result = await checkService('email');
    expect(result.status).toBe('unknown');

    Object.assign(process.env, origKeys);
  });

  test('storage returns unknown when not configured', async () => {
    const orig = process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_READ_WRITE_TOKEN;

    const result = await checkService('storage');
    expect(result.status).toBe('unknown');

    if (orig) process.env.BLOB_READ_WRITE_TOKEN = orig;
  });
});

describe('checkAllServices', () => {
  test('checks all 5 services', async () => {
    const results = await checkAllServices();
    expect(results).toHaveLength(5);
    const names = results.map(r => r.serviceName);
    expect(names).toContain('api');
    expect(names).toContain('database');
  });
});

describe('getAllServiceStatus', () => {
  test('returns cached results when available', async () => {
    const cached = [
      { serviceName: 'api', status: 'healthy' },
      { serviceName: 'database', status: 'healthy' },
    ];
    mockFind.mockReturnValue({ toArray: jest.fn().mockResolvedValue(cached) });

    const result = await getAllServiceStatus();
    expect(result).toEqual(cached);
  });

  test('runs checks when no cached data', async () => {
    mockFind.mockReturnValueOnce({ toArray: jest.fn().mockResolvedValue([]) });
    mockFind.mockReturnValue({
      sort: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
      toArray: jest.fn().mockResolvedValue([]),
    });

    const result = await getAllServiceStatus();
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('calculateUptime', () => {
  test('returns 100% when no history data', async () => {
    mockFind.mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) });
    const uptime = await calculateUptime('api', 24);
    expect(uptime).toBe(100);
  });

  test('calculates percentage from healthy+degraded records', async () => {
    const records = [
      { status: 'healthy' },
      { status: 'healthy' },
      { status: 'degraded' },
      { status: 'unhealthy' },
    ];
    mockFind.mockReturnValue({ toArray: jest.fn().mockResolvedValue(records) });
    const uptime = await calculateUptime('api', 24);
    expect(uptime).toBe(75);
  });

  test('returns 0% when all unhealthy', async () => {
    const records = [{ status: 'unhealthy' }, { status: 'unhealthy' }];
    mockFind.mockReturnValue({ toArray: jest.fn().mockResolvedValue(records) });
    const uptime = await calculateUptime('database', 24);
    expect(uptime).toBe(0);
  });
});

describe('getServiceHistory', () => {
  test('returns sorted history records', async () => {
    const history = [
      { serviceName: 'api', recordedAt: new Date(), latencyMs: 5 },
    ];
    mockFind.mockReturnValue({
      sort: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(history) }),
    });

    const result = await getServiceHistory('api', 24);
    expect(result).toEqual(history);
  });
});

describe('getOverallStatus', () => {
  test('returns healthy when all services healthy', async () => {
    const services = [
      { serviceName: 'api', status: 'healthy' },
      { serviceName: 'database', status: 'healthy' },
      { serviceName: 'ai', status: 'healthy' },
    ];
    mockFind.mockReturnValue({ toArray: jest.fn().mockResolvedValue(services) });
    const status = await getOverallStatus();
    expect(status).toBe('healthy');
  });

  test('returns unhealthy when critical service unhealthy', async () => {
    const services = [
      { serviceName: 'api', status: 'unhealthy' },
      { serviceName: 'database', status: 'healthy' },
    ];
    mockFind.mockReturnValue({ toArray: jest.fn().mockResolvedValue(services) });
    const status = await getOverallStatus();
    expect(status).toBe('unhealthy');
  });

  test('returns degraded when non-critical service unhealthy', async () => {
    const services = [
      { serviceName: 'api', status: 'healthy' },
      { serviceName: 'database', status: 'healthy' },
      { serviceName: 'ai', status: 'unhealthy' },
    ];
    mockFind.mockReturnValue({ toArray: jest.fn().mockResolvedValue(services) });
    const status = await getOverallStatus();
    expect(status).toBe('degraded');
  });

  test('returns degraded when any service degraded', async () => {
    const services = [
      { serviceName: 'api', status: 'healthy' },
      { serviceName: 'database', status: 'degraded' },
    ];
    mockFind.mockReturnValue({ toArray: jest.fn().mockResolvedValue(services) });
    const status = await getOverallStatus();
    expect(status).toBe('degraded');
  });
});

describe('getLatencyTrend', () => {
  test('maps history to timestamp+latency pairs', async () => {
    const now = new Date();
    const history = [
      { serviceName: 'api', recordedAt: now, latencyMs: 10, status: 'healthy' },
    ];
    mockFind.mockReturnValue({
      sort: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(history) }),
    });
    const trend = await getLatencyTrend('api', 24);
    expect(trend).toEqual([{ timestamp: now, latencyMs: 10 }]);
  });

  test('returns empty array when no history', async () => {
    mockFind.mockReturnValue({
      sort: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
    });
    const trend = await getLatencyTrend('api', 24);
    expect(trend).toEqual([]);
  });
});
