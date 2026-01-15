/**
 * Enhanced Template Tools for NetPad MCP Server
 *
 * Phase 6 of MCP Server 2.0 update - Enhanced Templates
 * Provides access to 25+ form templates across multiple categories.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface FormTemplateField {
  path: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  fieldWidth?: 'full' | 'half' | 'third' | 'quarter';
  options?: Array<{ label: string; value: string }>;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    errorMessage?: string;
  };
  conditionalLogic?: {
    action: 'show' | 'hide';
    logicType: 'all' | 'any';
    conditions: Array<{
      field: string;
      operator: string;
      value?: string | number | boolean;
    }>;
  };
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  icon?: string;
  fields: FormTemplateField[];
  multiPage?: {
    enabled: boolean;
    pages: Array<{
      id: string;
      title: string;
      description?: string;
      fields: string[];
    }>;
    showProgressBar?: boolean;
    showReview?: boolean;
  };
  settings?: {
    submitButtonText?: string;
    successMessage?: string;
    requiresEncryption?: boolean;
    allowAnonymous?: boolean;
  };
}

export interface TemplateCustomizations {
  name?: string;
  description?: string;
  includeOptionalFields?: boolean;
  theme?: string;
  submitButtonText?: string;
  successMessage?: string;
}

// ============================================================================
// FORM TEMPLATES (25+ templates across 10 categories)
// ============================================================================

export const FORM_TEMPLATES: Record<string, FormTemplate> = {
  // ==================== BUSINESS ====================
  'contact-form': {
    id: 'contact-form',
    name: 'Contact Form',
    description: 'Simple contact form for collecting inquiries',
    category: 'business',
    tags: ['contact', 'inquiry', 'basic'],
    icon: '📧',
    fields: [
      { path: 'name', label: 'Full Name', type: 'short_text', required: true, placeholder: 'John Doe' },
      { path: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'john@example.com' },
      { path: 'phone', label: 'Phone Number', type: 'phone', required: false, placeholder: '+1 (555) 123-4567' },
      { path: 'subject', label: 'Subject', type: 'dropdown', required: true, options: [
        { label: 'General Inquiry', value: 'general' },
        { label: 'Sales', value: 'sales' },
        { label: 'Support', value: 'support' },
        { label: 'Partnership', value: 'partnership' },
        { label: 'Other', value: 'other' },
      ]},
      { path: 'message', label: 'Message', type: 'long_text', required: true, placeholder: 'How can we help you?', validation: { minLength: 10 } },
    ],
    settings: {
      submitButtonText: 'Send Message',
      successMessage: 'Thank you for contacting us! We\'ll get back to you within 24 hours.',
    },
  },

  'lead-capture': {
    id: 'lead-capture',
    name: 'Lead Capture Form',
    description: 'Capture leads with company and interest information',
    category: 'business',
    tags: ['lead', 'sales', 'marketing', 'crm'],
    icon: '🎯',
    fields: [
      { path: 'firstName', label: 'First Name', type: 'short_text', required: true, fieldWidth: 'half' },
      { path: 'lastName', label: 'Last Name', type: 'short_text', required: true, fieldWidth: 'half' },
      { path: 'email', label: 'Work Email', type: 'email', required: true },
      { path: 'phone', label: 'Phone Number', type: 'phone', required: false },
      { path: 'company', label: 'Company Name', type: 'short_text', required: true },
      { path: 'jobTitle', label: 'Job Title', type: 'short_text', required: false },
      { path: 'companySize', label: 'Company Size', type: 'dropdown', required: true, options: [
        { label: '1-10 employees', value: '1-10' },
        { label: '11-50 employees', value: '11-50' },
        { label: '51-200 employees', value: '51-200' },
        { label: '201-500 employees', value: '201-500' },
        { label: '500+ employees', value: '500+' },
      ]},
      { path: 'interest', label: 'What are you interested in?', type: 'checkboxes', required: true, options: [
        { label: 'Product Demo', value: 'demo' },
        { label: 'Pricing Information', value: 'pricing' },
        { label: 'Technical Documentation', value: 'docs' },
        { label: 'Partnership Opportunities', value: 'partnership' },
      ]},
      { path: 'message', label: 'Additional Comments', type: 'long_text', required: false },
    ],
    settings: {
      submitButtonText: 'Get Started',
      successMessage: 'Thanks! A member of our team will reach out shortly.',
    },
  },

  'quote-request': {
    id: 'quote-request',
    name: 'Quote Request Form',
    description: 'Request a price quote for products or services',
    category: 'business',
    tags: ['quote', 'pricing', 'sales'],
    icon: '💰',
    fields: [
      { path: 'contactName', label: 'Contact Name', type: 'short_text', required: true },
      { path: 'email', label: 'Email', type: 'email', required: true },
      { path: 'phone', label: 'Phone', type: 'phone', required: true },
      { path: 'company', label: 'Company', type: 'short_text', required: false },
      { path: 'productService', label: 'Product/Service', type: 'dropdown', required: true, options: [
        { label: 'Service A', value: 'service_a' },
        { label: 'Service B', value: 'service_b' },
        { label: 'Service C', value: 'service_c' },
        { label: 'Custom Solution', value: 'custom' },
      ]},
      { path: 'quantity', label: 'Quantity/Volume', type: 'number', required: false },
      { path: 'timeline', label: 'Expected Timeline', type: 'dropdown', required: true, options: [
        { label: 'Immediate', value: 'immediate' },
        { label: 'Within 1 month', value: '1_month' },
        { label: '1-3 months', value: '1_3_months' },
        { label: '3+ months', value: '3_plus_months' },
      ]},
      { path: 'budget', label: 'Budget Range', type: 'dropdown', required: false, options: [
        { label: 'Under $1,000', value: 'under_1k' },
        { label: '$1,000 - $5,000', value: '1k_5k' },
        { label: '$5,000 - $10,000', value: '5k_10k' },
        { label: '$10,000+', value: '10k_plus' },
      ]},
      { path: 'requirements', label: 'Specific Requirements', type: 'long_text', required: false },
    ],
    settings: {
      submitButtonText: 'Request Quote',
      successMessage: 'Your quote request has been received. We\'ll send you a detailed proposal within 2 business days.',
    },
  },

  'newsletter-signup': {
    id: 'newsletter-signup',
    name: 'Newsletter Signup',
    description: 'Simple email newsletter subscription form',
    category: 'business',
    tags: ['newsletter', 'email', 'subscription', 'marketing'],
    icon: '📬',
    fields: [
      { path: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'you@example.com' },
      { path: 'firstName', label: 'First Name', type: 'short_text', required: false, placeholder: 'Your name (optional)' },
      { path: 'interests', label: 'Topics of Interest', type: 'checkboxes', required: false, options: [
        { label: 'Product Updates', value: 'updates' },
        { label: 'Industry News', value: 'news' },
        { label: 'Tips & Tutorials', value: 'tips' },
        { label: 'Special Offers', value: 'offers' },
      ]},
      { path: 'consent', label: 'I agree to receive marketing emails', type: 'checkbox', required: true },
    ],
    settings: {
      submitButtonText: 'Subscribe',
      successMessage: 'You\'re subscribed! Check your inbox for a confirmation email.',
    },
  },

  // ==================== EVENTS ====================
  'event-registration': {
    id: 'event-registration',
    name: 'Event Registration',
    description: 'Register attendees for events, conferences, or workshops',
    category: 'events',
    tags: ['event', 'registration', 'conference', 'workshop'],
    icon: '🎪',
    fields: [
      { path: 'firstName', label: 'First Name', type: 'short_text', required: true, fieldWidth: 'half' },
      { path: 'lastName', label: 'Last Name', type: 'short_text', required: true, fieldWidth: 'half' },
      { path: 'email', label: 'Email', type: 'email', required: true },
      { path: 'phone', label: 'Phone', type: 'phone', required: false },
      { path: 'organization', label: 'Organization', type: 'short_text', required: false },
      { path: 'ticketType', label: 'Ticket Type', type: 'radio', required: true, options: [
        { label: 'General Admission', value: 'general' },
        { label: 'VIP', value: 'vip' },
        { label: 'Student', value: 'student' },
      ]},
      { path: 'sessions', label: 'Sessions to Attend', type: 'checkboxes', required: false, options: [
        { label: 'Keynote Speech', value: 'keynote' },
        { label: 'Workshop A', value: 'workshop_a' },
        { label: 'Workshop B', value: 'workshop_b' },
        { label: 'Networking Session', value: 'networking' },
      ]},
      { path: 'dietaryRestrictions', label: 'Dietary Restrictions', type: 'dropdown', required: false, options: [
        { label: 'None', value: 'none' },
        { label: 'Vegetarian', value: 'vegetarian' },
        { label: 'Vegan', value: 'vegan' },
        { label: 'Gluten-Free', value: 'gluten_free' },
        { label: 'Other', value: 'other' },
      ]},
      { path: 'specialRequirements', label: 'Special Requirements', type: 'long_text', required: false },
    ],
    settings: {
      submitButtonText: 'Register Now',
      successMessage: 'You\'re registered! Check your email for confirmation and event details.',
    },
  },

  'rsvp': {
    id: 'rsvp',
    name: 'RSVP Form',
    description: 'Simple RSVP form for events and gatherings',
    category: 'events',
    tags: ['rsvp', 'event', 'invitation'],
    icon: '✉️',
    fields: [
      { path: 'name', label: 'Your Name', type: 'short_text', required: true },
      { path: 'email', label: 'Email', type: 'email', required: true },
      { path: 'attending', label: 'Will you be attending?', type: 'radio', required: true, options: [
        { label: 'Yes, I\'ll be there!', value: 'yes' },
        { label: 'Sorry, I can\'t make it', value: 'no' },
        { label: 'Maybe', value: 'maybe' },
      ]},
      { path: 'guestCount', label: 'Number of Guests', type: 'number', required: false, validation: { min: 0, max: 10 } },
      { path: 'message', label: 'Message for the Host', type: 'long_text', required: false },
    ],
    settings: {
      submitButtonText: 'Submit RSVP',
      successMessage: 'Thank you for your response!',
    },
  },

  'volunteer-signup': {
    id: 'volunteer-signup',
    name: 'Volunteer Signup',
    description: 'Collect volunteer information and availability',
    category: 'events',
    tags: ['volunteer', 'nonprofit', 'community'],
    icon: '🤝',
    fields: [
      { path: 'name', label: 'Full Name', type: 'short_text', required: true },
      { path: 'email', label: 'Email', type: 'email', required: true },
      { path: 'phone', label: 'Phone', type: 'phone', required: true },
      { path: 'availability', label: 'Availability', type: 'checkboxes', required: true, options: [
        { label: 'Weekday Mornings', value: 'weekday_am' },
        { label: 'Weekday Afternoons', value: 'weekday_pm' },
        { label: 'Weekday Evenings', value: 'weekday_eve' },
        { label: 'Weekends', value: 'weekends' },
      ]},
      { path: 'interests', label: 'Areas of Interest', type: 'checkboxes', required: true, options: [
        { label: 'Event Setup', value: 'setup' },
        { label: 'Registration Desk', value: 'registration' },
        { label: 'Food Service', value: 'food' },
        { label: 'Clean Up', value: 'cleanup' },
        { label: 'Photography', value: 'photography' },
      ]},
      { path: 'experience', label: 'Relevant Experience', type: 'long_text', required: false },
      { path: 'emergencyContact', label: 'Emergency Contact', type: 'short_text', required: true },
    ],
    settings: {
      submitButtonText: 'Sign Up to Volunteer',
      successMessage: 'Thank you for volunteering! We\'ll be in touch with more details.',
    },
  },

  'webinar-registration': {
    id: 'webinar-registration',
    name: 'Webinar Registration',
    description: 'Register attendees for online webinars',
    category: 'events',
    tags: ['webinar', 'online', 'virtual', 'registration'],
    icon: '💻',
    fields: [
      { path: 'firstName', label: 'First Name', type: 'short_text', required: true, fieldWidth: 'half' },
      { path: 'lastName', label: 'Last Name', type: 'short_text', required: true, fieldWidth: 'half' },
      { path: 'email', label: 'Email', type: 'email', required: true },
      { path: 'company', label: 'Company', type: 'short_text', required: false },
      { path: 'jobTitle', label: 'Job Title', type: 'short_text', required: false },
      { path: 'questions', label: 'Questions for the Speaker', type: 'long_text', required: false },
      { path: 'marketingConsent', label: 'I agree to receive related content and updates', type: 'checkbox', required: false },
    ],
    settings: {
      submitButtonText: 'Register for Webinar',
      successMessage: 'You\'re registered! Check your email for the webinar link and details.',
    },
  },

  // ==================== FEEDBACK ====================
  'customer-satisfaction': {
    id: 'customer-satisfaction',
    name: 'Customer Satisfaction Survey',
    description: 'Measure customer satisfaction with CSAT score',
    category: 'feedback',
    tags: ['csat', 'satisfaction', 'survey', 'feedback'],
    icon: '😊',
    fields: [
      { path: 'overallSatisfaction', label: 'How satisfied are you with our service?', type: 'rating', required: true },
      { path: 'productQuality', label: 'Product Quality', type: 'scale', required: true, validation: { min: 1, max: 5 } },
      { path: 'customerService', label: 'Customer Service', type: 'scale', required: true, validation: { min: 1, max: 5 } },
      { path: 'valueForMoney', label: 'Value for Money', type: 'scale', required: true, validation: { min: 1, max: 5 } },
      { path: 'whatWentWell', label: 'What did we do well?', type: 'long_text', required: false },
      { path: 'improvements', label: 'What could we improve?', type: 'long_text', required: false },
      { path: 'email', label: 'Email (optional for follow-up)', type: 'email', required: false },
    ],
    settings: {
      submitButtonText: 'Submit Feedback',
      successMessage: 'Thank you for your feedback! Your input helps us improve.',
    },
  },

  'nps-survey': {
    id: 'nps-survey',
    name: 'NPS Survey',
    description: 'Net Promoter Score survey to measure customer loyalty',
    category: 'feedback',
    tags: ['nps', 'loyalty', 'survey', 'feedback'],
    icon: '📊',
    fields: [
      { path: 'npsScore', label: 'How likely are you to recommend us to a friend or colleague?', type: 'nps', required: true },
      { path: 'reason', label: 'What\'s the primary reason for your score?', type: 'long_text', required: true },
      { path: 'improvements', label: 'What could we do to improve?', type: 'long_text', required: false },
      { path: 'canContact', label: 'May we follow up with you?', type: 'yes_no', required: true },
      { path: 'email', label: 'Email', type: 'email', required: false, conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'canContact', operator: 'equals', value: true }],
      }},
    ],
    settings: {
      submitButtonText: 'Submit',
      successMessage: 'Thank you for your feedback!',
    },
  },

  'product-feedback': {
    id: 'product-feedback',
    name: 'Product Feedback Form',
    description: 'Collect detailed product feedback and feature requests',
    category: 'feedback',
    tags: ['product', 'feedback', 'features', 'suggestions'],
    icon: '💡',
    fields: [
      { path: 'product', label: 'Which product are you providing feedback for?', type: 'dropdown', required: true, options: [
        { label: 'Product A', value: 'product_a' },
        { label: 'Product B', value: 'product_b' },
        { label: 'Product C', value: 'product_c' },
      ]},
      { path: 'feedbackType', label: 'Type of Feedback', type: 'radio', required: true, options: [
        { label: 'Bug Report', value: 'bug' },
        { label: 'Feature Request', value: 'feature' },
        { label: 'General Feedback', value: 'general' },
        { label: 'Compliment', value: 'compliment' },
      ]},
      { path: 'title', label: 'Summary', type: 'short_text', required: true, placeholder: 'Brief summary of your feedback' },
      { path: 'description', label: 'Detailed Description', type: 'long_text', required: true },
      { path: 'priority', label: 'How important is this to you?', type: 'radio', required: false, options: [
        { label: 'Critical - Blocking my work', value: 'critical' },
        { label: 'High - Significant impact', value: 'high' },
        { label: 'Medium - Would be nice', value: 'medium' },
        { label: 'Low - Minor improvement', value: 'low' },
      ]},
      { path: 'email', label: 'Email (for updates)', type: 'email', required: false },
    ],
    settings: {
      submitButtonText: 'Submit Feedback',
      successMessage: 'Thank you! Your feedback has been recorded and will be reviewed by our team.',
    },
  },

  'general-feedback': {
    id: 'general-feedback',
    name: 'General Feedback Form',
    description: 'Open-ended feedback collection form',
    category: 'feedback',
    tags: ['feedback', 'general', 'comments'],
    icon: '📝',
    fields: [
      { path: 'name', label: 'Name (optional)', type: 'short_text', required: false },
      { path: 'email', label: 'Email (optional)', type: 'email', required: false },
      { path: 'category', label: 'Feedback Category', type: 'dropdown', required: true, options: [
        { label: 'Website', value: 'website' },
        { label: 'Product', value: 'product' },
        { label: 'Service', value: 'service' },
        { label: 'Staff', value: 'staff' },
        { label: 'Other', value: 'other' },
      ]},
      { path: 'rating', label: 'Overall Rating', type: 'rating', required: false },
      { path: 'feedback', label: 'Your Feedback', type: 'long_text', required: true, placeholder: 'Tell us what\'s on your mind...' },
    ],
    settings: {
      submitButtonText: 'Submit',
      successMessage: 'Thanks for sharing your thoughts!',
    },
  },

  // ==================== SUPPORT ====================
  'support-ticket': {
    id: 'support-ticket',
    name: 'Support Ticket Form',
    description: 'Submit support requests and technical issues',
    category: 'support',
    tags: ['support', 'ticket', 'help', 'technical'],
    icon: '🎫',
    fields: [
      { path: 'name', label: 'Your Name', type: 'short_text', required: true },
      { path: 'email', label: 'Email', type: 'email', required: true },
      { path: 'category', label: 'Issue Category', type: 'dropdown', required: true, options: [
        { label: 'Technical Issue', value: 'technical' },
        { label: 'Account/Billing', value: 'billing' },
        { label: 'Product Question', value: 'question' },
        { label: 'Feature Request', value: 'feature' },
        { label: 'Other', value: 'other' },
      ]},
      { path: 'priority', label: 'Priority', type: 'radio', required: true, options: [
        { label: 'Low', value: 'low' },
        { label: 'Medium', value: 'medium' },
        { label: 'High', value: 'high' },
        { label: 'Critical', value: 'critical' },
      ]},
      { path: 'subject', label: 'Subject', type: 'short_text', required: true },
      { path: 'description', label: 'Description', type: 'long_text', required: true, helpText: 'Please include any error messages or steps to reproduce the issue' },
    ],
    settings: {
      submitButtonText: 'Submit Ticket',
      successMessage: 'Your ticket has been created. We\'ll respond within 24 hours.',
    },
  },

  'appointment-booking': {
    id: 'appointment-booking',
    name: 'Appointment Booking',
    description: 'Book appointments and schedule meetings',
    category: 'support',
    tags: ['appointment', 'booking', 'scheduling', 'meeting'],
    icon: '📅',
    fields: [
      { path: 'name', label: 'Your Name', type: 'short_text', required: true },
      { path: 'email', label: 'Email', type: 'email', required: true },
      { path: 'phone', label: 'Phone', type: 'phone', required: true },
      { path: 'appointmentType', label: 'Appointment Type', type: 'dropdown', required: true, options: [
        { label: 'Consultation', value: 'consultation' },
        { label: 'Follow-up', value: 'followup' },
        { label: 'Demo', value: 'demo' },
        { label: 'Support Call', value: 'support' },
      ]},
      { path: 'preferredDate', label: 'Preferred Date', type: 'date', required: true },
      { path: 'preferredTime', label: 'Preferred Time', type: 'dropdown', required: true, options: [
        { label: '9:00 AM', value: '09:00' },
        { label: '10:00 AM', value: '10:00' },
        { label: '11:00 AM', value: '11:00' },
        { label: '1:00 PM', value: '13:00' },
        { label: '2:00 PM', value: '14:00' },
        { label: '3:00 PM', value: '15:00' },
        { label: '4:00 PM', value: '16:00' },
      ]},
      { path: 'notes', label: 'Additional Notes', type: 'long_text', required: false },
    ],
    settings: {
      submitButtonText: 'Book Appointment',
      successMessage: 'Your appointment request has been submitted. We\'ll confirm shortly.',
    },
  },

  // ==================== E-COMMERCE ====================
  'order-form': {
    id: 'order-form',
    name: 'Order Form',
    description: 'Simple product order form with quantity and shipping',
    category: 'ecommerce',
    tags: ['order', 'purchase', 'ecommerce', 'product'],
    icon: '🛒',
    fields: [
      { path: 'product', label: 'Product', type: 'dropdown', required: true, options: [
        { label: 'Product A - $29.99', value: 'product_a' },
        { label: 'Product B - $49.99', value: 'product_b' },
        { label: 'Product C - $99.99', value: 'product_c' },
      ]},
      { path: 'quantity', label: 'Quantity', type: 'number', required: true, validation: { min: 1, max: 100 } },
      { path: 'customerName', label: 'Full Name', type: 'short_text', required: true },
      { path: 'email', label: 'Email', type: 'email', required: true },
      { path: 'phone', label: 'Phone', type: 'phone', required: true },
      { path: 'shippingAddress', label: 'Shipping Address', type: 'long_text', required: true },
      { path: 'city', label: 'City', type: 'short_text', required: true, fieldWidth: 'half' },
      { path: 'zipCode', label: 'ZIP/Postal Code', type: 'short_text', required: true, fieldWidth: 'half' },
      { path: 'specialInstructions', label: 'Special Instructions', type: 'long_text', required: false },
    ],
    settings: {
      submitButtonText: 'Place Order',
      successMessage: 'Your order has been placed! You\'ll receive a confirmation email shortly.',
    },
  },

  'return-request': {
    id: 'return-request',
    name: 'Return Request Form',
    description: 'Request product returns or exchanges',
    category: 'ecommerce',
    tags: ['return', 'exchange', 'refund', 'ecommerce'],
    icon: '📦',
    fields: [
      { path: 'orderNumber', label: 'Order Number', type: 'short_text', required: true },
      { path: 'email', label: 'Email Used for Order', type: 'email', required: true },
      { path: 'product', label: 'Product to Return', type: 'short_text', required: true },
      { path: 'reason', label: 'Reason for Return', type: 'dropdown', required: true, options: [
        { label: 'Defective/Damaged', value: 'defective' },
        { label: 'Wrong Item Received', value: 'wrong_item' },
        { label: 'Changed Mind', value: 'changed_mind' },
        { label: 'Size/Fit Issue', value: 'size_fit' },
        { label: 'Other', value: 'other' },
      ]},
      { path: 'action', label: 'Preferred Action', type: 'radio', required: true, options: [
        { label: 'Refund', value: 'refund' },
        { label: 'Exchange', value: 'exchange' },
        { label: 'Store Credit', value: 'credit' },
      ]},
      { path: 'details', label: 'Additional Details', type: 'long_text', required: false },
    ],
    settings: {
      submitButtonText: 'Submit Return Request',
      successMessage: 'Your return request has been submitted. We\'ll email you with instructions within 24 hours.',
    },
  },

  // ==================== HEALTHCARE ====================
  'patient-intake': {
    id: 'patient-intake',
    name: 'Patient Intake Form',
    description: 'Medical patient intake with health history (encrypted)',
    category: 'healthcare',
    tags: ['healthcare', 'medical', 'patient', 'intake', 'hipaa'],
    icon: '🏥',
    fields: [
      { path: 'firstName', label: 'First Name', type: 'short_text', required: true, fieldWidth: 'half' },
      { path: 'lastName', label: 'Last Name', type: 'short_text', required: true, fieldWidth: 'half' },
      { path: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true },
      { path: 'gender', label: 'Gender', type: 'dropdown', required: true, options: [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
        { label: 'Non-binary', value: 'non_binary' },
        { label: 'Prefer not to say', value: 'prefer_not' },
      ]},
      { path: 'phone', label: 'Phone', type: 'phone', required: true },
      { path: 'email', label: 'Email', type: 'email', required: true },
      { path: 'address', label: 'Address', type: 'long_text', required: true },
      { path: 'emergencyContact', label: 'Emergency Contact Name', type: 'short_text', required: true },
      { path: 'emergencyPhone', label: 'Emergency Contact Phone', type: 'phone', required: true },
      { path: 'allergies', label: 'Known Allergies', type: 'long_text', required: false, helpText: 'List any known allergies to medications, foods, or other substances' },
      { path: 'currentMedications', label: 'Current Medications', type: 'long_text', required: false },
      { path: 'medicalConditions', label: 'Existing Medical Conditions', type: 'checkboxes', required: false, options: [
        { label: 'Diabetes', value: 'diabetes' },
        { label: 'Heart Disease', value: 'heart' },
        { label: 'High Blood Pressure', value: 'hypertension' },
        { label: 'Asthma', value: 'asthma' },
        { label: 'Cancer', value: 'cancer' },
        { label: 'None', value: 'none' },
      ]},
      { path: 'reasonForVisit', label: 'Reason for Visit', type: 'long_text', required: true },
    ],
    multiPage: {
      enabled: true,
      pages: [
        { id: 'personal', title: 'Personal Information', fields: ['firstName', 'lastName', 'dateOfBirth', 'gender', 'phone', 'email', 'address'] },
        { id: 'emergency', title: 'Emergency Contact', fields: ['emergencyContact', 'emergencyPhone'] },
        { id: 'medical', title: 'Medical History', fields: ['allergies', 'currentMedications', 'medicalConditions', 'reasonForVisit'] },
      ],
      showProgressBar: true,
      showReview: true,
    },
    settings: {
      submitButtonText: 'Submit Intake Form',
      successMessage: 'Your intake form has been submitted securely.',
      requiresEncryption: true,
    },
  },

  'health-screening': {
    id: 'health-screening',
    name: 'Health Screening Form',
    description: 'Pre-visit health screening questionnaire',
    category: 'healthcare',
    tags: ['healthcare', 'screening', 'covid', 'health'],
    icon: '🩺',
    fields: [
      { path: 'name', label: 'Full Name', type: 'short_text', required: true },
      { path: 'dateOfVisit', label: 'Date of Visit', type: 'date', required: true },
      { path: 'symptoms', label: 'Have you experienced any of these symptoms in the last 14 days?', type: 'checkboxes', required: true, options: [
        { label: 'Fever or chills', value: 'fever' },
        { label: 'Cough', value: 'cough' },
        { label: 'Shortness of breath', value: 'breathing' },
        { label: 'Fatigue', value: 'fatigue' },
        { label: 'Body aches', value: 'aches' },
        { label: 'None of the above', value: 'none' },
      ]},
      { path: 'exposure', label: 'Have you been in close contact with anyone who tested positive for COVID-19?', type: 'yes_no', required: true },
      { path: 'travel', label: 'Have you traveled internationally in the last 14 days?', type: 'yes_no', required: true },
      { path: 'confirmation', label: 'I confirm that the information provided is accurate', type: 'checkbox', required: true },
    ],
    settings: {
      submitButtonText: 'Submit Screening',
      successMessage: 'Thank you. Please proceed to check-in.',
    },
  },

  // ==================== HR ====================
  'job-application': {
    id: 'job-application',
    name: 'Job Application Form',
    description: 'Comprehensive job application with experience and education',
    category: 'hr',
    tags: ['job', 'application', 'hr', 'recruitment', 'career'],
    icon: '💼',
    fields: [
      { path: 'firstName', label: 'First Name', type: 'short_text', required: true, fieldWidth: 'half' },
      { path: 'lastName', label: 'Last Name', type: 'short_text', required: true, fieldWidth: 'half' },
      { path: 'email', label: 'Email', type: 'email', required: true },
      { path: 'phone', label: 'Phone', type: 'phone', required: true },
      { path: 'position', label: 'Position Applied For', type: 'dropdown', required: true, options: [
        { label: 'Software Engineer', value: 'software_engineer' },
        { label: 'Product Manager', value: 'product_manager' },
        { label: 'Designer', value: 'designer' },
        { label: 'Marketing Manager', value: 'marketing' },
        { label: 'Other', value: 'other' },
      ]},
      { path: 'experience', label: 'Years of Experience', type: 'number', required: true, validation: { min: 0, max: 50 } },
      { path: 'education', label: 'Highest Education', type: 'dropdown', required: true, options: [
        { label: 'High School', value: 'high_school' },
        { label: 'Associate\'s Degree', value: 'associate' },
        { label: 'Bachelor\'s Degree', value: 'bachelor' },
        { label: 'Master\'s Degree', value: 'master' },
        { label: 'PhD', value: 'phd' },
      ]},
      { path: 'linkedin', label: 'LinkedIn Profile', type: 'url', required: false },
      { path: 'portfolio', label: 'Portfolio/Website', type: 'url', required: false },
      { path: 'coverLetter', label: 'Cover Letter', type: 'long_text', required: false },
      { path: 'availableDate', label: 'Available Start Date', type: 'date', required: true },
      { path: 'salaryExpectation', label: 'Salary Expectation', type: 'short_text', required: false },
      { path: 'referral', label: 'How did you hear about us?', type: 'dropdown', required: false, options: [
        { label: 'Job Board', value: 'job_board' },
        { label: 'LinkedIn', value: 'linkedin' },
        { label: 'Company Website', value: 'website' },
        { label: 'Employee Referral', value: 'referral' },
        { label: 'Other', value: 'other' },
      ]},
    ],
    multiPage: {
      enabled: true,
      pages: [
        { id: 'personal', title: 'Personal Information', fields: ['firstName', 'lastName', 'email', 'phone'] },
        { id: 'professional', title: 'Professional Background', fields: ['position', 'experience', 'education', 'linkedin', 'portfolio'] },
        { id: 'additional', title: 'Additional Information', fields: ['coverLetter', 'availableDate', 'salaryExpectation', 'referral'] },
      ],
      showProgressBar: true,
      showReview: true,
    },
    settings: {
      submitButtonText: 'Submit Application',
      successMessage: 'Thank you for applying! We\'ll review your application and get back to you.',
    },
  },

  // ==================== FINANCE ====================
  'expense-report': {
    id: 'expense-report',
    name: 'Expense Report Form',
    description: 'Submit business expense reports for reimbursement',
    category: 'finance',
    tags: ['expense', 'finance', 'reimbursement', 'accounting'],
    icon: '🧾',
    fields: [
      { path: 'employeeName', label: 'Employee Name', type: 'short_text', required: true },
      { path: 'department', label: 'Department', type: 'dropdown', required: true, options: [
        { label: 'Engineering', value: 'engineering' },
        { label: 'Sales', value: 'sales' },
        { label: 'Marketing', value: 'marketing' },
        { label: 'Operations', value: 'operations' },
        { label: 'Finance', value: 'finance' },
      ]},
      { path: 'expenseDate', label: 'Expense Date', type: 'date', required: true },
      { path: 'category', label: 'Expense Category', type: 'dropdown', required: true, options: [
        { label: 'Travel', value: 'travel' },
        { label: 'Meals', value: 'meals' },
        { label: 'Office Supplies', value: 'supplies' },
        { label: 'Software/Subscriptions', value: 'software' },
        { label: 'Other', value: 'other' },
      ]},
      { path: 'amount', label: 'Amount', type: 'number', required: true, validation: { min: 0 } },
      { path: 'currency', label: 'Currency', type: 'dropdown', required: true, options: [
        { label: 'USD', value: 'usd' },
        { label: 'EUR', value: 'eur' },
        { label: 'GBP', value: 'gbp' },
        { label: 'CAD', value: 'cad' },
      ]},
      { path: 'description', label: 'Description', type: 'long_text', required: true },
      { path: 'businessPurpose', label: 'Business Purpose', type: 'long_text', required: true },
    ],
    settings: {
      submitButtonText: 'Submit Expense Report',
      successMessage: 'Your expense report has been submitted for approval.',
    },
  },

  // ==================== EDUCATION ====================
  'course-enrollment': {
    id: 'course-enrollment',
    name: 'Course Enrollment Form',
    description: 'Enroll students in courses and programs',
    category: 'education',
    tags: ['course', 'enrollment', 'education', 'student'],
    icon: '📚',
    fields: [
      { path: 'studentName', label: 'Student Name', type: 'short_text', required: true },
      { path: 'email', label: 'Email', type: 'email', required: true },
      { path: 'phone', label: 'Phone', type: 'phone', required: true },
      { path: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true },
      { path: 'course', label: 'Course Selection', type: 'dropdown', required: true, options: [
        { label: 'Introduction to Programming', value: 'intro_programming' },
        { label: 'Data Science Fundamentals', value: 'data_science' },
        { label: 'Web Development Bootcamp', value: 'web_dev' },
        { label: 'Machine Learning Basics', value: 'ml_basics' },
      ]},
      { path: 'schedule', label: 'Preferred Schedule', type: 'radio', required: true, options: [
        { label: 'Morning (9 AM - 12 PM)', value: 'morning' },
        { label: 'Afternoon (1 PM - 4 PM)', value: 'afternoon' },
        { label: 'Evening (6 PM - 9 PM)', value: 'evening' },
        { label: 'Weekend', value: 'weekend' },
      ]},
      { path: 'priorExperience', label: 'Prior Experience', type: 'long_text', required: false },
      { path: 'goals', label: 'What do you hope to achieve?', type: 'long_text', required: false },
    ],
    settings: {
      submitButtonText: 'Enroll Now',
      successMessage: 'Your enrollment has been submitted! Check your email for confirmation.',
    },
  },

  'scholarship-application': {
    id: 'scholarship-application',
    name: 'Scholarship Application',
    description: 'Apply for educational scholarships',
    category: 'education',
    tags: ['scholarship', 'education', 'financial-aid', 'student'],
    icon: '🎓',
    fields: [
      { path: 'firstName', label: 'First Name', type: 'short_text', required: true, fieldWidth: 'half' },
      { path: 'lastName', label: 'Last Name', type: 'short_text', required: true, fieldWidth: 'half' },
      { path: 'email', label: 'Email', type: 'email', required: true },
      { path: 'phone', label: 'Phone', type: 'phone', required: true },
      { path: 'currentSchool', label: 'Current School/Institution', type: 'short_text', required: true },
      { path: 'gpa', label: 'GPA', type: 'number', required: true, validation: { min: 0, max: 4 } },
      { path: 'fieldOfStudy', label: 'Field of Study', type: 'short_text', required: true },
      { path: 'essay', label: 'Scholarship Essay', type: 'long_text', required: true, helpText: 'Describe why you deserve this scholarship (500-1000 words)' },
      { path: 'financialNeed', label: 'Statement of Financial Need', type: 'long_text', required: true },
      { path: 'extracurriculars', label: 'Extracurricular Activities', type: 'long_text', required: false },
    ],
    multiPage: {
      enabled: true,
      pages: [
        { id: 'personal', title: 'Personal Information', fields: ['firstName', 'lastName', 'email', 'phone'] },
        { id: 'academic', title: 'Academic Information', fields: ['currentSchool', 'gpa', 'fieldOfStudy'] },
        { id: 'essays', title: 'Essays', fields: ['essay', 'financialNeed', 'extracurriculars'] },
      ],
      showProgressBar: true,
      showReview: true,
    },
    settings: {
      submitButtonText: 'Submit Application',
      successMessage: 'Your scholarship application has been submitted. Good luck!',
    },
  },

  // ==================== REAL ESTATE ====================
  'property-inquiry': {
    id: 'property-inquiry',
    name: 'Property Inquiry Form',
    description: 'Inquire about property listings',
    category: 'real-estate',
    tags: ['real-estate', 'property', 'inquiry', 'housing'],
    icon: '🏠',
    fields: [
      { path: 'name', label: 'Your Name', type: 'short_text', required: true },
      { path: 'email', label: 'Email', type: 'email', required: true },
      { path: 'phone', label: 'Phone', type: 'phone', required: true },
      { path: 'propertyId', label: 'Property ID/Address', type: 'short_text', required: true },
      { path: 'inquiryType', label: 'I\'m interested in', type: 'radio', required: true, options: [
        { label: 'Buying', value: 'buying' },
        { label: 'Renting', value: 'renting' },
        { label: 'Just Browsing', value: 'browsing' },
      ]},
      { path: 'budget', label: 'Budget Range', type: 'dropdown', required: false, options: [
        { label: 'Under $100,000', value: 'under_100k' },
        { label: '$100,000 - $250,000', value: '100k_250k' },
        { label: '$250,000 - $500,000', value: '250k_500k' },
        { label: '$500,000 - $1,000,000', value: '500k_1m' },
        { label: 'Over $1,000,000', value: 'over_1m' },
      ]},
      { path: 'moveInDate', label: 'Desired Move-in Date', type: 'date', required: false },
      { path: 'message', label: 'Questions/Comments', type: 'long_text', required: false },
    ],
    settings: {
      submitButtonText: 'Submit Inquiry',
      successMessage: 'Thank you for your interest! An agent will contact you within 24 hours.',
    },
  },

  'rental-application': {
    id: 'rental-application',
    name: 'Rental Application',
    description: 'Apply to rent a property',
    category: 'real-estate',
    tags: ['rental', 'application', 'real-estate', 'housing'],
    icon: '🔑',
    fields: [
      { path: 'firstName', label: 'First Name', type: 'short_text', required: true, fieldWidth: 'half' },
      { path: 'lastName', label: 'Last Name', type: 'short_text', required: true, fieldWidth: 'half' },
      { path: 'email', label: 'Email', type: 'email', required: true },
      { path: 'phone', label: 'Phone', type: 'phone', required: true },
      { path: 'currentAddress', label: 'Current Address', type: 'long_text', required: true },
      { path: 'employer', label: 'Current Employer', type: 'short_text', required: true },
      { path: 'monthlyIncome', label: 'Monthly Income', type: 'number', required: true },
      { path: 'occupants', label: 'Number of Occupants', type: 'number', required: true, validation: { min: 1 } },
      { path: 'pets', label: 'Do you have pets?', type: 'yes_no', required: true },
      { path: 'petDetails', label: 'Pet Details', type: 'short_text', required: false, conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'pets', operator: 'equals', value: true }],
      }},
      { path: 'moveInDate', label: 'Desired Move-in Date', type: 'date', required: true },
      { path: 'references', label: 'References (Name, Phone, Relationship)', type: 'long_text', required: true },
      { path: 'consent', label: 'I authorize a background and credit check', type: 'checkbox', required: true },
    ],
    multiPage: {
      enabled: true,
      pages: [
        { id: 'personal', title: 'Personal Information', fields: ['firstName', 'lastName', 'email', 'phone', 'currentAddress'] },
        { id: 'employment', title: 'Employment & Income', fields: ['employer', 'monthlyIncome'] },
        { id: 'rental', title: 'Rental Details', fields: ['occupants', 'pets', 'petDetails', 'moveInDate', 'references', 'consent'] },
      ],
      showProgressBar: true,
      showReview: true,
    },
    settings: {
      submitButtonText: 'Submit Application',
      successMessage: 'Your rental application has been submitted. We\'ll be in touch within 3-5 business days.',
    },
  },
};

// ============================================================================
// TEMPLATE CATEGORIES
// ============================================================================

export const TEMPLATE_CATEGORIES = [
  { id: 'business', name: 'Business', description: 'Contact forms, lead capture, quotes', icon: '💼', count: 4 },
  { id: 'events', name: 'Events', description: 'Registrations, RSVPs, volunteer signups', icon: '🎪', count: 4 },
  { id: 'feedback', name: 'Feedback', description: 'Surveys, NPS, product feedback', icon: '📊', count: 4 },
  { id: 'support', name: 'Support', description: 'Tickets, appointments', icon: '🎫', count: 2 },
  { id: 'ecommerce', name: 'E-commerce', description: 'Orders, returns', icon: '🛒', count: 2 },
  { id: 'healthcare', name: 'Healthcare', description: 'Patient intake, screenings', icon: '🏥', count: 2 },
  { id: 'hr', name: 'HR', description: 'Job applications', icon: '💼', count: 1 },
  { id: 'finance', name: 'Finance', description: 'Expense reports', icon: '🧾', count: 1 },
  { id: 'education', name: 'Education', description: 'Enrollments, scholarships', icon: '📚', count: 2 },
  { id: 'real-estate', name: 'Real Estate', description: 'Property inquiries, rentals', icon: '🏠', count: 2 },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): FormTemplate[] {
  if (category === 'all') {
    return Object.values(FORM_TEMPLATES);
  }
  return Object.values(FORM_TEMPLATES).filter(t => t.category === category);
}

/**
 * Get template by ID
 */
