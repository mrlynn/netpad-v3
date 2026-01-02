/**
 * Employee Onboarding Wizard Template
 *
 * A comprehensive new hire onboarding flow that collects:
 * - Personal information
 * - Emergency contacts
 * - Tax/payroll preferences
 * - IT equipment needs
 * - Policy acknowledgments
 */

import { WizardTemplate } from '@/types/wizardTemplates';
import { FormPage, FieldConfig } from '@/types/form';

const pages: FormPage[] = [
  // Page 1: Welcome
  {
    id: 'welcome',
    title: 'Welcome to the Team!',
    description: 'We\'re excited to have you join us. Let\'s get you set up.',
    pageType: 'info',
    fields: [],
    order: 0,
    showInNavigation: true,
    nextLabel: 'Get Started',
    content: {
      body: `Welcome to your first day! We're thrilled to have you join our team.

This onboarding wizard will guide you through the essential setup steps. It should take about 10-15 minutes to complete.

**What we'll cover:**
• Your personal information
• Emergency contacts
• Payroll & tax preferences
• IT equipment setup
• Company policy acknowledgments

All information you provide is kept secure and confidential.`,
      contentType: 'markdown',
      alignment: 'center',
      callouts: [
        {
          type: 'tip',
          title: 'Have these ready',
          text: 'You\'ll need your bank account details, emergency contact info, and government ID for tax forms.',
        },
      ],
    },
  },

  // Page 2: Personal Information
  {
    id: 'personal-info',
    title: 'Personal Information',
    description: 'Let\'s start with your basic details',
    pageType: 'form',
    fields: [
      '_section_basic_info',
      'firstName',
      'lastName',
      'preferredName',
      'email',
      'phone',
      'dateOfBirth',
      '_section_address',
      'address.street',
      'address.city',
      'address.state',
      'address.zip',
      'address.country',
    ],
    order: 1,
    showInNavigation: true,
  },

  // Page 3: Emergency Contacts
  {
    id: 'emergency-contacts',
    title: 'Emergency Contacts',
    description: 'Who should we contact in case of emergency?',
    pageType: 'form',
    fields: [
      'emergencyContact1.name',
      'emergencyContact1.relationship',
      'emergencyContact1.phone',
      'emergencyContact1.email',
      'emergencyContact2.name',
      'emergencyContact2.relationship',
      'emergencyContact2.phone',
    ],
    order: 2,
    showInNavigation: true,
  },

  // Page 4: Payroll & Tax
  {
    id: 'payroll',
    title: 'Payroll & Tax Information',
    description: 'Set up your payment preferences',
    pageType: 'form',
    fields: [
      'payrollMethod',
      'bankName',
      'bankAccountType',
      'bankRoutingNumber',
      'bankAccountNumber',
      'taxFilingStatus',
      'taxWithholdings',
      'stateWithholdings',
    ],
    order: 3,
    showInNavigation: true,
    content: {
      callouts: [
        {
          type: 'info',
          title: 'Secure Information',
          text: 'Your banking information is encrypted and stored securely. It will only be used for payroll processing.',
        },
      ],
    },
  },

  // Page 5: IT Equipment
  {
    id: 'it-equipment',
    title: 'IT & Equipment',
    description: 'Let us know what you need to do your best work',
    pageType: 'form',
    fields: [
      'computerPreference',
      'additionalMonitor',
      'headset',
      'specialEquipment',
      'softwareNeeds',
      'remoteSetup',
    ],
    order: 4,
    showInNavigation: true,
  },

  // Page 6: Policy Acknowledgments
  {
    id: 'policies',
    title: 'Policy Acknowledgments',
    description: 'Please review and acknowledge our company policies',
    pageType: 'form',
    fields: [
      'employeeHandbookAck',
      'codeOfConductAck',
      'dataPrivacyAck',
      'itSecurityAck',
      'antiHarassmentAck',
      'electronicSignature',
      'signatureDate',
    ],
    order: 5,
    showInNavigation: true,
  },

  // Page 7: Review
  {
    id: 'review',
    title: 'Review Your Information',
    description: 'Please verify everything is correct before submitting',
    pageType: 'summary',
    fields: [],
    order: 6,
    showInNavigation: true,
    summaryConfig: {
      showAllFields: true,
      groupByPage: true,
      allowEdit: true,
      editMode: 'jump-to-page',
      confirmLabel: 'Submit Onboarding',
      excludeEmptyFields: true,
    },
  },

  // Page 8: Complete
  {
    id: 'complete',
    title: 'Onboarding Complete',
    pageType: 'complete',
    fields: [],
    order: 7,
    showInNavigation: false,
    completionConfig: {
      heading: 'Welcome Aboard!',
      message: 'Your onboarding information has been submitted successfully. Our HR team will review your details and reach out if we need anything else.\n\nIn the meantime, check your email for next steps and your first-day schedule.',
      icon: 'celebration',
      showConfetti: true,
      actions: [
        {
          id: 'dashboard',
          label: 'Go to Employee Portal',
          action: 'navigate',
          url: '/portal',
          variant: 'primary',
        },
        {
          id: 'close',
          label: 'Close',
          action: 'close',
          variant: 'secondary',
        },
      ],
    },
  },
];

