# @netpad/templates

> 100+ production-ready form templates for NetPad applications

[![npm version](https://badge.fury.io/js/%40netpad%2Ftemplates.svg)](https://www.npmjs.com/package/@netpad/templates)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Installation

```bash
npm install @netpad/templates
```

## Quick Start

```typescript
import { allTemplates, getTemplateById, searchTemplates } from '@netpad/templates';

// Get all templates
console.log(`${allTemplates.length} templates available`);

// Find a specific template
const contactForm = getTemplateById('contact-form');
console.log(contactForm?.name); // "Contact Form"

// Search templates
const healthcareTemplates = searchTemplates('healthcare');
```

## Template Categories

| Category | Templates | Description |
|----------|-----------|-------------|
| Business & Sales | 8+ | Lead capture, vendor registration, sales inquiries |
| HR & Recruitment | 8+ | Job applications, onboarding, employee forms |
| Customer Service | 8+ | Support tickets, feedback, satisfaction surveys |
| Marketing & Research | 7+ | Event registration, surveys, NPS |
| Education & Training | 7+ | Course enrollment, student applications |
| Healthcare & Wellness | 8+ | Patient intake, appointments, medical history |
| Real Estate | 7+ | Property inquiries, tenant applications |
| Legal & Compliance | 6+ | NDAs, contract reviews, DSAR |
| Nonprofit & Community | 7+ | Donations, volunteer applications |
| Events & Hospitality | 6+ | Event registration, RSVPs |
| Technology & IT | 6+ | Bug reports, feature requests |
| Finance & Accounting | 6+ | Expense reports, invoices |
| Sports & Fitness | 7+ | Gym memberships, waivers |
| Travel & Tourism | 7+ | Travel inquiries, bookings |
| Government & Public | 6+ | Public records, permits |

## API Reference

### Template Access

```typescript
import {
  allTemplates,           // All 100+ templates
  getTemplateById,        // Get single template by ID
  getTemplatesByCategory, // Filter by category
  getFeaturedTemplates,   // Get featured templates
  searchTemplates,        // Search by name/tags
  getTemplateCounts,      // Get count per category
  filterTemplates,        // Multi-criteria filter
} from '@netpad/templates';
```

### Category-Specific Imports

```typescript
import {
  businessSalesTemplates,
  hrRecruitmentTemplates,
  customerServiceTemplates,
  marketingResearchTemplates,
  educationTrainingTemplates,
  healthcareWellnessTemplates,
  realEstateTemplates,
  legalComplianceTemplates,
  nonprofitCommunityTemplates,
  eventsHospitalityTemplates,
  technologyItTemplates,
  financeAccountingTemplates,
  sportsFitnessTemplates,
  travelTourismTemplates,
  governmentPublicTemplates,
} from '@netpad/templates';
```

### Type Imports

```typescript
import type {
  FormTemplate,
  FieldConfig,
  FormTheme,
  FormTemplateCategory,
  TemplateComplexity,
  TemplateFormType,
} from '@netpad/templates';
```

### Helper Functions

Create custom templates using the same builders:

```typescript
import {
  createTemplate,
  textField,
  emailField,
  phoneField,
  selectField,
  textareaField,
  dateField,
  yesNoField,
  sectionHeader,
  THEME_PRESETS,
  getThemeForCategory,
} from '@netpad/templates/helpers';

const myTemplate = createTemplate({
  id: 'my-custom-form',
  name: 'My Custom Form',
  category: 'business-sales',
  shortDescription: 'A custom form for my needs',
  fieldConfigs: [
    sectionHeader('contact', 'Contact Information'),
    textField('name', 'Full Name', { required: true }),
    emailField('email', 'Email', true),
    phoneField('phone', 'Phone'),
    textareaField('message', 'Message', { required: true }),
  ],
});
```

### Filtering Templates

```typescript
import { filterTemplates } from '@netpad/templates';

// Filter by multiple criteria
const results = filterTemplates({
  category: 'healthcare-wellness',
  complexity: 'simple',
  featured: true,
  search: 'patient',
});
```

## Template Structure

Each template includes:

```typescript
interface FormTemplate {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  shortDescription: string;      // Brief description
  fullDescription: string;       // Detailed description
  category: FormTemplateCategory;
  formType: 'traditional' | 'conversational' | 'hybrid';
  complexity: 'simple' | 'moderate' | 'advanced';
  estimatedTime: number;         // Minutes to complete
  icon: string;                  // Lucide icon name
  tags: string[];                // Searchable tags
  isFeatured: boolean;
  fieldConfigs: FieldConfig[];   // Form fields
  theme: FormTheme;              // Styling
  // ... additional properties
}
```

## Field Types

Templates support 20+ field types:

- **Text**: `string`, `email`, `phone`, `url`, `textarea`
- **Selection**: `select`, `multiselect`, `radio`, `checkbox`
- **Date/Time**: `date`, `time`, `datetime`
- **Numbers**: `number`, `currency`, `rating`, `scale`
- **Boolean**: `boolean` (yes/no toggle)
- **Files**: `file`, `image`, `signature`
- **Location**: `address`
- **Layout**: `section-header`, `description`, `divider`

## Theme Presets

Industry-specific themes included:

```typescript
import { THEME_PRESETS, getThemeForCategory } from '@netpad/templates/helpers';

// Get theme for a category
const theme = getThemeForCategory('healthcare-wellness');

// Available presets
Object.keys(THEME_PRESETS);
// ['professional', 'healthcare', 'education', 'creative', 'tech',
//  'nonprofit', 'realEstate', 'government', 'travel', 'sports',
//  'hr', 'support', 'events', 'finance']
```

## Contributing

Templates are defined in `src/definitions/` organized by category. Each template uses the `createTemplate()` factory and field builder functions for consistency.

## License

Apache-2.0
