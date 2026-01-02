/**
 * Sample NPS (Net Promoter Score) Database
 * A comprehensive sample database for collecting and managing NPS surveys
 *
 * NPS Best Practices Implemented:
 * - Standard 0-10 scoring with automatic categorization (Promoter/Passive/Detractor)
 * - Follow-up questions that vary based on score
 * - Customer context for segmentation analysis
 * - Campaign/touchpoint tracking for journey mapping
 * - Response metadata for timing analysis
 */

import { SampleDatabase, SampleCollection } from '@/types/dataImport';

// ============================================
// Type Breakdown Template (for reuse)
// ============================================
const emptyTypeBreakdown = {
  string: 0, number: 0, integer: 0, decimal: 0, boolean: 0,
  date: 0, datetime: 0, time: 0, email: 0, url: 0, phone: 0,
  objectId: 0, array: 0, object: 0, null: 0, mixed: 0
};

// ============================================
// NPS Responses Collection
// ============================================

export const npsResponsesCollection: SampleCollection = {
  name: 'nps_responses',
  description: 'Individual NPS survey responses with scores, feedback, and customer context',
  documentCount: 500,
  schema: [
    {
      originalName: 'response_id',
      suggestedPath: 'response_id',
      suggestedLabel: 'Response ID',
      inferredType: 'string',
      confidence: 1.0,
      stats: { totalValues: 500, nullCount: 0, uniqueCount: 500, sampleValues: ['NPS-2024-0001', 'NPS-2024-0002'] },
      typeBreakdown: { ...emptyTypeBreakdown, string: 500 },
      isRequired: true,
      isUnique: true,
    },
    {
      originalName: 'nps_score',
      suggestedPath: 'nps_score',
      suggestedLabel: 'NPS Score (0-10)',
      inferredType: 'integer',
      confidence: 1.0,
      stats: {
        totalValues: 500, nullCount: 0, uniqueCount: 11,
        sampleValues: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
        minValue: 0, maxValue: 10, avgValue: 7.2
      },
      typeBreakdown: { ...emptyTypeBreakdown, integer: 500 },
      isRequired: true,
      isUnique: false,
      suggestedValidation: { min: 0, max: 10 },
    },
    {
      originalName: 'respondent_category',
      suggestedPath: 'respondent_category',
      suggestedLabel: 'Category',
      inferredType: 'string',
      confidence: 1.0,
      stats: { totalValues: 500, nullCount: 0, uniqueCount: 3, sampleValues: ['Promoter', 'Passive', 'Detractor'] },
      typeBreakdown: { ...emptyTypeBreakdown, string: 500 },
      isRequired: true,
      isUnique: false,
      suggestedValidation: { options: ['Promoter', 'Passive', 'Detractor'] },
    },
    {
      originalName: 'feedback',
      suggestedPath: 'feedback',
      suggestedLabel: 'Open Feedback',
      inferredType: 'string',
      confidence: 1.0,
      stats: {
        totalValues: 500, nullCount: 75, uniqueCount: 400,
        sampleValues: [
          'Excellent service and product quality!',
          'The support team was very helpful.',
          'Pricing is a bit high compared to competitors.'
        ]
      },
      typeBreakdown: { ...emptyTypeBreakdown, string: 425, null: 75 },
      isRequired: false,
      isUnique: false,
    },
    {
      originalName: 'improvement_suggestion',
      suggestedPath: 'improvement_suggestion',
      suggestedLabel: 'What could we improve?',
      inferredType: 'string',
      confidence: 1.0,
      stats: {
        totalValues: 500, nullCount: 150, uniqueCount: 320,
        sampleValues: [
          'Faster shipping options',
          'More payment methods',
          'Better mobile app experience'
        ]
      },
      typeBreakdown: { ...emptyTypeBreakdown, string: 350, null: 150 },
      isRequired: false,
      isUnique: false,
    },
    {
      originalName: 'customer_email',
      suggestedPath: 'customer_email',
      suggestedLabel: 'Customer Email',
      inferredType: 'email',
      confidence: 1.0,
      stats: {
        totalValues: 500, nullCount: 50, uniqueCount: 420,
        sampleValues: ['john.doe@email.com', 'jane.smith@company.org']
      },
      typeBreakdown: { ...emptyTypeBreakdown, email: 450, null: 50 },
      isRequired: false,
      isUnique: false,
    },
    {
      originalName: 'customer_name',
      suggestedPath: 'customer_name',
      suggestedLabel: 'Customer Name',
      inferredType: 'string',
      confidence: 1.0,
      stats: {
        totalValues: 500, nullCount: 100, uniqueCount: 380,
        sampleValues: ['John Doe', 'Jane Smith', 'Anonymous']
      },
      typeBreakdown: { ...emptyTypeBreakdown, string: 400, null: 100 },
      isRequired: false,
      isUnique: false,
    },
    {
      originalName: 'customer_segment',
      suggestedPath: 'customer_segment',
      suggestedLabel: 'Customer Segment',
      inferredType: 'string',
      confidence: 1.0,
      stats: {
        totalValues: 500, nullCount: 0, uniqueCount: 5,
        sampleValues: ['Enterprise', 'SMB', 'Startup', 'Individual', 'Government']
      },
      typeBreakdown: { ...emptyTypeBreakdown, string: 500 },
      isRequired: true,
      isUnique: false,
      suggestedValidation: { options: ['Enterprise', 'SMB', 'Startup', 'Individual', 'Government'] },
    },
    {
      originalName: 'product_used',
      suggestedPath: 'product_used',
      suggestedLabel: 'Product/Service Used',
      inferredType: 'string',
      confidence: 1.0,
      stats: {
        totalValues: 500, nullCount: 0, uniqueCount: 6,
        sampleValues: ['Core Platform', 'Analytics Suite', 'API Services', 'Mobile App', 'Support Portal', 'All Products']
      },
      typeBreakdown: { ...emptyTypeBreakdown, string: 500 },
      isRequired: true,
      isUnique: false,
      suggestedValidation: { options: ['Core Platform', 'Analytics Suite', 'API Services', 'Mobile App', 'Support Portal', 'All Products'] },
    },
    {
      originalName: 'touchpoint',
      suggestedPath: 'touchpoint',
      suggestedLabel: 'Survey Touchpoint',
      inferredType: 'string',
      confidence: 1.0,
      stats: {
        totalValues: 500, nullCount: 0, uniqueCount: 7,
        sampleValues: ['Post-Purchase', 'Support Ticket Closed', 'Quarterly Check-in', 'Onboarding Complete', 'Renewal', 'Feature Launch', 'Annual Review']
      },
      typeBreakdown: { ...emptyTypeBreakdown, string: 500 },
      isRequired: true,
      isUnique: false,
      suggestedValidation: {
        options: ['Post-Purchase', 'Support Ticket Closed', 'Quarterly Check-in', 'Onboarding Complete', 'Renewal', 'Feature Launch', 'Annual Review']
      },
    },
    {
      originalName: 'campaign_id',
      suggestedPath: 'campaign_id',
      suggestedLabel: 'Campaign ID',
      inferredType: 'string',
      confidence: 1.0,
      stats: { totalValues: 500, nullCount: 0, uniqueCount: 12, sampleValues: ['CAMP-Q1-2024', 'CAMP-Q2-2024'] },
      typeBreakdown: { ...emptyTypeBreakdown, string: 500 },
      isRequired: true,
      isUnique: false,
    },
    {
      originalName: 'submitted_at',
      suggestedPath: 'submitted_at',
      suggestedLabel: 'Submission Date',
      inferredType: 'datetime',
      confidence: 1.0,
      stats: {
        totalValues: 500, nullCount: 0, uniqueCount: 480,
        sampleValues: ['2024-01-15T10:30:00Z', '2024-02-20T14:45:00Z']
      },
      typeBreakdown: { ...emptyTypeBreakdown, datetime: 500 },
      isRequired: true,
      isUnique: false,
    },
    {
      originalName: 'response_time_seconds',
      suggestedPath: 'response_time_seconds',
      suggestedLabel: 'Response Time (seconds)',
      inferredType: 'integer',
      confidence: 1.0,
      stats: {
        totalValues: 500, nullCount: 0, uniqueCount: 180,
        sampleValues: [45, 120, 300],
        minValue: 15, maxValue: 900, avgValue: 95
      },
      typeBreakdown: { ...emptyTypeBreakdown, integer: 500 },
      isRequired: true,
      isUnique: false,
    },
    {
      originalName: 'survey_channel',
      suggestedPath: 'survey_channel',
      suggestedLabel: 'Survey Channel',
      inferredType: 'string',
      confidence: 1.0,
      stats: {
        totalValues: 500, nullCount: 0, uniqueCount: 4,
        sampleValues: ['Email', 'In-App', 'SMS', 'Website']
      },
      typeBreakdown: { ...emptyTypeBreakdown, string: 500 },
      isRequired: true,
      isUnique: false,
      suggestedValidation: { options: ['Email', 'In-App', 'SMS', 'Website'] },
    },
    {
      originalName: 'follow_up_requested',
      suggestedPath: 'follow_up_requested',
      suggestedLabel: 'Follow-up Requested',
      inferredType: 'boolean',
      confidence: 1.0,
      stats: { totalValues: 500, nullCount: 0, uniqueCount: 2, sampleValues: [true, false] },
      typeBreakdown: { ...emptyTypeBreakdown, boolean: 500 },
      isRequired: true,
      isUnique: false,
    },
    {
      originalName: 'follow_up_completed',
      suggestedPath: 'follow_up_completed',
      suggestedLabel: 'Follow-up Completed',
      inferredType: 'boolean',
      confidence: 1.0,
      stats: { totalValues: 500, nullCount: 200, uniqueCount: 2, sampleValues: [true, false] },
      typeBreakdown: { ...emptyTypeBreakdown, boolean: 300, null: 200 },
      isRequired: false,
      isUnique: false,
    },
    {
      originalName: 'account_tenure_months',
      suggestedPath: 'account_tenure_months',
      suggestedLabel: 'Account Tenure (months)',
      inferredType: 'integer',
      confidence: 1.0,
      stats: {
        totalValues: 500, nullCount: 0, uniqueCount: 60,
        sampleValues: [3, 12, 24, 36],
        minValue: 1, maxValue: 84, avgValue: 18
      },
      typeBreakdown: { ...emptyTypeBreakdown, integer: 500 },
      isRequired: true,
      isUnique: false,
    },
  ],
  sampleDocuments: [
    // Promoters (9-10)
    {
      response_id: 'NPS-2024-0001',
      nps_score: 10,
      respondent_category: 'Promoter',
      feedback: 'Absolutely love the product! It has transformed how we work. The team is always responsive and helpful.',
      improvement_suggestion: 'Would love to see more integrations with third-party tools.',
      customer_email: 'sarah.johnson@techcorp.com',
      customer_name: 'Sarah Johnson',
      customer_segment: 'Enterprise',
      product_used: 'Core Platform',
      touchpoint: 'Quarterly Check-in',
      campaign_id: 'CAMP-Q1-2024',
      submitted_at: '2024-01-15T10:30:00Z',
      response_time_seconds: 120,
      survey_channel: 'Email',
      follow_up_requested: false,
      follow_up_completed: null,
      account_tenure_months: 24
    },
    {
      response_id: 'NPS-2024-0002',
      nps_score: 9,
      respondent_category: 'Promoter',
      feedback: 'Great experience overall. The onboarding was smooth and the support team is excellent.',
      improvement_suggestion: 'The mobile app could use some polish.',
      customer_email: 'mike.chen@startup.io',
      customer_name: 'Mike Chen',
      customer_segment: 'Startup',
      product_used: 'Analytics Suite',
      touchpoint: 'Onboarding Complete',
      campaign_id: 'CAMP-Q1-2024',
      submitted_at: '2024-01-18T14:22:00Z',
      response_time_seconds: 85,
      survey_channel: 'In-App',
      follow_up_requested: false,
      follow_up_completed: null,
      account_tenure_months: 2
    },
    {
      response_id: 'NPS-2024-0003',
      nps_score: 10,
      respondent_category: 'Promoter',
      feedback: 'Best decision we made this year. ROI has been incredible.',
      improvement_suggestion: null,
      customer_email: 'j.williams@govagency.gov',
      customer_name: 'James Williams',
      customer_segment: 'Government',
      product_used: 'All Products',
      touchpoint: 'Annual Review',
      campaign_id: 'CAMP-Q1-2024',
      submitted_at: '2024-01-20T09:15:00Z',
      response_time_seconds: 45,
      survey_channel: 'Email',
      follow_up_requested: true,
      follow_up_completed: true,
      account_tenure_months: 36
    },
    // Passives (7-8)
    {
      response_id: 'NPS-2024-0004',
      nps_score: 8,
      respondent_category: 'Passive',
      feedback: 'Good product, does what it says. Nothing particularly stands out though.',
      improvement_suggestion: 'More customization options would be nice.',
      customer_email: 'lisa.park@smb.com',
      customer_name: 'Lisa Park',
      customer_segment: 'SMB',
      product_used: 'Core Platform',
      touchpoint: 'Post-Purchase',
      campaign_id: 'CAMP-Q1-2024',
      submitted_at: '2024-01-22T11:45:00Z',
      response_time_seconds: 150,
      survey_channel: 'Email',
      follow_up_requested: false,
      follow_up_completed: null,
      account_tenure_months: 6
    },
    {
      response_id: 'NPS-2024-0005',
      nps_score: 7,
      respondent_category: 'Passive',
      feedback: 'Works well but the learning curve was steep. Documentation could be better.',
      improvement_suggestion: 'Better tutorials and video guides.',
      customer_email: 'alex.rivera@individual.net',
      customer_name: 'Alex Rivera',
      customer_segment: 'Individual',
      product_used: 'API Services',
      touchpoint: 'Support Ticket Closed',
      campaign_id: 'CAMP-Q1-2024',
      submitted_at: '2024-01-25T16:30:00Z',
      response_time_seconds: 200,
      survey_channel: 'In-App',
      follow_up_requested: true,
      follow_up_completed: false,
      account_tenure_months: 4
    },
    // Detractors (0-6)
    {
      response_id: 'NPS-2024-0006',
      nps_score: 5,
      respondent_category: 'Detractor',
      feedback: 'Had some issues with reliability. System was down twice last month.',
      improvement_suggestion: 'Better uptime and more transparent status updates.',
      customer_email: 'tom.baker@enterprise.co',
      customer_name: 'Tom Baker',
      customer_segment: 'Enterprise',
      product_used: 'Core Platform',
      touchpoint: 'Quarterly Check-in',
      campaign_id: 'CAMP-Q1-2024',
      submitted_at: '2024-01-28T08:20:00Z',
      response_time_seconds: 180,
      survey_channel: 'Email',
      follow_up_requested: true,
      follow_up_completed: true,
      account_tenure_months: 12
    },
    {
      response_id: 'NPS-2024-0007',
      nps_score: 3,
      respondent_category: 'Detractor',
      feedback: 'Support response times are too slow. Waited 3 days for a critical issue.',
      improvement_suggestion: 'Faster support, especially for paying customers.',
      customer_email: 'emma.wilson@smb.org',
      customer_name: 'Emma Wilson',
      customer_segment: 'SMB',
      product_used: 'Support Portal',
      touchpoint: 'Support Ticket Closed',
      campaign_id: 'CAMP-Q2-2024',
      submitted_at: '2024-02-05T13:10:00Z',
      response_time_seconds: 300,
      survey_channel: 'Email',
      follow_up_requested: true,
      follow_up_completed: true,
      account_tenure_months: 8
    },
    {
      response_id: 'NPS-2024-0008',
      nps_score: 6,
      respondent_category: 'Detractor',
      feedback: 'The price increase was unexpected and not communicated well.',
      improvement_suggestion: 'More advance notice on pricing changes.',
      customer_email: null,
      customer_name: null,
      customer_segment: 'Startup',
      product_used: 'Analytics Suite',
      touchpoint: 'Renewal',
      campaign_id: 'CAMP-Q2-2024',
      submitted_at: '2024-02-10T10:00:00Z',
      response_time_seconds: 60,
      survey_channel: 'Website',
      follow_up_requested: false,
      follow_up_completed: null,
      account_tenure_months: 12
    },
    // More varied responses
    {
      response_id: 'NPS-2024-0009',
      nps_score: 9,
      respondent_category: 'Promoter',
      feedback: 'The new feature launch was exactly what we needed. Keep innovating!',
      improvement_suggestion: null,
      customer_email: 'david.lee@techcorp.com',
      customer_name: 'David Lee',
      customer_segment: 'Enterprise',
      product_used: 'Mobile App',
      touchpoint: 'Feature Launch',
      campaign_id: 'CAMP-Q2-2024',
      submitted_at: '2024-02-15T15:45:00Z',
      response_time_seconds: 55,
      survey_channel: 'In-App',
      follow_up_requested: false,
      follow_up_completed: null,
      account_tenure_months: 18
    },
    {
      response_id: 'NPS-2024-0010',
      nps_score: 8,
      respondent_category: 'Passive',
      feedback: null,
      improvement_suggestion: null,
      customer_email: 'anonymous@temp.com',
      customer_name: null,
      customer_segment: 'Individual',
      product_used: 'Core Platform',
      touchpoint: 'Post-Purchase',
      campaign_id: 'CAMP-Q2-2024',
      submitted_at: '2024-02-18T09:30:00Z',
      response_time_seconds: 25,
      survey_channel: 'SMS',
      follow_up_requested: false,
      follow_up_completed: null,
      account_tenure_months: 1
    },
  ],
  suggestedForms: [
    {
      type: 'data-entry',
      name: 'NPS Survey',
      description: 'Standard NPS survey with 0-10 score, open feedback, and customer context'
    },
    {
      type: 'search',
      name: 'NPS Response Search',
      description: 'Search and filter NPS responses by score, segment, touchpoint, or date range'
    },
    {
      type: 'both',
      name: 'NPS Response Manager',
      description: 'Complete NPS management with response search, follow-up tracking, and data entry'
    },
  ],
};

