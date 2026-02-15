/**
 * Alert Service Tests
 *
 * Tests for alert rule CRUD, metric evaluation, rule evaluation, and history.
 */

import {
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  getAllAlertRules,
  getAlertRule,
  getEnabledAlertRules,
  getMetricValue,
  evaluateRule,
  evaluateAllRules,
  testAlertRule,
  getAlertHistory,
  updateAlertStatus,
  getAlertStats,
} from '@/lib/platform/alertService';

// Mock DB collections
const mockInsertOne = jest.fn().mockResolvedValue({ insertedId: 'mock_id' });
const mockUpdateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
const mockDeleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });
const mockFindOne = jest.fn();
const mockFind = jest.fn();
const mockCountDocuments = jest.fn().mockResolvedValue(0);
const mockAggregate = jest.fn();

const mockCollection = {
  insertOne: mockInsertOne,
  updateOne: mockUpdateOne,
  deleteOne: mockDeleteOne,
  findOne: mockFindOne,
  find: mockFind,
  countDocuments: mockCountDocuments,
  aggregate: mockAggregate,
};

// Chain helpers
const chainableFind = (docs: any[]) => ({
  sort: jest.fn().mockReturnValue({
    skip: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(docs) }),
    }),
    toArray: jest.fn().mockResolvedValue(docs),
  }),
  toArray: jest.fn().mockResolvedValue(docs),
});

jest.mock('@/lib/platform/db', () => ({
  getAlertRulesCollection: jest.fn().mockResolvedValue(null),
  getAlertHistoryCollection: jest.fn().mockResolvedValue(null),
  getPlatformErrorsCollection: jest.fn().mockResolvedValue(null),
  getAPIMetricsCollection: jest.fn().mockResolvedValue(null),
  getSystemHealthCollection: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/platform/alertDelivery', () => ({
  sendAlertEmail: jest.fn().mockResolvedValue(undefined),
}));

const db = require('@/lib/platform/db');

beforeEach(() => {
  jest.clearAllMocks();
  // Default: all collection getters return mockCollection
  db.getAlertRulesCollection.mockResolvedValue(mockCollection);
  db.getAlertHistoryCollection.mockResolvedValue(mockCollection);
  db.getPlatformErrorsCollection.mockResolvedValue(mockCollection);
  db.getAPIMetricsCollection.mockResolvedValue(mockCollection);
  db.getSystemHealthCollection.mockResolvedValue(mockCollection);
  mockFind.mockReturnValue(chainableFind([]));
});

describe('Alert Rule CRUD', () => {
  const baseRule = {
    name: 'High Error Rate',
    enabled: true,
    condition: {
      metric: 'error_rate' as const,
      operator: 'gt' as const,
      threshold: 5,
    },
    channels: ['email' as const],
    channelConfig: {},
    createdBy: 'user_123',
    cooldownMinutes: 15,
  };

  test('createAlertRule inserts and returns new rule with generated ID', async () => {
    const result = await createAlertRule(baseRule);
    expect(mockInsertOne).toHaveBeenCalledTimes(1);
    expect(result.ruleId).toMatch(/^rule_/);
    expect(result.name).toBe('High Error Rate');
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  test('updateAlertRule calls updateOne with correct filter', async () => {
    const updated = await updateAlertRule('rule_abc', { enabled: false });
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { ruleId: 'rule_abc' },
      { $set: { enabled: false } }
    );
    expect(updated).toBe(true);
  });

  test('updateAlertRule returns false when no match', async () => {
    mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 0 });
    const updated = await updateAlertRule('rule_nonexistent', { enabled: false });
    expect(updated).toBe(false);
  });

  test('deleteAlertRule removes the rule', async () => {
    const deleted = await deleteAlertRule('rule_abc');
    expect(mockDeleteOne).toHaveBeenCalledWith({ ruleId: 'rule_abc' });
    expect(deleted).toBe(true);
  });

  test('deleteAlertRule returns false when no match', async () => {
    mockDeleteOne.mockResolvedValueOnce({ deletedCount: 0 });
    const deleted = await deleteAlertRule('rule_nonexistent');
    expect(deleted).toBe(false);
  });

  test('getAllAlertRules returns sorted rules', async () => {
    const rules = [{ ruleId: 'rule_1' }, { ruleId: 'rule_2' }];
    mockFind.mockReturnValue(chainableFind(rules));
    const result = await getAllAlertRules();
    expect(result).toEqual(rules);
  });

  test('getAlertRule returns single rule by ID', async () => {
    const rule = { ruleId: 'rule_1', name: 'Test' };
    mockFindOne.mockResolvedValue(rule);
    const result = await getAlertRule('rule_1');
    expect(result).toEqual(rule);
    expect(mockFindOne).toHaveBeenCalledWith({ ruleId: 'rule_1' });
  });

  test('getAlertRule returns null for missing rule', async () => {
    mockFindOne.mockResolvedValue(null);
    const result = await getAlertRule('rule_nonexistent');
    expect(result).toBeNull();
  });

  test('getEnabledAlertRules filters by enabled: true', async () => {
    const rules = [{ ruleId: 'rule_1', enabled: true }];
    mockFind.mockReturnValue({ toArray: jest.fn().mockResolvedValue(rules) });
    const result = await getEnabledAlertRules();
    expect(mockFind).toHaveBeenCalledWith({ enabled: true });
    expect(result).toEqual(rules);
  });
});

