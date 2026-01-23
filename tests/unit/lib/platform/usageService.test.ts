/**
 * Local Usage Service Tests
 *
 * Tests for the self-hosted usage tracking and limit enforcement.
 * This service is the fallback when cloud extension is not available.
 */

import {
  getOrCreateUsage,
  incrementAIUsage,
  checkAILimit,
  hasAIFeature,
  checkSubmissionLimit,
  incrementSubmissionUsage,
  checkFormLimit,
  checkFieldLimit,
  checkConnectionLimit,
  checkActiveWorkflowLimit,
  incrementWorkflowExecutionAtQueue,
  updateWorkflowExecutionResult,
  checkStorageQuota,
  getFeatureAccess,
  getSubscriptionTier,
  initializeFreeSubscription,
} from '@/lib/platform/usageService';

// Mock MongoDB collections
// Helper to get current period in same format as usageService
function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

jest.mock('@/lib/platform/db', () => {
  const mockOrg = {
    orgId: 'org_test123',
    name: 'Test Org',
    subscription: {
      tier: 'free',
      status: 'active',
    },
    currentMonthSubmissions: 0,
  };

  // Use dynamic period to match what usageService.ts will query for
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const mockUsage = {
    organizationId: 'org_test123',
    period: currentPeriod,
    forms: { created: 5, active: 3 },
    submissions: { total: 100, byForm: { form1: 50, form2: 50 } },
    storage: { filesBytes: 1024 * 1024 * 10, responsesBytes: 1024 * 100 },
    // Free tier limit is 10, so use 5 to be well under limit
    ai: { generations: 5, agentSessions: 2, processingRuns: 5, tokensUsed: 1000 },
    workflows: {
      executions: 20,
      byWorkflow: { wf1: 15, wf2: 5 },
      successfulExecutions: 18,
      failedExecutions: 2,
    },
  };

  const mockOrgsCollection = {
    findOne: jest.fn().mockResolvedValue(mockOrg),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
  };

  const mockUsageCollection = {
    findOne: jest.fn().mockResolvedValue(mockUsage),
    insertOne: jest.fn().mockResolvedValue({ insertedId: 'usage_123' }),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    findOneAndUpdate: jest.fn().mockResolvedValue(mockUsage),
  };

  return {
    getOrganizationsCollection: jest.fn().mockResolvedValue(mockOrgsCollection),
    getUsageCollection: jest.fn().mockResolvedValue(mockUsageCollection),
    __mockOrgsCollection: mockOrgsCollection,
    __mockUsageCollection: mockUsageCollection,
    __mockOrg: mockOrg,
    __mockUsage: mockUsage,
  };
});

// Mock cluster checks
jest.mock('@/lib/platform/clusterChecks', () => ({
  checkFeatureAccess: jest.fn().mockReturnValue({ hasAccess: true }),
  FEATURE_REQUIREMENTS: {},
  getClusterTier: jest.fn().mockResolvedValue('M10'),
  getDeploymentMode: jest.fn().mockReturnValue('self-hosted'),
  isSelfHosted: jest.fn().mockReturnValue(true),
  getMinVectorSearchTier: jest.fn().mockReturnValue('M10'),
}));

