/**
 * Field Ordering Utility
 *
 * Provides intelligent ordering for form fields after AI generation.
 * Places contact information (name, email, phone) at the top, followed by
 * other commonly-accessed fields, with technical/metadata fields at the bottom.
 */

import { FieldConfig } from '@/types/form';

// ============================================
// Field Priority Categories
// ============================================

/**
 * Priority tiers for field ordering (lower = higher priority)
 */
enum FieldPriority {
  IDENTITY = 0,        // Name fields
  CONTACT_PRIMARY = 1, // Email, phone
  CONTACT_SECONDARY = 2, // Address, location
  DEMOGRAPHICS = 3,    // Age, gender, etc.
  ORGANIZATION = 4,    // Company, title, department
  MAIN_CONTENT = 5,    // Subject, title, description of the main entity
  CATEGORIZATION = 6,  // Type, status, category
  DETAILS = 7,         // Other details
  PREFERENCES = 8,     // Preferences, settings
  DATES = 9,           // Date fields
  NUMBERS = 10,        // Numeric/quantity fields
  LONG_TEXT = 11,      // Comments, notes, descriptions
  METADATA = 12,       // Internal/system fields
  UNKNOWN = 50,        // Uncategorized fields
}

// ============================================
// Field Pattern Matchers
// ============================================

/**
 * Pattern definitions for categorizing fields
 * Each entry maps a regex pattern to a priority level
 */
