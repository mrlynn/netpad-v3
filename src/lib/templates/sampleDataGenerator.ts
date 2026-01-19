/**
 * Sample Data Generator for Form Templates
 *
 * Generates realistic fake data for form templates using @faker-js/faker.
 * Used for search demos and template previews.
 */

import { faker } from '@faker-js/faker';
import { FieldConfig } from '@/types/form';
import { FormTemplate } from '@/types/formTemplate';

// Set a seed for reproducible data (but still varied)
faker.seed(42);

/**
 * Generate a single field value based on field configuration
 */
function generateFieldValue(field: FieldConfig): unknown {
  // Skip section headers and non-included fields
  if (field.type === 'sectionHeader' || !field.included) {
    return undefined;
  }

  // Get options if available
  const options = field.validation?.options;

  // Handle based on field type
  switch (field.type) {
    // Text fields - use smart generation based on field path/label
    case 'text':
    case 'name':
      return generateSmartText(field);

    case 'email':
      return faker.internet.email().toLowerCase();

    case 'phone':
      return faker.phone.number({ style: 'national' });

    case 'url':
      return faker.internet.url();

    case 'textarea':
    case 'long_text':
      return generateSmartTextarea(field);

    case 'number':
      return generateSmartNumber(field);

    case 'currency':
      return parseFloat(faker.finance.amount({ min: 10, max: 10000, dec: 2 }));

    case 'date':
      return generateSmartDate(field);

    case 'time':
      return faker.date.recent().toTimeString().slice(0, 5);

    case 'datetime':
      return faker.date.recent().toISOString();

    case 'select':
    case 'dropdown':
      if (options && options.length > 0) {
        const opt = faker.helpers.arrayElement(options);
        return typeof opt === 'string' ? opt : opt.value;
      }
      return null;

    case 'multiSelect':
      if (options && options.length > 0) {
        const count = faker.number.int({ min: 1, max: Math.min(3, options.length) });
        const selected = faker.helpers.arrayElements(options, count);
        return selected.map((opt) => (typeof opt === 'string' ? opt : opt.value));
      }
      return [];

    case 'radio':
    case 'multiple_choice':
      if (options && options.length > 0) {
        const opt = faker.helpers.arrayElement(options);
        return typeof opt === 'string' ? opt : opt.value;
      }
      return null;

    case 'checkbox':
      if (options && options.length > 0) {
        const count = faker.number.int({ min: 1, max: Math.min(2, options.length) });
        const selected = faker.helpers.arrayElements(options, count);
        return selected.map((opt) => (typeof opt === 'string' ? opt : opt.value));
      }
      return faker.datatype.boolean();

    case 'boolean':
    case 'yesNo':
      return faker.datatype.boolean();

    case 'rating':
      const max = field.validation?.max || 5;
      return faker.number.int({ min: 1, max });

    case 'address':
      return {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state({ abbreviated: true }),
        zip: faker.location.zipCode(),
        country: 'USA',
      };

    case 'file':
    case 'signature':
      // Return placeholder for file/signature fields
      return '[uploaded]';

    default:
      // Default to smart text generation
      return generateSmartText(field);
  }
}

/**
 * Generate smart text based on field path/label hints
 */
function generateSmartText(field: FieldConfig): string {
  const path = field.path.toLowerCase();
  const label = field.label.toLowerCase();
  const combined = `${path} ${label}`;

  // Name patterns
  if (combined.includes('first') && combined.includes('name')) {
    return faker.person.firstName();
  }
  if (combined.includes('last') && combined.includes('name')) {
    return faker.person.lastName();
  }
  if (combined.includes('full') && combined.includes('name')) {
    return faker.person.fullName();
  }
  if (path.includes('name') || label.includes('name')) {
    // Check if it's a person's name context
    if (combined.includes('contact') || combined.includes('emergency') || combined.includes('guardian') || combined.includes('parent')) {
      return faker.person.fullName();
    }
    // Could be company/team name
    if (combined.includes('company') || combined.includes('business') || combined.includes('organization')) {
      return faker.company.name();
    }
    if (combined.includes('team')) {
      return faker.company.name() + ' ' + faker.helpers.arrayElement(['United', 'FC', 'Stars', 'Thunder', 'Lightning']);
    }
    return faker.person.fullName();
  }

  // Contact patterns
  if (combined.includes('email')) {
    return faker.internet.email().toLowerCase();
  }
  if (combined.includes('phone') || combined.includes('tel') || combined.includes('mobile') || combined.includes('cell')) {
    return faker.phone.number({ style: 'national' });
  }

  // Address patterns
  if (combined.includes('street') || combined.includes('address')) {
    return faker.location.streetAddress();
  }
  if (combined.includes('city')) {
    return faker.location.city();
  }
  if (combined.includes('state') || combined.includes('province')) {
    return faker.location.state();
  }
  if (combined.includes('zip') || combined.includes('postal')) {
    return faker.location.zipCode();
  }
  if (combined.includes('country')) {
    return faker.location.country();
  }

  // Business patterns
  if (combined.includes('company') || combined.includes('organization') || combined.includes('employer')) {
    return faker.company.name();
  }
  if (combined.includes('job') || combined.includes('title') || combined.includes('position') || combined.includes('role')) {
    return faker.person.jobTitle();
  }
  if (combined.includes('department')) {
    return faker.commerce.department();
  }
  if (combined.includes('website') || combined.includes('url')) {
    return faker.internet.url();
  }

  // ID patterns
  if (combined.includes('id') || combined.includes('number') || combined.includes('code')) {
    if (combined.includes('member') || combined.includes('employee') || combined.includes('student')) {
      return faker.string.alphanumeric({ length: 8, casing: 'upper' });
    }
    if (combined.includes('policy') || combined.includes('insurance')) {
      return faker.string.alphanumeric({ length: 10, casing: 'upper' });
    }
  }

  // Relationship
  if (combined.includes('relationship') || combined.includes('relation')) {
    return faker.helpers.arrayElement(['Spouse', 'Parent', 'Sibling', 'Friend', 'Colleague', 'Partner']);
  }

  // Default: short sentence or word based on placeholder
  if (field.placeholder) {
    return faker.lorem.words(3);
  }
  return faker.lorem.words(2);
}

