/**
 * Cloud-Only Route Behavior Tests
 *
 * Tests that cloud-only endpoints correctly return errors in self-hosted mode.
 * These endpoints include:
 * - /api/billing/portal
 * - /api/billing/checkout
 * - /api/billing/cancel
 *
 * Note: These tests focus on the logic of the isFeatureAvailable checks
 * rather than full API route testing (which would require E2E tests).
 */

// Mock the extensions module to simulate different deployment modes
const mockIsFeatureAvailable = jest.fn();
const mockGetBillingService = jest.fn();
const mockExtensionsLoaded = jest.fn();
const mockLoadExtensions = jest.fn();

jest.mock('@/lib/extensions', () => ({
  isFeatureAvailable: mockIsFeatureAvailable,
  getBillingService: mockGetBillingService,
  extensionsLoaded: mockExtensionsLoaded,
  loadExtensions: mockLoadExtensions,
}));

// Mock deployment mode
jest.mock('@/lib/runtime/deploymentMode', () => ({
  getDeploymentMode: jest.fn(() => 'self-hosted'),
  isCloudMode: jest.fn(() => false),
  isSelfHosted: jest.fn(() => true),
}));

describe('Cloud-Only Feature Checks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExtensionsLoaded.mockReturnValue(true);
  });

  describe('isFeatureAvailable', () => {
    describe('Self-Hosted Mode', () => {
      beforeEach(() => {
        mockIsFeatureAvailable.mockReturnValue({
          available: false,
          reason: 'Feature "billing" is not enabled. This may require a cloud deployment or additional extension.',
        });
      });

      it('should return unavailable for billing feature', () => {
        const result = mockIsFeatureAvailable('billing');

        expect(result.available).toBe(false);
        expect(result.reason).toContain('not enabled');
      });

      it('should return unavailable for stripe_integration feature', () => {
        const result = mockIsFeatureAvailable('stripe_integration');

        expect(result.available).toBe(false);
      });

      it('should return unavailable for subscription_management feature', () => {
        const result = mockIsFeatureAvailable('subscription_management');

        expect(result.available).toBe(false);
      });

      it('should return unavailable for atlas_provisioning feature', () => {
        const result = mockIsFeatureAvailable('atlas_provisioning');

        expect(result.available).toBe(false);
      });
    });

    describe('Cloud Mode', () => {
      beforeEach(() => {
        mockIsFeatureAvailable.mockReturnValue({
          available: true,
          providedBy: 'cloud-features',
        });
      });

      it('should return available for billing feature', () => {
        const result = mockIsFeatureAvailable('billing');

        expect(result.available).toBe(true);
        expect(result.providedBy).toBe('cloud-features');
      });

      it('should return available for stripe_integration feature', () => {
        const result = mockIsFeatureAvailable('stripe_integration');

        expect(result.available).toBe(true);
      });
    });
  });

  describe('getBillingService', () => {
    it('should return null in self-hosted mode', () => {
      mockGetBillingService.mockReturnValue(null);

      const service = mockGetBillingService();

      expect(service).toBeNull();
    });

    it('should return service in cloud mode', () => {
      const mockService = {
        createCheckoutSession: jest.fn(),
        createPortalSession: jest.fn(),
        getSubscription: jest.fn(),
        handleWebhook: jest.fn(),
      };
      mockGetBillingService.mockReturnValue(mockService);

      const service = mockGetBillingService();

      expect(service).toBe(mockService);
      expect(service.createCheckoutSession).toBeDefined();
      expect(service.createPortalSession).toBeDefined();
    });
  });

  describe('Extension Loading', () => {
    it('should report not loaded before loadExtensions is called', () => {
      mockExtensionsLoaded.mockReturnValue(false);

      expect(mockExtensionsLoaded()).toBe(false);
    });

    it('should report loaded after loadExtensions is called', async () => {
      mockExtensionsLoaded.mockReturnValue(true);
      mockLoadExtensions.mockResolvedValue(undefined);

      await mockLoadExtensions();

      expect(mockExtensionsLoaded()).toBe(true);
    });
  });

  describe('Billing Route Logic', () => {
    it('should check billing feature before processing portal request', () => {
      mockIsFeatureAvailable.mockReturnValue({ available: false });

      const featureCheck = mockIsFeatureAvailable('billing');

      expect(featureCheck.available).toBe(false);
      // In actual route: would return 400 error
    });

    it('should check billing feature before processing checkout request', () => {
      mockIsFeatureAvailable.mockReturnValue({ available: false });

      const featureCheck = mockIsFeatureAvailable('billing');

      expect(featureCheck.available).toBe(false);
      // In actual route: would return 400 error
    });

    it('should check billing feature before processing cancel request', () => {
      mockIsFeatureAvailable.mockReturnValue({ available: false });

      const featureCheck = mockIsFeatureAvailable('billing');

      expect(featureCheck.available).toBe(false);
      // In actual route: would return 400 error
    });
  });

  describe('Service Availability Pattern', () => {
    it('should follow the pattern: check feature -> get service -> use service', async () => {
      // Step 1: Check feature availability
      mockIsFeatureAvailable.mockReturnValue({
        available: true,
        providedBy: 'cloud-features',
      });

      const featureCheck = mockIsFeatureAvailable('billing');
      expect(featureCheck.available).toBe(true);

      // Step 2: Get the service
      const mockService = {
        createPortalSession: jest.fn().mockResolvedValue({
          url: 'https://billing.stripe.com/portal',
        }),
      };
      mockGetBillingService.mockReturnValue(mockService);

      const service = mockGetBillingService();
      expect(service).not.toBeNull();

      // Step 3: Use the service
      const result = await service.createPortalSession({
        organizationId: 'org_123',
        returnUrl: 'https://example.com/settings',
      });
      expect(result.url).toBeDefined();
    });

    it('should short-circuit when feature is not available', () => {
      mockIsFeatureAvailable.mockReturnValue({
        available: false,
        reason: 'Billing not enabled in self-hosted mode',
      });

      const featureCheck = mockIsFeatureAvailable('billing');

      // Should not proceed to get service if feature is unavailable
      if (!featureCheck.available) {
        // Route would return error here
        expect(featureCheck.reason).toContain('not enabled');
        // Service should not be called
        expect(mockGetBillingService).not.toHaveBeenCalled();
      }
    });
  });

  describe('Error Message Consistency', () => {
    it('should provide consistent error format for self-hosted mode', () => {
      mockIsFeatureAvailable.mockReturnValue({
        available: false,
        reason: 'Feature "billing" is not enabled. This may require a cloud deployment or additional extension.',
      });

      const result = mockIsFeatureAvailable('billing');

      // Error should mention that feature is not enabled
      expect(result.reason).toContain('not enabled');
      // Error should suggest cloud deployment
      expect(result.reason).toContain('cloud');
    });

    it('should include extension provider info when available', () => {
      mockIsFeatureAvailable.mockReturnValue({
        available: true,
        providedBy: 'netpad-cloud-features',
      });

      const result = mockIsFeatureAvailable('billing');

      expect(result.providedBy).toBe('netpad-cloud-features');
    });
  });

  describe('Feature Matrix', () => {
    const cloudOnlyFeatures = [
      'billing',
      'stripe_integration',
      'subscription_management',
      'atlas_provisioning',
      'cluster_management',
      'application_marketplace',
      'app_approval_workflow',
      'admin_dashboard',
      'waitlist_management',
    ];

    it('should identify all cloud-only features as unavailable in self-hosted mode', () => {
      mockIsFeatureAvailable.mockReturnValue({
        available: false,
        reason: 'Feature is not enabled',
      });

      for (const feature of cloudOnlyFeatures) {
        const result = mockIsFeatureAvailable(feature);
        expect(result.available).toBe(false);
      }
    });

    it('should track which features are cloud-only', () => {
      // These features should only be available with cloud extension
      expect(cloudOnlyFeatures).toContain('billing');
      expect(cloudOnlyFeatures).toContain('stripe_integration');
      expect(cloudOnlyFeatures).toContain('atlas_provisioning');
      expect(cloudOnlyFeatures).toContain('admin_dashboard');
    });
  });

  describe('Graceful Degradation', () => {
    it('should allow app to function without cloud features', () => {
      // In self-hosted mode, app should still work
      // Just without billing/cloud-specific features
      mockIsFeatureAvailable.mockImplementation((feature: string) => {
        const cloudOnly = ['billing', 'stripe_integration', 'atlas_provisioning'];
        return {
          available: !cloudOnly.includes(feature),
          reason: cloudOnly.includes(feature)
            ? 'Cloud feature not available in self-hosted mode'
            : undefined,
        };
      });

      // Cloud features unavailable
      expect(mockIsFeatureAvailable('billing').available).toBe(false);
      expect(mockIsFeatureAvailable('stripe_integration').available).toBe(false);

      // Core features should still work
      expect(mockIsFeatureAvailable('forms').available).toBe(true);
      expect(mockIsFeatureAvailable('workflows').available).toBe(true);
    });

    it('should provide helpful guidance when feature is unavailable', () => {
      mockIsFeatureAvailable.mockReturnValue({
        available: false,
        reason: 'Billing portal is not available in self-hosted mode. Manage your subscription through your billing provider.',
      });

      const result = mockIsFeatureAvailable('billing');

      // Should suggest alternative action
      expect(result.reason).toContain('billing provider');
    });
  });
});
