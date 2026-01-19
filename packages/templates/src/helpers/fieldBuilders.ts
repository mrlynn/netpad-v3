/**
 * Field Builders
 *
 * Helper functions for creating consistent field configurations.
 */

import type { FieldConfig, ConditionalLogic } from '../types';

// ============================================
// Text Fields
// ============================================

/**
 * Create a text field configuration
 */
export function textField(
  path: string,
  label: string,
  requiredOrOptions: boolean | Partial<FieldConfig> = false
): FieldConfig {
  const options: Partial<FieldConfig> = typeof requiredOrOptions === 'boolean'
    ? { required: requiredOrOptions }
    : requiredOrOptions;
  return {
    path,
    label,
    type: 'string',
    included: true,
    required: options.required ?? false,
    placeholder: options.placeholder,
    fieldWidth: options.fieldWidth ?? 'full',
    validation: options.validation,
    conditionalLogic: options.conditionalLogic,
    ...options,
  };
}

/**
 * Create an email field configuration
 */
export function emailField(
  path: string = 'email',
  label: string = 'Email Address',
  requiredOrOptions: boolean | Partial<FieldConfig> = true
): FieldConfig {
  const options: Partial<FieldConfig> = typeof requiredOrOptions === 'boolean'
    ? { required: requiredOrOptions }
    : requiredOrOptions;
  return {
    path,
    label,
    type: 'email',
    included: true,
    required: options.required ?? true,
    placeholder: options.placeholder ?? 'your@email.com',
    fieldWidth: options.fieldWidth ?? 'full',
    validation: {
      confirmEmail: false,
      ...options.validation,
    },
    ...options,
  };
}

/**
 * Create a phone field configuration
 */
export function phoneField(
  path: string = 'phone',
  label: string = 'Phone Number',
  requiredOrOptions: boolean | Partial<FieldConfig> = false
): FieldConfig {
  const options: Partial<FieldConfig> = typeof requiredOrOptions === 'boolean'
    ? { required: requiredOrOptions }
    : requiredOrOptions;
  return {
    path,
    label,
    type: 'phone',
    included: true,
    required: options.required ?? false,
    placeholder: options.placeholder ?? '(555) 123-4567',
    fieldWidth: options.fieldWidth ?? 'half',
    validation: {
      defaultCountry: 'US',
      phoneFormat: 'national',
      showCountrySelector: true,
      ...options.validation,
    },
    ...options,
  };
}

/**
 * Create a textarea/long text field configuration
 */
export function textareaField(
  path: string,
  label: string,
  requiredOrOptions: boolean | Partial<FieldConfig> = false
): FieldConfig {
  const options: Partial<FieldConfig> = typeof requiredOrOptions === 'boolean'
    ? { required: requiredOrOptions }
    : requiredOrOptions;
  return {
    path,
    label,
    type: 'textarea',
    included: true,
    required: options.required ?? false,
    placeholder: options.placeholder,
    fieldWidth: options.fieldWidth ?? 'full',
    validation: {
      minLength: options.validation?.minLength ?? 0,
      maxLength: options.validation?.maxLength ?? 2000,
      ...options.validation,
    },
    ...options,
  };
}

/**
 * Create a URL field configuration
 */
export function urlField(
  path: string,
  label: string,
  requiredOrOptions: boolean | Partial<FieldConfig> = false
): FieldConfig {
  const options: Partial<FieldConfig> = typeof requiredOrOptions === 'boolean'
    ? { required: requiredOrOptions }
    : requiredOrOptions;
  return {
    path,
    label,
    type: 'url',
    included: true,
    required: options.required ?? false,
    placeholder: options.placeholder ?? 'https://...',
    fieldWidth: options.fieldWidth ?? 'full',
    validation: {
      requireHttps: false,
      ...options.validation,
    },
    ...options,
  };
}

// ============================================
// Selection Fields
// ============================================

/**
 * Create a dropdown/select field configuration
 */