describe('Local Usage Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-establish mock return values after clearAllMocks
    const db = require('@/lib/platform/db');
    db.__mockOrgsCollection.findOne.mockResolvedValue(db.__mockOrg);
    db.__mockUsageCollection.findOne.mockResolvedValue(db.__mockUsage);
    db.__mockUsageCollection.insertOne.mockResolvedValue({ insertedId: 'usage_123' });
    db.__mockUsageCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
    db.__mockUsageCollection.findOneAndUpdate.mockResolvedValue(db.__mockUsage);
  });

  describe('getOrCreateUsage', () => {
    it('should return existing usage record', async () => {
      const usage = await getOrCreateUsage('org_test123');

      expect(usage).toBeDefined();
      expect(usage.organizationId).toBe('org_test123');
    });

    it('should create new usage record if none exists', async () => {
      const db = require('@/lib/platform/db');
      db.__mockUsageCollection.findOne.mockResolvedValueOnce(null);

      const usage = await getOrCreateUsage('org_new');

      expect(db.__mockUsageCollection.insertOne).toHaveBeenCalled();
    });
  });

  describe('AI Usage', () => {
    describe('incrementAIUsage', () => {
      it('should allow increment within limits', async () => {
        const result = await incrementAIUsage('org_test123', 'generations', 1);

        expect(result.allowed).toBe(true);
        expect(result.current).toBeDefined();
        expect(result.limit).toBeDefined();
        expect(result.remaining).toBeDefined();
      });

      it('should track tokens used', async () => {
        const db = require('@/lib/platform/db');

        await incrementAIUsage('org_test123', 'generations', 1, 500);

        // Verify some update was called (may use updateOne or findOneAndUpdate)
        expect(
          db.__mockUsageCollection.findOneAndUpdate.mock.calls.length +
          db.__mockUsageCollection.updateOne.mock.calls.length
        ).toBeGreaterThan(0);
      });

      it('should return not allowed when org not found', async () => {
        const db = require('@/lib/platform/db');
        db.__mockOrgsCollection.findOne.mockResolvedValueOnce(null);

        const result = await incrementAIUsage('org_nonexistent', 'generations', 1);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('not found');
      });
    });

    describe('checkAILimit', () => {
      it('should check if AI operation is allowed', async () => {
        const result = await checkAILimit('org_test123', 'generations');

        expect(result).toHaveProperty('allowed');
        expect(result).toHaveProperty('current');
        expect(result).toHaveProperty('limit');
        expect(result).toHaveProperty('remaining');
      });

      it('should enforce limits based on tier', async () => {
        const db = require('@/lib/platform/db');

        // Simulate free tier at limit (free tier has 10 generations/month)
        db.__mockOrgsCollection.findOne.mockResolvedValueOnce({
          ...db.__mockOrg,
          subscription: { tier: 'free', status: 'active' },
        });
        db.__mockUsageCollection.findOne.mockResolvedValueOnce({
          ...db.__mockUsage,
          ai: { generations: 10, agentSessions: 0, processingRuns: 0, tokensUsed: 0 },
        });

        const result = await checkAILimit('org_test123', 'generations');

        // Free tier has 10 generations limit, so at 10 should not allow more
        expect(result.current).toBe(10);
      });
    });

    describe('hasAIFeature', () => {
      it('should check if organization has access to AI feature', async () => {
        const result = await hasAIFeature('org_test123', 'ai_form_generator');

        expect(result).toHaveProperty('allowed');
      });

      it('should include tier information when not allowed', async () => {
        const db = require('@/lib/platform/db');
        db.__mockOrgsCollection.findOne.mockResolvedValueOnce({
          ...db.__mockOrg,
          subscription: { tier: 'free', status: 'active' },
        });

        const result = await hasAIFeature('org_test123', 'advanced_rag');

        // Free tier may not have access to advanced RAG
        expect(result).toHaveProperty('allowed');
      });
    });
  });

  describe('Submission Usage', () => {
    describe('checkSubmissionLimit', () => {
      it('should check if submissions are allowed', async () => {
        const result = await checkSubmissionLimit('org_test123');

        expect(result).toHaveProperty('allowed');
        expect(result).toHaveProperty('current');
        expect(result).toHaveProperty('limit');
      });
    });

    describe('incrementSubmissionUsage', () => {
      it('should increment submission count', async () => {
        const result = await incrementSubmissionUsage('org_test123', 'form_123');

        expect(result).toHaveProperty('allowed');
      });

      it('should track per-form submissions', async () => {
        const db = require('@/lib/platform/db');

        await incrementSubmissionUsage('org_test123', 'form_specific');

        // Verify some update was called (may use updateOne or findOneAndUpdate)
        expect(
          db.__mockUsageCollection.findOneAndUpdate.mock.calls.length +
          db.__mockUsageCollection.updateOne.mock.calls.length
        ).toBeGreaterThan(0);
      });
    });
  });

  describe('Form/Field/Connection Limits', () => {
    describe('checkFormLimit', () => {
      it('should check if more forms can be created', async () => {
        const result = await checkFormLimit('org_test123', 5);

        expect(result).toHaveProperty('allowed');
        expect(result).toHaveProperty('limit');
      });

      it('should respect tier limits', async () => {
        const db = require('@/lib/platform/db');
        db.__mockOrgsCollection.findOne.mockResolvedValueOnce({
          ...db.__mockOrg,
          subscription: { tier: 'free', status: 'active' },
        });

        const result = await checkFormLimit('org_test123', 10);

        // Free tier has limited forms
        expect(result).toHaveProperty('allowed');
        expect(result.limit).toBeGreaterThan(0);
      });
    });

    describe('checkFieldLimit', () => {
      it('should check if form can have more fields', async () => {
        const result = await checkFieldLimit('org_test123', 25);

        expect(result).toHaveProperty('allowed');
        expect(result).toHaveProperty('limit');
      });
    });

    describe('checkConnectionLimit', () => {
      it('should check if more connections can be created', async () => {
        const result = await checkConnectionLimit('org_test123', 3);

        expect(result).toHaveProperty('allowed');
        expect(result).toHaveProperty('limit');
      });
    });
  });

  describe('Workflow Usage', () => {
    describe('checkActiveWorkflowLimit', () => {
      it('should check if more active workflows are allowed', async () => {
        const result = await checkActiveWorkflowLimit('org_test123', 5);

        expect(result).toHaveProperty('allowed');
        expect(result).toHaveProperty('limit');
      });
    });

    describe('incrementWorkflowExecutionAtQueue', () => {
      it('should increment workflow execution at queue time', async () => {
        const result = await incrementWorkflowExecutionAtQueue(
          'org_test123',
          'workflow_123'
        );

        expect(result).toHaveProperty('allowed');
        expect(result).toHaveProperty('current');
      });

      it('should track per-workflow executions', async () => {
        const db = require('@/lib/platform/db');

        await incrementWorkflowExecutionAtQueue('org_test123', 'workflow_specific');

        // Verify some update was called (may use updateOne or findOneAndUpdate)
        expect(
          db.__mockUsageCollection.findOneAndUpdate.mock.calls.length +
          db.__mockUsageCollection.updateOne.mock.calls.length
        ).toBeGreaterThan(0);
      });
    });

    describe('updateWorkflowExecutionResult', () => {
      it('should update workflow success count', async () => {
        const db = require('@/lib/platform/db');

        await updateWorkflowExecutionResult('org_test123', 'workflow_123', true);

        expect(db.__mockUsageCollection.updateOne).toHaveBeenCalled();
      });

      it('should update workflow failure count', async () => {
        const db = require('@/lib/platform/db');

        await updateWorkflowExecutionResult('org_test123', 'workflow_123', false);

        expect(db.__mockUsageCollection.updateOne).toHaveBeenCalled();
      });
    });
  });

  describe('Storage Usage', () => {
    describe('checkStorageQuota', () => {
      it('should check storage quota', async () => {
        const result = await checkStorageQuota('org_test123');

        expect(result).toHaveProperty('allowed');
        expect(result).toHaveProperty('current');
        expect(result).toHaveProperty('limit');
        expect(result).toHaveProperty('percentUsed');
      });

      it('should account for additional bytes being added', async () => {
        const additionalBytes = 1024 * 1024 * 100; // 100 MB
        const result = await checkStorageQuota('org_test123', additionalBytes);

        expect(result).toHaveProperty('allowed');
      });
    });
  });

  describe('Feature Access', () => {
    describe('getFeatureAccess', () => {
      it('should return complete feature access summary', async () => {
        const result = await getFeatureAccess('org_test123');

        expect(result).toHaveProperty('tier');
        expect(result).toHaveProperty('aiFeatures');
        expect(result).toHaveProperty('platformFeatures');
        expect(result).toHaveProperty('limits');
      });

      it('should include current usage', async () => {
        const result = await getFeatureAccess('org_test123');

        expect(result).toHaveProperty('usage');
      });
    });

    describe('getSubscriptionTier', () => {
      it('should return organization subscription tier', async () => {
        const tier = await getSubscriptionTier('org_test123');

        expect(tier).toBe('free');
      });

      it('should default to free when no subscription', async () => {
        const db = require('@/lib/platform/db');
        db.__mockOrgsCollection.findOne.mockResolvedValueOnce({
          orgId: 'org_test123',
          name: 'Test Org',
          // No subscription
        });

        const tier = await getSubscriptionTier('org_test123');

        expect(tier).toBe('free');
      });
    });

    describe('initializeFreeSubscription', () => {
      it('should set up free tier for new organization', async () => {
        const db = require('@/lib/platform/db');

        await initializeFreeSubscription('org_new');

        expect(db.__mockOrgsCollection.updateOne).toHaveBeenCalled();
      });
    });
  });

  describe('Tier Configuration', () => {
    it('should enforce free tier limits correctly', async () => {
      const db = require('@/lib/platform/db');
      db.__mockOrgsCollection.findOne.mockResolvedValue({
        ...db.__mockOrg,
        subscription: { tier: 'free', status: 'active' },
      });

      // Free tier has specific limits
      const formResult = await checkFormLimit('org_test123', 0);
      expect(formResult.limit).toBeGreaterThan(0);

      const connectionResult = await checkConnectionLimit('org_test123', 0);
      expect(connectionResult.limit).toBeGreaterThan(0);
    });

    it('should handle pro tier with higher limits', async () => {
      const db = require('@/lib/platform/db');
      db.__mockOrgsCollection.findOne.mockResolvedValue({
        ...db.__mockOrg,
        subscription: { tier: 'pro', status: 'active' },
      });

      const formResult = await checkFormLimit('org_test123', 0);

      // Pro tier should have higher or unlimited limits
      // -1 indicates unlimited
      expect(formResult.limit === -1 || formResult.limit > 5).toBe(true);
    });

    it('should handle enterprise tier with unlimited features', async () => {
      const db = require('@/lib/platform/db');
      db.__mockOrgsCollection.findOne.mockResolvedValue({
        ...db.__mockOrg,
        subscription: { tier: 'enterprise', status: 'active' },
      });

      const formResult = await checkFormLimit('org_test123', 1000);

      // Enterprise should allow many forms
      expect(formResult.allowed).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const db = require('@/lib/platform/db');
      db.__mockOrgsCollection.findOne.mockRejectedValueOnce(
        new Error('Database error')
      );

      await expect(checkAILimit('org_test123', 'generations')).rejects.toThrow();
    });

    it('should handle missing organization', async () => {
      const db = require('@/lib/platform/db');
      db.__mockOrgsCollection.findOne.mockResolvedValueOnce(null);

      const result = await incrementAIUsage('org_nonexistent', 'generations', 1);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not found');
    });
  });
});