/**
 * Generate smart textarea content based on field hints
 */
function generateSmartTextarea(field: FieldConfig): string {
  const path = field.path.toLowerCase();
  const label = field.label.toLowerCase();
  const combined = `${path} ${label}`;

  // Medical/health patterns
  if (combined.includes('condition') || combined.includes('medical') || combined.includes('health')) {
    return faker.helpers.arrayElement([
      'No known medical conditions',
      'Mild asthma, well controlled with inhaler',
      'Type 2 diabetes, managed with diet',
      'High blood pressure, on medication',
      'None',
      'Seasonal allergies',
    ]);
  }
  if (combined.includes('allerg')) {
    return faker.helpers.arrayElement([
      'No known allergies',
      'Penicillin',
      'Peanuts, tree nuts',
      'Shellfish',
      'None',
      'Latex, bee stings',
    ]);
  }
  if (combined.includes('medication')) {
    return faker.helpers.arrayElement([
      'None',
      'Daily multivitamin',
      'Lisinopril 10mg daily',
      'Metformin 500mg twice daily',
      'No current medications',
    ]);
  }
  if (combined.includes('injur') || combined.includes('surgery')) {
    return faker.helpers.arrayElement([
      'None',
      'ACL reconstruction, left knee, 2019',
      'Rotator cuff repair, 2021',
      'No previous injuries or surgeries',
      'Broken arm, fully healed',
    ]);
  }

  // Goals/objectives patterns
  if (combined.includes('goal') || combined.includes('objective')) {
    return faker.helpers.arrayElement([
      'Improve overall fitness and lose 15 pounds',
      'Train for upcoming marathon',
      'Build strength and muscle definition',
      'Reduce stress and improve flexibility',
      'Recover from injury and regain mobility',
    ]);
  }

  // Description/notes patterns
  if (combined.includes('description') || combined.includes('details') || combined.includes('note')) {
    return faker.lorem.sentences(2);
  }

  // Comment/feedback patterns
  if (combined.includes('comment') || combined.includes('feedback') || combined.includes('message')) {
    return faker.lorem.sentences(3);
  }

  // Diet/nutrition patterns
  if (combined.includes('diet') || combined.includes('nutrition') || combined.includes('eating')) {
    return faker.helpers.arrayElement([
      'Balanced diet with occasional treats',
      'Vegetarian, high protein focus',
      'Keto diet for the past 6 months',
      'No specific diet, trying to eat healthier',
      'Mediterranean diet',
    ]);
  }

  // Routine/schedule patterns
  if (combined.includes('routine') || combined.includes('exercise') || combined.includes('workout')) {
    return faker.helpers.arrayElement([
      'Gym 3x per week, mostly cardio',
      'Walking 30 minutes daily',
      'No current exercise routine',
      'Yoga 2x per week, occasional running',
      'Weight training 4x per week',
    ]);
  }

  // Experience/background patterns
  if (combined.includes('experience') || combined.includes('background') || combined.includes('history')) {
    return faker.lorem.sentences(2);
  }

  // Default
  return faker.lorem.sentences(2);
}

/**
 * Generate smart number based on field hints
 */
