/**
 * Collection Naming Utilities
 * 
 * Converts form names to MongoDB collection names following conventions:
 * - "IT Helpdesk" → "it_helpdesk_responses"
 * - "Customer Feedback Form" → "customer_feedback_form_responses"
 */

/**
 * Convert a form name to a collection name
 * 
 * Rules:
 * - Convert to lowercase
 * - Replace spaces and special characters with underscores
 * - Remove leading/trailing underscores
 * - Append "_responses" suffix
 * - Max length: 64 characters (MongoDB limit)
 * - Ensure valid MongoDB collection name
 * 
 * @param formName - The form name to convert
 * @returns A valid MongoDB collection name
 */
export function formNameToCollectionName(formName: string): string {
  if (!formName || formName.trim().length === 0) {
    return 'form_responses';
  }

  // Convert to lowercase
  let collection = formName.toLowerCase().trim();

  // Replace spaces and common separators with underscores
  collection = collection.replace(/[\s\-\.]+/g, '_');

  // Remove special characters (keep only alphanumeric and underscores)
  collection = collection.replace(/[^a-z0-9_]/g, '');

  // Remove multiple consecutive underscores
  collection = collection.replace(/_+/g, '_');

  // Remove leading and trailing underscores
  collection = collection.replace(/^_+|_+$/g, '');

  // If empty after cleaning, use default
  if (collection.length === 0) {
    return 'form_responses';
  }

  // Append "_responses" suffix
  collection = `${collection}_responses`;

  // Ensure it doesn't exceed MongoDB's 64 character limit
  // Reserve space for "_responses" (9 chars) + some buffer
  const maxBaseLength = 55;
  if (collection.length > 64) {
    const base = collection.slice(0, -9); // Remove "_responses"
    collection = `${base.substring(0, maxBaseLength)}_responses`;
  }

  // MongoDB collection name validation:
  // - Must start with letter or underscore
  // - Can contain letters, numbers, underscores
  // - Cannot be empty
  // - Cannot start with "system."
  if (!/^[a-z_]/.test(collection)) {
    collection = `form_${collection}`;
  }

  // Ensure it doesn't start with "system."
  if (collection.startsWith('system.')) {
    collection = `form_${collection}`;
  }

  return collection;
}

/**
 * Validate a collection name
 * 
 * @param collectionName - The collection name to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validateCollectionName(collectionName: string): {
  isValid: boolean;
  error?: string;
} {
  if (!collectionName || collectionName.trim().length === 0) {
    return {
      isValid: false,
      error: 'Collection name cannot be empty',
    };
  }

  // Check length
  if (collectionName.length > 64) {
    return {
      isValid: false,
      error: 'Collection name cannot exceed 64 characters',
    };
  }

  // Check format (must start with letter or underscore, can contain letters, numbers, underscores)
  if (!/^[a-z_][a-z0-9_]*$/i.test(collectionName)) {
    return {
      isValid: false,
      error: 'Collection name must start with a letter or underscore and contain only letters, numbers, and underscores',
    };
  }

  // Cannot start with "system."
  if (collectionName.toLowerCase().startsWith('system.')) {
    return {
      isValid: false,
      error: 'Collection name cannot start with "system."',
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Suggest an alternative collection name if the provided one is invalid or conflicts
 * 
 * @param baseName - The base name to use
 * @param existingNames - Array of existing collection names to avoid conflicts
 * @param attempt - Current attempt number (for appending numbers)
 * @returns A suggested collection name
 */
export function suggestCollectionName(
  baseName: string,
  existingNames: string[] = [],
  attempt: number = 0
): string {
  let suggested = formNameToCollectionName(baseName);

  // If this is not the first attempt, append a number
  if (attempt > 0) {
    const base = suggested.replace(/_responses$/, '');
    suggested = `${base}_${attempt}_responses`;
    
    // Ensure it doesn't exceed length limit
    if (suggested.length > 64) {
      const maxBaseLength = 55 - attempt.toString().length - 1; // Reserve space for number and underscore
      const base = suggested.replace(/_responses$/, '').replace(/_\d+$/, '');
      suggested = `${base.substring(0, maxBaseLength)}_${attempt}_responses`;
    }
  }

  // Check for conflicts
  if (existingNames.includes(suggested)) {
    return suggestCollectionName(baseName, existingNames, attempt + 1);
  }

  return suggested;
}
