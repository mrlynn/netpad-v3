/**
 * Extension Registry Tests
 *
 * Tests for the NetPad extension system registry functionality including:
 * - Extension registration and unregistration
 * - Feature availability checks
 * - Service access
 * - Event handling
 */

import {
  registerExtension,
  unregisterExtension,
  isFeatureAvailable,
  getBillingService,
  getUsageService,
  getAtlasProvisioningService,
  getMarketplaceService,
  getWaitlistService,
  getAdminService,
  getEnabledFeatures,
  getRegistryStatus,
  initializeExtensions,
  cleanupExtensions,
  onExtensionEvent,
  getExtensionRoutes,
  getExtensionMiddleware,
} from '@/lib/extensions/registry';
import {
  NetPadExtension,
  ExtensionFeature,
  BillingService,
  UsageService,
  ExtensionEvent,
} from '@/lib/extensions/types';

// Mock the deployment mode module
jest.mock('@/lib/runtime/deploymentMode', () => ({
  getDeploymentMode: jest.fn(() => 'cloud'),
  isCloudMode: jest.fn(() => true),
  isSelfHosted: jest.fn(() => false),
}));

// Helper to clear registry state between tests
// Note: We need to access the internal state, so we'll use a fresh module for each test
beforeEach(() => {
  jest.resetModules();
});