export function selectField(
  path: string,
  label: string,
  optionsList: string[] | { value: string; label: string }[],
  requiredOrOptions: boolean | Partial<FieldConfig> = false
): FieldConfig {
  const options: Partial<FieldConfig> = typeof requiredOrOptions === 'boolean'
    ? { required: requiredOrOptions }
    : requiredOrOptions;
  return {
    path,
    label,
    type: 'select',
    included: true,
    required: options.required ?? false,
    placeholder: options.placeholder ?? `Select ${label.toLowerCase()}...`,
    fieldWidth: options.fieldWidth ?? 'full',
    validation: {
      options: optionsList,
      searchable: (optionsList.length > 8),
      clearable: true,
      ...options.validation,
    },
    ...options,
  };
}

/**
 * Create a multi-select/checkbox field configuration
 */
export function multiSelectField(
  path: string,
  label: string,
  optionsList: string[] | { value: string; label: string }[],
  requiredOrOptions: boolean | Partial<FieldConfig> = false
): FieldConfig {
  const options: Partial<FieldConfig> = typeof requiredOrOptions === 'boolean'
    ? { required: requiredOrOptions }
    : requiredOrOptions;
  return {
    path,
    label,
    type: 'multiselect',
    included: true,
    required: options.required ?? false,
    fieldWidth: options.fieldWidth ?? 'full',
    validation: {
      options: optionsList,
      choiceLayout: 'vertical',
      ...options.validation,
    },
    ...options,
  };
}

/**
 * Create a radio button field configuration
 */
export function radioField(
  path: string,
  label: string,
  optionsList: string[] | { value: string; label: string }[],
  requiredOrOptions: boolean | Partial<FieldConfig> = false
): FieldConfig {
  const options: Partial<FieldConfig> = typeof requiredOrOptions === 'boolean'
    ? { required: requiredOrOptions }
    : requiredOrOptions;
  return {
    path,
    label,
    type: 'radio',
    included: true,
    required: options.required ?? false,
    fieldWidth: options.fieldWidth ?? 'full',
    validation: {
      options: optionsList,
      choiceLayout: 'vertical',
      ...options.validation,
    },
    ...options,
  };
}

// ============================================
// Date & Time Fields
// ============================================

/**
 * Create a date field configuration
 */
export function dateField(
  path: string,
  label: string,
  requiredOrOptions: boolean | Partial<FieldConfig> = false
): FieldConfig {
  const options: Partial<FieldConfig> = typeof requiredOrOptions === 'boolean'
    ? { required: requiredOrOptions }
    : requiredOrOptions;
  return {
    path,
    label,
    type: 'date',
    included: true,
    required: options.required ?? false,
    fieldWidth: options.fieldWidth ?? 'half',
    validation: options.validation,
    ...options,
  };
}

/**
 * Create a datetime field configuration
 */
export function dateTimeField(
  path: string,
  label: string,
  requiredOrOptions: boolean | Partial<FieldConfig> = false
): FieldConfig {
  const options: Partial<FieldConfig> = typeof requiredOrOptions === 'boolean'
    ? { required: requiredOrOptions }
    : requiredOrOptions;
  return {
    path,
    label,
    type: 'datetime',
    included: true,
    required: options.required ?? false,
    fieldWidth: options.fieldWidth ?? 'half',
    validation: {
      dateTimeTimezone: 'local',
      ...options.validation,
    },
    ...options,
  };
}

/**
 * Create a time field configuration
 */
export function timeField(
  path: string,
  label: string,
  requiredOrOptions: boolean | Partial<FieldConfig> = false
): FieldConfig {
  const options: Partial<FieldConfig> = typeof requiredOrOptions === 'boolean'
    ? { required: requiredOrOptions }
    : requiredOrOptions;
  return {
    path,
    label,
    type: 'time',
    included: true,
    required: options.required ?? false,
    fieldWidth: options.fieldWidth ?? 'half',
    validation: {
      timeFormat: '12h',
      minuteStep: 15,
      ...options.validation,
    },
    ...options,
  };
}

// ============================================
// Number Fields
// ============================================

/**
 * Create a number field configuration
 */
export function numberField(
  path: string,
  label: string,
  requiredOrOptions: boolean | Partial<FieldConfig> = false,
  min?: number,
  max?: number
): FieldConfig {
  const options: Partial<FieldConfig> = typeof requiredOrOptions === 'boolean'
    ? { required: requiredOrOptions }
    : requiredOrOptions;
  return {
    path,
    label,
    type: 'number',
    included: true,
    required: options.required ?? false,
    placeholder: options.placeholder,
    fieldWidth: options.fieldWidth ?? 'half',
    validation: {
      decimalsAllowed: options.validation?.decimalsAllowed ?? false,
      min: min ?? options.validation?.min,
      max: max ?? options.validation?.max,
      ...options.validation,
    },
    ...options,
  };
}