const FIELD_PATTERNS: Array<{ patterns: RegExp[]; priority: FieldPriority }> = [
  // Identity - Names (highest priority)
  {
    patterns: [
      /^(full[_\s]?)?name$/i,
      /^(first[_\s]?)?name$/i,
      /^(last[_\s]?)?name$/i,
      /^(given[_\s]?)?name$/i,
      /^surname$/i,
      /^family[_\s]?name$/i,
      /^user[_\s]?name$/i,
      /^display[_\s]?name$/i,
      /^contact[_\s]?name$/i,
      /^customer[_\s]?name$/i,
      /^client[_\s]?name$/i,
    ],
    priority: FieldPriority.IDENTITY,
  },

  // Primary contact - Email, Phone
  {
    patterns: [
      /^e?mail$/i,
      /^email[_\s]?address$/i,
      /^contact[_\s]?email$/i,
      /^work[_\s]?email$/i,
      /^personal[_\s]?email$/i,
      /^phone$/i,
      /^phone[_\s]?(number)?$/i,
      /^mobile$/i,
      /^cell$/i,
      /^telephone$/i,
      /^contact[_\s]?phone$/i,
      /^work[_\s]?phone$/i,
      /^home[_\s]?phone$/i,
    ],
    priority: FieldPriority.CONTACT_PRIMARY,
  },

  // Secondary contact - Address
  {
    patterns: [
      /^address$/i,
      /^street$/i,
      /^city$/i,
      /^state$/i,
      /^province$/i,
      /^country$/i,
      /^zip$/i,
      /^postal[_\s]?code$/i,
      /^region$/i,
      /^location$/i,
      /^mailing[_\s]?address$/i,
      /^shipping[_\s]?address$/i,
      /^billing[_\s]?address$/i,
    ],
    priority: FieldPriority.CONTACT_SECONDARY,
  },

  // Demographics
  {
    patterns: [
      /^age$/i,
      /^gender$/i,
      /^sex$/i,
      /^date[_\s]?of[_\s]?birth$/i,
      /^dob$/i,
      /^birth[_\s]?date$/i,
      /^nationality$/i,
      /^ethnicity$/i,
      /^language$/i,
      /^preferred[_\s]?language$/i,
    ],
    priority: FieldPriority.DEMOGRAPHICS,
  },

  // Organization info
  {
    patterns: [
      /^company$/i,
      /^organization$/i,
      /^employer$/i,
      /^business$/i,
      /^job[_\s]?title$/i,
      /^title$/i,
      /^position$/i,
      /^role$/i,
      /^department$/i,
      /^team$/i,
      /^division$/i,
      /^industry$/i,
      /^occupation$/i,
      /^profession$/i,
    ],
    priority: FieldPriority.ORGANIZATION,
  },

  // Main content fields
  {
    patterns: [
      /^subject$/i,
      /^topic$/i,
      /^headline$/i,
      /^summary$/i,
      /^overview$/i,
      /^purpose$/i,
      /^reason$/i,
      /^inquiry$/i,
      /^request$/i,
      /^question$/i,
    ],
    priority: FieldPriority.MAIN_CONTENT,
  },

  // Categorization
  {
    patterns: [
      /^type$/i,
      /^category$/i,
      /^status$/i,
      /^priority$/i,
      /^severity$/i,
      /^urgency$/i,
      /^level$/i,
      /^tier$/i,
      /^classification$/i,
      /^tag(s)?$/i,
      /^label(s)?$/i,
    ],
    priority: FieldPriority.CATEGORIZATION,
  },

  // Preferences
  {
    patterns: [
      /^prefer/i,
      /^subscri/i,
      /^newsletter$/i,
      /^opt[_\s]?(in|out)$/i,
      /^consent$/i,
      /^notification/i,
      /^communication/i,
      /^marketing$/i,
      /^terms$/i,
      /^agree/i,
    ],
    priority: FieldPriority.PREFERENCES,
  },

  // Date fields
  {
    patterns: [
      /date$/i,
      /^deadline$/i,
      /^due$/i,
      /^scheduled$/i,
      /^appointment$/i,
      /^start[_\s]?(date|time)?$/i,
      /^end[_\s]?(date|time)?$/i,
      /^expir/i,
      /^valid/i,
    ],
    priority: FieldPriority.DATES,
  },

  // Numeric/quantity fields
  {
    patterns: [
      /^amount$/i,
      /^quantity$/i,
      /^count$/i,
      /^total$/i,
      /^price$/i,
      /^cost$/i,
      /^budget$/i,
      /^salary$/i,
      /^rate$/i,
      /^score$/i,
      /^rating$/i,
      /^number[_\s]?of/i,
      /^size$/i,
      /^weight$/i,
      /^height$/i,
      /^width$/i,
      /^length$/i,
    ],
    priority: FieldPriority.NUMBERS,
  },

  // Long text fields (usually at the bottom)
  {
    patterns: [
      /^comment(s)?$/i,
      /^note(s)?$/i,
      /^description$/i,
      /^detail(s)?$/i,
      /^message$/i,
      /^feedback$/i,
      /^remarks?$/i,
      /^additional[_\s]?info/i,
      /^other$/i,
      /^body$/i,
      /^content$/i,
      /^text$/i,
      /^bio$/i,
      /^about$/i,
    ],
    priority: FieldPriority.LONG_TEXT,
  },

  // Metadata/system fields (lowest priority)
  {
    patterns: [
      /^_id$/i,
      /^id$/i,
      /^uuid$/i,
      /^guid$/i,
      /^created/i,
      /^updated/i,
      /^modified/i,
      /^timestamp$/i,
      /^version$/i,
      /^__v$/i,
      /^deleted/i,
      /^archived$/i,
      /^active$/i,
      /^enabled$/i,
      /^is[_\s]?active$/i,
      /^is[_\s]?deleted$/i,
      /^source$/i,
      /^origin$/i,
      /^ref(erence)?[_\s]?(id|number)?$/i,
      /^internal/i,
      /^system/i,
      /^meta/i,
    ],
    priority: FieldPriority.METADATA,
  },
];

// ============================================
// Priority Detection Functions
// ============================================

/**
 * Determines the priority of a field based on its path/label
 */
function getFieldPriority(field: FieldConfig): FieldPriority {
  // Use both path and label for matching
  const identifiers = [
    field.path,
    field.label,
    // Also check the last segment of nested paths
    field.path.split('.').pop() || '',
  ].filter(Boolean);

  for (const { patterns, priority } of FIELD_PATTERNS) {
    for (const pattern of patterns) {
      for (const identifier of identifiers) {
        if (pattern.test(identifier)) {
          return priority;
        }
      }
    }
  }

  // Additional type-based priority adjustments
  if (field.type === 'email') return FieldPriority.CONTACT_PRIMARY;
  if (field.type === 'phone') return FieldPriority.CONTACT_PRIMARY;
  if (field.type === 'address') return FieldPriority.CONTACT_SECONDARY;
  if (field.type === 'date' || field.type === 'datetime') return FieldPriority.DATES;
  if (field.type === 'number' || field.type === 'slider' || field.type === 'rating') {
    return FieldPriority.NUMBERS;
  }
  if (field.type === 'long_text') return FieldPriority.LONG_TEXT;

  return FieldPriority.UNKNOWN;
}

/**
 * Gets a secondary sort key for fields with the same priority
 * This ensures consistent ordering within each priority group
 */
