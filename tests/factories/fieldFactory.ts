/**
 * Field Factory
 *
 * Generates test fixtures for all 25+ field types with realistic defaults
 * and helper methods for common validation scenarios.
 */

// Simple ID generator for tests (no external dependencies)
const generateId = () => Math.random().toString(36).substring(2, 15);

/**
 * Base field configuration used by all field types
 */
interface BaseFieldConfig {
  path: string;
  label: string;
  type: string;
  included: boolean;
  required?: boolean;
  disabled?: boolean;
  validation?: Record<string, unknown>;
}

/**
 * Factory for creating field configurations for testing
 */
export const FieldFactory = {
  /**
   * Generic field creator with full customization
   */
  create: (type: string, overrides: Partial<BaseFieldConfig> = {}): BaseFieldConfig => ({
    path: overrides.path || `field_${generateId()}`,
    label: overrides.label || `Test ${type} Field`,
    type,
    included: true,
    required: false,
    ...overrides,
  }),

  // ============================================
  // Text Fields
  // ============================================

  shortText: (overrides: Partial<BaseFieldConfig> = {}) => ({
    path: 'short_text_field',
    label: 'Short Text',
    type: 'short_text',
    included: true,
    required: false,
    validation: {
      maxLength: 255,
    },
    ...overrides,
  }),

  longText: (overrides: Partial<BaseFieldConfig> = {}) => ({
    path: 'long_text_field',
    label: 'Long Text',
    type: 'long_text',
    included: true,
    required: false,
    validation: {
      minLength: 0,
      maxLength: 5000,
    },
    ...overrides,
  }),

  // ============================================
  // Contact Fields
  // ============================================

  email: (overrides: Partial<BaseFieldConfig> = {}) => ({
    path: 'email',
    label: 'Email Address',
    type: 'email',
    included: true,
    required: false,
    validation: {
      validateFormat: true,
    },
    ...overrides,
  }),

  phone: (overrides: Partial<BaseFieldConfig> = {}) => ({
    path: 'phone',
    label: 'Phone Number',
    type: 'phone',
    included: true,
    required: false,
    validation: {},
    ...overrides,
  }),

  url: (overrides: Partial<BaseFieldConfig> = {}) => ({
    path: 'website',
    label: 'Website URL',
    type: 'url',
    included: true,
    required: false,
    validation: {},
    ...overrides,
  }),

  // ============================================
  // Number Fields
  // ============================================

  number: (overrides: Partial<BaseFieldConfig> = {}) => ({
    path: 'number_field',
    label: 'Number',
    type: 'number',
    included: true,
    required: false,
    validation: {},
    ...overrides,
  }),

  currency: (overrides: Partial<BaseFieldConfig> = {}) => ({
    path: 'amount',
    label: 'Amount',
    type: 'number',
    included: true,
    required: false,
    validation: {
      min: 0,
      decimalPlaces: 2,
    },
    format: 'currency',
    currencyCode: 'USD',
    ...overrides,
  }),

  // ============================================
  // Date/Time Fields
  // ============================================

  date: (overrides: Partial<BaseFieldConfig> = {}) => ({
    path: 'date_field',
    label: 'Date',
    type: 'date',
    included: true,
    required: false,
    validation: {},
    ...overrides,
  }),

  time: (overrides: Partial<BaseFieldConfig> = {}) => ({
    path: 'time_field',
    label: 'Time',
    type: 'time',
    included: true,
    required: false,
    validation: {},
    ...overrides,
  }),

  datetime: (overrides: Partial<BaseFieldConfig> = {}) => ({
    path: 'datetime_field',
    label: 'Date & Time',
    type: 'datetime',
    included: true,
    required: false,
    validation: {},
    ...overrides,
  }),

  // ============================================
  // Choice Fields
  // ============================================

  dropdown: (overrides: Partial<BaseFieldConfig & { options?: Array<{ label: string; value: string }> }> = {}) => ({
    path: 'dropdown_field',
    label: 'Dropdown',
    type: 'dropdown',
    included: true,
    required: false,
    options: overrides.options || [
      { label: 'Option 1', value: 'option1' },
      { label: 'Option 2', value: 'option2' },
      { label: 'Option 3', value: 'option3' },
    ],
    validation: {},
    ...overrides,
  }),

  multipleChoice: (overrides: Partial<BaseFieldConfig & { options?: Array<{ label: string; value: string }> }> = {}) => ({
    path: 'multiple_choice_field',
    label: 'Multiple Choice',
    type: 'multiple_choice',
    included: true,
    required: false,
    options: overrides.options || [
      { label: 'Choice A', value: 'a' },
      { label: 'Choice B', value: 'b' },
      { label: 'Choice C', value: 'c' },
    ],
    validation: {},
    ...overrides,
  }),

  checkboxes: (overrides: Partial<BaseFieldConfig & { options?: Array<{ label: string; value: string }> }> = {}) => ({
    path: 'checkboxes_field',
    label: 'Checkboxes',
    type: 'checkboxes',
    included: true,
    required: false,
    options: overrides.options || [
      { label: 'Option A', value: 'a' },
      { label: 'Option B', value: 'b' },
      { label: 'Option C', value: 'c' },
    ],
    validation: {},
    ...overrides,
  }),

  yesNo: (overrides: Partial<BaseFieldConfig> = {}) => ({
    path: 'yes_no_field',
    label: 'Yes/No',
    type: 'yes_no',
    included: true,
    required: false,
    validation: {},
    ...overrides,
  }),

  // ============================================
  // Rating/Scale Fields
  // ============================================

  rating: (overrides: Partial<BaseFieldConfig> = {}) => ({
    path: 'rating_field',
    label: 'Rating',
    type: 'rating',
    included: true,
    required: false,
    maxRating: 5,
    validation: {},
    ...overrides,
  }),

  scale: (overrides: Partial<BaseFieldConfig> = {}) => ({
    path: 'scale_field',
    label: 'Scale',
    type: 'scale',
    included: true,
    required: false,
    minValue: 1,
    maxValue: 10,
    validation: {},
    ...overrides,
  }),

  slider: (overrides: Partial<BaseFieldConfig> = {}) => ({
    path: 'slider_field',
    label: 'Slider',
    type: 'slider',
    included: true,
    required: false,
    min: 0,
    max: 100,
    step: 1,
    validation: {},
    ...overrides,
  }),

  nps: (overrides: Partial<BaseFieldConfig> = {}) => ({
    path: 'nps_field',
    label: 'NPS Score',
    type: 'nps',
    included: true,
    required: false,
    validation: {
      min: 0,
      max: 10,
    },
    ...overrides,
  }),

  opinionScale: (overrides: Partial<BaseFieldConfig> = {}) => ({
    path: 'opinion_scale_field',
    label: 'Opinion Scale',
    type: 'opinion_scale',
    included: true,
    required: false,
    startLabel: 'Strongly Disagree',
    endLabel: 'Strongly Agree',
    steps: 5,
    validation: {},
    ...overrides,
  }),

  // ============================================
  // File Upload Fields
  // ============================================

  file: (overrides: Partial<BaseFieldConfig> = {}) => ({
    path: 'file_field',
    label: 'File Upload',
    type: 'file',
    included: true,
    required: false,
    acceptedTypes: ['*/*'],
    maxSize: 10 * 1024 * 1024, // 10MB
    validation: {},
    ...overrides,
  }),

  image: (overrides: Partial<BaseFieldConfig> = {}) => ({
    path: 'image_field',
    label: 'Image Upload',
    type: 'image',
    included: true,
    required: false,
    acceptedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSize: 5 * 1024 * 1024, // 5MB
    validation: {},
    ...overrides,
  }),

  signature: (overrides: Partial<BaseFieldConfig> = {}) => ({
    path: 'signature_field',
    label: 'Signature',
    type: 'signature',
    included: true,
    required: false,
    validation: {},
    ...overrides,
  }),

  // ============================================
  // Advanced Fields
  // ============================================

  matrix: (overrides: Partial<BaseFieldConfig> = {}) => ({
    path: 'matrix_field',
    label: 'Matrix',
    type: 'matrix',
    included: true,
    required: false,
    rows: [
      { label: 'Row 1', value: 'row1' },
      { label: 'Row 2', value: 'row2' },
    ],
    columns: [
      { label: 'Col 1', value: 'col1' },
      { label: 'Col 2', value: 'col2' },
    ],
    validation: {},
    ...overrides,
  }),

  ranking: (overrides: Partial<BaseFieldConfig> = {}) => ({
    path: 'ranking_field',
    label: 'Ranking',
    type: 'ranking',
    included: true,
    required: false,
    items: [
      { label: 'Item 1', value: 'item1' },
      { label: 'Item 2', value: 'item2' },
      { label: 'Item 3', value: 'item3' },
    ],
    validation: {},
    ...overrides,
  }),

  address: (overrides: Partial<BaseFieldConfig> = {}) => ({
    path: 'address_field',
    label: 'Address',
    type: 'address',
    included: true,
    required: false,
    showLine2: true,
    showCountry: true,
    validation: {},
    ...overrides,
  }),

  tags: (overrides: Partial<BaseFieldConfig> = {}) => ({
    path: 'tags_field',
    label: 'Tags',
    type: 'tags',
    included: true,
    required: false,
    maxTags: 10,
    validation: {},
    ...overrides,
  }),

  colorPicker: (overrides: Partial<BaseFieldConfig> = {}) => ({
    path: 'color_field',
    label: 'Color',
    type: 'color',
    included: true,
    required: false,
    validation: {},
    ...overrides,
  }),

  payment: (overrides: Partial<BaseFieldConfig> = {}) => ({
    path: 'payment_field',
    label: 'Payment',
    type: 'payment',
    included: true,
    required: false,
    currency: 'USD',
    validation: {},
    ...overrides,
  }),

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Create a required version of any field
   */
  required: (field: BaseFieldConfig): BaseFieldConfig => ({
    ...field,
    required: true,
  }),

  /**
   * Create a disabled version of any field
   */
  disabled: (field: BaseFieldConfig): BaseFieldConfig => ({
    ...field,
    disabled: true,
  }),

  /**
   * Create a field with custom validation
   */
  withValidation: (
    field: BaseFieldConfig,
    validation: Record<string, unknown>
  ): BaseFieldConfig => ({
    ...field,
    validation: {
      ...field.validation,
      ...validation,
    },
  }),

  /**
   * Get all basic field types for comprehensive testing
   */
  allFieldTypes: () => [
    FieldFactory.shortText(),
    FieldFactory.longText(),
    FieldFactory.email(),
    FieldFactory.phone(),
    FieldFactory.url(),
    FieldFactory.number(),
    FieldFactory.date(),
    FieldFactory.time(),
    FieldFactory.datetime(),
    FieldFactory.dropdown(),
    FieldFactory.multipleChoice(),
    FieldFactory.checkboxes(),
    FieldFactory.yesNo(),
    FieldFactory.rating(),
    FieldFactory.scale(),
    FieldFactory.slider(),
    FieldFactory.nps(),
    FieldFactory.file(),
    FieldFactory.image(),
    FieldFactory.signature(),
    FieldFactory.matrix(),
    FieldFactory.ranking(),
    FieldFactory.address(),
    FieldFactory.tags(),
    FieldFactory.colorPicker(),
  ],
};