export function getTemplateById(templateId: string): FormTemplate | undefined {
  return FORM_TEMPLATES[templateId];
}

/**
 * Search templates by query
 */
export function searchTemplates(query: string): FormTemplate[] {
  const lowerQuery = query.toLowerCase();
  return Object.values(FORM_TEMPLATES).filter(t =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Apply customizations to a template
 */
export function applyTemplateCustomizations(
  template: FormTemplate,
  customizations: TemplateCustomizations
): FormTemplate {
  const customized = { ...template };

  if (customizations.name) {
    customized.name = customizations.name;
  }

  if (customizations.description) {
    customized.description = customizations.description;
  }

  if (customizations.includeOptionalFields === false) {
    customized.fields = template.fields.filter(f => f.required !== false);
  }

  if (customizations.submitButtonText) {
    customized.settings = {
      ...customized.settings,
      submitButtonText: customizations.submitButtonText,
    };
  }

  if (customizations.successMessage) {
    customized.settings = {
      ...customized.settings,
      successMessage: customizations.successMessage,
    };
  }

  return customized;
}

/**
 * Generate form configuration from template
 */
export function generateFormConfigFromTemplate(
  template: FormTemplate,
  customizations?: TemplateCustomizations
): object {
  const finalTemplate = customizations
    ? applyTemplateCustomizations(template, customizations)
    : template;

  return {
    name: finalTemplate.name,
    description: finalTemplate.description,
    slug: finalTemplate.id,
    fieldConfigs: finalTemplate.fields.map(field => ({
      path: field.path,
      label: field.label,
      type: field.type,
      required: field.required ?? false,
      placeholder: field.placeholder,
      helpText: field.helpText,
      fieldWidth: field.fieldWidth ?? 'full',
      options: field.options,
      validation: field.validation,
      conditionalLogic: field.conditionalLogic,
    })),
    multiPage: finalTemplate.multiPage,
    settings: {
      submitButtonText: finalTemplate.settings?.submitButtonText ?? 'Submit',
      successMessage: finalTemplate.settings?.successMessage ?? 'Thank you for your submission!',
    },
    metadata: {
      templateId: template.id,
      category: template.category,
      tags: template.tags,
    },
  };
}

/**
 * Generate code for creating a form from template
 */
export function generateCreateFormFromTemplateCode(
  templateId: string,
  customizations?: TemplateCustomizations,
  projectId?: string,
  organizationId?: string
): string {
  const template = getTemplateById(templateId);
  if (!template) {
    return `// Error: Template "${templateId}" not found`;
  }

  const config = generateFormConfigFromTemplate(template, customizations);

  return `// Create form from template: ${template.name}
// Using: NetPad Platform API

const formConfig = ${JSON.stringify(config, null, 2)};

const response = await fetch('/api/forms', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify({
    ...formConfig,
    ${projectId ? `projectId: '${projectId}',` : ''}
    ${organizationId ? `organizationId: '${organizationId}',` : ''}
  }),
});

const { form } = await response.json();
console.log('Created form from template:', form.formId);
`;
}