function getSecondarySortKey(field: FieldConfig): string {
  // For identity fields, order: full name -> first name -> last name -> others
  if (getFieldPriority(field) === FieldPriority.IDENTITY) {
    const path = field.path.toLowerCase();
    if (/^(full[_\s]?)?name$/i.test(path)) return '0';
    if (/^first/i.test(path) || /^given/i.test(path)) return '1';
    if (/^last/i.test(path) || /^surname/i.test(path) || /^family/i.test(path)) return '2';
    return '3';
  }

  // For contact fields, order: email -> phone -> mobile
  if (getFieldPriority(field) === FieldPriority.CONTACT_PRIMARY) {
    const path = field.path.toLowerCase();
    if (/email/i.test(path)) return '0';
    if (/phone/i.test(path)) return '1';
    if (/mobile|cell/i.test(path)) return '2';
    return '3';
  }

  // For address fields, maintain logical order
  if (getFieldPriority(field) === FieldPriority.CONTACT_SECONDARY) {
    const path = field.path.toLowerCase();
    if (/^address$|street/i.test(path)) return '0';
    if (/city/i.test(path)) return '1';
    if (/state|province/i.test(path)) return '2';
    if (/zip|postal/i.test(path)) return '3';
    if (/country/i.test(path)) return '4';
    return '5';
  }

  // Default: alphabetical by label
  return field.label.toLowerCase();
}

// ============================================
// Main Sorting Function
// ============================================

/**
 * Sorts form fields into a logical order for better user experience.
 *
 * Order priority:
 * 1. Identity (name fields)
 * 2. Primary contact (email, phone)
 * 3. Secondary contact (address)
 * 4. Demographics
 * 5. Organization info
 * 6. Main content (subject, topic)
 * 7. Categorization (type, status)
 * 8. Details
 * 9. Preferences
 * 10. Dates
 * 11. Numbers
 * 12. Long text (comments, notes)
 * 13. Metadata (internal fields)
 *
 * @param fields - Array of field configurations to sort
 * @returns Sorted array of field configurations
 */
export function sortFieldsByPriority(fields: FieldConfig[]): FieldConfig[] {
  return [...fields].sort((a, b) => {
    const priorityA = getFieldPriority(a);
    const priorityB = getFieldPriority(b);

    // First sort by priority
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Then by secondary sort key for same-priority fields
    const secondaryA = getSecondarySortKey(a);
    const secondaryB = getSecondarySortKey(b);
    return secondaryA.localeCompare(secondaryB);
  });
}

/**
 * Checks if a field should be considered "primary" (shown first in forms)
 */
export function isPrimaryField(field: FieldConfig): boolean {
  const priority = getFieldPriority(field);
  return priority <= FieldPriority.CONTACT_SECONDARY;
}

/**
 * Checks if a field should be considered "metadata" (shown last or hidden)
 */
export function isMetadataField(field: FieldConfig): boolean {
  return getFieldPriority(field) === FieldPriority.METADATA;
}

/**
 * Groups fields by their priority category
 * Useful for creating form sections
 */
export function groupFieldsByCategory(fields: FieldConfig[]): Map<string, FieldConfig[]> {
  const groups = new Map<string, FieldConfig[]>();

  const categoryNames: Record<FieldPriority, string> = {
    [FieldPriority.IDENTITY]: 'Personal Information',
    [FieldPriority.CONTACT_PRIMARY]: 'Contact Information',
    [FieldPriority.CONTACT_SECONDARY]: 'Address',
    [FieldPriority.DEMOGRAPHICS]: 'Demographics',
    [FieldPriority.ORGANIZATION]: 'Organization',
    [FieldPriority.MAIN_CONTENT]: 'Details',
    [FieldPriority.CATEGORIZATION]: 'Classification',
    [FieldPriority.DETAILS]: 'Additional Details',
    [FieldPriority.PREFERENCES]: 'Preferences',
    [FieldPriority.DATES]: 'Dates',
    [FieldPriority.NUMBERS]: 'Quantities',
    [FieldPriority.LONG_TEXT]: 'Additional Information',
    [FieldPriority.METADATA]: 'System Fields',
    [FieldPriority.UNKNOWN]: 'Other',
  };

  for (const field of fields) {
    const priority = getFieldPriority(field);
    const categoryName = categoryNames[priority];

    if (!groups.has(categoryName)) {
      groups.set(categoryName, []);
    }
    groups.get(categoryName)!.push(field);
  }

  return groups;
}