// ============================================
// NPS Campaigns Collection
// ============================================

export const npsCampaignsCollection: SampleCollection = {
  name: 'nps_campaigns',
  description: 'NPS survey campaigns for tracking and scheduling survey distributions',
  documentCount: 20,
  schema: [
    {
      originalName: 'campaign_id',
      suggestedPath: 'campaign_id',
      suggestedLabel: 'Campaign ID',
      inferredType: 'string',
      confidence: 1.0,
      stats: { totalValues: 20, nullCount: 0, uniqueCount: 20, sampleValues: ['CAMP-Q1-2024', 'CAMP-Q2-2024'] },
      typeBreakdown: { ...emptyTypeBreakdown, string: 20 },
      isRequired: true,
      isUnique: true,
    },
    {
      originalName: 'campaign_name',
      suggestedPath: 'campaign_name',
      suggestedLabel: 'Campaign Name',
      inferredType: 'string',
      confidence: 1.0,
      stats: {
        totalValues: 20, nullCount: 0, uniqueCount: 20,
        sampleValues: ['Q1 2024 Customer Satisfaction', 'Post-Onboarding Survey']
      },
      typeBreakdown: { ...emptyTypeBreakdown, string: 20 },
      isRequired: true,
      isUnique: true,
    },
    {
      originalName: 'description',
      suggestedPath: 'description',
      suggestedLabel: 'Description',
      inferredType: 'string',
      confidence: 1.0,
      stats: {
        totalValues: 20, nullCount: 0, uniqueCount: 20,
        sampleValues: ['Quarterly satisfaction survey for all active customers']
      },
      typeBreakdown: { ...emptyTypeBreakdown, string: 20 },
      isRequired: true,
      isUnique: false,
    },
    {
      originalName: 'target_audience',
      suggestedPath: 'target_audience',
      suggestedLabel: 'Target Audience',
      inferredType: 'string',
      confidence: 1.0,
      stats: {
        totalValues: 20, nullCount: 0, uniqueCount: 8,
        sampleValues: ['All Customers', 'Enterprise Only', 'New Customers (< 90 days)', 'Churned Customers']
      },
      typeBreakdown: { ...emptyTypeBreakdown, string: 20 },
      isRequired: true,
      isUnique: false,
      suggestedValidation: {
        options: ['All Customers', 'Enterprise Only', 'SMB Only', 'New Customers (< 90 days)', 'Renewal Due', 'Post-Support', 'Post-Purchase', 'Churned Customers']
      },
    },
    {
      originalName: 'touchpoint',
      suggestedPath: 'touchpoint',
      suggestedLabel: 'Survey Touchpoint',
      inferredType: 'string',
      confidence: 1.0,
      stats: {
        totalValues: 20, nullCount: 0, uniqueCount: 7,
        sampleValues: ['Quarterly Check-in', 'Post-Purchase', 'Support Ticket Closed']
      },
      typeBreakdown: { ...emptyTypeBreakdown, string: 20 },
      isRequired: true,
      isUnique: false,
      suggestedValidation: {
        options: ['Post-Purchase', 'Support Ticket Closed', 'Quarterly Check-in', 'Onboarding Complete', 'Renewal', 'Feature Launch', 'Annual Review']
      },
    },
    {
      originalName: 'channel',
      suggestedPath: 'channel',
      suggestedLabel: 'Distribution Channel',
      inferredType: 'string',
      confidence: 1.0,
      stats: {
        totalValues: 20, nullCount: 0, uniqueCount: 4,
        sampleValues: ['Email', 'In-App', 'SMS', 'Website']
      },
      typeBreakdown: { ...emptyTypeBreakdown, string: 20 },
      isRequired: true,
      isUnique: false,
      suggestedValidation: { options: ['Email', 'In-App', 'SMS', 'Website'] },
    },
    {
      originalName: 'status',
      suggestedPath: 'status',
      suggestedLabel: 'Status',
      inferredType: 'string',
      confidence: 1.0,
      stats: {
        totalValues: 20, nullCount: 0, uniqueCount: 4,
        sampleValues: ['Draft', 'Scheduled', 'Active', 'Completed']
      },
      typeBreakdown: { ...emptyTypeBreakdown, string: 20 },
      isRequired: true,
      isUnique: false,
      suggestedValidation: { options: ['Draft', 'Scheduled', 'Active', 'Completed'] },
    },
    {
      originalName: 'start_date',
      suggestedPath: 'start_date',
      suggestedLabel: 'Start Date',
      inferredType: 'date',
      confidence: 1.0,
      stats: {
        totalValues: 20, nullCount: 0, uniqueCount: 18,
        sampleValues: ['2024-01-01', '2024-04-01']
      },
      typeBreakdown: { ...emptyTypeBreakdown, date: 20 },
      isRequired: true,
      isUnique: false,
    },
    {
      originalName: 'end_date',
      suggestedPath: 'end_date',
      suggestedLabel: 'End Date',
      inferredType: 'date',
      confidence: 1.0,
      stats: {
        totalValues: 20, nullCount: 2, uniqueCount: 16,
        sampleValues: ['2024-03-31', '2024-06-30']
      },
      typeBreakdown: { ...emptyTypeBreakdown, date: 18, null: 2 },
      isRequired: false,
      isUnique: false,
    },
    {
      originalName: 'total_sent',
      suggestedPath: 'total_sent',
      suggestedLabel: 'Surveys Sent',
      inferredType: 'integer',
      confidence: 1.0,
      stats: {
        totalValues: 20, nullCount: 0, uniqueCount: 18,
        sampleValues: [500, 1000, 2500],
        minValue: 0, maxValue: 5000, avgValue: 850
      },
      typeBreakdown: { ...emptyTypeBreakdown, integer: 20 },
      isRequired: true,
      isUnique: false,
    },
    {
      originalName: 'total_responses',
      suggestedPath: 'total_responses',
      suggestedLabel: 'Total Responses',
      inferredType: 'integer',
      confidence: 1.0,
      stats: {
        totalValues: 20, nullCount: 0, uniqueCount: 18,
        sampleValues: [125, 280, 600],
        minValue: 0, maxValue: 1200, avgValue: 210
      },
      typeBreakdown: { ...emptyTypeBreakdown, integer: 20 },
      isRequired: true,
      isUnique: false,
    },
    {
      originalName: 'response_rate',
      suggestedPath: 'response_rate',
      suggestedLabel: 'Response Rate (%)',
      inferredType: 'decimal',
      confidence: 1.0,
      stats: {
        totalValues: 20, nullCount: 0, uniqueCount: 18,
        sampleValues: [25.0, 28.5, 32.0],
        minValue: 0, maxValue: 45, avgValue: 24.5
      },
      typeBreakdown: { ...emptyTypeBreakdown, decimal: 20 },
      isRequired: true,
      isUnique: false,
      suggestedValidation: { min: 0, max: 100 },
    },
    {
      originalName: 'nps_score_average',
      suggestedPath: 'nps_score_average',
      suggestedLabel: 'Average NPS Score',
      inferredType: 'decimal',
      confidence: 1.0,
      stats: {
        totalValues: 20, nullCount: 2, uniqueCount: 16,
        sampleValues: [7.2, 8.1, 6.5],
        minValue: 0, maxValue: 10, avgValue: 7.4
      },
      typeBreakdown: { ...emptyTypeBreakdown, decimal: 18, null: 2 },
      isRequired: false,
      isUnique: false,
      suggestedValidation: { min: 0, max: 10 },
    },
    {
      originalName: 'calculated_nps',
      suggestedPath: 'calculated_nps',
      suggestedLabel: 'Calculated NPS',
      inferredType: 'integer',
      confidence: 1.0,
      stats: {
        totalValues: 20, nullCount: 2, uniqueCount: 15,
        sampleValues: [42, 35, -5],
        minValue: -100, maxValue: 100, avgValue: 32
      },
      typeBreakdown: { ...emptyTypeBreakdown, integer: 18, null: 2 },
      isRequired: false,
      isUnique: false,
      suggestedValidation: { min: -100, max: 100 },
    },
    {
      originalName: 'promoters_count',
      suggestedPath: 'promoters_count',
      suggestedLabel: 'Promoters Count',
      inferredType: 'integer',
      confidence: 1.0,
      stats: {
        totalValues: 20, nullCount: 0, uniqueCount: 15,
        sampleValues: [75, 150, 400],
        minValue: 0, maxValue: 800, avgValue: 120
      },
      typeBreakdown: { ...emptyTypeBreakdown, integer: 20 },
      isRequired: true,
      isUnique: false,
    },
    {
      originalName: 'passives_count',
      suggestedPath: 'passives_count',
      suggestedLabel: 'Passives Count',
      inferredType: 'integer',
      confidence: 1.0,
      stats: {
        totalValues: 20, nullCount: 0, uniqueCount: 14,
        sampleValues: [30, 80, 250],
        minValue: 0, maxValue: 300, avgValue: 55
      },
      typeBreakdown: { ...emptyTypeBreakdown, integer: 20 },
      isRequired: true,
      isUnique: false,
    },
    {
      originalName: 'detractors_count',
      suggestedPath: 'detractors_count',
      suggestedLabel: 'Detractors Count',
      inferredType: 'integer',
      confidence: 1.0,
      stats: {
        totalValues: 20, nullCount: 0, uniqueCount: 12,
        sampleValues: [20, 50, 150],
        minValue: 0, maxValue: 200, avgValue: 35
      },
      typeBreakdown: { ...emptyTypeBreakdown, integer: 20 },
      isRequired: true,
      isUnique: false,
    },
    {
      originalName: 'created_by',
      suggestedPath: 'created_by',
      suggestedLabel: 'Created By',
      inferredType: 'string',
      confidence: 1.0,
      stats: {
        totalValues: 20, nullCount: 0, uniqueCount: 5,
        sampleValues: ['admin@company.com', 'cx-team@company.com']
      },
      typeBreakdown: { ...emptyTypeBreakdown, string: 20 },
      isRequired: true,
      isUnique: false,
    },
    {
      originalName: 'created_at',
      suggestedPath: 'created_at',
      suggestedLabel: 'Created At',
      inferredType: 'datetime',
      confidence: 1.0,
      stats: {
        totalValues: 20, nullCount: 0, uniqueCount: 20,
        sampleValues: ['2023-12-15T09:00:00Z', '2024-03-20T14:30:00Z']
      },
      typeBreakdown: { ...emptyTypeBreakdown, datetime: 20 },
      isRequired: true,
      isUnique: false,
    },
  ],
  sampleDocuments: [
    {
      campaign_id: 'CAMP-Q1-2024',
      campaign_name: 'Q1 2024 Customer Satisfaction',
      description: 'Quarterly satisfaction survey for all active customers to measure overall NPS and gather feedback.',
      target_audience: 'All Customers',
      touchpoint: 'Quarterly Check-in',
      channel: 'Email',
      status: 'Completed',
      start_date: '2024-01-01',
      end_date: '2024-03-31',
      total_sent: 2500,
      total_responses: 625,
      response_rate: 25.0,
      nps_score_average: 7.4,
      calculated_nps: 42,
      promoters_count: 375,
      passives_count: 156,
      detractors_count: 94,
      created_by: 'cx-team@company.com',
      created_at: '2023-12-15T09:00:00Z'
    },
    {
      campaign_id: 'CAMP-Q2-2024',
      campaign_name: 'Q2 2024 Customer Satisfaction',
      description: 'Quarterly satisfaction survey for all active customers.',
      target_audience: 'All Customers',
      touchpoint: 'Quarterly Check-in',
      channel: 'Email',
      status: 'Active',
      start_date: '2024-04-01',
      end_date: '2024-06-30',
      total_sent: 2800,
      total_responses: 420,
      response_rate: 15.0,
      nps_score_average: 7.6,
      calculated_nps: 45,
      promoters_count: 250,
      passives_count: 110,
      detractors_count: 60,
      created_by: 'cx-team@company.com',
      created_at: '2024-03-20T14:30:00Z'
    },
    {
      campaign_id: 'CAMP-ONBOARD-2024',
      campaign_name: 'Post-Onboarding Feedback',
      description: 'Automated survey sent 7 days after customer onboarding completion.',
      target_audience: 'New Customers (< 90 days)',
      touchpoint: 'Onboarding Complete',
      channel: 'In-App',
      status: 'Active',
      start_date: '2024-01-01',
      end_date: null,
      total_sent: 450,
      total_responses: 180,
      response_rate: 40.0,
      nps_score_average: 8.1,
      calculated_nps: 55,
      promoters_count: 120,
      passives_count: 40,
      detractors_count: 20,
      created_by: 'admin@company.com',
      created_at: '2023-12-20T10:00:00Z'
    },
    {
      campaign_id: 'CAMP-SUPPORT-2024',
      campaign_name: 'Post-Support Survey',
      description: 'Automated survey sent after support ticket resolution to measure support quality.',
      target_audience: 'Post-Support',
      touchpoint: 'Support Ticket Closed',
      channel: 'Email',
      status: 'Active',
      start_date: '2024-01-01',
      end_date: null,
      total_sent: 1200,
      total_responses: 360,
      response_rate: 30.0,
      nps_score_average: 6.8,
      calculated_nps: 28,
      promoters_count: 180,
      passives_count: 90,
      detractors_count: 90,
      created_by: 'support-team@company.com',
      created_at: '2023-12-22T11:30:00Z'
    },
    {
      campaign_id: 'CAMP-RENEWAL-2024',
      campaign_name: 'Pre-Renewal Check-in',
      description: 'Survey sent 30 days before subscription renewal to gauge satisfaction and identify at-risk accounts.',
      target_audience: 'Renewal Due',
      touchpoint: 'Renewal',
      channel: 'Email',
      status: 'Active',
      start_date: '2024-01-01',
      end_date: null,
      total_sent: 300,
      total_responses: 105,
      response_rate: 35.0,
      nps_score_average: 7.0,
      calculated_nps: 32,
      promoters_count: 55,
      passives_count: 30,
      detractors_count: 20,
      created_by: 'cs-team@company.com',
      created_at: '2023-12-28T16:00:00Z'
    },
  ],
  suggestedForms: [
    {
      type: 'data-entry',
      name: 'New Campaign',
      description: 'Create a new NPS survey campaign'
    },
    {
      type: 'search',
      name: 'Campaign Search',
      description: 'Search and filter NPS campaigns by status, touchpoint, or date'
    },
    {
      type: 'both',
      name: 'Campaign Manager',
      description: 'Complete campaign management with search, editing, and performance tracking'
    },
  ],
};

// ============================================
// Complete NPS Database
// ============================================

export const npsDatabase: SampleDatabase = {
  id: 'nps-survey',
  name: 'NPS Survey Database',
  description: 'A comprehensive Net Promoter Score (NPS) survey system with responses, campaigns, and analytics. Perfect for measuring customer loyalty and satisfaction.',
  collections: [
    npsResponsesCollection,
    npsCampaignsCollection,
  ],
};

export default npsDatabase;
