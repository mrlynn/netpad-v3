/**
 * Form Factory
 *
 * Generates test fixtures for form configurations with realistic defaults
 * and helper methods for common testing scenarios.
 */

import { FieldFactory } from './fieldFactory';

// Simple ID generator for tests
const generateId = () => Math.random().toString(36).substring(2, 15);
const generateSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Base form configuration interface
 */
interface BaseFormConfig {
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  fieldConfigs: any[];
  organizationId?: string;
  projectId?: string;
  isPublished?: boolean;
  theme?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  botProtection?: Record<string, unknown>;
  accessControl?: Record<string, unknown>;
  hooks?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Factory for creating form configurations for testing
 */
export const FormFactory = {
  /**
   * Create a basic form with minimal configuration
   */
  create: (overrides: Partial<BaseFormConfig> = {}): BaseFormConfig => {
    const name = overrides.name || 'Test Form';
    return {
      id: `form_${generateId()}`,
      name,
      slug: generateSlug(name),
      description: 'A test form for automated testing',
      fieldConfigs: [],
      organizationId: `org_${generateId()}`,
      projectId: `proj_${generateId()}`,
      isPublished: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  },

  /**
   * Create a published form ready for submissions
   */
  published: (overrides: Partial<BaseFormConfig> = {}): BaseFormConfig =>
    FormFactory.create({
      isPublished: true,
      ...overrides,
    }),

  /**
   * Create a minimal contact form
   */
  contactForm: (overrides: Partial<BaseFormConfig> = {}): BaseFormConfig =>
    FormFactory.create({
      name: 'Contact Form',
      description: 'Get in touch with us',
      fieldConfigs: [
        FieldFactory.shortText({ path: 'name', label: 'Name', required: true }),
        FieldFactory.email({ path: 'email', label: 'Email', required: true }),
        FieldFactory.longText({ path: 'message', label: 'Message', required: true }),
      ],
      ...overrides,
    }),

  /**
   * Create a feedback form with ratings
   */
  feedbackForm: (overrides: Partial<BaseFormConfig> = {}): BaseFormConfig =>
    FormFactory.create({
      name: 'Feedback Form',
      description: 'Share your feedback',
      fieldConfigs: [
        FieldFactory.shortText({ path: 'name', label: 'Name' }),
        FieldFactory.email({ path: 'email', label: 'Email' }),
        FieldFactory.rating({ path: 'rating', label: 'Overall Rating', required: true }),
        FieldFactory.nps({ path: 'nps', label: 'How likely are you to recommend us?' }),
        FieldFactory.longText({ path: 'comments', label: 'Additional Comments' }),
      ],
      ...overrides,
    }),

  /**
   * Create a registration form
   */
  registrationForm: (overrides: Partial<BaseFormConfig> = {}): BaseFormConfig =>
    FormFactory.create({
      name: 'Registration Form',
      description: 'Create your account',
      fieldConfigs: [
        FieldFactory.shortText({ path: 'firstName', label: 'First Name', required: true }),
        FieldFactory.shortText({ path: 'lastName', label: 'Last Name', required: true }),
        FieldFactory.email({ path: 'email', label: 'Email', required: true }),
        FieldFactory.phone({ path: 'phone', label: 'Phone Number' }),
        FieldFactory.date({ path: 'dob', label: 'Date of Birth' }),
        FieldFactory.dropdown({
          path: 'country',
          label: 'Country',
          options: [
            { label: 'United States', value: 'US' },
            { label: 'Canada', value: 'CA' },
            { label: 'United Kingdom', value: 'UK' },
          ],
        }),
        FieldFactory.yesNo({ path: 'terms', label: 'I agree to the terms', required: true }),
      ],
      ...overrides,
    }),

  /**
   * Create a survey form with various question types
   */
  surveyForm: (overrides: Partial<BaseFormConfig> = {}): BaseFormConfig =>
    FormFactory.create({
      name: 'Customer Survey',
      description: 'Help us improve our service',
      fieldConfigs: [
        FieldFactory.multipleChoice({
          path: 'satisfaction',
          label: 'How satisfied are you with our service?',
          options: [
            { label: 'Very Satisfied', value: 'very_satisfied' },
            { label: 'Satisfied', value: 'satisfied' },
            { label: 'Neutral', value: 'neutral' },
            { label: 'Dissatisfied', value: 'dissatisfied' },
            { label: 'Very Dissatisfied', value: 'very_dissatisfied' },
          ],
          required: true,
        }),
        FieldFactory.checkboxes({
          path: 'features',
          label: 'Which features do you use most?',
          options: [
            { label: 'Dashboard', value: 'dashboard' },
            { label: 'Reports', value: 'reports' },
            { label: 'Integrations', value: 'integrations' },
            { label: 'API', value: 'api' },
          ],
        }),
        FieldFactory.scale({ path: 'easeOfUse', label: 'Rate the ease of use (1-10)' }),
        FieldFactory.longText({ path: 'suggestions', label: 'Any suggestions for improvement?' }),
      ],
      ...overrides,
    }),

  /**
   * Create a form with file uploads
   */
  fileUploadForm: (overrides: Partial<BaseFormConfig> = {}): BaseFormConfig =>
    FormFactory.create({
      name: 'Document Upload',
      description: 'Upload your documents',
      fieldConfigs: [
        FieldFactory.shortText({ path: 'title', label: 'Document Title', required: true }),
        FieldFactory.file({ path: 'document', label: 'Upload Document', required: true }),
        FieldFactory.image({ path: 'thumbnail', label: 'Thumbnail Image' }),
        FieldFactory.longText({ path: 'description', label: 'Description' }),
      ],
      ...overrides,
    }),

  /**
   * Create a form with all field types for comprehensive testing
   */
  allFieldTypesForm: (overrides: Partial<BaseFormConfig> = {}): BaseFormConfig =>
    FormFactory.create({
      name: 'All Field Types Form',
      description: 'Form containing all field types for testing',
      fieldConfigs: FieldFactory.allFieldTypes(),
      ...overrides,
    }),

  /**
   * Create a form with validation rules
   */
  validatedForm: (overrides: Partial<BaseFormConfig> = {}): BaseFormConfig =>
    FormFactory.create({
      name: 'Validated Form',
      description: 'Form with various validation rules',
      fieldConfigs: [
        FieldFactory.withValidation(FieldFactory.shortText({ path: 'username', label: 'Username', required: true }), {
          minLength: 3,
          maxLength: 20,
          pattern: '^[a-zA-Z0-9_]+$',
          errorMessage: 'Username must be 3-20 alphanumeric characters',
        }),
        FieldFactory.email({ path: 'email', label: 'Email', required: true }),
        FieldFactory.withValidation(FieldFactory.number({ path: 'age', label: 'Age', required: true }), {
          min: 18,
          max: 120,
        }),
        FieldFactory.withValidation(FieldFactory.longText({ path: 'bio', label: 'Bio' }), {
          minLength: 10,
          maxLength: 500,
        }),
      ],
      ...overrides,
    }),

  /**
   * Create a form with bot protection enabled
   */
  protectedForm: (overrides: Partial<BaseFormConfig> = {}): BaseFormConfig =>
    FormFactory.create({
      name: 'Protected Form',
      botProtection: {
        enabled: true,
        honeypot: { enabled: true },
        timing: { enabled: true, minSubmitTime: 3, maxSubmitTime: 3600 },
        turnstile: { enabled: false }, // Turnstile requires real keys
      },
      ...overrides,
    }),

  /**
   * Create a form with access control
   */
  restrictedForm: (overrides: Partial<BaseFormConfig> = {}): BaseFormConfig =>
    FormFactory.create({
      name: 'Restricted Form',
      accessControl: {
        type: 'authenticated',
        allowedAuthMethods: ['magic-link', 'passkey'],
      },
      ...overrides,
    }),

  /**
   * Create a form with webhooks configured
   */
  webhookForm: (overrides: Partial<BaseFormConfig> = {}): BaseFormConfig =>
    FormFactory.create({
      name: 'Webhook Form',
      hooks: {
        onSuccess: {
          webhook: {
            url: 'https://example.com/webhook',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          },
        },
        onError: {
          webhook: {
            url: 'https://example.com/error-webhook',
            method: 'POST',
          },
        },
      },
      ...overrides,
    }),

  /**
   * Create a form with custom theme
   */
  themedForm: (overrides: Partial<BaseFormConfig> = {}): BaseFormConfig =>
    FormFactory.create({
      name: 'Themed Form',
      theme: {
        primaryColor: '#00ED64',
        fontFamily: 'Inter, sans-serif',
        borderRadius: 8,
        mode: 'light',
      },
      ...overrides,
    }),
};

/**
 * Test submission data generators
 */
export const SubmissionFactory = {
  /**
   * Create valid submission data for a contact form
   */
  contactFormData: () => ({
    name: 'John Doe',
    email: 'john@example.com',
    message: 'This is a test message.',
  }),

  /**
   * Create valid submission data for a feedback form
   */
  feedbackFormData: () => ({
    name: 'Jane Smith',
    email: 'jane@example.com',
    rating: 5,
    nps: 9,
    comments: 'Great service!',
  }),

  /**
   * Create valid submission data for a registration form
   */
  registrationFormData: () => ({
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    phone: '+1-555-123-4567',
    dob: '1990-01-15',
    country: 'US',
    terms: true,
  }),

  /**
   * Create submission data with missing required fields
   */
  incompleteData: () => ({
    name: 'Incomplete',
    // Missing email and message
  }),

  /**
   * Create submission data with invalid values
   */
  invalidData: () => ({
    name: 'Invalid',
    email: 'not-an-email',
    age: -5,
  }),

  /**
   * Create submission metadata
   */
  metadata: () => ({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
    ipAddress: '127.0.0.1',
    referrer: 'https://example.com',
    deviceType: 'desktop' as const,
  }),
};

export default FormFactory;
