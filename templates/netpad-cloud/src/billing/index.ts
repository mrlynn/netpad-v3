/**
 * Billing Service Implementation
 *
 * Handles Stripe integration for subscription management.
 * This is cloud-only functionality.
 */

import type { BillingService } from '@/lib/extensions';
import Stripe from 'stripe';

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

/**
 * Get Stripe price IDs based on environment
 */
function getPriceIds() {
  const isLive = process.env.STRIPE_MODE === 'live';
  return {
    proMonthly: isLive
      ? process.env.STRIPE_PRICE_PRO_MONTHLY_LIVE
      : process.env.STRIPE_PRICE_PRO_MONTHLY_TEST,
    proYearly: isLive
      ? process.env.STRIPE_PRICE_PRO_YEARLY_LIVE
      : process.env.STRIPE_PRICE_PRO_YEARLY_TEST,
    teamMonthly: isLive
      ? process.env.STRIPE_PRICE_TEAM_MONTHLY_LIVE
      : process.env.STRIPE_PRICE_TEAM_MONTHLY_TEST,
    teamYearly: isLive
      ? process.env.STRIPE_PRICE_TEAM_YEARLY_LIVE
      : process.env.STRIPE_PRICE_TEAM_YEARLY_TEST,
  };
}

export const billingService: BillingService = {
  async createCheckoutSession({ organizationId, priceId, successUrl, cancelUrl }) {
    // TODO: Get or create Stripe customer for organization
    const customerId = await getOrCreateCustomer(organizationId);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        organizationId,
      },
    });

    return {
      sessionId: session.id,
      url: session.url!,
    };
  },

  async createPortalSession({ organizationId, returnUrl }) {
    const customerId = await getOrCreateCustomer(organizationId);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return {
      url: session.url,
    };
  },

  async getSubscription(organizationId) {
    // TODO: Look up subscription from database
    const subscription = await getSubscriptionFromDb(organizationId);

    if (!subscription) {
      return null;
    }

    return {
      tier: subscription.tier,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
    };
  },

  async handleWebhook(payload, signature) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[Billing] Unhandled event type: ${event.type}`);
    }
  },
};

// ============================================
// Helper functions (implement these)
// ============================================

async function getOrCreateCustomer(organizationId: string): Promise<string> {
  // TODO: Look up customer in database, create if not exists
  throw new Error('Not implemented - move from src/lib/platform/billing.ts');
}

async function getSubscriptionFromDb(organizationId: string) {
  // TODO: Look up subscription in database
  throw new Error('Not implemented - move from src/lib/platform/billing.ts');
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  // TODO: Update organization subscription
  throw new Error('Not implemented - move from src/lib/platform/billing.ts');
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  // TODO: Update organization subscription
  throw new Error('Not implemented - move from src/lib/platform/billing.ts');
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  // TODO: Handle subscription cancellation
  throw new Error('Not implemented - move from src/lib/platform/billing.ts');
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // TODO: Handle failed payment
  throw new Error('Not implemented - move from src/lib/platform/billing.ts');
}
