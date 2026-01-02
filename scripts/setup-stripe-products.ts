#!/usr/bin/env npx ts-node
/**
 * Stripe Product & Price Setup Script
 *
 * Creates products and prices in Stripe matching your pricing tiers.
 *
 * Usage:
 *   npx ts-node scripts/setup-stripe-products.ts --mode test   # Create in test account
 *   npx ts-node scripts/setup-stripe-products.ts --mode live   # Create in live account
 *   npx ts-node scripts/setup-stripe-products.ts               # Uses STRIPE_MODE from .env.local
 *
 * Prerequisites:
 *   - STRIPE_SECRET_KEY_TEST and/or STRIPE_SECRET_KEY_LIVE must be set in .env.local
 *
 * This script will:
 *   1. Create a "NetPad Pro" product with monthly and yearly prices
 *   2. Create a "NetPad Team" product with monthly and yearly per-seat prices
 *   3. Output the price IDs to add to your .env.local
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Parse command line arguments
function parseArgs(): { mode: 'test' | 'live' } {
  const args = process.argv.slice(2);
  const modeIndex = args.indexOf('--mode');

  if (modeIndex !== -1 && args[modeIndex + 1]) {
    const mode = args[modeIndex + 1].toLowerCase();
    if (mode === 'test' || mode === 'live') {
      return { mode };
    }
    console.error(`Invalid mode: ${mode}. Use 'test' or 'live'.`);
    process.exit(1);
  }

  // Default to STRIPE_MODE env var, or 'test' if not set
  const envMode = process.env.STRIPE_MODE?.toLowerCase();
  if (envMode === 'live') {
    return { mode: 'live' };
  }
  return { mode: 'test' };
}

const { mode } = parseArgs();

// Get the appropriate Stripe key based on mode
function getStripeKey(): string {
  if (mode === 'test') {
    const key = process.env.STRIPE_SECRET_KEY_TEST;
    if (!key) {
      console.error('Error: STRIPE_SECRET_KEY_TEST not found in environment');
      console.error('Please add it to your .env.local file');
      process.exit(1);
    }
    return key;
  } else {
    const key = process.env.STRIPE_SECRET_KEY_LIVE;
    if (!key) {
      console.error('Error: STRIPE_SECRET_KEY_LIVE not found in environment');
      console.error('Please add it to your .env.local file');
      process.exit(1);
    }
    return key;
  }
}

const STRIPE_SECRET_KEY = getStripeKey();

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-12-15.clover',
});

interface ProductConfig {
  name: string;
  description: string;
  metadata: Record<string, string>;
  prices: {
    monthly: {
      unitAmount: number;
      nickname: string;
    };
    yearly: {
      unitAmount: number;
      nickname: string;
    };
  };
  perSeat?: boolean;
}

const products: Record<string, ProductConfig> = {
  pro: {
    name: 'NetPad Pro',
    description: 'Professional tier for power users. Unlimited forms, AI features, custom branding, and webhooks.',
    metadata: {
      tier: 'pro',
      maxForms: 'unlimited',
      maxSubmissions: '1000',
      aiGenerations: '100',
      agentSessions: '20',
    },
    prices: {
      monthly: {
        unitAmount: 1900, // $19.00 in cents
        nickname: 'Pro Monthly',
      },
      yearly: {
        unitAmount: 19000, // $190.00 in cents (17% discount)
        nickname: 'Pro Yearly',
      },
    },
  },
  team: {
    name: 'NetPad Team',
    description: 'Team tier for collaboration. Per-seat pricing with advanced features, field encryption, and analytics.',
    metadata: {
      tier: 'team',
      maxForms: 'unlimited',
      maxSubmissions: '10000',
      aiGenerations: '500',
      agentSessions: '100',
    },
    prices: {
      monthly: {
        unitAmount: 4900, // $49.00 per seat in cents
        nickname: 'Team Monthly (per seat)',
      },
      yearly: {
        unitAmount: 49000, // $490.00 per seat yearly in cents (17% discount)
        nickname: 'Team Yearly (per seat)',
      },
    },
    perSeat: true,
  },
};

async function findExistingProduct(tier: string): Promise<Stripe.Product | null> {
  const existingProducts = await stripe.products.search({
    query: `metadata['tier']:'${tier}'`,
  });
  return existingProducts.data[0] || null;
}

async function findExistingPrice(productId: string, interval: 'month' | 'year'): Promise<Stripe.Price | null> {
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
  });
  return prices.data.find(p => p.recurring?.interval === interval) || null;
}

async function createOrUpdateProduct(
  tierKey: string,
  config: ProductConfig
): Promise<{ productId: string; monthlyPriceId: string; yearlyPriceId: string }> {
  console.log(`\n📦 Setting up ${config.name}...`);

  // Check for existing product
  let product = await findExistingProduct(tierKey);

  if (product) {
    console.log(`  ✓ Found existing product: ${product.id}`);
    // Update the product
    product = await stripe.products.update(product.id, {
      name: config.name,
      description: config.description,
      metadata: config.metadata,
    });
    console.log(`  ✓ Updated product metadata`);
  } else {
    // Create new product
    product = await stripe.products.create({
      name: config.name,
      description: config.description,
      metadata: config.metadata,
    });
    console.log(`  ✓ Created new product: ${product.id}`);
  }

  // Check for existing prices
  let monthlyPrice = await findExistingPrice(product.id, 'month');
  let yearlyPrice = await findExistingPrice(product.id, 'year');

  // Create monthly price if doesn't exist
  if (monthlyPrice) {
    console.log(`  ✓ Found existing monthly price: ${monthlyPrice.id}`);
    // Check if price amount matches
    if (monthlyPrice.unit_amount !== config.prices.monthly.unitAmount) {
      console.log(`  ⚠ Monthly price amount mismatch. Creating new price...`);
      // Archive old price
      await stripe.prices.update(monthlyPrice.id, { active: false });
      monthlyPrice = null;
    }
  }

  if (!monthlyPrice) {
    monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: config.prices.monthly.unitAmount,
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      nickname: config.prices.monthly.nickname,
      metadata: {
        tier: tierKey,
        billing_interval: 'month',
      },
    });
    console.log(`  ✓ Created monthly price: ${monthlyPrice.id}`);
  }

  // Create yearly price if doesn't exist
  if (yearlyPrice) {
    console.log(`  ✓ Found existing yearly price: ${yearlyPrice.id}`);
    // Check if price amount matches
    if (yearlyPrice.unit_amount !== config.prices.yearly.unitAmount) {
      console.log(`  ⚠ Yearly price amount mismatch. Creating new price...`);
      // Archive old price
      await stripe.prices.update(yearlyPrice.id, { active: false });
      yearlyPrice = null;
    }
  }

  if (!yearlyPrice) {
    yearlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: config.prices.yearly.unitAmount,
      currency: 'usd',
      recurring: {
        interval: 'year',
      },
      nickname: config.prices.yearly.nickname,
      metadata: {
        tier: tierKey,
        billing_interval: 'year',
      },
    });
    console.log(`  ✓ Created yearly price: ${yearlyPrice.id}`);
  }

  return {
    productId: product.id,
    monthlyPriceId: monthlyPrice.id,
    yearlyPriceId: yearlyPrice.id,
  };
}

async function setupBillingPortal() {
  console.log('\n⚙️  Configuring Billing Portal...');

  try {
    // Get existing configurations
    const configs = await stripe.billingPortal.configurations.list({ limit: 1 });

    const portalConfig: Stripe.BillingPortal.ConfigurationCreateParams = {
      business_profile: {
        headline: 'Manage your NetPad subscription',
        privacy_policy_url: 'https://netpad.io/privacy',
        terms_of_service_url: 'https://netpad.io/terms',
      },
      features: {
        customer_update: {
          enabled: true,
          allowed_updates: ['email', 'address', 'name'],
        },
        invoice_history: {
          enabled: true,
        },
        payment_method_update: {
          enabled: true,
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: {
            enabled: true,
            options: [
              'too_expensive',
              'missing_features',
              'switched_service',
              'unused',
              'other',
            ],
          },
        },
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price', 'quantity'],
          proration_behavior: 'create_prorations',
        },
      },
    };

    if (configs.data.length > 0) {
      // Update existing configuration
      await stripe.billingPortal.configurations.update(
        configs.data[0].id,
        portalConfig
      );
      console.log('  ✓ Updated billing portal configuration');
    } else {
      // Create new configuration
      await stripe.billingPortal.configurations.create(portalConfig);
      console.log('  ✓ Created billing portal configuration');
    }
  } catch (error) {
    console.log('  ⚠ Could not configure billing portal (may need to be done in dashboard)');
    console.log('    Error:', error instanceof Error ? error.message : 'Unknown error');
  }
}

async function main() {
  const modeUpper = mode.toUpperCase();
  const suffix = mode === 'test' ? '_TEST' : '';

  console.log('🚀 NetPad Stripe Setup');
  console.log('='.repeat(50));
  console.log(`Mode: ${modeUpper}`);
  console.log(`Using Stripe ${modeUpper} API key`);
  console.log('');

  if (mode === 'live') {
    console.log('⚠️  WARNING: You are creating products in LIVE mode!');
    console.log('   These will be real products that customers can purchase.');
    console.log('');
  }

  const results: Record<string, { productId: string; monthlyPriceId: string; yearlyPriceId: string }> = {};

  for (const [tierKey, config] of Object.entries(products)) {
    results[tierKey] = await createOrUpdateProduct(tierKey, config);
  }

  // Setup billing portal
  await setupBillingPortal();

  // Output environment variables
  console.log('\n' + '='.repeat(50));
  console.log('✅ Setup Complete!');
  console.log('='.repeat(50));
  console.log('\nAdd these to your .env.local:\n');
  console.log(`# Stripe ${modeUpper} Price IDs`);
  console.log(`STRIPE_PRICE_PRO_MONTHLY${suffix}=${results.pro.monthlyPriceId}`);
  console.log(`STRIPE_PRICE_PRO_YEARLY${suffix}=${results.pro.yearlyPriceId}`);
  console.log(`STRIPE_PRICE_TEAM_MONTHLY${suffix}=${results.team.monthlyPriceId}`);
  console.log(`STRIPE_PRICE_TEAM_YEARLY${suffix}=${results.team.yearlyPriceId}`);

  console.log('\n📋 Product Summary:');
  console.log('-'.repeat(50));
  for (const [tier, data] of Object.entries(results)) {
    const config = products[tier];
    console.log(`\n${config.name}:`);
    console.log(`  Product ID: ${data.productId}`);
    console.log(`  Monthly: ${data.monthlyPriceId} ($${(config.prices.monthly.unitAmount / 100).toFixed(2)}/mo)`);
    console.log(`  Yearly: ${data.yearlyPriceId} ($${(config.prices.yearly.unitAmount / 100).toFixed(2)}/yr)`);
  }

  console.log('\n🔗 Useful Links:');
  const dashboardBase = mode === 'test'
    ? 'https://dashboard.stripe.com/test'
    : 'https://dashboard.stripe.com';
  console.log(`  Products: ${dashboardBase}/products`);
  console.log(`  Webhooks: ${dashboardBase}/webhooks`);
  if (mode === 'test') {
    console.log(`  Test Cards: https://stripe.com/docs/testing#cards`);
  }

  console.log('\n💡 Next Steps:');
  if (mode === 'test') {
    console.log('  1. Copy the price IDs above to your .env.local');
    console.log('  2. Test checkout with card number: 4242 4242 4242 4242');
    console.log('  3. When ready for production, run: npx ts-node scripts/setup-stripe-products.ts --mode live');
  } else {
    console.log('  1. Copy the price IDs above to your .env.local');
    console.log('  2. Set STRIPE_MODE=live in production environment');
    console.log('  3. Configure webhook endpoint in Stripe dashboard');
  }
}

main().catch(console.error);
