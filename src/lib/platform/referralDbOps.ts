/**
 * Referral Database Operations
 *
 * Implements the ReferralDatabaseOperations interface for the cloud-features package.
 * This file bridges the gap between the cloud referral service and the netpad-3 database.
 */

import {
  getReferralCodesCollection,
  getReferralsCollection,
  getReferralEarningsCollection,
  getReferralPayoutsCollection,
  getReferralEventsCollection,
  getOrganizationsCollection,
} from './db';

/**
 * Interface for referral database operations
 * This matches the interface expected by @netpad/cloud-features referral service
 */
export interface ReferralDatabaseOperations {
  // Referral codes
  createReferralCode(data: Record<string, unknown>): Promise<void>;
  getReferralCodeByOrg(orgId: string): Promise<Record<string, unknown> | null>;
  getReferralCodeByCode(code: string): Promise<Record<string, unknown> | null>;
  updateReferralCode(code: string, update: Record<string, unknown>): Promise<void>;

  // Referrals
  createReferral(data: Record<string, unknown>): Promise<string>;
  getReferralByReferredOrg(orgId: string): Promise<Record<string, unknown> | null>;
  getReferralsByReferrer(orgId: string): Promise<Record<string, unknown>[]>;
  updateReferral(referralId: string, update: Record<string, unknown>): Promise<void>;