const fieldConfigs: FieldConfig[] = [
  // ============================================
  // Section Headers (Layout Fields)
  // ============================================
  {
    path: '_section_basic_info',
    label: 'Basic Information',
    type: 'section-header' as any,
    included: true,
    required: false,
    fieldWidth: 'full',
    layout: {
      type: 'section-header',
      title: 'Basic Information',
      subtitle: 'Your legal name and contact details',
    },
  },
  {
    path: '_section_address',
    label: 'Address',
    type: 'section-header' as any,
    included: true,
    required: false,
    fieldWidth: 'full',
    layout: {
      type: 'section-header',
      title: 'Home Address',
      subtitle: 'Where should we send mail?',
    },
  },

  // ============================================
  // Personal Information Fields
  // ============================================
  {
    path: 'firstName',
    label: 'First Name',
    type: 'short_text',
    included: true,
    required: true,
    placeholder: 'Enter your legal first name',
    fieldWidth: 'half',
  },
  {
    path: 'lastName',
    label: 'Last Name',
    type: 'short_text',
    included: true,
    required: true,
    placeholder: 'Enter your legal last name',
    fieldWidth: 'half',
  },
  {
    path: 'preferredName',
    label: 'Preferred Name',
    type: 'short_text',
    included: true,
    required: false,
    placeholder: 'What would you like to be called? (Leave blank if same as first name)',
    fieldWidth: 'full',
  },
  {
    path: 'email',
    label: 'Personal Email',
    type: 'email',
    included: true,
    required: true,
    placeholder: 'your.email@example.com',
    fieldWidth: 'half',
  },
  {
    path: 'phone',
    label: 'Phone Number',
    type: 'phone',
    included: true,
    required: true,
    fieldWidth: 'half',
  },
  {
    path: 'dateOfBirth',
    label: 'Date of Birth',
    type: 'date',
    included: true,
    required: true,
    fieldWidth: 'half',
  },

  // ============================================
  // Address Fields
  // ============================================
  {
    path: 'address.street',
    label: 'Street Address',
    type: 'short_text',
    included: true,
    required: true,
    placeholder: '123 Main Street, Apt 4B',
    fieldWidth: 'full',
  },
  {
    path: 'address.city',
    label: 'City',
    type: 'short_text',
    included: true,
    required: true,
    fieldWidth: 'third',
  },
  {
    path: 'address.state',
    label: 'State/Province',
    type: 'short_text',
    included: true,
    required: true,
    fieldWidth: 'third',
  },
  {
    path: 'address.zip',
    label: 'ZIP/Postal Code',
    type: 'short_text',
    included: true,
    required: true,
    fieldWidth: 'third',
  },
  {
    path: 'address.country',
    label: 'Country',
    type: 'dropdown',
    included: true,
    required: true,
    defaultValue: 'United States',
    fieldWidth: 'third',
    validation: {
      options: [
        'United States',
        'Canada',
        'United Kingdom',
        'Australia',
        'Germany',
        'France',
        'Other',
      ],
    },
  },

  // Emergency Contacts
  {
    path: 'emergencyContact1.name',
    label: 'Primary Emergency Contact Name',
    type: 'short_text',
    included: true,
    required: true,
    fieldWidth: 'half',
  },
  {
    path: 'emergencyContact1.relationship',
    label: 'Relationship',
    type: 'dropdown',
    included: true,
    required: true,
    fieldWidth: 'half',
    validation: {
      options: ['Spouse', 'Partner', 'Parent', 'Sibling', 'Child', 'Friend', 'Other'],
    },
  },
  {
    path: 'emergencyContact1.phone',
    label: 'Phone Number',
    type: 'phone',
    included: true,
    required: true,
    fieldWidth: 'half',
  },
  {
    path: 'emergencyContact1.email',
    label: 'Email (Optional)',
    type: 'email',
    included: true,
    required: false,
    fieldWidth: 'half',
  },
  {
    path: 'emergencyContact2.name',
    label: 'Secondary Emergency Contact Name',
    type: 'short_text',
    included: true,
    required: false,
    fieldWidth: 'half',
  },
  {
    path: 'emergencyContact2.relationship',
    label: 'Relationship',
    type: 'dropdown',
    included: true,
    required: false,
    fieldWidth: 'half',
    validation: {
      options: ['Spouse', 'Partner', 'Parent', 'Sibling', 'Child', 'Friend', 'Other'],
    },
  },
  {
    path: 'emergencyContact2.phone',
    label: 'Phone Number',
    type: 'phone',
    included: true,
    required: false,
    fieldWidth: 'full',
  },

  // Payroll & Tax
  {
    path: 'payrollMethod',
    label: 'Payment Method',
    type: 'multiple_choice',
    included: true,
    required: true,
    fieldWidth: 'full',
    validation: {
      options: [
        { value: 'direct_deposit', label: 'Direct Deposit (Recommended)' },
        { value: 'check', label: 'Paper Check' },
      ],
      choiceLayout: 'horizontal',
    },
  },
  {
    path: 'bankName',
    label: 'Bank Name',
    type: 'short_text',
    included: true,
    required: true,
    placeholder: 'e.g., Chase, Bank of America',
    fieldWidth: 'full',
    conditionalLogic: {
      action: 'show',
      logicType: 'all',
      conditions: [{ field: 'payrollMethod', operator: 'equals', value: 'direct_deposit' }],
    },
  },
  {
    path: 'bankAccountType',
    label: 'Account Type',
    type: 'multiple_choice',
    included: true,
    required: true,
    fieldWidth: 'half',
    validation: {
      options: [
        { value: 'checking', label: 'Checking' },
        { value: 'savings', label: 'Savings' },
      ],
      choiceLayout: 'horizontal',
    },
    conditionalLogic: {
      action: 'show',
      logicType: 'all',
      conditions: [{ field: 'payrollMethod', operator: 'equals', value: 'direct_deposit' }],
    },
  },
  {
    path: 'bankRoutingNumber',
    label: 'Routing Number',
    type: 'short_text',
    included: true,
    required: true,
    placeholder: '9-digit routing number',
    fieldWidth: 'half',
    validation: {
      pattern: '^[0-9]{9}$',
      minLength: 9,
      maxLength: 9,
    },
    conditionalLogic: {
      action: 'show',
      logicType: 'all',
      conditions: [{ field: 'payrollMethod', operator: 'equals', value: 'direct_deposit' }],
    },
  },
  {
    path: 'bankAccountNumber',
    label: 'Account Number',
    type: 'short_text',
    included: true,
    required: true,
    placeholder: 'Your account number',
    fieldWidth: 'half',
    conditionalLogic: {
      action: 'show',
      logicType: 'all',
      conditions: [{ field: 'payrollMethod', operator: 'equals', value: 'direct_deposit' }],
    },
  },
  {
    path: 'taxFilingStatus',
    label: 'Federal Tax Filing Status',
    type: 'dropdown',
    included: true,
    required: true,
    fieldWidth: 'half',
    validation: {
      options: [
        'Single',
        'Married Filing Jointly',
        'Married Filing Separately',
        'Head of Household',
      ],
    },
  },
  {
    path: 'taxWithholdings',
    label: 'Federal Withholding Allowances',
    type: 'number',
    included: true,
    required: true,
    defaultValue: 1,
    fieldWidth: 'half',
    validation: {
      min: 0,
      max: 10,
    },
  },
  {
    path: 'stateWithholdings',
    label: 'State Withholding Allowances',
    type: 'number',
    included: true,
    required: false,
    defaultValue: 1,
    fieldWidth: 'half',
    validation: {
      min: 0,
      max: 10,
    },
  },

  // IT Equipment
  {
    path: 'computerPreference',
    label: 'Computer Preference',
    type: 'multiple_choice',
    included: true,
    required: true,
    fieldWidth: 'full',
    validation: {
      options: [
        { value: 'macbook_pro', label: 'MacBook Pro' },
        { value: 'macbook_air', label: 'MacBook Air' },
        { value: 'windows_laptop', label: 'Windows Laptop' },
        { value: 'windows_desktop', label: 'Windows Desktop' },
      ],
      choiceLayout: 'horizontal',
      showImages: false,
    },
  },
  {
    path: 'additionalMonitor',
    label: 'Do you need an additional monitor?',
    type: 'yes_no',
    included: true,
    required: true,
    fieldWidth: 'half',
    validation: {
      displayStyle: 'buttons',
    },
  },
  {
    path: 'headset',
    label: 'Do you need a headset for calls?',
    type: 'yes_no',
    included: true,
    required: true,
    fieldWidth: 'half',
    validation: {
      displayStyle: 'buttons',
    },
  },
  {
    path: 'specialEquipment',
    label: 'Any special equipment or accessibility needs?',
    type: 'long_text',
    included: true,
    required: false,
    placeholder: 'e.g., ergonomic keyboard, standing desk, screen reader software',
    fieldWidth: 'full',
  },
  {
    path: 'softwareNeeds',
    label: 'Software you\'ll need for your role',
    type: 'checkboxes',
    included: true,
    required: false,
    fieldWidth: 'full',
    validation: {
      options: [
        'Microsoft Office',
        'Adobe Creative Suite',
        'Figma',
        'Slack',
        'Zoom',
        'GitHub',
        'Jira',
        'Salesforce',
        'Other (specify in notes)',
      ],
      choiceLayout: 'grid',
      choiceColumns: 3,
    },
  },
  {
    path: 'remoteSetup',
    label: 'Will you be working remotely?',
    type: 'multiple_choice',
    included: true,
    required: true,
    fieldWidth: 'full',
    validation: {
      options: [
        { value: 'full_remote', label: 'Fully Remote' },
        { value: 'hybrid', label: 'Hybrid (some office, some remote)' },
        { value: 'office', label: 'Full-time in Office' },
      ],
      choiceLayout: 'horizontal',
    },
  },

  // Policy Acknowledgments
  {
    path: 'employeeHandbookAck',
    label: 'I acknowledge that I have received and read the Employee Handbook',
    type: 'yes_no',
    included: true,
    required: true,
    fieldWidth: 'full',
    validation: {
      displayStyle: 'checkbox',
    },
  },
  {
    path: 'codeOfConductAck',
    label: 'I agree to abide by the Company Code of Conduct',
    type: 'yes_no',
    included: true,
    required: true,
    fieldWidth: 'full',
    validation: {
      displayStyle: 'checkbox',
    },
  },
  {
    path: 'dataPrivacyAck',
    label: 'I understand and agree to the Data Privacy Policy',
    type: 'yes_no',
    included: true,
    required: true,
    fieldWidth: 'full',
    validation: {
      displayStyle: 'checkbox',
    },
  },
  {
    path: 'itSecurityAck',
    label: 'I agree to follow IT Security policies and procedures',
    type: 'yes_no',
    included: true,
    required: true,
    fieldWidth: 'full',
    validation: {
      displayStyle: 'checkbox',
    },
  },
  {
    path: 'antiHarassmentAck',
    label: 'I have reviewed the Anti-Harassment Policy and understand my responsibilities',
    type: 'yes_no',
    included: true,
    required: true,
    fieldWidth: 'full',
    validation: {
      displayStyle: 'checkbox',
    },
  },
  {
    path: 'electronicSignature',
    label: 'Electronic Signature (Type your full legal name)',
    type: 'short_text',
    included: true,
    required: true,
    placeholder: 'Type your full legal name to sign',
    fieldWidth: 'half',
  },
  {
    path: 'signatureDate',
    label: 'Date',
    type: 'date',
    included: true,
    required: true,
    fieldWidth: 'half',
  },
];

export const employeeOnboardingTemplate: WizardTemplate = {
  id: 'employee-onboarding-v1',
  name: 'Employee Onboarding',
  description: 'Comprehensive new hire onboarding wizard covering personal info, emergency contacts, payroll setup, IT equipment, and policy acknowledgments.',
  category: 'hr',
  complexity: 'moderate',
  estimatedTime: '10-15 minutes',
  icon: 'PersonAdd',

  pages,
  fieldConfigs,
  multiPageConfig: {
    enabled: true,
    showStepIndicator: true,
    stepIndicatorStyle: 'progress',
    allowJumpToPage: false,
    validateOnPageChange: true,
    showPageTitles: true,
    submitButtonLabel: 'Complete Onboarding',
  },

  customizableFields: [
    'computerPreference',
    'softwareNeeds',
    'address.country',
  ],
  requiredIntegrations: [],

  version: '1.0.0',
  author: 'NetPad',
  tags: ['hr', 'onboarding', 'new-hire', 'employee'],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

export default employeeOnboardingTemplate;
