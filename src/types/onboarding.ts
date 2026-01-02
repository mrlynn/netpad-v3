/**
 * Standalone Onboarding Application Types
 *
 * This module defines types for the Employee Onboarding showcase application,
 * demonstrating NetPad's wizard/form capabilities with full persistence.
 */

// ============================================
// Status Types
// ============================================

export type OnboardingStatus = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'draft';

export interface StatusHistoryEntry {
  status: OnboardingStatus;
  changedAt: Date;
  changedBy?: string;
  notes?: string;
}

// ============================================
// Submission Data Structure
// ============================================

export interface OnboardingPersonalInfo {
  firstName: string;
  lastName: string;
  preferredName?: string;
  email: string;
  phone: string;
  dateOfBirth: string;
}

export interface OnboardingAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface OnboardingPayroll {
  payrollMethod: 'direct_deposit' | 'check';
  bankName?: string;
  bankAccountType?: 'checking' | 'savings';
  bankRoutingNumber?: string;
  bankAccountNumber?: string;
  taxFilingStatus: string;
  taxWithholdings: number;
  stateWithholdings?: number;
}

export interface OnboardingITEquipment {
  computerPreference: string;
  additionalMonitor: boolean;
  headset: boolean;
  specialEquipment?: string;
  softwareNeeds?: string[];
  remoteSetup: 'full_remote' | 'hybrid' | 'office';
}

export interface OnboardingPolicyAcknowledgments {
  employeeHandbookAck: boolean;
  codeOfConductAck: boolean;
  dataPrivacyAck: boolean;
  itSecurityAck: boolean;
  antiHarassmentAck: boolean;
  electronicSignature: string;
  signatureDate: string;
}

export interface OnboardingFormData {
  // Personal Info
  firstName: string;
  lastName: string;
  preferredName?: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: OnboardingAddress;

  // Emergency Contacts
  emergencyContact1: EmergencyContact;
  emergencyContact2?: Partial<EmergencyContact>;

  // Payroll & Tax
  payrollMethod: 'direct_deposit' | 'check';
  bankName?: string;
  bankAccountType?: 'checking' | 'savings';
  bankRoutingNumber?: string;
  bankAccountNumber?: string;
  taxFilingStatus: string;
  taxWithholdings: number;
  stateWithholdings?: number;

  // IT Equipment
  computerPreference: string;
  additionalMonitor: boolean;
  headset: boolean;
  specialEquipment?: string;
  softwareNeeds?: string[];
  remoteSetup: 'full_remote' | 'hybrid' | 'office';

  // Policy Acknowledgments
  employeeHandbookAck: boolean;
  codeOfConductAck: boolean;
  dataPrivacyAck: boolean;
  itSecurityAck: boolean;
  antiHarassmentAck: boolean;
  electronicSignature: string;
  signatureDate: string;
}

// ============================================
// Submission Metadata
// ============================================

export interface OnboardingMetadata {
  ipAddress: string;
  userAgent: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  referrer?: string;
  completionTimeSeconds: number;
  startedAt: Date;
}

// ============================================
// Main Submission Type
// ============================================

export interface OnboardingSubmission {
  _id?: string;
  submissionId: string;               // "onb_abc123" - public reference number

  // Form data
  data: OnboardingFormData;

  // Status workflow
  status: OnboardingStatus;
  statusHistory: StatusHistoryEntry[];

  // Metadata
  metadata: OnboardingMetadata;

  // Timestamps
  submittedAt: Date;
  updatedAt: Date;

  // Branding context (snapshot at submission time)
  brandingSnapshot?: {
    companyName?: string;
    logoUrl?: string;
  };
}

// ============================================
// Branding Configuration
// ============================================

export interface OnboardingBrandingConfig {
  _id?: string;
  configId: string;                   // "brand_default" or custom

  // Company branding
  companyName: string;
  logoUrl?: string;
  primaryColor: string;               // Default: "#00ED64"
  secondaryColor?: string;

  // Welcome page customization
  welcomeTitle: string;
  welcomeMessage: string;

