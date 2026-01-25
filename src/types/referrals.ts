/**
 * Referral System Types
 *
 * Types for the cloud-only referral management system.
 * These mirror and extend the types from @netpad/cloud-features.
 */

// ============================================
// Commission Rates
// ============================================

export interface CommissionRates {
  year1: number;  // e.g., 0.20 = 20%
  year2: number;
  year3: number;
  yearN: number;
}

// ============================================
// Referred User Benefits
// ============================================

/**
 * Benefits given to the referred user when they sign up with a referral code.
 * All fields are optional - only specify the benefits that apply.
 */
export interface ReferredUserBenefits {
  /** Percentage discount on first N payments (0.10 = 10% off) */
  discountPercent?: number;
  /** Number of payments the discount applies to (default: 1) */
  discountPayments?: number;
  /** Flat credit amount in cents to apply to account */
  creditAmountCents?: number;
  /** Additional trial days beyond the standard trial */
  trialExtensionDays?: number;
  /** Temporary feature unlocks (feature names) */
  featureUnlocks?: string[];
  /** How long feature unlocks last in days */
  featureUnlockDays?: number;
}

// ============================================
// Referral Code
// ============================================

export interface ReferralCode {
  code: string;
  organizationId: string | null;  // null for campaign codes
  type: 'standard' | 'influencer' | 'partner' | 'campaign';
  commissionRates: CommissionRates;
  /** Benefits given to users who sign up with this code */
  referredUserBenefits?: ReferredUserBenefits | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Referral (Attribution Record)
// ============================================

export type ReferralStatus =
  | 'pending'     // Signup attributed, no payments yet
  | 'qualifying'  // Has payments but not yet qualified
  | 'qualified'   // Met qualification threshold
  | 'active'      // Actively generating commissions
  | 'churned';    // Referred org cancelled

export interface ReferralAttribution {
  source: string;  // 'url_param', 'cookie', 'manual'
  signupUrl?: string;
  campaign?: string;
}

export interface Referral {
  referralId: string;
  referrerOrgId: string;
  referredOrgId: string;
  referralCodeId: string;
  status: ReferralStatus;
  paymentCount: number;
  attribution: ReferralAttribution;
  attributedAt: Date;
  qualifiedAt?: Date;
  churnedAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

// ============================================
// Referral Earning
// ============================================

export type EarningStatus =
  | 'pending'    // In hold period
  | 'available'  // Ready for payout
  | 'requested'  // Payout requested
  | 'paid';      // Paid out

export interface ReferralEarning {
  earningId: string;
  referralId: string;
  referrerOrgId: string;
  referredOrgId: string;
  stripeInvoiceId: string;
  grossAmount: number;  // Invoice amount in cents
  commissionRate: number;  // e.g., 0.20
  commissionAmount: number;  // Commission in cents
  referralYear: number;  // Which year of the referral (1, 2, 3+)
  currency: string;
  status: EarningStatus;
  availableAt: Date;  // When hold period ends
  earnedAt: Date;
  payoutId?: string;  // Set when included in a payout
  createdAt: Date;
}

// ============================================
// Referral Payout
// ============================================

export type PayoutStatus =
  | 'pending'    // Requested, awaiting approval
  | 'approved'   // Approved, ready for processing
  | 'processing' // Being processed
  | 'completed'  // Funds sent
  | 'rejected';  // Rejected by admin

export type PayoutMethod = 'paypal' | 'wise' | 'bank_transfer' | 'other';

export interface ReferralPayout {
  payoutId: string;
  organizationId: string;
  amount: number;  // Amount in cents
  currency: string;
  method: PayoutMethod | string;
  paymentDetails: Record<string, string>;  // Method-specific details
  status: PayoutStatus;
  requestedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  processedAt?: Date;
  transactionId?: string;  // External payment reference
  createdAt: Date;
  updatedAt?: Date;
}

// ============================================
// Referral Event (Audit Log)
// ============================================

export type ReferralEventType =
  | 'code.created'
  | 'code.customized'
  | 'code.deactivated'
  | 'referral.attributed'
  | 'referral.qualified'
  | 'referral.churned'
  | 'earning.created'
  | 'earning.available'
  | 'payout.requested'
  | 'payout.approved'
  | 'payout.rejected'
  | 'payout.completed';

export interface ReferralEvent {
  eventId: string;
  eventType: ReferralEventType;
  organizationId: string;
  referralId?: string;
  payoutId?: string;
  data: Record<string, unknown>;
  createdAt: Date;
}

// ============================================
// API Response Types
// ============================================

export interface ReferralCodeInfo {
  code: string;
  type: 'standard' | 'influencer' | 'partner' | 'campaign';
  shareUrl: string;
  commissionRates: CommissionRates;
  /** Benefits given to users who sign up with this code */
  referredUserBenefits?: ReferredUserBenefits;
  isActive: boolean;
  stats: {
    totalReferrals: number;
    qualifiedReferrals: number;
    totalEarnings: number;
    availableEarnings: number;
  };
}

export interface ReferralStats {
  totalReferrals: number;
  qualifiedReferrals: number;
  pendingReferrals: number;
  churnedReferrals: number;
  totalEarnings: number;
  availableForPayout: number;
  pendingEarnings: number;
  paidOut: number;
}

export interface EarningsList {
  earnings: Array<{
    earningId: string;
    amount: number;
    status: string;
    earnedAt: Date;
    referredOrgName?: string;
  }>;
  total: number;
}
