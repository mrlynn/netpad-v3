/**
 * Template Helper Functions
 *
 * Re-exports utilities from @netpad/templates package for backward compatibility.
 * All template helpers are now defined in the @netpad/templates package.
 *
 * @deprecated Import directly from '@netpad/templates/helpers' instead
 */

// Re-export all helpers from the package
export {
  // Theme presets
  THEME_PRESETS,
  getThemeForCategory,
  // Template factory
  createTemplate,
  // Field builders
  textField,
  emailField,
  phoneField,
  textareaField,
  urlField,
  selectField,
  multiSelectField,
  radioField,
  dateField,
  dateTimeField,
  timeField,
  numberField,
  currencyField,
  yesNoField,
  ratingField,
  scaleField,
  fileField,
  imageField,
  signatureField,
  addressField,
  sectionHeader,
  descriptionBlock,
  divider,
} from '@netpad/templates/helpers';