  // Success page customization
  successTitle: string;
  successMessage: string;

  // Metadata
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_BRANDING: Omit<OnboardingBrandingConfig, '_id' | 'createdAt' | 'updatedAt'> = {
  configId: 'brand_default',
  companyName: 'Your Company',
  logoUrl: undefined,
  primaryColor: '#00ED64',
  secondaryColor: '#001E2B',
  welcomeTitle: 'Welcome to the Team!',
  welcomeMessage: `We're excited to have you join us. This onboarding wizard will guide you through the essential setup steps.

**What we'll cover:**
• Your personal information
• Emergency contacts
• Payroll & tax preferences
• IT equipment setup
• Company policy acknowledgments

It should take about 10-15 minutes to complete.`,
  successTitle: 'Onboarding Complete!',
  successMessage: `Your onboarding information has been submitted successfully.

Our HR team will review your details and reach out if we need anything else. In the meantime, check your email for next steps and your first-day schedule.`,
  isActive: true,
};

// ============================================
// Analytics Types
// ============================================

export interface OnboardingTrendDataPoint {
  date: string;
  count: number;
}

export interface OnboardingAnalytics {
  // Overview stats
  totalSubmissions: number;
  submissionsByStatus: Record<OnboardingStatus, number>;
  completionRate: number;             // Percentage who complete all pages
  averageCompletionTime: number;      // In seconds

  // Trend data
  submissionsTrend: OnboardingTrendDataPoint[];

  // Device breakdown
  deviceBreakdown: Record<'mobile' | 'desktop' | 'tablet', number>;

  // Drop-off analysis
  dropOffByPage: Record<string, number>;

  // Popular choices
  topSoftwareRequests: Array<{
    software: string;
    count: number;
  }>;
  computerPreferences: Record<string, number>;
  remoteSetupDistribution: Record<string, number>;

  // Calculated at
  calculatedAt: Date;
}

// ============================================
// API Request/Response Types
// ============================================

export interface SubmitOnboardingRequest {
  data: OnboardingFormData;
  startedAt: string;                  // ISO timestamp when form was started
}

export interface SubmitOnboardingResponse {
  success: boolean;
  submissionId?: string;
  referenceNumber?: string;
  error?: string;
}

export interface ListSubmissionsParams {
  page?: number;
  pageSize?: number;
  status?: OnboardingStatus;
  search?: string;
  sortBy?: 'submittedAt' | 'status' | 'lastName';
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
}

export interface ListSubmissionsResponse {
  success: boolean;
  submissions: OnboardingSubmission[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UpdateSubmissionRequest {
  status?: OnboardingStatus;
  notes?: string;
}

export interface ExportParams {
  format: 'csv' | 'json' | 'xlsx';
  status?: OnboardingStatus;
  startDate?: string;
  endDate?: string;
}

// ============================================
// Admin Session Types
// ============================================

export interface OnboardingAdminSession {
  isAuthenticated: boolean;
  authenticatedAt?: Date;
  expiresAt?: Date;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a unique submission ID
 */
export function generateSubmissionId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 10; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `onb_${id}`;
}

/**
 * Get display name from submission data
 */
export function getSubmissionDisplayName(data: OnboardingFormData): string {
  if (data.preferredName) {
    return `${data.preferredName} ${data.lastName}`;
  }
  return `${data.firstName} ${data.lastName}`;
}

/**
 * Format completion time for display
 */
export function formatCompletionTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Get status display info
 */
export const STATUS_CONFIG: Record<OnboardingStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  draft: {
    label: 'Draft',
    color: '#666666',
    bgColor: '#f5f5f5',
  },
  submitted: {
    label: 'Submitted',
    color: '#1976d2',
    bgColor: '#e3f2fd',
  },
  under_review: {
    label: 'Under Review',
    color: '#f57c00',
    bgColor: '#fff3e0',
  },
  approved: {
    label: 'Approved',
    color: '#388e3c',
    bgColor: '#e8f5e9',
  },
  rejected: {
    label: 'Rejected',
    color: '#d32f2f',
    bgColor: '#ffebee',
  },
};