function generateSmartNumber(field: FieldConfig): number {
  const path = field.path.toLowerCase();
  const label = field.label.toLowerCase();
  const combined = `${path} ${label}`;

  // Use validation constraints if available
  const min = field.validation?.min ?? 0;
  const max = field.validation?.max ?? 100;

  // Age patterns
  if (combined.includes('age')) {
    return faker.number.int({ min: 18, max: 75 });
  }

  // Weight patterns
  if (combined.includes('weight')) {
    return faker.number.int({ min: 100, max: 250 });
  }

  // Height patterns
  if (combined.includes('height')) {
    return faker.number.int({ min: 60, max: 78 }); // inches
  }

  // Year patterns
  if (combined.includes('year') || combined.includes('experience')) {
    return faker.number.int({ min: 0, max: 30 });
  }

  // Quantity patterns
  if (combined.includes('quantity') || combined.includes('count') || combined.includes('number')) {
    return faker.number.int({ min: 1, max: 10 });
  }

  // Score/rating patterns
  if (combined.includes('score') || combined.includes('rating')) {
    return faker.number.int({ min: 1, max: 10 });
  }

  // Default: use validation range or sensible default
  return faker.number.int({ min, max });
}

/**
 * Generate smart date based on field hints
 */
function generateSmartDate(field: FieldConfig): string {
  const path = field.path.toLowerCase();
  const label = field.label.toLowerCase();
  const combined = `${path} ${label}`;

  // Birth date patterns
  if (combined.includes('birth') || combined.includes('dob')) {
    const age = faker.number.int({ min: 18, max: 65 });
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - age);
    return birthDate.toISOString().split('T')[0];
  }

  // Start date patterns (future)
  if (combined.includes('start') || combined.includes('begin') || combined.includes('preferred')) {
    return faker.date.soon({ days: 30 }).toISOString().split('T')[0];
  }

  // End/expiration patterns
  if (combined.includes('end') || combined.includes('expir')) {
    return faker.date.future({ years: 1 }).toISOString().split('T')[0];
  }

  // Event/appointment patterns
  if (combined.includes('event') || combined.includes('appointment') || combined.includes('class')) {
    return faker.date.soon({ days: 14 }).toISOString().split('T')[0];
  }

  // Signature/submission date (today or recent)
  if (combined.includes('signature') || combined.includes('sign') || combined.includes('submit')) {
    return new Date().toISOString().split('T')[0];
  }

  // Default: recent date
  return faker.date.recent({ days: 30 }).toISOString().split('T')[0];
}

/**
 * Generate a complete record from field configurations
 */
export function generateRecord(fields: FieldConfig[]): Record<string, unknown> {
  const record: Record<string, unknown> = {
    _id: faker.string.uuid(),
    createdAt: faker.date.recent({ days: 90 }).toISOString(),
  };

  for (const field of fields) {
    if (field.type === 'sectionHeader' || !field.included) {
      continue;
    }

    const value = generateFieldValue(field);
    if (value !== undefined) {
      record[field.path] = value;
    }
  }

  return record;
}

/**
 * Generate multiple sample records for a template
 */
export function generateSampleData(
  template: FormTemplate,
  count: number = 20
): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = [];

  // Reset faker seed with template ID for reproducibility
  faker.seed(hashCode(template.id));

  for (let i = 0; i < count; i++) {
    records.push(generateRecord(template.fieldConfigs));
  }

  return records;
}

/**
 * Simple hash function for string to number
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get searchable fields from a template (fields suitable for search/filter)
 */
export function getSearchableFields(template: FormTemplate): FieldConfig[] {
  return template.fieldConfigs.filter((field) => {
    // Skip section headers and non-included fields
    if (field.type === 'sectionHeader' || !field.included) {
      return false;
    }

    // Skip signature, file, and complex fields
    if (['signature', 'file', 'address'].includes(field.type)) {
      return false;
    }

    return true;
  });
}

/**
 * Filter records based on search criteria
 */
export function filterRecords(
  records: Record<string, unknown>[],
  filters: Record<string, unknown>
): Record<string, unknown>[] {
  return records.filter((record) => {
    for (const [key, filterValue] of Object.entries(filters)) {
      if (filterValue === undefined || filterValue === null || filterValue === '') {
        continue;
      }

      const recordValue = record[key];

      // Handle different filter types
      if (typeof filterValue === 'string') {
        // String search (case-insensitive partial match)
        const recordStr = String(recordValue || '').toLowerCase();
        if (!recordStr.includes(filterValue.toLowerCase())) {
          return false;
        }
      } else if (typeof filterValue === 'boolean') {
        if (recordValue !== filterValue) {
          return false;
        }
      } else if (Array.isArray(filterValue)) {
        // Multi-select filter
        if (filterValue.length > 0) {
          const recordArr = Array.isArray(recordValue) ? recordValue : [recordValue];
          const hasMatch = filterValue.some((v) => recordArr.includes(v));
          if (!hasMatch) {
            return false;
          }
        }
      } else if (filterValue === recordValue) {
        // Exact match for other types
        continue;
      } else if (recordValue !== filterValue) {
        return false;
      }
    }

    return true;
  });
}
