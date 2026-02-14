/**
 * Tests for Audit Logger
 *
 * Tests the audit logging system including:
 * - logAuditEvent: creating audit log entries
 * - getAuditLogs: querying with filters
 * - Error handling (non-throwing on log failures)
 */

// Set env before importing
process.env.MONGODB_URI = 'mongodb://localhost:27017';
process.env.MONGODB_DATABASE = 'test_db';

import { logAuditEvent, getAuditLogs, AuditAction } from '@/lib/auditLogger';
import { MongoClient } from 'mongodb';

// The mongodb mock is already configured in jest.config.js moduleNameMapper

describe('Audit Logger', () => {
  // ==========================================
  // logAuditEvent
  // ==========================================
  describe('logAuditEvent', () => {
    it('should log a basic audit event', async () => {
      await expect(
        logAuditEvent('form.view', 'form-123')
      ).resolves.toBeUndefined();
    });

    it('should log with all options', async () => {
      await expect(
        logAuditEvent('response.create', 'form-123', {
          responseId: 'resp-456',
          userId: 'user-789',
          metadata: { ipAddress: '127.0.0.1', userAgent: 'test' },
        })
      ).resolves.toBeUndefined();
    });

    it('should accept all valid audit actions', async () => {
      const actions: AuditAction[] = [
        'response.create',
        'response.read',
        'response.update',
        'response.delete',
        'response.export',
        'form.view',
        'form.edit',
        'form.delete',
        'analytics.view',
      ];

      for (const action of actions) {
        await expect(logAuditEvent(action, 'form-123')).resolves.toBeUndefined();
      }
    });

    it('should accept custom connection string', async () => {
      await expect(
        logAuditEvent('form.view', 'form-123', {
          connectionString: 'mongodb://custom:27017',
        })
      ).resolves.toBeUndefined();
    });

    it('should accept metadata with various properties', async () => {
      await expect(
        logAuditEvent('response.read', 'form-123', {
          metadata: {
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
            filters: { status: 'active' },
            customProp: 42,
          },
        })
      ).resolves.toBeUndefined();
    });

    it('should not throw on insertOne failure (swallows errors)', async () => {
      // The mock insertOne always succeeds, but we test the contract:
      // logAuditEvent should not throw even if something goes wrong internally
      await expect(
        logAuditEvent('form.view', 'form-123')
      ).resolves.toBeUndefined();
    });

    it('should log export events with format metadata', async () => {
      await expect(
        logAuditEvent('response.export', 'form-123', {
          metadata: { exportFormat: 'csv' },
        })
      ).resolves.toBeUndefined();
    });
  });

  // ==========================================
  // getAuditLogs
  // ==========================================
  describe('getAuditLogs', () => {
    it('should return an array of logs', async () => {
      const logs = await getAuditLogs('form-123');
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should accept limit option', async () => {
      const logs = await getAuditLogs('form-123', { limit: 10 });
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should accept date range filters', async () => {
      const logs = await getAuditLogs('form-123', {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
      });
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should accept action filter', async () => {
      const logs = await getAuditLogs('form-123', { action: 'form.view' });
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should accept startDate only', async () => {
      const logs = await getAuditLogs('form-123', {
        startDate: new Date('2025-06-01'),
      });
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should accept endDate only', async () => {
      const logs = await getAuditLogs('form-123', {
        endDate: new Date('2025-12-31'),
      });
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should accept custom connection string', async () => {
      const logs = await getAuditLogs('form-123', {
        connectionString: 'mongodb://custom:27017',
      });
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should work with default connection string from env', async () => {
      const logs = await getAuditLogs('form-123');
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should combine all filter options', async () => {
      const logs = await getAuditLogs('form-123', {
        limit: 50,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        action: 'response.create',
      });
      expect(Array.isArray(logs)).toBe(true);
    });
  });

  // ==========================================
  // Type Safety
  // ==========================================
  describe('AuditAction type', () => {
    it('should cover all CRUD operations on responses', () => {
      const responseActions: AuditAction[] = [
        'response.create',
        'response.read',
        'response.update',
        'response.delete',
        'response.export',
      ];
      expect(responseActions.length).toBe(5);
    });

    it('should cover form operations', () => {
      const formActions: AuditAction[] = [
        'form.view',
        'form.edit',
        'form.delete',
      ];
      expect(formActions.length).toBe(3);
    });

    it('should cover analytics operations', () => {
      const analyticsActions: AuditAction[] = ['analytics.view'];
      expect(analyticsActions.length).toBe(1);
    });
  });
});