/**
 * Test data generators for each field type
 */
export const TestData = {
  // Valid values
  valid: {
    shortText: 'Hello World',
    longText: 'This is a longer piece of text that spans multiple words and provides meaningful content for testing.',
    email: 'test@example.com',
    phone: '+1-555-123-4567',
    url: 'https://example.com/path?query=1',
    number: 42,
    date: '2024-01-15',
    time: '14:30',
    datetime: '2024-01-15T14:30:00',
    dropdown: 'option1',
    multipleChoice: 'a',
    checkboxes: ['a', 'b'],
    yesNo: true,
    rating: 4,
    scale: 7,
    slider: 50,
    nps: 9,
    opinionScale: 4,
    file: { name: 'document.pdf', size: 1024, type: 'application/pdf' },
    image: { name: 'photo.jpg', size: 2048, type: 'image/jpeg' },
    signature: 'data:image/png;base64,iVBORw0KGgo=',
    matrix: { row1: 'col1', row2: 'col2' },
    ranking: ['item2', 'item1', 'item3'],
    address: {
      line1: '123 Main St',
      line2: 'Apt 4B',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'US',
    },
    tags: ['tag1', 'tag2', 'tag3'],
    colorPicker: '#FF5733',
    payment: { amount: 99.99, currency: 'USD' },
  },

  // Invalid values for validation testing
  invalid: {
    email: [
      'notanemail',
      'missing@tld',
      '@nodomain.com',
      'spaces in@email.com',
      '',
    ],
    phone: [
      '123', // Too short
      'not-a-phone',
      'abc',
    ],
    url: [
      'not a url',
      'ftp://invalid-protocol.com',
      'missing-protocol.com',
    ],
    number: [
      'not a number',
      NaN,
      Infinity,
    ],
  },

  // Edge cases
  edge: {
    emptyString: '',
    null: null,
    undefined: undefined,
    emptyArray: [],
    emptyObject: {},
    whitespace: '   ',
    zero: 0,
    negativeNumber: -1,
    veryLongString: 'a'.repeat(10000),
    specialChars: '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~',
    unicode: '你好世界 مرحبا 🎉',
    xssAttempt: '<script>alert("xss")</script>',
    sqlInjection: "'; DROP TABLE users; --",
  },
};

export default FieldFactory;