/**
 * Create a currency/money field configuration
 */
export function currencyField(
  path: string,
  label: string,
  requiredOrOptions: boolean | Partial<FieldConfig> = false
): FieldConfig {
  const options: Partial<FieldConfig> = typeof requiredOrOptions === 'boolean'
    ? { required: requiredOrOptions }
    : requiredOrOptions;
  return {
    path,
    label,
    type: 'number',
    included: true,
    required: options.required ?? false,
    placeholder: options.placeholder ?? '0.00',
    fieldWidth: options.fieldWidth ?? 'half',
    validation: {
      min: 0,
      decimalsAllowed: true,
      ...options.validation,
    },
    ...options,
  };
}

// ============================================
// Boolean & Rating Fields
// ============================================

/**
 * Create a yes/no toggle field configuration
 */
export function yesNoField(
  path: string,
  label: string,
  requiredOrOptions: boolean | Partial<FieldConfig> = false
): FieldConfig {
  const options: Partial<FieldConfig> = typeof requiredOrOptions === 'boolean'
    ? { required: requiredOrOptions }
    : requiredOrOptions;
  return {
    path,
    label,
    type: 'boolean',
    included: true,
    required: options.required ?? false,
    fieldWidth: options.fieldWidth ?? 'full',
    validation: {
      yesLabel: options.validation?.yesLabel ?? 'Yes',
      noLabel: options.validation?.noLabel ?? 'No',
      displayStyle: options.validation?.displayStyle ?? 'buttons',
      ...options.validation,
    },
    ...options,
  };
}

/**
 * Create a rating field configuration
 */
export function ratingField(
  path: string,
  label: string,
  requiredOrOptions: boolean | Partial<FieldConfig> = false
): FieldConfig {
  const options: Partial<FieldConfig> = typeof requiredOrOptions === 'boolean'
    ? { required: requiredOrOptions }
    : requiredOrOptions;
  return {
    path,
    label,
    type: 'rating',
    included: true,
    required: options.required ?? false,
    fieldWidth: options.fieldWidth ?? 'full',
    validation: {
      min: 1,
      max: 5,
      ratingStyle: 'stars',
      ...options.validation,
    },
    ...options,
  };
}

/**
 * Create a scale/opinion field configuration
 */
export function scaleField(
  path: string,
  label: string,
  requiredOrOptions: boolean | Partial<FieldConfig> = false
): FieldConfig {
  const options: Partial<FieldConfig> = typeof requiredOrOptions === 'boolean'
    ? { required: requiredOrOptions }
    : requiredOrOptions;
  return {
    path,
    label,
    type: 'scale',
    included: true,
    required: options.required ?? false,
    fieldWidth: options.fieldWidth ?? 'full',
    validation: {
      min: 1,
      max: 10,
      lowLabel: options.validation?.lowLabel ?? 'Not at all likely',
      highLabel: options.validation?.highLabel ?? 'Extremely likely',
      scaleDisplayStyle: 'buttons',
      showLabels: true,
      ...options.validation,
    },
    ...options,
  };
}

// ============================================
// File & Media Fields
// ============================================

/**
 * Create a file upload field configuration
 */
export function fileField(
  path: string,
  label: string,
  requiredOrOptions: boolean | Partial<FieldConfig> = false,
  acceptedTypes?: string
): FieldConfig {
  const options: Partial<FieldConfig> = typeof requiredOrOptions === 'boolean'
    ? { required: requiredOrOptions }
    : requiredOrOptions;
  return {
    path,
    label,
    type: 'file',
    included: true,
    required: options.required ?? false,
    fieldWidth: options.fieldWidth ?? 'full',
    validation: {
      maxSize: 10,
      multiple: false,
      allowedTypes: acceptedTypes
        ? acceptedTypes.split(',').map((t) => t.trim())
        : ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      ...options.validation,
    },
    ...options,
  };
}

/**
 * Create an image upload field configuration
 */