  // Earnings
  createEarning(data: Record<string, unknown>): Promise<void>;
  getEarningByInvoice(stripeInvoiceId: string): Promise<Record<string, unknown> | null>;
  getEarningsByReferrer(orgId: string, filter?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  updateEarning(earningId: string, update: Record<string, unknown>): Promise<void>;

  // Payouts
  createPayout(data: Record<string, unknown>): Promise<string>;
  getPayout(payoutId: string): Promise<Record<string, unknown> | null>;
  getPayoutsByOrg(orgId: string): Promise<Record<string, unknown>[]>;
  updatePayout(payoutId: string, update: Record<string, unknown>): Promise<void>;

  // Events
  logReferralEvent(event: Record<string, unknown>): Promise<void>;

  // Org lookup
  getOrganizationName(orgId: string): Promise<string | null>;
}

/**
 * Database operations implementation for the referral service
 */
export const referralDatabaseOperations: ReferralDatabaseOperations = {
  // ============================================
  // Referral Codes
  // ============================================

  async createReferralCode(data: Record<string, unknown>): Promise<void> {
    const collection = await getReferralCodesCollection();
    await collection.insertOne(data as any);
  },

  async getReferralCodeByOrg(orgId: string): Promise<Record<string, unknown> | null> {
    const collection = await getReferralCodesCollection();
    return await collection.findOne({ organizationId: orgId }) as Record<string, unknown> | null;
  },

  async getReferralCodeByCode(code: string): Promise<Record<string, unknown> | null> {
    const collection = await getReferralCodesCollection();
    return await collection.findOne({ code: code.toUpperCase() }) as Record<string, unknown> | null;
  },

  async updateReferralCode(code: string, update: Record<string, unknown>): Promise<void> {
    const collection = await getReferralCodesCollection();
    await collection.updateOne(
      { code: code.toUpperCase() },
      { $set: update }
    );
  },

  // ============================================
  // Referrals
  // ============================================

  async createReferral(data: Record<string, unknown>): Promise<string> {
    const collection = await getReferralsCollection();
    await collection.insertOne(data as any);
    return data.referralId as string;
  },

  async getReferralByReferredOrg(orgId: string): Promise<Record<string, unknown> | null> {
    const collection = await getReferralsCollection();
    return await collection.findOne({ referredOrgId: orgId }) as Record<string, unknown> | null;
  },

  async getReferralsByReferrer(orgId: string): Promise<Record<string, unknown>[]> {
    const collection = await getReferralsCollection();
    return await collection.find({ referrerOrgId: orgId }).toArray() as Record<string, unknown>[];
  },

  async updateReferral(referralId: string, update: Record<string, unknown>): Promise<void> {
    const collection = await getReferralsCollection();
    await collection.updateOne(
      { referralId },
      { $set: update }
    );
  },

  // ============================================
  // Earnings
  // ============================================

  async createEarning(data: Record<string, unknown>): Promise<void> {
    const collection = await getReferralEarningsCollection();
    await collection.insertOne(data as any);
  },

  async getEarningByInvoice(stripeInvoiceId: string): Promise<Record<string, unknown> | null> {
    const collection = await getReferralEarningsCollection();
    return await collection.findOne({ stripeInvoiceId }) as Record<string, unknown> | null;
  },

  async getEarningsByReferrer(orgId: string, filter?: Record<string, unknown>): Promise<Record<string, unknown>[]> {
    const collection = await getReferralEarningsCollection();
    const query: Record<string, unknown> = { referrerOrgId: orgId };

    if (filter?.status) {
      query.status = filter.status;
    }

    let cursor = collection.find(query).sort({ earnedAt: -1 });

    if (filter?.offset) {
      cursor = cursor.skip(filter.offset as number);
    }

    if (filter?.limit) {
      cursor = cursor.limit(filter.limit as number);
    }

    return await cursor.toArray() as Record<string, unknown>[];
  },

  async updateEarning(earningId: string, update: Record<string, unknown>): Promise<void> {
    const collection = await getReferralEarningsCollection();
    await collection.updateOne(
      { earningId },
      { $set: update }
    );
  },

  // ============================================
  // Payouts
  // ============================================

  async createPayout(data: Record<string, unknown>): Promise<string> {
    const collection = await getReferralPayoutsCollection();
    await collection.insertOne(data as any);
    return data.payoutId as string;
  },

  async getPayout(payoutId: string): Promise<Record<string, unknown> | null> {
    const collection = await getReferralPayoutsCollection();
    return await collection.findOne({ payoutId }) as Record<string, unknown> | null;
  },

  async getPayoutsByOrg(orgId: string): Promise<Record<string, unknown>[]> {
    const collection = await getReferralPayoutsCollection();
    return await collection
      .find({ organizationId: orgId })
      .sort({ requestedAt: -1 })
      .toArray() as Record<string, unknown>[];
  },

  async updatePayout(payoutId: string, update: Record<string, unknown>): Promise<void> {
    const collection = await getReferralPayoutsCollection();
    await collection.updateOne(
      { payoutId },
      { $set: update }
    );
  },

  // ============================================
  // Events
  // ============================================

  async logReferralEvent(event: Record<string, unknown>): Promise<void> {
    const collection = await getReferralEventsCollection();
    await collection.insertOne(event as any);
  },

  // ============================================
  // Organization Lookup
  // ============================================

  async getOrganizationName(orgId: string): Promise<string | null> {
    const collection = await getOrganizationsCollection();
    const org = await collection.findOne({ orgId });
    return org?.name || null;
  },
};

/**
 * Initialize referral database operations
 * Call this when cloud-features is loaded to wire up the database
 */
export async function initializeReferralDbOps(): Promise<void> {
  try {
    // Dynamically import cloud-features to avoid build errors when not installed
    // Use Function constructor to avoid TypeScript type checking the import
    const pkgName = '@netpad/cloud-features';
    
    const cloudFeatures = (await new Function('p', 'return import(p)')(pkgName)) as any;

    // Check if the function exists (may not if cloud-features hasn't been rebuilt)
    if (typeof cloudFeatures.setReferralDatabaseOperations === 'function') {
      cloudFeatures.setReferralDatabaseOperations(referralDatabaseOperations);
      console.log('[Referrals] Database operations configured');
    } else {
      console.log('[Referrals] setReferralDatabaseOperations not available in cloud-features');
    }
  } catch (error) {
    // cloud-features not available, that's okay in self-hosted mode
    console.log('[Referrals] cloud-features not available, skipping database operations setup');
  }
}