describe('getMetricValue', () => {
  test('error_count_5m counts unresolved errors', async () => {
    mockCountDocuments.mockResolvedValue(42);
    const value = await getMetricValue('error_count_5m');
    expect(value).toBe(42);
  });

  test('error_rate returns 0 when no requests', async () => {
    mockCountDocuments.mockResolvedValue(5);
    mockFindOne.mockResolvedValue(null);
    const value = await getMetricValue('error_rate');
    expect(value).toBe(0);
  });

  test('error_rate calculates percentage', async () => {
    mockCountDocuments.mockResolvedValue(10);
    mockFindOne.mockResolvedValue({
      periodType: 'hourly',
      endpoints: {
        '/api/forms': { totalRequests: 100 },
        '/api/users': { totalRequests: 100 },
      },
    });
    const value = await getMetricValue('error_rate');
    expect(value).toBe(5); // 10/200 * 100
  });

  test('api_latency_p95 returns max p95 from metrics', async () => {
    mockFindOne.mockResolvedValue({
      endpoints: {
        '/api/forms': { p95LatencyMs: 200 },
        '/api/users': { p95LatencyMs: 400 },
      },
    });
    const value = await getMetricValue('api_latency_p95');
    expect(value).toBe(400);
  });

  test('api_latency_p95 returns 0 when no metrics', async () => {
    mockFindOne.mockResolvedValue(null);
    const value = await getMetricValue('api_latency_p95');
    expect(value).toBe(0);
  });
});

describe('evaluateRule', () => {
  test('triggers alert when condition met (gt)', async () => {
    mockCountDocuments.mockResolvedValue(10);
    const rule = {
      ruleId: 'rule_1',
      name: 'Error Alert',
      enabled: true,
      metric: 'error_count_5m',
      condition: { operator: 'gt', value: 5 },
      channels: [],
      createdBy: 'user_1',
      cooldownMinutes: 15,
      createdAt: new Date(),
    };
    const result = await evaluateRule(rule as any);
    expect(result.triggered).toBe(true);
    expect(result.metricValue).toBe(10);
  });

  test('does not trigger when condition not met', async () => {
    mockCountDocuments.mockResolvedValue(2);
    const rule = {
      ruleId: 'rule_1',
      name: 'Error Alert',
      enabled: true,
      metric: 'error_count_5m',
      condition: { operator: 'gt', value: 5 },
      channels: [],
      createdBy: 'user_1',
      cooldownMinutes: 15,
      createdAt: new Date(),
    };
    const result = await evaluateRule(rule as any);
    expect(result.triggered).toBe(false);
  });

  test('skips evaluation during cooldown', async () => {
    const rule = {
      ruleId: 'rule_1',
      name: 'Error Alert',
      enabled: true,
      metric: 'error_count_5m',
      condition: { operator: 'gt', value: 5 },
      channels: [],
      createdBy: 'user_1',
      cooldownMinutes: 15,
      createdAt: new Date(),
      lastAlertedAt: new Date(), // just alerted
    };
    const result = await evaluateRule(rule as any);
    expect(result.skipped).toBe(true);
    expect(result.triggered).toBe(false);
    expect(result.metricValue).toBe(0);
  });
});

describe('getAlertHistory', () => {
  test('returns paginated results', async () => {
    const alerts = [{ alertId: 'alert_1' }, { alertId: 'alert_2' }];
    mockFind.mockReturnValue(chainableFind(alerts));
    mockCountDocuments.mockResolvedValue(2);
    const result = await getAlertHistory({ page: 1, limit: 10 });
    expect(result.alerts).toEqual(alerts);
  });

  test('filters by ruleId when provided', async () => {
    mockFind.mockReturnValue(chainableFind([]));
    mockCountDocuments.mockResolvedValue(0);
    await getAlertHistory({ ruleId: 'rule_1', page: 1, limit: 10 });
    expect(mockFind).toHaveBeenCalled();
  });

  test('filters by status when provided', async () => {
    mockFind.mockReturnValue(chainableFind([]));
    mockCountDocuments.mockResolvedValue(0);
    await getAlertHistory({ status: 'triggered', page: 1, limit: 10 });
    expect(mockFind).toHaveBeenCalled();
  });
});

describe('updateAlertStatus', () => {
  test('updates status of an alert', async () => {
    await updateAlertStatus('alert_1', 'acknowledged');
    expect(mockUpdateOne).toHaveBeenCalled();
  });
});

describe('getAlertStats', () => {
  test('returns aggregated stats', async () => {
    mockAggregate.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([
        { _id: 'triggered', count: 5 },
        { _id: 'acknowledged', count: 2 },
      ]),
    });
    mockCountDocuments.mockResolvedValue(7);
    const stats = await getAlertStats(7);
    expect(stats).toBeDefined();
  });
});
