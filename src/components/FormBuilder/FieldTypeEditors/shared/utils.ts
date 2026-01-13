/**
 * Shared utilities for field type editors
 */

import { FieldConfig } from '@/types/form';

/**
 * Helper to detect question type from field config
 * Maps various naming conventions to canonical type IDs
 */
export function getQuestionTypeId(config: FieldConfig): string | null {
  const type = config.type?.toLowerCase();

  // Direct type matches first - map various naming conventions to canonical type IDs
  if (type === 'color_picker' || type === 'color-picker' || type === 'colorpicker' || type === 'color') return 'color_picker';
  if (type === 'email') return 'email';
  if (type === 'url') return 'url';
  if (type === 'phone' || type === 'tel' || type === 'telephone') return 'phone';
  if (type === 'file_upload' || type === 'file-upload' || type === 'fileupload' || type === 'file') return 'file_upload';
  if (type === 'image_upload' || type === 'image-upload' || type === 'imageupload' || type === 'image') return 'image_upload';
  if (type === 'time') return 'time';
  if (type === 'datetime' || type === 'date-time') return 'datetime';
  if (type === 'signature') return 'signature';
  if (type === 'tags') return 'tags';
  if (type === 'slider') return 'slider';
  if (type === 'opinion_scale' || type === 'opinion-scale' || type === 'opinionscale') return 'opinion_scale';
  if (type === 'multiple_choice' || type === 'multiple-choice' || type === 'multiplechoice' || type === 'radio') return 'multiple_choice';
  if (type === 'checkboxes' || type === 'checkbox') return 'checkboxes';
  if (type === 'dropdown' || type === 'select') return 'dropdown';
  if (type === 'matrix') return 'matrix';
  if (type === 'ranking') return 'ranking';
  if (type === 'address') return 'address';
  if (type === 'nps') return 'nps';
  if (type === 'rating') return 'rating';
  if (type === 'scale') return 'scale';
  if (type === 'textarea' || type === 'long_text' || type === 'long-text' || type === 'longtext') return 'long-text';
  if (type === 'text' || type === 'short_text' || type === 'short-text' || type === 'shorttext') return 'short-text';

  // Check for special types based on validation or other indicators
  if (type === 'number') {
    // Check if it's a rating or scale based on validation
    if (config.validation?.min !== undefined && config.validation?.max !== undefined) {
      const range = (config.validation.max || 10) - (config.validation.min || 1);
      if (range <= 5) return 'rating';
      if (range <= 10) return 'scale';
    }
    return 'number';
  }

  if (type === 'string') {
    // Could be short text, long text, email, phone, etc.
    if (config.validation?.minLength && config.validation.minLength > 50) return 'long-text';
    return 'short-text';
  }

  if (type === 'boolean' || type === 'yes_no' || type === 'yes-no') return 'yes-no';
  if (type === 'date') return 'date';
  if (type === 'array') return 'checkboxes';

  return type;
}

/**
 * Helper type for field type editor props
 */
export interface FieldTypeEditorProps {
  config: FieldConfig;
  onUpdate: (updates: Partial<FieldConfig>) => void;
}

/**
 * Helper to create an updateValidation function
 */
export function createUpdateValidation(
  config: FieldConfig,
  onUpdate: (updates: Partial<FieldConfig>) => void
) {
  return (key: string, value: any) => {
    onUpdate({
      validation: {
        ...config.validation,
        [key]: value,
      },
    });
  };
}
