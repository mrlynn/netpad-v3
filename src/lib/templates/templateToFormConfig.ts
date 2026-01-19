/**
 * Template to FormConfiguration Adapter
 *
 * Converts a FormTemplate to a FormConfiguration that can be used
 * by the @netpad/forms FormRenderer component.
 */

import { FormTemplate } from '@/types/formTemplate';
import { FieldConfig as AppFieldConfig } from '@/types/form';
import {
  FormConfiguration,
  FieldConfig as FormsFieldConfig,
} from '@netpad/forms';

/**
 * Convert app FieldConfig to @netpad/forms FieldConfig
 * The main difference is that options are in validation.options in app but
 * at the top level in the forms package.
 */
function convertFieldConfig(appField: AppFieldConfig): FormsFieldConfig {
  // Extract options from validation if present
  const options = appField.validation?.options?.map((opt) => {
    if (typeof opt === 'string') {
      return { label: opt, value: opt };
    }
    return { label: opt.label, value: opt.value };
  });

  // Map field types - some have different names
  let type = appField.type;
  if (type === 'sectionHeader') {
    type = 'section-header';
  }

  const formsField: FormsFieldConfig = {
    path: appField.path,
    label: appField.label,
    type,
    included: appField.included,
    required: appField.required,
    placeholder: appField.placeholder,
    defaultValue: appField.defaultValue,
    fieldWidth: appField.fieldWidth,
    options,
    validation: appField.validation
      ? {
          min: appField.validation.min,
          max: appField.validation.max,
          minLength: appField.validation.minLength,
          maxLength: appField.validation.maxLength,
          pattern: appField.validation.pattern,
        }
      : undefined,
    // Handle layout fields (section headers, etc.)
    layout:
      type === 'section-header'
        ? {
            type: 'section-header',
            title: appField.label,
          }
        : undefined,
  };

  return formsField;
}

/**
 * Convert app FormTheme to @netpad/forms FormTheme
 * The main difference is that the app supports 'auto' mode but the package doesn't.
 */
function convertTheme(
  appTheme: FormTemplate['theme']
): FormConfiguration['theme'] {
  if (!appTheme) return undefined;

  return {
    ...appTheme,
    // Convert 'auto' to undefined (let the package handle defaults)
    mode: appTheme.mode === 'auto' ? undefined : appTheme.mode,
  };
}

/**
 * Convert a FormTemplate to a FormConfiguration for use with FormRenderer
 */
export function templateToFormConfig(template: FormTemplate): FormConfiguration {
  const config: FormConfiguration = {
    formId: template.id,
    name: template.name,
    description: template.fullDescription,
    fieldConfigs: template.fieldConfigs.map(convertFieldConfig),
    multiPage: template.multiPage,
    theme: convertTheme(template.theme),
    submitButtonText: 'Submit',
  };

  return config;
}

/**
 * Create a preview-friendly config (no submit button, demo mode)
 */
export function templateToPreviewConfig(template: FormTemplate): FormConfiguration {
  const config = templateToFormConfig(template);

  // For preview, we might want to adjust some settings
  return {
    ...config,
    submitButtonText: 'Submit (Preview)',
  };
}
