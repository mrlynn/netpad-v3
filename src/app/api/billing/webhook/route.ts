/**
 * POST /api/billing/webhook
 *
 * Stripe webhook handler for subscription events.
 * Verifies webhook signature and processes events.
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  syncSubscriptionFromStripe,
  recordBillingEvent,
  markEventProcessed,
  getStripeWebhookSecret,
  isStripeTestMode,
} from '@/lib/platform/billing';
import { getOrganizationsCollection } from '@/lib/platform/db';

// Lazy-loaded Stripe client to avoid errors at build time
let stripeClient: Stripe | null = null;

function getStripe(): Stripe | null {
  // Use test or live key based on mode
  const secretKey = isStripeTestMode()
    ? (process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY)
    : (process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY);

  if (!secretKey) {
    return null;
  }
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2025-12-15.clover',
    });
  }
  return stripeClient;
}

export async function POST(req: NextRequest) {
  const webhookSecret = getStripeWebhookSecret();
  const stripe = getStripe();
  const mode = isStripeTestMode() ? 'test' : 'live';

  if (!stripe || !webhookSecret) {
    console.error(`[Webhook] Stripe or webhook secret not configured for ${mode} mode`);
    return NextResponse.json(
      { error: `Webhook not configured for ${mode} mode` },
      { status: 500 }
    );
  }

  // Get the raw body for signature verification
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  console.log(`[Webhook] Received event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      // ============================================
      // Subscription Events
      // ============================================

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscriptionFromStripe(subscription);

        const orgId = subscription.metadata.orgId;
        if (orgId) {
          await recordBillingEvent(
            event.id,
            event.type === 'customer.subscription.created'
              ? 'subscription.created'
              : 'subscription.updated',
            orgId,
            {
              subscriptionId: subscription.id,
              status: subscription.status,
              tier: subscription.metadata.tier,
            }
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata.orgId;

        if (orgId) {
          // Downgrade to free tier
          const orgsCollection = await getOrganizationsCollection();
          await orgsCollection.updateOne(
            { orgId },
            {
              $set: {
                'subscription.tier': 'free',
                'subscription.status': 'canceled',
                'subscription.canceledAt': new Date(),
                'subscription.updatedAt': new Date(),
                plan: 'free',
                updatedAt: new Date(),
              },
            }
          );

          await recordBillingEvent(event.id, 'subscription.canceled', orgId, {
            subscriptionId: subscription.id,
          });
        }
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata.orgId;

        if (orgId) {
          await recordBillingEvent(event.id, 'subscription.trial_will_end', orgId, {
            subscriptionId: subscription.id,
            trialEnd: subscription.trial_end,
          });

          // TODO: Send email notification about trial ending
        }
        break;
      }

      // ============================================
      // Invoice Events
      // ============================================

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Find org by customer ID
        const orgsCollection = await getOrganizationsCollection();
        const org = await orgsCollection.findOne({ stripeCustomerId: customerId });

        if (org) {
          await recordBillingEvent(event.id, 'invoice.paid', org.orgId, {
            invoiceId: invoice.id,
            amountPaid: invoice.amount_paid,
            currency: invoice.currency,
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Find org by customer ID
        const orgsCollection = await getOrganizationsCollection();
        const org = await orgsCollection.findOne({ stripeCustomerId: customerId });

        if (org) {
          // Update subscription status
          await orgsCollection.updateOne(
            { orgId: org.orgId },
            {
              $set: {
                'subscription.status': 'past_due',
                'subscription.updatedAt': new Date(),
                updatedAt: new Date(),
              },
            }
          );

          await recordBillingEvent(event.id, 'invoice.payment_failed', org.orgId, {
            invoiceId: invoice.id,
            amountDue: invoice.amount_due,
          });

          // TODO: Send email notification about failed payment
        }
        break;
      }

      // ============================================
      // Payment Method Events
      // ============================================

      case 'payment_method.attached': {
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        const customerId = paymentMethod.customer as string;

        const orgsCollection = await getOrganizationsCollection();
        const org = await orgsCollection.findOne({ stripeCustomerId: customerId });

        if (org) {
          await recordBillingEvent(event.id, 'payment_method.attached', org.orgId, {
            paymentMethodId: paymentMethod.id,
            type: paymentMethod.type,
            cardBrand: paymentMethod.card?.brand,
            cardLast4: paymentMethod.card?.last4,
          });
        }
        break;
      }

      case 'payment_method.detached': {
        const paymentMethod = event.data.object as Stripe.PaymentMethod;

        // Note: customer is null after detachment, so we can only log the event
        console.log(`[Webhook] Payment method detached: ${paymentMethod.id}`);
        break;
      }

      // ============================================
      // Checkout Events
      // ============================================

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // If subscription mode, the subscription events will handle the rest
        if (session.mode === 'subscription') {
          console.log(`[Webhook] Checkout completed for subscription: ${session.subscription}`);
        }
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    // Mark event as processed
    await markEventProcessed(event.id);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`[Webhook] Error processing ${event.type}:`, error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

