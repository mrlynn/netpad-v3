/**
 * @netpad/templates - Helper Exports
 *
 * Field builders, theme presets, and template factory functions.
 */

// Theme presets
export { THEME_PRESETS, getThemeForCategory } from './themePresets';

// Template factory
export { createTemplate } from './createTemplate';
export type { CreateTemplateInput } from './createTemplate';

// Field builders
export {
  // Text fields
  textField,
  emailField,
  phoneField,
  textareaField,
  urlField,
  // Selection fields
  selectField,
  multiSelectField,
  radioField,
  // Date & time fields
  dateField,
  dateTimeField,
  timeField,
  // Number fields
  numberField,
  currencyField,
  // Boolean & rating fields
  yesNoField,
  ratingField,
  scaleField,
  // File & media fields
  fileField,
  imageField,
  signatureField,
  // Address fields
  addressField,
  // Layout fields
  sectionHeader,
  descriptionBlock,
  divider,
} from './fieldBuilders';