export function imageField(
  path: string,
  label: string,
  requiredOrOptions: boolean | Partial<FieldConfig> = false
): FieldConfig {
  const options: Partial<FieldConfig> = typeof requiredOrOptions === 'boolean'
    ? { required: requiredOrOptions }
    : requiredOrOptions;
  return {
    path,
    label,
    type: 'image',
    included: true,
    required: options.required ?? false,
    fieldWidth: options.fieldWidth ?? 'full',
    validation: {
      maxSize: 5,
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      enableCrop: true,
      enableCompression: true,
      compressionQuality: 0.8,
      ...options.validation,
    },
    ...options,
  };
}

/**
 * Create a signature field configuration
 */
export function signatureField(
  path: string = 'signature',
  label: string = 'Signature',
  requiredOrOptions: boolean | Partial<FieldConfig> = true
): FieldConfig {
  const options: Partial<FieldConfig> = typeof requiredOrOptions === 'boolean'
    ? { required: requiredOrOptions }
    : requiredOrOptions;
  return {
    path,
    label,
    type: 'signature',
    included: true,
    required: options.required ?? true,
    fieldWidth: options.fieldWidth ?? 'full',
    validation: {
      strokeColor: '#000000',
      strokeWidth: 2,
      canvasWidth: 400,
      canvasHeight: 150,
      backgroundColor: '#ffffff',
      allowTypedSignature: true,
      outputFormat: 'png',
      ...options.validation,
    },
    ...options,
  };
}

// ============================================
// Address Fields
// ============================================

/**
 * Create an address field configuration
 */
export function addressField(
  path: string = 'address',
  label: string = 'Address',
  requiredOrOptions: boolean | Partial<FieldConfig> = false
): FieldConfig {
  const options: Partial<FieldConfig> = typeof requiredOrOptions === 'boolean'
    ? { required: requiredOrOptions }
    : requiredOrOptions;
  return {
    path,
    label,
    type: 'address',
    included: true,
    required: options.required ?? false,
    fieldWidth: options.fieldWidth ?? 'full',
    validation: {
      addressComponents: ['street1', 'street2', 'city', 'state', 'postalCode', 'country'],
      addressDefaultCountry: 'US',
      enableAutocomplete: true,
      addressDisplayMode: 'multi',
      ...options.validation,
    },
    ...options,
  };
}

// ============================================
// Layout Fields
// ============================================

/**
 * Create a section header (layout element)
 */
export function sectionHeader(
  idOrTitle: string,
  titleOrOptions?: string | Partial<FieldConfig>,
  subtitleOrOptions?: string | Partial<FieldConfig>
): FieldConfig {
  let actualId: string;
  let actualTitle: string;
  let subtitle: string | undefined;
  let options: Partial<FieldConfig> = {};

  if (typeof titleOrOptions === 'string') {
    actualId = idOrTitle;
    actualTitle = titleOrOptions;
    if (typeof subtitleOrOptions === 'string') {
      subtitle = subtitleOrOptions;
    } else if (subtitleOrOptions && typeof subtitleOrOptions === 'object') {
      options = subtitleOrOptions;
    }
  } else if (typeof titleOrOptions === 'object' && titleOrOptions) {
    actualId = idOrTitle.toLowerCase().replace(/\s+/g, '_');
    actualTitle = idOrTitle;
    options = titleOrOptions;
  } else {
    actualId = idOrTitle.toLowerCase().replace(/\s+/g, '_');
    actualTitle = idOrTitle;
  }

  return {
    path: `_section_${actualId}`,
    label: actualTitle,
    type: 'layout',
    included: true,
    required: false,
    layout: {
      type: 'section-header',
      title: actualTitle,
      subtitle,
    },
    ...options,
  };
}

/**
 * Create a description/info block (layout element)
 */
export function descriptionBlock(
  id: string,
  content: string,
  contentType: 'text' | 'markdown' = 'text'
): FieldConfig {
  return {
    path: `_desc_${id}`,
    label: '',
    type: 'layout',
    included: true,
    required: false,
    layout: {
      type: 'description',
      content,
      contentType,
    },
  };
}

/**
 * Create a divider (layout element)
 */
export function divider(id: string): FieldConfig {
  return {
    path: `_divider_${id}`,
    label: '',
    type: 'layout',
    included: true,
    required: false,
    layout: {
      type: 'divider',
    },
  };
}