describe('Extension Registry', () => {
  // Create a mock extension for testing
  const createMockExtension = (
    overrides: Partial<NetPadExtension> = {}
  ): NetPadExtension => ({
    metadata: {
      id: 'test-extension',
      name: 'Test Extension',
      version: '1.0.0',
      description: 'A test extension',
    },
    features: ['billing', 'atlas_provisioning'] as ExtensionFeature[],
    ...overrides,
  });

  // Create a mock billing service
  const createMockBillingService = (): BillingService => ({
    createCheckoutSession: jest.fn().mockResolvedValue({
      sessionId: 'sess_123',
      url: 'https://checkout.stripe.com/test',
    }),
    createPortalSession: jest.fn().mockResolvedValue({
      url: 'https://billing.stripe.com/portal',
    }),
    getSubscription: jest.fn().mockResolvedValue({
      tier: 'pro',
      status: 'active',
      currentPeriodEnd: new Date(),
    }),
    handleWebhook: jest.fn().mockResolvedValue(undefined),
  });

  // Create a mock usage service
  const createMockUsageService = (): Partial<UsageService> => ({
    checkAILimit: jest.fn().mockResolvedValue({
      allowed: true,
      current: 50,
      limit: 1000,
      remaining: 950,
    }),
    incrementAIUsage: jest.fn().mockResolvedValue({
      allowed: true,
      current: 51,
      limit: 1000,
      remaining: 949,
    }),
    getSubscriptionTier: jest.fn().mockResolvedValue('pro'),
  });

  describe('registerExtension', () => {
    it('should register an extension successfully', async () => {
      const { registerExtension, getRegistryStatus } = await import(
        '@/lib/extensions/registry'
      );

      const extension = createMockExtension();
      registerExtension(extension);

      const status = getRegistryStatus();
      expect(status.extensionCount).toBe(1);
      expect(status.extensions[0].id).toBe('test-extension');
      expect(status.extensions[0].name).toBe('Test Extension');
    });

    it('should not register the same extension twice', async () => {
      const { registerExtension, getRegistryStatus } = await import(
        '@/lib/extensions/registry'
      );

      const extension = createMockExtension();
      registerExtension(extension);
      registerExtension(extension); // Try to register again

      const status = getRegistryStatus();
      expect(status.extensionCount).toBe(1);
    });

    it('should track features provided by extension', async () => {
      const { registerExtension, getEnabledFeatures } = await import(
        '@/lib/extensions/registry'
      );

      const extension = createMockExtension({
        features: ['billing', 'stripe_integration', 'atlas_provisioning'],
      });
      registerExtension(extension);

      const features = getEnabledFeatures();
      expect(features).toContain('billing');
      expect(features).toContain('stripe_integration');
      expect(features).toContain('atlas_provisioning');
    });

    it('should emit registration event', async () => {
      const { registerExtension, onExtensionEvent } = await import(
        '@/lib/extensions/registry'
      );

      const events: ExtensionEvent[] = [];
      onExtensionEvent((event) => events.push(event));

      const extension = createMockExtension();
      registerExtension(extension);

      // Should have feature events + registration event
      expect(events.length).toBeGreaterThan(0);
      expect(events.some((e) => e.type === 'extension:registered')).toBe(true);
      expect(events.some((e) => e.type === 'feature:enabled')).toBe(true);
    });
  });

  describe('unregisterExtension', () => {
    it('should unregister an extension successfully', async () => {
      const { registerExtension, unregisterExtension, getRegistryStatus } =
        await import('@/lib/extensions/registry');

      const extension = createMockExtension();
      registerExtension(extension);
      unregisterExtension('test-extension');

      const status = getRegistryStatus();
      expect(status.extensionCount).toBe(0);
    });

    it('should remove features when extension is unregistered', async () => {
      const {
        registerExtension,
        unregisterExtension,
        getEnabledFeatures,
      } = await import('@/lib/extensions/registry');

      const extension = createMockExtension({
        features: ['billing', 'atlas_provisioning'],
      });
      registerExtension(extension);
      unregisterExtension('test-extension');

      const features = getEnabledFeatures();
      expect(features).not.toContain('billing');
      expect(features).not.toContain('atlas_provisioning');
    });

    it('should emit disabled events for features', async () => {
      const {
        registerExtension,
        unregisterExtension,
        onExtensionEvent,
      } = await import('@/lib/extensions/registry');

      const extension = createMockExtension();
      registerExtension(extension);

      const events: ExtensionEvent[] = [];
      onExtensionEvent((event) => events.push(event));

      unregisterExtension('test-extension');

      expect(events.some((e) => e.type === 'feature:disabled')).toBe(true);
    });
  });

  describe('isFeatureAvailable', () => {
    it('should return available for registered features', async () => {
      const { registerExtension, isFeatureAvailable } = await import(
        '@/lib/extensions/registry'
      );

      const extension = createMockExtension({
        features: ['billing'],
      });
      registerExtension(extension);

      const result = isFeatureAvailable('billing');
      expect(result.available).toBe(true);
      expect(result.providedBy).toBe('test-extension');
    });

    it('should return not available for unregistered features', async () => {
      const { isFeatureAvailable } = await import('@/lib/extensions/registry');

      const result = isFeatureAvailable('billing');
      expect(result.available).toBe(false);
      expect(result.reason).toContain('not enabled');
    });

    it('should include extension ID when feature is provided', async () => {
      const { registerExtension, isFeatureAvailable } = await import(
        '@/lib/extensions/registry'
      );

      const extension = createMockExtension({
        metadata: {
          id: 'cloud-features',
          name: 'Cloud Features',
          version: '1.0.0',
        },
        features: ['stripe_integration'],
      });
      registerExtension(extension);

      const result = isFeatureAvailable('stripe_integration');
      expect(result.providedBy).toBe('cloud-features');
    });
  });

  describe('Service Access', () => {
    describe('getBillingService', () => {
      it('should return null when no billing service is registered', async () => {
        const { getBillingService } = await import('@/lib/extensions/registry');
        expect(getBillingService()).toBeNull();
      });

      it('should return the billing service when registered', async () => {
        const { registerExtension, getBillingService } = await import(
          '@/lib/extensions/registry'
        );

        const mockBillingService = createMockBillingService();
        const extension = createMockExtension({
          services: {
            billing: mockBillingService,
          },
        });
        registerExtension(extension);

        const service = getBillingService();
        expect(service).toBe(mockBillingService);
      });

      it('should allow calling billing service methods', async () => {
        const { registerExtension, getBillingService } = await import(
          '@/lib/extensions/registry'
        );

        const mockBillingService = createMockBillingService();
        const extension = createMockExtension({
          services: { billing: mockBillingService },
        });
        registerExtension(extension);

        const service = getBillingService()!;
        const result = await service.createCheckoutSession({
          organizationId: 'org_123',
          priceId: 'price_pro',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        });

        expect(result.sessionId).toBe('sess_123');
        expect(mockBillingService.createCheckoutSession).toHaveBeenCalled();
      });
    });

    describe('getUsageService', () => {
      it('should return null when no usage service is registered', async () => {
        const { getUsageService } = await import('@/lib/extensions/registry');
        expect(getUsageService()).toBeNull();
      });

      it('should return the usage service when registered', async () => {
        const { registerExtension, getUsageService } = await import(
          '@/lib/extensions/registry'
        );

        const mockUsageService = createMockUsageService() as UsageService;
        const extension = createMockExtension({
          services: {
            usage: mockUsageService,
          },
        });
        registerExtension(extension);

        const service = getUsageService();
        expect(service).toBe(mockUsageService);
      });
    });

    describe('getAtlasProvisioningService', () => {
      it('should return null when no service is registered', async () => {
        const { getAtlasProvisioningService } = await import(
          '@/lib/extensions/registry'
        );
        expect(getAtlasProvisioningService()).toBeNull();
      });
    });

    describe('getMarketplaceService', () => {
      it('should return null when no service is registered', async () => {
        const { getMarketplaceService } = await import(
          '@/lib/extensions/registry'
        );
        expect(getMarketplaceService()).toBeNull();
      });
    });

    describe('getWaitlistService', () => {
      it('should return null when no service is registered', async () => {
        const { getWaitlistService } = await import('@/lib/extensions/registry');
        expect(getWaitlistService()).toBeNull();
      });
    });

    describe('getAdminService', () => {
      it('should return null when no service is registered', async () => {
        const { getAdminService } = await import('@/lib/extensions/registry');
        expect(getAdminService()).toBeNull();
      });
    });
  });

  describe('initializeExtensions', () => {
    it('should call initialize on all extensions', async () => {
      const { registerExtension, initializeExtensions, getRegistryStatus } =
        await import('@/lib/extensions/registry');

      const initFn = jest.fn().mockResolvedValue(undefined);
      const extension = createMockExtension({
        initialize: initFn,
      });

      registerExtension(extension);
      await initializeExtensions();

      expect(initFn).toHaveBeenCalled();
      expect(getRegistryStatus().initialized).toBe(true);
    });

    it('should not initialize twice', async () => {
      const { registerExtension, initializeExtensions } = await import(
        '@/lib/extensions/registry'
      );

      const initFn = jest.fn().mockResolvedValue(undefined);
      const extension = createMockExtension({
        initialize: initFn,
      });

      registerExtension(extension);
      await initializeExtensions();
      await initializeExtensions(); // Second call

      expect(initFn).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization errors gracefully', async () => {
      const { registerExtension, initializeExtensions, onExtensionEvent } =
        await import('@/lib/extensions/registry');

      const events: ExtensionEvent[] = [];
      onExtensionEvent((event) => events.push(event));

      const initFn = jest.fn().mockRejectedValue(new Error('Init failed'));
      const extension = createMockExtension({
        initialize: initFn,
      });

      registerExtension(extension);

      // Should not throw
      await expect(initializeExtensions()).resolves.not.toThrow();

      // Should emit error event
      expect(events.some((e) => e.type === 'extension:error')).toBe(true);
    });
  });

  describe('cleanupExtensions', () => {
    it('should call cleanup on all extensions', async () => {
      const {
        registerExtension,
        initializeExtensions,
        cleanupExtensions,
        getRegistryStatus,
      } = await import('@/lib/extensions/registry');

      const cleanupFn = jest.fn().mockResolvedValue(undefined);
      const extension = createMockExtension({
        cleanup: cleanupFn,
      });

      registerExtension(extension);
      await initializeExtensions();
      await cleanupExtensions();

      expect(cleanupFn).toHaveBeenCalled();
      expect(getRegistryStatus().initialized).toBe(false);
    });
  });

  describe('Routes and Middleware', () => {
    it('should return all routes from extensions', async () => {
      const { registerExtension, getExtensionRoutes } = await import(
        '@/lib/extensions/registry'
      );

      const mockHandler = jest.fn();
      const extension = createMockExtension({
        routes: [
          {
            path: '/api/billing/checkout',
            method: 'POST',
            handler: mockHandler,
            requiresAuth: true,
          },
          {
            path: '/api/billing/portal',
            method: 'POST',
            handler: mockHandler,
            requiresAuth: true,
          },
        ],
      });

      registerExtension(extension);
      const routes = getExtensionRoutes();

      expect(routes).toHaveLength(2);
      expect(routes[0].path).toBe('/api/billing/checkout');
      expect(routes[1].path).toBe('/api/billing/portal');
    });

    it('should return middleware sorted by priority', async () => {
      const { registerExtension, getExtensionMiddleware } = await import(
        '@/lib/extensions/registry'
      );

      const mockHandler = jest.fn();
      const extension = createMockExtension({
        middleware: [
          {
            name: 'low-priority',
            paths: ['/api/*'],
            handler: mockHandler,
            priority: 100,
          },
          {
            name: 'high-priority',
            paths: ['/api/*'],
            handler: mockHandler,
            priority: 10,
          },
        ],
      });

      registerExtension(extension);
      const middleware = getExtensionMiddleware();

      expect(middleware).toHaveLength(2);
      expect(middleware[0].name).toBe('high-priority');
      expect(middleware[1].name).toBe('low-priority');
    });
  });

  describe('Event Handling', () => {
    it('should allow subscribing to events', async () => {
      const { registerExtension, onExtensionEvent } = await import(
        '@/lib/extensions/registry'
      );

      const events: ExtensionEvent[] = [];
      const unsubscribe = onExtensionEvent((event) => events.push(event));

      const extension = createMockExtension();
      registerExtension(extension);

      expect(events.length).toBeGreaterThan(0);

      // Cleanup
      unsubscribe();
    });

    it('should allow unsubscribing from events', async () => {
      const { registerExtension, onExtensionEvent } = await import(
        '@/lib/extensions/registry'
      );

      const events: ExtensionEvent[] = [];
      const unsubscribe = onExtensionEvent((event) => events.push(event));

      unsubscribe();

      const extension = createMockExtension();
      registerExtension(extension);

      // Should not receive events after unsubscribe
      expect(events).toHaveLength(0);
    });

    it('should handle errors in event handlers gracefully', async () => {
      const { registerExtension, onExtensionEvent } = await import(
        '@/lib/extensions/registry'
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      onExtensionEvent(() => {
        throw new Error('Handler error');
      });

      const extension = createMockExtension();

      // Should not throw
      expect(() => registerExtension(extension)).not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('getRegistryStatus', () => {
    it('should return complete registry status', async () => {
      const { registerExtension, getRegistryStatus } = await import(
        '@/lib/extensions/registry'
      );

      const extension = createMockExtension({
        features: ['billing', 'atlas_provisioning'],
      });
      registerExtension(extension);

      const status = getRegistryStatus();

      expect(status).toEqual({
        extensionCount: 1,
        extensions: [
          {
            id: 'test-extension',
            name: 'Test Extension',
            version: '1.0.0',
            features: ['billing', 'atlas_provisioning'],
          },
        ],
        enabledFeatures: expect.arrayContaining([
          'billing',
          'atlas_provisioning',
        ]),
        initialized: false,
        deploymentMode: 'cloud',
      });
    });
  });
});
